/**
 * The shape of what the stack's repos declare, read from their own files by
 * `stack_snapshot.task.ts` and committed as `stack_snapshot.json`: which
 * projects each depends on, and the commands its check script and CI run.
 * `stack_data.ts` holds the committed file, parsed.
 *
 * The snapshot is dated and goes stale between runs. The task's `--check`
 * says whether it has, where the repos are checked out; `gro check` reads
 * only the committed file. It records no versions, so it changes when a
 * relationship does and not on every release.
 *
 * A manifest shows what a repo declares, which is not always what it
 * imports, and only the stack's own projects are named: a consumer outside
 * the stack is not in it.
 *
 * @module
 */

import * as s from '@fuzdev/fuz_schema/schema.ts';

/** The kinds in order of strength, which is also the order a page lists them in. */
export const dep_kinds = ['runtime', 'peer', 'peer_optional', 'optional', 'build', 'dev'] as const;

/** Which table of a manifest declares a dependency. */
export const DepKind = s.one_of(dep_kinds);
export type DepKind = s.Infer<typeof DepKind>;

/** What each kind means, for a legend. */
export const dep_kind_labels: Record<DepKind, { label: string; meaning: string }> = {
	runtime: {
		label: 'runtime',
		meaning: 'Under dependencies in package.json, or a normal dependency of a crate.'
	},
	peer: { label: 'peer', meaning: 'Under peerDependencies, and required.' },
	peer_optional: {
		label: 'optional peer',
		meaning: 'Under peerDependencies, and marked optional.'
	},
	optional: { label: 'optional', meaning: 'Under optionalDependencies.' },
	build: { label: 'build', meaning: "A crate's build dependency." },
	dev: {
		label: 'dev',
		meaning:
			'Under devDependencies, a dev dependency of a crate, or anything a test or tooling crate uses.'
	}
};

/** The kinds a manifest declares for development or for a build script. */
const dev_kinds: ReadonlySet<DepKind> = new Set(['build', 'dev']);

/** One repo's dependency on another project, at the strongest kind it declares. */
export const StackDepEdge = s.object({
	/** The project that declares the dependency. */
	from: s.string,
	/** The repo of `from` whose manifest declares it. */
	from_repo: s.string,
	/** The project depended on. */
	to: s.string,
	manifest: s.one_of(['npm', 'cargo'] as const),
	kind: DepKind,
	/** For a crate: a sibling checkout by path, or the registry. */
	source: s.optional(s.one_of(['path', 'registry'] as const)),
	/** The packages or crates of `to` that are depended on, sorted. */
	via: s.array(s.string)
});
export type StackDepEdge = s.Infer<typeof StackDepEdge>;

/** One workflow file and the commands its steps run, in file order. */
export const StackWorkflow = s.object({
	file: s.string,
	runs: s.array(s.string)
});
export type StackWorkflow = s.Infer<typeof StackWorkflow>;

/** One repo's files, as far as the snapshot reads them. */
export const StackRepo = s.object({
	repo: s.string,
	project: s.string,
	/** Whether the repo has a root `package.json`. */
	npm: s.boolean,
	/** Whether the repo has a root `Cargo.toml`. */
	cargo: s.boolean,
	/** The `check` script of the root `package.json`, verbatim. */
	check_script: s.nullable(s.string),
	workflows: s.array(StackWorkflow)
});
export type StackRepo = s.Infer<typeof StackRepo>;

export const StackSnapshot = s.object({
	/** The day the repos' files were last read, as an ISO date. */
	checked: s.string,
	/** In `stack_projects` order. */
	repos: s.array(StackRepo),
	/** Sorted by `to`, then `from_repo`, then `manifest`. */
	edges: s.array(StackDepEdge)
});
export type StackSnapshot = s.Infer<typeof StackSnapshot>;

/** What a reader needs to know before trusting a list drawn from the snapshot. */
export const snapshot_notes = {
	consumers:
		'The stack repos that declare a dependency on it. A breaking change has to be carried through each of them, and through any consumer that no manifest declares.',
	declares:
		"Only each repo's root manifests are read. A manifest shows what a repo declares, which is not always what its code imports, and a dependency that no manifest states, such as a sibling checkout a test reads, is not here.",
	stack_only:
		"Only the stack's own projects are listed, so a consumer outside the stack is not here.",
	tables:
		'The kind is the manifest table a dependency is declared in, not how much it matters: an app that bundles what it builds declares everything as dev.',
	commands:
		"The commands are each workflow's run steps as the file writes them, without the actions a step uses or the conditions on it, and nothing here says which command is the gate."
};

/** Whether an edge is declared for development or a build, and so in a manifest's dev tables. */
export const dep_edge_is_dev = (edge: StackDepEdge): boolean => dev_kinds.has(edge.kind);

/** The projects at the other end of a list of edges, each once, in the edges' order. */
export const dep_edge_projects = (
	edges: Array<StackDepEdge>,
	side: 'from' | 'to'
): Array<string> => [...new Set(edges.map((edge) => edge[side]))];
