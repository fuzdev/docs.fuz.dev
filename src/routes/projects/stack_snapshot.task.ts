import { dirname } from 'node:path';
import { fs, type FsDir } from '@fuzdev/gro/fs.ts';
import { spawn, type SpawnProgram } from '@fuzdev/gro/spawn.ts';
import type { Task } from '@fuzdev/gro/task.ts';
import { TaskError } from '@fuzdev/gro/task_error.ts';
import { meta } from '@fuzdev/fuz_schema/meta.ts';
import * as s from '@fuzdev/fuz_schema/schema.ts';

import { STACK_OWNER, stack_projects, type StackProject } from '#routes/stack_projects.ts';
import {
	build_stack_edges,
	CargoMetadata,
	PackageJson,
	type RepoManifests
} from './stack_edges.ts';
import { StackSnapshot, type StackRepo, type StackWorkflow } from './stack_snapshot.ts';
import { workflow_run_commands } from './workflow_commands.ts';

/** @nodocs */
export const Args = s.object({
	check: s.with_default(
		meta(s.boolean, { description: 'compare the committed snapshot and write nothing' }),
		false
	)
});
export type Args = s.Infer<typeof Args>;

/** Where the snapshot is committed, in this repo. */
const SNAPSHOT_PATH = 'src/routes/projects/stack_snapshot.json';

interface RepoFiles extends RepoManifests {
	check_script: string | null;
	workflows: Array<StackWorkflow>;
}

const read_repo = async (
	repos_dir: FsDir,
	repo: string,
	project: string,
	cargo: SpawnProgram
): Promise<RepoFiles> => {
	if (!(await repos_dir.exists(repo))) {
		throw new TaskError(`no checkout of ${repo} beside this repo`);
	}
	const dir = repos_dir.dir(repo);

	const package_text = await dir.read_text_if_exists('package.json');
	const package_json =
		package_text === null ? null : s.parse_or_throw(PackageJson, JSON.parse(package_text));

	let cargo_metadata: CargoMetadata | null = null;
	if (await dir.exists('Cargo.toml')) {
		const result = await cargo.out(
			['metadata', '--no-deps', '--offline', '--format-version', '1'],
			{
				cwd: dir
			}
		);
		if (result.kind !== 'exited' || result.code !== 0) {
			throw new TaskError(`cargo metadata failed in ${repo}: ${result.stderr.trim()}`);
		}
		cargo_metadata = s.parse_or_throw(CargoMetadata, JSON.parse(result.stdout));
	}

	const workflows: Array<StackWorkflow> = [];
	if (await dir.exists('.github/workflows')) {
		for await (const entry of dir.list('.github/workflows')) {
			if (entry.kind !== 'file' || !/\.ya?ml$/.test(entry.name)) continue;
			const yaml = await dir.read_text(`.github/workflows/${entry.name}`);
			try {
				workflows.push({ file: entry.name, runs: workflow_run_commands(yaml) });
			} catch (error) {
				throw new TaskError(`${repo}/.github/workflows/${entry.name}: ${error.message}`);
			}
		}
	}
	return {
		repo,
		project,
		package_json,
		cargo: cargo_metadata,
		check_script: package_json?.scripts?.check ?? null,
		workflows
	};
};

/**
 * Run as `gro task src/routes/projects/stack_snapshot.task.ts`, with every stack repo
 * checked out beside this one and `cargo` installed. Writes the snapshot the project
 * pages read; with `--check`, writes nothing and fails when the repos have moved on.
 *
 * It reads each checkout's working tree, so run it with the siblings clean and on
 * their main branch.
 *
 * @nodocs
 */
export const task: Task<Args> = {
	summary: "read the stack repos' manifests and workflows into the committed snapshot",
	Args,
	run: async ({ task_args, log }) => {
		const repos_dir = await fs.open_dir(dirname(fs.project.path));
		const cargo = spawn.program('cargo', { pass_env: ['RUSTUP_*', 'CARGO_HOME'] });
		// as the wider type, where every project may carry `packages`
		const projects: ReadonlyArray<StackProject> = stack_projects;

		const files: Array<RepoFiles> = [];
		for (const project of projects) {
			for (const repo of project.repos) {
				files.push(await read_repo(repos_dir, repo, project.name, cargo));
			}
		}
		const { edges, problems } = build_stack_edges(files, projects, repos_dir.path, STACK_OWNER);
		if (problems.length > 0) {
			throw new TaskError(`the snapshot would drop what it cannot place:\n${problems.join('\n')}`);
		}
		const repos: Array<StackRepo> = files.map((f) => ({
			repo: f.repo,
			project: f.project,
			npm: f.package_json !== null,
			cargo: f.cargo !== null,
			check_script: f.check_script,
			workflows: f.workflows
		}));

		// a committed file that no longer parses is one to rewrite
		const committed_text = await fs.project.read_text_if_exists(SNAPSHOT_PATH);
		const parsed =
			committed_text === null ? null : s.parse(StackSnapshot, JSON.parse(committed_text));
		const committed = parsed?.ok ? parsed.value : null;
		const unchanged =
			committed !== null &&
			JSON.stringify({ repos: committed.repos, edges: committed.edges }) ===
				JSON.stringify({ repos, edges });

		if (task_args.check) {
			if (!unchanged) {
				throw new TaskError(
					`${SNAPSHOT_PATH} no longer matches the repos; run the task to rewrite it`
				);
			}
			log.info(`${SNAPSHOT_PATH} matches the repos (read ${committed.checked})`);
			return;
		}
		const snapshot: StackSnapshot = {
			checked: new Date().toISOString().slice(0, 10),
			repos,
			edges
		};
		await fs.project.write(SNAPSHOT_PATH, JSON.stringify(snapshot, null, '\t') + '\n');
		log.info(
			`${unchanged ? 'unchanged' : 'rewrote'} ${SNAPSHOT_PATH}: ` +
				`${repos.length} repos, ${edges.length} edges`
		);
	}
};
