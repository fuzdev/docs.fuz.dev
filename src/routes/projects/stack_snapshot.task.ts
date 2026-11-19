import { dirname } from 'node:path';
import { fs } from '@fuzdev/gro/fs.ts';
import { spawn } from '@fuzdev/gro/spawn.ts';
import type { Task } from '@fuzdev/gro/task.ts';
import { TaskError } from '@fuzdev/gro/task_error.ts';
import { meta } from '@fuzdev/fuz_schema/meta.ts';
import * as s from '@fuzdev/fuz_schema/schema.ts';

import { STACK_OWNER, stack_projects, type StackProject } from '#routes/stack_projects.ts';
import { build_stack_edges } from './stack_edges.ts';
import { build_stack_facets, StackFacets } from './stack_facets.ts';
import {
	stack_page_read,
	stack_repo_read,
	StackReadError,
	type StackReadDeps,
	type StackRepoFiles
} from './stack_read.ts';
import { StackSnapshot, type StackRepo } from './stack_snapshot.ts';

/** @nodocs */
export const Args = s.object({
	check: s.with_default(
		meta(s.boolean, { description: 'compare the committed files and write nothing' }),
		false
	)
});
export type Args = s.Infer<typeof Args>;

/** Where the snapshot of the stack repos' own files is committed, in this repo. */
const SNAPSHOT_PATH = 'src/routes/projects/stack_snapshot.json';

/** Where what the stack page says of each project is committed, in this repo. */
const FACETS_PATH = 'src/routes/projects/stack_facets.json';

// what a committed file holds, or `null` for one that is missing or no longer parses,
// which is then a file to rewrite
const read_committed = async <T>(path: string, schema: s.Schema<T>): Promise<T | null> => {
	const text = await fs.project.read_text_if_exists(path);
	if (text === null) return null;
	const parsed = s.parse(schema, JSON.parse(text));
	return parsed.ok ? parsed.value : null;
};

// a snapshot without the day it was read and the commits it was read at, which say
// when it was read and not what was found
const snapshot_content = (snapshot: Pick<StackSnapshot, 'repos' | 'edges'>): string =>
	JSON.stringify({
		repos: snapshot.repos.map(({ commit: _, ...repo }) => repo),
		edges: snapshot.edges
	});
const facets_content = ({ checked: _, commit: __, ...facets }: StackFacets): string =>
	JSON.stringify(facets);

/**
 * Run as `gro task src/routes/projects/stack_snapshot.task.ts`, with every stack repo
 * and the stack page's repo checked out beside this one, and `cargo` installed. Writes
 * the two files the project pages read; with `--check`, writes nothing and fails when
 * the repos have moved on.
 *
 * It reads each repo at the main branch its checkout last fetched, so a sibling may be
 * mid-work. It refuses only where it must read the working tree: a repo whose
 * `Cargo.toml` files, or a stack page whose data, are not what the main branch has.
 *
 * @nodocs
 */
export const task: Task<Args> = {
	summary: "read the stack repos' own files, and the stack page's data, into the committed files",
	Args,
	run: async ({ task_args, log }) => {
		const deps: StackReadDeps = {
			repos_dir: await fs.open_dir(dirname(fs.project.path)),
			git: spawn.program('git'),
			cargo: spawn.program('cargo', { pass_env: ['RUSTUP_*', 'CARGO_HOME'] })
		};
		// as the wider type, where every project may carry `packages`
		const projects: ReadonlyArray<StackProject> = stack_projects;
		const today = new Date().toISOString().slice(0, 10);

		let snapshot: StackSnapshot;
		let facets: StackFacets;
		try {
			const files: Array<StackRepoFiles> = [];
			for (const project of projects) {
				for (const repo of project.repos) {
					files.push(await stack_repo_read(deps, repo, project.name));
				}
			}
			const { edges, third_party, problems } = build_stack_edges(
				files,
				projects,
				deps.repos_dir.path,
				STACK_OWNER
			);
			if (problems.length > 0) {
				throw new TaskError(
					`the snapshot would drop what it cannot place:\n${problems.join('\n')}`
				);
			}
			const repos: Array<StackRepo> = files.map((f) => ({
				repo: f.repo,
				project: f.project,
				commit: f.commit,
				npm: f.package_json !== null,
				cargo: f.cargo !== null,
				exports: f.exports,
				check_script: f.check_script,
				check_lines: f.check_lines,
				third_party: third_party.get(f.repo) ?? [],
				workflows: f.workflows
			}));
			snapshot = { checked: today, repos, edges };

			const page = await stack_page_read(deps);
			const built = build_stack_facets(
				page.module,
				projects.map((p) => p.name)
			);
			if (built.problems.length > 0) {
				throw new TaskError(`the stack page does not line up:\n${built.problems.join('\n')}`);
			}
			facets = { checked: today, commit: page.commit, ...built.facets };
		} catch (error) {
			if (error instanceof StackReadError) throw new TaskError(error.message);
			throw error;
		}

		const committed_snapshot = await read_committed(SNAPSHOT_PATH, StackSnapshot);
		const committed_facets = await read_committed(FACETS_PATH, StackFacets);
		const outputs = [
			{
				path: SNAPSHOT_PATH,
				value: snapshot,
				read: committed_snapshot?.checked,
				unchanged:
					committed_snapshot !== null &&
					snapshot_content(committed_snapshot) === snapshot_content(snapshot)
			},
			{
				path: FACETS_PATH,
				value: facets,
				read: committed_facets?.checked,
				unchanged:
					committed_facets !== null && facets_content(committed_facets) === facets_content(facets)
			}
		];

		if (task_args.check) {
			const moved = outputs.filter((output) => !output.unchanged);
			if (moved.length > 0) {
				throw new TaskError(
					`${moved.map((output) => output.path).join(' and ')} no longer ` +
						`${moved.length === 1 ? 'matches' : 'match'} the repos; run the task to rewrite`
				);
			}
			for (const output of outputs) {
				log.info(`${output.path} matches the repos (read ${output.read})`);
			}
			return;
		}
		for (const output of outputs) {
			await fs.project.write(output.path, JSON.stringify(output.value, null, '\t') + '\n');
			log.info(`${output.unchanged ? 'unchanged' : 'rewrote'} ${output.path}`);
		}
		log.info(`${snapshot.repos.length} repos, ${snapshot.edges.length} edges`);
	}
};
