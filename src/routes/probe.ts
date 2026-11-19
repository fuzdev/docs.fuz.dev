/**
 * A probe is the part of a claim a machine can hold: a string that a named
 * file, check script or CI step of a stack repo must have, or must not have.
 * A row of a data page carries the probes that would fail if the row stopped
 * being true in the way a file can show.
 *
 * Two things check them. A probe of a check script or a workflow is checked
 * against the committed snapshot of the stack's repos by this repo's tests,
 * so it is held on every change here, and the snapshot is held to the repos
 * by its task. A probe of a file is checked by the evidence task, where the
 * repos are checked out.
 *
 * A probe that passes says the file, script or step still has the text the
 * row depends on, not that what it does is sound. It reads only the text it
 * names: a `lacks` does not see the same thing reached through another
 * script, or switched on by an environment variable the snapshot leaves out.
 *
 * @module
 */

import type { FsReadDir } from '@fuzdev/gro/fs.ts';

import type { StackRepo, StackSnapshot } from '#routes/projects/stack_snapshot.ts';
import { workflow_commands } from '#routes/projects/workflow_read.ts';

/** What a probe looks for: a string that must be there, or one that must not. */
type ProbeMatch = { has: string; lacks?: undefined } | { lacks: string; has?: undefined };

/** The repo's root `package.json` has a `check` script that holds the match. */
export type CheckScriptProbe = { kind: 'check_script'; repo: string } & ProbeMatch;

/**
 * Some command a workflow of the repo runs has the string, or none does. With `file`,
 * only that workflow's commands are read.
 */
export type WorkflowProbe = { kind: 'workflow'; repo: string; file?: string } & ProbeMatch;

/** The file exists in the repo, and contains `has` when one is given. */
export interface FileProbe {
	kind: 'file';
	repo: string;
	path: string;
	has?: string;
}

/** A probe the committed snapshot can answer. */
export type SnapshotProbe = CheckScriptProbe | WorkflowProbe;

export type Probe = SnapshotProbe | FileProbe;

export const probe_is_snapshot = (probe: Probe): probe is SnapshotProbe => probe.kind !== 'file';

/** A probe in a few words, for a failure message. */
export const probe_label = (probe: Probe): string => {
	if (probe.kind === 'file') {
		return `${probe.repo}/${probe.path}${probe.has === undefined ? ' exists' : ` has ${probe.has}`}`;
	}
	const where =
		probe.kind === 'check_script'
			? `${probe.repo}'s check script`
			: `${probe.repo}'s ${probe.file ?? 'workflows'}`;
	return probe.has === undefined ? `${where} lacks ${probe.lacks}` : `${where} has ${probe.has}`;
};

// the texts a snapshot probe searches, or `null` when the repo has nothing of that kind
const probe_texts = (probe: SnapshotProbe, repo: StackRepo): Array<string> | null => {
	if (probe.kind === 'check_script') {
		return repo.check_script === null ? null : [repo.check_script];
	}
	const workflows =
		probe.file === undefined ? repo.workflows : repo.workflows.filter((w) => w.file === probe.file);
	return workflows.length === 0 ? null : workflows.flatMap(workflow_commands);
};

/**
 * Checks a probe against the snapshot.
 *
 * @returns `null` when it holds, and otherwise why it does not
 */
export const probe_check_snapshot = (
	probe: SnapshotProbe,
	snapshot: StackSnapshot
): string | null => {
	const repo = snapshot.repos.find((r) => r.repo === probe.repo);
	if (!repo) return `the snapshot has no repo ${probe.repo}`;
	const texts = probe_texts(probe, repo);
	// a probe names something to read, so a repo without it fails a `lacks` too
	if (texts === null) {
		return probe.kind === 'check_script'
			? `${probe.repo} has no check script`
			: `${probe.repo} has no ${probe.file ?? 'workflow'}`;
	}
	if (probe.has !== undefined) {
		return texts.some((text) => text.includes(probe.has)) ? null : `nothing has ${probe.has}`;
	}
	return texts.some((text) => text.includes(probe.lacks)) ? `found ${probe.lacks}` : null;
};

/**
 * Checks a file probe against the checkouts.
 *
 * @param repos_dir - the directory holding the stack's repos, each under its name
 * @returns `null` when it holds, and otherwise why it does not
 */
export const probe_check_file = async (
	probe: FileProbe,
	repos_dir: Pick<FsReadDir, 'read_text_if_exists'>
): Promise<string | null> => {
	const text = await repos_dir.read_text_if_exists(`${probe.repo}/${probe.path}`);
	if (text === null) return 'no such file';
	if (probe.has !== undefined && !text.includes(probe.has)) return `it does not have ${probe.has}`;
	return null;
};
