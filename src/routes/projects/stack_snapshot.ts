/**
 * The shape of what the stack's repos declare, read from their own files by
 * `stack_snapshot.task.ts` and committed as `stack_snapshot.json`: which
 * projects each depends on, what it declares from outside the stack, its
 * check script, how its `CLAUDE.md` comments its check command, and its CI
 * workflows. `stack_data.ts` holds the committed file, parsed.
 *
 * The snapshot is dated and goes stale between runs. The task's `--check`
 * says whether it has, where the repos are checked out; `gro check` reads
 * only the committed file. It records no versions, so it changes when a
 * relationship does and not on every release. Each repo's `commit` is where
 * its files were read, and is not part of what `--check` compares.
 *
 * A manifest shows what a repo declares, which is not always what it
 * imports, and only the stack's own projects are named as projects: a
 * consumer outside the stack is not in it.
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

/** How a step's action is pinned: to a commit, to a tag or branch, or a path in the repo. */
export const pin_kinds = ['commit', 'ref', 'local'] as const;

/** One step of a job: a command it runs, or an action it uses. */
export const StackStep = s.object({
	name: s.optional(s.string),
	/** The step's condition, as written. */
	if: s.optional(s.string),
	/** The command, when the step runs one. */
	run: s.optional(s.string),
	/** The action without its ref, when the step uses one. */
	uses: s.optional(s.string),
	pin: s.optional(s.one_of(pin_kinds)),
	/** The step's `continue-on-error`, as written, when it has one: a step that may fail without failing its job. */
	continue_on_error: s.optional(s.string)
});
export type StackStep = s.Infer<typeof StackStep>;

/** One job of a workflow, with its steps in file order. */
export const StackJob = s.object({
	id: s.string,
	/** The runner, as written, which may be an expression over a matrix. */
	runs_on: s.string,
	/** The job's condition, as written. */
	if: s.optional(s.string),
	steps: s.array(StackStep)
});
export type StackJob = s.Infer<typeof StackJob>;

/** One event that starts a workflow, with the filters on it. */
export const StackTrigger = s.object({
	event: s.string,
	branches: s.optional(s.array(s.string)),
	tags: s.optional(s.array(s.string)),
	paths: s.optional(s.array(s.string)),
	/** The times of a `schedule`. */
	cron: s.optional(s.array(s.string))
});
export type StackTrigger = s.Infer<typeof StackTrigger>;

/** One workflow file: what starts it, and its jobs in file order. */
export const StackWorkflow = s.object({
	file: s.string,
	on: s.array(StackTrigger),
	jobs: s.array(StackJob)
});
export type StackWorkflow = s.Infer<typeof StackWorkflow>;

/** A package or crate from outside the stack that a repo declares, at the strongest kind. */
export const StackThirdParty = s.object({
	name: s.string,
	manifest: s.one_of(['npm', 'cargo'] as const),
	kind: DepKind
});
export type StackThirdParty = s.Infer<typeof StackThirdParty>;

/** A line of a repo's `CLAUDE.md`, in a code block, that comments a check command. */
export const StackCheckLine = s.object({
	/** The line's number in the file, from one. */
	line: s.number,
	command: s.string,
	/** The comment after the command, as written. */
	comment: s.string,
	/** Whether the comment says to run the command before committing. */
	before_committing: s.boolean
});
export type StackCheckLine = s.Infer<typeof StackCheckLine>;

/** One repo's files, as far as the snapshot reads them. */
export const StackRepo = s.object({
	repo: s.string,
	project: s.string,
	/** The commit of the repo's main branch that its files were read at. */
	commit: s.string,
	/** Whether the repo has a root `package.json`. */
	npm: s.boolean,
	/** Whether the repo has a root `Cargo.toml`. */
	cargo: s.boolean,
	/** Whether the root `package.json` has an `exports` map. */
	exports: s.boolean,
	/** The `check` script of the root `package.json`, verbatim. */
	check_script: s.nullable(s.string),
	/** The check commands its root `CLAUDE.md` comments, or `null` without that file. */
	check_lines: s.nullable(s.array(StackCheckLine)),
	/** What it declares from outside the stack, outside the dev tables, sorted by name. */
	third_party: s.array(StackThirdParty),
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
	third_party:
		"What a repo's manifests declare from outside the stack, by name and without versions. The dev tables are left out, so what an app bundles from its dev table is not here. For a Cargo workspace the list is every crate's together, and it is what is declared, not what a release build links. A crate is left out as tooling only when it is named xtask or testing_*, or the release audit marks it dev-only, so what a bench, debug or test-support crate under another name uses is listed with the rest.",
	commands:
		"A workflow's jobs and steps are as the file writes them: a step's command, or the action it uses without its version. An action's inputs, a matrix's values, permissions, environment and working directories are left out, and nothing here says which command is the gate.",
	check_lines:
		"A line is quoted when it sits in a code block of the repo's CLAUDE.md, has a # comment after the command, and either is the command gro check or npm run check, or has a comment that says to run it before committing. A repo that describes its check command in a sentence or a list, or in another file, has no line here.",
	main: "Every file is read at the repo's main branch as the checkout last fetched it, so nothing uncommitted or unpushed is here."
};

/** Whether an edge is declared for development or a build, and so in a manifest's dev tables. */
export const dep_edge_is_dev = (edge: StackDepEdge): boolean => dev_kinds.has(edge.kind);

/** The projects at the other end of a list of edges, each once, in the edges' order. */
export const dep_edge_projects = (
	edges: Array<StackDepEdge>,
	side: 'from' | 'to'
): Array<string> => [...new Set(edges.map((edge) => edge[side]))];

/** A trigger in a few words: its event, and the filters or times on it. */
export const trigger_label = (trigger: StackTrigger): string => {
	const filters = [
		trigger.branches && `branches ${trigger.branches.join(', ')}`,
		trigger.tags && `tags ${trigger.tags.join(', ')}`,
		trigger.paths && `paths ${trigger.paths.join(', ')}`,
		trigger.cron && `at ${trigger.cron.join(', ')}`
	].filter((filter) => typeof filter === 'string');
	return filters.length > 0 ? `${trigger.event} (${filters.join('; ')})` : trigger.event;
};
