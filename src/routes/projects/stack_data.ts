/**
 * The committed snapshot of the stack's repos, parsed, and what the pages
 * ask of it. The snapshot task imports the schema and never this module, so a
 * committed file that no longer parses can still be rewritten.
 *
 * @module
 */

import * as s from '@fuzdev/fuz_schema/schema.ts';

import { STACK_OWNER, stack_projects, type StackProject } from '#routes/stack_projects.ts';
import { repo_class_ids, repo_classes, type RepoClassId } from './repo_classes.ts';
import { StackFacets, type StackProjectFacets } from './stack_facets.ts';
import facets_json from './stack_facets.json' with { type: 'json' };
import {
	dep_kinds,
	StackSnapshot,
	type DepKind,
	type StackDepEdge,
	type StackRepo,
	type StackStep,
	type StackThirdParty
} from './stack_snapshot.ts';
import snapshot_json from './stack_snapshot.json' with { type: 'json' };

/** The committed snapshot. A file that does not match the schema fails here, at import. */
export const stack_snapshot: StackSnapshot = s.parse_or_throw(StackSnapshot, snapshot_json);

/** What the stack page says of each project, as committed. It fails at import as the snapshot does. */
export const stack_facets: StackFacets = s.parse_or_throw(StackFacets, facets_json);

const by_kind = (a: StackDepEdge, b: StackDepEdge): number =>
	dep_kinds.indexOf(a.kind) - dep_kinds.indexOf(b.kind);

/** What a project's repos declare a dependency on, strongest kind first. */
export const project_uses = (project: StackProject): Array<StackDepEdge> =>
	stack_snapshot.edges.filter((e) => e.from === project.name).toSorted(by_kind);

/** The repos in the stack that declare a dependency on a project, strongest kind first. */
export const project_used_by = (project: StackProject): Array<StackDepEdge> =>
	stack_snapshot.edges.filter((e) => e.to === project.name).toSorted(by_kind);

/** A project's repos as the snapshot read them. */
export const project_repos = (project: StackProject): Array<StackRepo> =>
	stack_snapshot.repos.filter((r) => r.project === project.name);

/** The projects the snapshot has no repo for, which is none when it is whole. */
export const snapshot_missing_projects = (): Array<string> =>
	stack_projects
		.filter((p) => !stack_snapshot.repos.some((r) => r.project === p.name))
		.map((p) => p.name);

/** How the stack page files a project, or `undefined` for one it does not list. */
export const project_facets = (project: StackProject): StackProjectFacets | undefined =>
	stack_facets.projects.find((p) => p.name === project.name);

/** The classes a repo is a member of, in the classes' order. */
export const repo_class_ids_of = (repo: StackRepo): Array<RepoClassId> =>
	repo_class_ids.filter((id) => repo_classes[id].has(repo));

/** The repos of a class, in the snapshot's order. */
export const class_repos = (id: RepoClassId): Array<StackRepo> =>
	stack_snapshot.repos.filter((repo) => repo_classes[id].has(repo));

/** A link to a file of a repo as the snapshot read it, at a line when one is given. */
export const repo_file_url = (repo: StackRepo, path: string, line?: number): string =>
	`https://github.com/${STACK_OWNER}/${repo.repo}/blob/${repo.commit}/${path}` +
	(line === undefined ? '' : `#L${line}`);

/** One package or crate from outside the stack, with the repos that declare it. */
export interface ThirdPartyUse {
	name: string;
	manifest: StackThirdParty['manifest'];
	/** In the snapshot's order. */
	repos: Array<{ repo: StackRepo; kind: DepKind }>;
}

/**
 * Everything the stack's repos declare from outside the stack, each name once per
 * manifest, the most declared first and then by name.
 */
export const stack_third_party = (): Array<ThirdPartyUse> => {
	const found: Map<string, ThirdPartyUse> = new Map();
	for (const repo of stack_snapshot.repos) {
		for (const { name, manifest, kind } of repo.third_party) {
			const key = `${manifest}|${name}`;
			const use = found.get(key) ?? { name, manifest, repos: [] };
			use.repos.push({ repo, kind });
			found.set(key, use);
		}
	}
	return [...found.values()].toSorted(
		(a, b) =>
			b.repos.length - a.repos.length ||
			a.name.localeCompare(b.name, 'en') ||
			a.manifest.localeCompare(b.manifest, 'en')
	);
};

/** One action the stack's workflows use, with how its steps pin it and the repos that use it. */
export interface ActionUse {
	uses: string;
	/** How many steps pin it each way. */
	pins: Partial<Record<NonNullable<StackStep['pin']>, number>>;
	/** In the snapshot's order. */
	repos: Array<StackRepo>;
}

/** Every action a step of a stack workflow uses, the most used first and then by name. */
export const stack_actions = (): Array<ActionUse> => {
	const found: Map<string, ActionUse> = new Map();
	for (const repo of stack_snapshot.repos) {
		for (const step of repo.workflows.flatMap((w) => w.jobs.flatMap((job) => job.steps))) {
			if (step.uses === undefined || step.pin === undefined) continue;
			const use = found.get(step.uses) ?? { uses: step.uses, pins: {}, repos: [] };
			use.pins[step.pin] = (use.pins[step.pin] ?? 0) + 1;
			if (!use.repos.includes(repo)) use.repos.push(repo);
			found.set(step.uses, use);
		}
	}
	return [...found.values()].toSorted(
		(a, b) => b.repos.length - a.repos.length || a.uses.localeCompare(b.uses, 'en')
	);
};
