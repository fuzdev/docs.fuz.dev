/**
 * Turns the stack repos' manifests into dependency edges between projects,
 * for the snapshot task. Pure, so its rules can be tested without a checkout.
 *
 * @module
 */

import * as s from '@fuzdev/fuz_schema/schema.ts';

import type { StackProject } from '#routes/stack_projects.ts';
import { dep_kinds, type DepKind, type StackDepEdge } from './stack_snapshot.ts';

/** The fields of a root `package.json` the snapshot reads. */
export const PackageJson = s.loose_object({
	name: s.optional(s.string),
	private: s.optional(s.boolean),
	scripts: s.optional(s.record(s.string)),
	dependencies: s.optional(s.record(s.string)),
	peerDependencies: s.optional(s.record(s.string)),
	peerDependenciesMeta: s.optional(s.record(s.loose_object({ optional: s.optional(s.boolean) }))),
	optionalDependencies: s.optional(s.record(s.string)),
	devDependencies: s.optional(s.record(s.string))
});
export type PackageJson = s.Infer<typeof PackageJson>;

/** The fields of `cargo metadata --no-deps` the snapshot reads. */
export const CargoMetadata = s.loose_object({
	packages: s.array(
		s.loose_object({
			name: s.string,
			/** `null` when the crate may be published anywhere, a list of registries otherwise. */
			publish: s.nullable(s.array(s.string)),
			/** The crate's `[package.metadata]` table, where the release audit's `dev_only` is set. */
			metadata: s.optional(s.nullable(s.unknown)),
			dependencies: s.array(
				s.loose_object({
					name: s.string,
					/** `null` for a normal dependency, else `dev` or `build`. */
					kind: s.nullable(s.string),
					/** Set for a dependency on a crate at a path. */
					path: s.optional(s.string),
					/** `null` for a path dependency, else the registry or git source. */
					source: s.nullable(s.string)
				})
			)
		})
	)
});
export type CargoMetadata = s.Infer<typeof CargoMetadata>;

/** One repo's manifests, as read. */
export interface RepoManifests {
	repo: string;
	project: string;
	package_json: PackageJson | null;
	cargo: CargoMetadata | null;
}

/** The tables of a `package.json` that declare a dependency, with the kind each one is. */
const npm_tables: ReadonlyArray<
	[
		table: 'dependencies' | 'peerDependencies' | 'optionalDependencies' | 'devDependencies',
		kind: DepKind
	]
> = [
	['dependencies', 'runtime'],
	['peerDependencies', 'peer'],
	['optionalDependencies', 'optional'],
	['devDependencies', 'dev']
];

/**
 * Whether a crate is development tooling that no shipped binary links: an `xtask`,
 * a `testing_*` binary, or one the release audit marks `dev_only`. What such a crate
 * depends on is a development dependency whatever its manifest table says.
 */
export const crate_is_dev_only = (crate: { name: string; metadata?: unknown }): boolean => {
	if (crate.name === 'xtask' || crate.name.startsWith('testing_')) return true;
	const metadata = crate.metadata;
	if (typeof metadata !== 'object' || metadata === null) return false;
	const audit = (metadata as Record<string, unknown>).fuz_audit;
	return (
		typeof audit === 'object' && audit !== null && 'dev_only' in audit && audit.dev_only === true
	);
};

export interface StackEdgesResult {
	/** Sorted by `to`, then `from_repo`, then `manifest`. */
	edges: Array<StackDepEdge>;
	/** What could not be placed. A caller writes nothing when this is not empty. */
	problems: Array<string>;
}

/**
 * Builds the edges between projects from every stack repo's manifests.
 *
 * @param repos_path - the absolute path of the directory holding the checkouts, which a
 * crate's path dependency is read against
 * @param scope - the stack's npm scope, without the `@`: a name under it that maps to no
 * project is a problem, where any other unknown name is someone else's package
 */
export const build_stack_edges = (
	manifests: ReadonlyArray<RepoManifests>,
	projects: ReadonlyArray<StackProject>,
	repos_path: string,
	scope: string
): StackEdgesResult => {
	// which project a package name or a crate name belongs to
	const npm_names: Map<string, string> = new Map();
	for (const project of projects) {
		for (const name of project.packages ?? []) npm_names.set(name, project.name);
	}
	const crate_names: Map<string, { project: string; publishable: boolean }> = new Map();
	for (const m of manifests) {
		// a private root package is installed by nobody, so its name is not the project's
		if (m.package_json?.name && m.package_json.private !== true) {
			npm_names.set(m.package_json.name, m.project);
		}
		for (const crate of m.cargo?.packages ?? []) {
			crate_names.set(crate.name, {
				project: m.project,
				publishable: crate.publish === null || crate.publish.length > 0
			});
		}
	}

	const problems: Array<string> = [];
	// per edge, the packages or crates depended on at each kind
	const found: Map<
		string,
		{ edge: Omit<StackDepEdge, 'kind' | 'via'>; via: Map<DepKind, Set<string>> }
	> = new Map();
	const add = (
		m: RepoManifests,
		to: string,
		manifest: StackDepEdge['manifest'],
		kind: DepKind,
		name: string,
		source?: StackDepEdge['source']
	): void => {
		// a repo's dependency on its own project is not a relation between projects
		if (to === m.project) return;
		const key = `${m.repo}|${to}|${manifest}`;
		let entry = found.get(key);
		if (!entry) {
			entry = {
				edge: { from: m.project, from_repo: m.repo, to, manifest, source },
				via: new Map()
			};
			found.set(key, entry);
		}
		// a path dependency is the closer tie, so it is the one recorded
		if (source === 'path') entry.edge.source = 'path';
		const names = entry.via.get(kind) ?? new Set();
		entry.via.set(kind, names.add(name));
	};

	for (const m of manifests) {
		for (const [table, table_kind] of npm_tables) {
			for (const name of Object.keys(m.package_json?.[table] ?? {})) {
				const to = npm_names.get(name);
				if (to === undefined) {
					if (name.startsWith(`@${scope}/`)) {
						problems.push(`${m.repo}: ${name} in ${table} maps to no stack project`);
					}
					continue;
				}
				const optional_peer =
					table_kind === 'peer' && m.package_json?.peerDependenciesMeta?.[name]?.optional === true;
				add(m, to, 'npm', optional_peer ? 'peer_optional' : table_kind, name);
			}
		}
		for (const crate of m.cargo?.packages ?? []) {
			const dev_only = crate_is_dev_only(crate);
			for (const dep of crate.dependencies) {
				const kind: DepKind =
					dev_only || dep.kind === 'dev' ? 'dev' : dep.kind === 'build' ? 'build' : 'runtime';
				if (dep.path !== undefined) {
					// a path into a sibling checkout names that checkout's project
					const repo = dep.path.startsWith(`${repos_path}/`)
						? dep.path.slice(repos_path.length + 1).split('/')[0]
						: undefined;
					const owner = manifests.find((other) => other.repo === repo);
					if (!owner) {
						problems.push(`${m.repo}: crate ${crate.name} depends on ${dep.path}, off the stack`);
						continue;
					}
					add(m, owner.project, 'cargo', kind, dep.name, 'path');
					continue;
				}
				const known = crate_names.get(dep.name);
				if (!known || known.project === m.project) continue;
				if (dep.source?.startsWith('registry+')) {
					// a registry crate is the stack's only when the stack may publish one by that name
					if (known.publishable) add(m, known.project, 'cargo', kind, dep.name, 'registry');
				} else {
					// a git or other source that names a stack crate is an edge this cannot place
					problems.push(
						`${m.repo}: crate ${crate.name} depends on ${dep.name} from ${dep.source ?? 'no source'}`
					);
				}
			}
		}
	}

	const edges = [...found.values()]
		.map(({ edge, via }): StackDepEdge => {
			// the strongest kind the repo declares, and what it declares at that kind
			const kind = dep_kinds.find((k) => via.has(k))!;
			return { ...edge, kind, via: [...via.get(kind)!].toSorted() };
		})
		.toSorted(
			(a, b) =>
				a.to.localeCompare(b.to, 'en') ||
				a.from_repo.localeCompare(b.from_repo, 'en') ||
				a.manifest.localeCompare(b.manifest, 'en')
		);
	return { edges, problems };
};
