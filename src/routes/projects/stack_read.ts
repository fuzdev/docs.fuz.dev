/**
 * Reads the stack repos' files for the snapshot task. Every file is read
 * from git at the main branch as the checkout last fetched it, so what a
 * session has not committed or pushed is never published as the repo's.
 *
 * Two things cannot be read from git and are read from the working tree,
 * each only when the files behind it are the main branch's: `cargo metadata`,
 * which needs the workspace on disk, and the stack page's data, which is
 * imported as a module.
 *
 * @module
 */

import { pathToFileURL } from 'node:url';
import type { FsReadDir } from '@fuzdev/gro/fs.ts';
import type { SpawnProgram } from '@fuzdev/gro/spawn.ts';
import * as s from '@fuzdev/fuz_schema/schema.ts';
import { to_error_message } from '@fuzdev/fuz_util/error.ts';

import { claude_check_lines } from './check_lines.ts';
import { CargoMetadata, PackageJson, type RepoManifests } from './stack_edges.ts';
import { StackPageModule } from './stack_facets.ts';
import type { StackCheckLine, StackWorkflow } from './stack_snapshot.ts';
import { workflow_read } from './workflow_read.ts';

/** The ref every file is read at: the main branch as the checkout last fetched it. */
export const STACK_REF = 'origin/main';

/** Every `Cargo.toml` of a repo, as a git pathspec. */
const CARGO_MANIFESTS = ':(glob)**/Cargo.toml';

const WORKFLOWS_DIR = '.github/workflows';

/** A stack repo could not be read as its main branch has it. The message says what to do. */
export class StackReadError extends Error {}

export interface StackReadDeps {
	/** The directory holding this repo and its siblings, each under its repo name. */
	repos_dir: FsReadDir;
	git: SpawnProgram;
	cargo: SpawnProgram;
}

/** One repo's files, as read at `STACK_REF`. */
export interface StackRepoFiles extends RepoManifests {
	/** The commit `STACK_REF` names in the checkout. */
	commit: string;
	exports: boolean;
	check_script: string | null;
	check_lines: Array<StackCheckLine> | null;
	workflows: Array<StackWorkflow>;
}

// a git command's output, or `null` when it exits with a code in `allow`
const git_out = async (
	deps: StackReadDeps,
	repo: string,
	args: ReadonlyArray<string>,
	allow: ReadonlyArray<number> = []
): Promise<string | null> => {
	const result = await deps.git.out(args, { cwd: deps.repos_dir.dir(repo) });
	if (result.kind === 'exited' && result.code === 0) return result.stdout;
	if (result.kind === 'exited' && result.code !== null && allow.includes(result.code)) return null;
	throw new StackReadError(`git ${args.join(' ')} failed in ${repo}: ${result.stderr.trim()}`);
};

/** The commit a repo's main branch is at, as its checkout last fetched it. */
export const stack_repo_commit = async (deps: StackReadDeps, repo: string): Promise<string> => {
	if (!(await deps.repos_dir.exists(repo))) {
		throw new StackReadError(`no checkout of ${repo} beside this repo`);
	}
	const commit = await git_out(deps, repo, ['rev-parse', '--verify', `${STACK_REF}^{commit}`]);
	return commit!.trim();
};

/**
 * Refuses a repo whose working tree does not have the files at `pathspec` as its main
 * branch has them: changed, staged, untracked, or on a branch that differs there.
 */
export const stack_repo_require_main = async (
	deps: StackReadDeps,
	repo: string,
	pathspec: string
): Promise<void> => {
	const status = await git_out(deps, repo, ['status', '--porcelain', '--', pathspec]);
	const differs =
		(await git_out(deps, repo, ['diff', '--quiet', STACK_REF, '--', pathspec], [1])) === null;
	if (status!.trim() !== '' || differs) {
		throw new StackReadError(
			`${repo}: ${pathspec} in the working tree is not what ${STACK_REF} has, ` +
				'and it is read from the working tree; commit and push it, or stash it'
		);
	}
};

/** Reads one stack repo's files at `STACK_REF`. */
export const stack_repo_read = async (
	deps: StackReadDeps,
	repo: string,
	project: string
): Promise<StackRepoFiles> => {
	const commit = await stack_repo_commit(deps, repo);
	// the paths under the ref that this reads, so a file's absence is known and not a failed read
	const listed = await git_out(deps, repo, [
		'ls-tree',
		'-r',
		'--name-only',
		commit,
		'--',
		'package.json',
		'Cargo.toml',
		'CLAUDE.md',
		WORKFLOWS_DIR
	]);
	const paths = new Set(listed!.split('\n').filter((path) => path !== ''));
	const show = async (path: string): Promise<string | null> =>
		paths.has(path) ? git_out(deps, repo, ['show', `${commit}:${path}`]) : null;

	const package_text = await show('package.json');
	const package_json =
		package_text === null ? null : s.parse_or_throw(PackageJson, JSON.parse(package_text));

	let cargo: CargoMetadata | null = null;
	if (paths.has('Cargo.toml')) {
		await stack_repo_require_main(deps, repo, CARGO_MANIFESTS);
		const result = await deps.cargo.out(
			['metadata', '--no-deps', '--offline', '--format-version', '1'],
			{ cwd: deps.repos_dir.dir(repo) }
		);
		if (result.kind !== 'exited' || result.code !== 0) {
			throw new StackReadError(`cargo metadata failed in ${repo}: ${result.stderr.trim()}`);
		}
		cargo = s.parse_or_throw(CargoMetadata, JSON.parse(result.stdout));
		// the guard above sees tracked and untracked manifests; one that git ignores, or that
		// the index is told to skip, gets past it and still reaches cargo through a glob
		const tracked = await git_out(deps, repo, ['ls-tree', '-r', '--name-only', commit]);
		const at_commit = new Set(tracked!.split('\n'));
		const root = `${deps.repos_dir.path}/${repo}/`;
		for (const crate of cargo.packages) {
			const path = crate.manifest_path;
			if (path === undefined || !path.startsWith(root) || !at_commit.has(path.slice(root.length))) {
				throw new StackReadError(
					`${repo}: cargo reads the crate ${crate.name} from ${path ?? 'an unknown manifest'}, ` +
						`which ${STACK_REF} does not have`
				);
			}
		}
	}

	const claude_md = await show('CLAUDE.md');

	const workflows: Array<StackWorkflow> = [];
	const workflow_paths = [...paths]
		.filter((path) => path.startsWith(`${WORKFLOWS_DIR}/`) && /\.ya?ml$/.test(path))
		.toSorted();
	for (const path of workflow_paths) {
		const file = path.slice(WORKFLOWS_DIR.length + 1);
		// a workflow in a directory under the workflows directory is not one GitHub runs
		if (file.includes('/')) continue;
		try {
			workflows.push({ file, ...workflow_read((await show(path))!) });
		} catch (error) {
			throw new StackReadError(`${repo}/${path}: ${to_error_message(error)}`);
		}
	}

	return {
		repo,
		project,
		commit,
		package_json,
		cargo,
		exports: package_json?.exports !== undefined,
		check_script: package_json?.scripts?.check ?? null,
		check_lines: claude_md === null ? null : claude_check_lines(claude_md),
		workflows
	};
};

/** The repo and file the Fuz stack page keeps its data in. */
export const STACK_PAGE_REPO = 'fuz.dev';
export const STACK_PAGE_DATA = 'src/routes/stack/stack.ts';

/** Reads the stack page's data module, with the commit of its repo's main branch. */
export const stack_page_read = async (
	deps: StackReadDeps
): Promise<{ commit: string; module: StackPageModule }> => {
	const commit = await stack_repo_commit(deps, STACK_PAGE_REPO);
	await stack_repo_require_main(deps, STACK_PAGE_REPO, STACK_PAGE_DATA);
	const path = `${deps.repos_dir.path}/${STACK_PAGE_REPO}/${STACK_PAGE_DATA}`;
	const module: unknown = await import(/* @vite-ignore */ pathToFileURL(path).href);
	return { commit, module: s.parse_or_throw(StackPageModule, { ...(module as object) }) };
};
