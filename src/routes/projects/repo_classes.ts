/**
 * Classes of stack repos that a data page speaks of as a class ("the repos
 * whose check script runs gro's check"), each computed from the snapshot. A
 * row that names a class shows its members from here, so the list is never
 * written by hand and never goes stale apart from the snapshot.
 *
 * A class says what a repo's files declare and nothing more: a repo that
 * reaches the same check another way, such as through a script its check
 * script calls, is not a member.
 *
 * @module
 */

import type { StackRepo, StackWorkflow } from './stack_snapshot.ts';
import { workflow_commands } from './workflow_read.ts';

export type RepoClassId =
	| 'check_gro'
	| 'ci_gro_workspace'
	| 'ci_gro_exports'
	| 'ci_gro_build'
	| 'ci_gro_lint'
	| 'cargo'
	| 'no_ci';

export interface RepoClass {
	/** The class as a phrase that follows "the repos". */
	label: string;
	has: (repo: StackRepo) => boolean;
}

const GRO_CHECK = /\bgro check\b/;

/** Whether a workflow runs on a change: a push or a pull request, and not only by hand or on a schedule. */
const runs_on_change = (workflow: StackWorkflow): boolean =>
	workflow.on.some((trigger) => trigger.event === 'push' || trigger.event === 'pull_request');

// the lines that run gro's check, among the commands a repo's CI holds a change to,
// leaving out a line that is only a shell comment
const ci_gro_checks = (repo: StackRepo): Array<string> =>
	repo.workflows
		.filter(runs_on_change)
		.flatMap(workflow_commands)
		.flatMap((command) => command.split('\n'))
		.filter((line) => !line.trimStart().startsWith('#') && GRO_CHECK.test(line));

const has_flag = (line: string, flag: string): boolean => line.split(/\s+/).includes(flag);

const ci_gro_with = (repo: StackRepo, flag: string): boolean =>
	ci_gro_checks(repo).some((line) => has_flag(line, flag));

export const repo_classes: Record<RepoClassId, RepoClass> = {
	check_gro: {
		label: 'whose check script runs gro check',
		has: (repo) => repo.check_script !== null && GRO_CHECK.test(repo.check_script)
	},
	ci_gro_workspace: {
		label: 'with a CI step, on a push or a pull request, that runs gro check with --workspace',
		has: (repo) => ci_gro_with(repo, '--workspace')
	},
	ci_gro_exports: {
		label:
			'with an exports map in package.json, and a CI step, on a push or a pull request, that runs gro check with --workspace',
		has: (repo) => repo.exports && ci_gro_with(repo, '--workspace')
	},
	ci_gro_build: {
		label: 'with a CI step, on a push or a pull request, that runs gro check with --build',
		has: (repo) => ci_gro_with(repo, '--build')
	},
	ci_gro_lint: {
		label: 'with a CI step, on a push or a pull request, that runs gro check with --lint',
		has: (repo) => ci_gro_with(repo, '--lint')
	},
	cargo: {
		label: 'with a Cargo workspace at the root',
		has: (repo) => repo.cargo
	},
	no_ci: {
		label: 'with no CI workflow',
		has: (repo) => repo.workflows.length === 0
	}
};

export const repo_class_ids = Object.keys(repo_classes) as Array<RepoClassId>;
