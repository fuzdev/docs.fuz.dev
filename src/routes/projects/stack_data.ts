/**
 * The committed snapshot of the stack's repos, parsed, and what the pages
 * ask of it. The snapshot task imports the schema and never this module, so a
 * committed file that no longer parses can still be rewritten.
 *
 * @module
 */

import * as s from '@fuzdev/fuz_schema/schema.ts';

import { stack_projects, type StackProject } from '#routes/stack_projects.ts';
import { dep_kinds, StackSnapshot, type StackDepEdge, type StackRepo } from './stack_snapshot.ts';
import snapshot_json from './stack_snapshot.json' with { type: 'json' };

/** The committed snapshot. A file that does not match the schema fails here, at import. */
export const stack_snapshot: StackSnapshot = s.parse_or_throw(StackSnapshot, snapshot_json);

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
