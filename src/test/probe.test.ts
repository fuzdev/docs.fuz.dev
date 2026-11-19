import { describe, test, assert } from 'vitest';

import { coherence_probes } from '#routes/coherence/coherence.ts';
import {
	probe_check_file,
	probe_check_snapshot,
	probe_is_snapshot,
	probe_label
} from '#routes/probe.ts';
import { stack_snapshot } from '#routes/projects/stack_data.ts';
import type { StackRepo, StackSnapshot } from '#routes/projects/stack_snapshot.ts';
import { stack_repos } from '#routes/stack_projects.ts';

const repo = (name: string, rest: Partial<StackRepo> = {}): StackRepo => ({
	repo: name,
	project: name,
	commit: '0'.repeat(40),
	npm: true,
	cargo: false,
	exports: false,
	check_script: null,
	check_lines: null,
	third_party: [],
	workflows: [],
	...rest
});

const snapshot: StackSnapshot = {
	checked: '2026-01-01',
	edges: [],
	repos: [
		repo('alpha', {
			check_script: 'gro check && npm run audit',
			workflows: [
				{
					file: 'check.yml',
					on: [{ event: 'push' }],
					jobs: [
						{
							id: 'build',
							runs_on: 'x',
							steps: [{ uses: 'npm/run-audit', pin: 'commit' }, { run: 'npm ci\nnpm run check' }]
						}
					]
				},
				{
					file: 'release.yml',
					on: [{ event: 'push' }],
					jobs: [{ id: 'publish', runs_on: 'x', steps: [{ run: 'npm publish' }] }]
				}
			]
		}),
		repo('beta')
	]
};

describe('probe_check_snapshot', () => {
	test('a check script has or lacks a string', () => {
		assert.isNull(
			probe_check_snapshot({ kind: 'check_script', repo: 'alpha', has: 'gro check' }, snapshot)
		);
		assert.isNull(
			probe_check_snapshot({ kind: 'check_script', repo: 'alpha', lacks: 'deploy' }, snapshot)
		);
		assert.isString(
			probe_check_snapshot({ kind: 'check_script', repo: 'alpha', has: 'deploy' }, snapshot)
		);
		assert.isString(
			probe_check_snapshot(
				{ kind: 'check_script', repo: 'alpha', lacks: 'npm run audit' },
				snapshot
			)
		);
	});

	test("a workflow's commands are searched, in every file or in the one named, and never its actions", () => {
		assert.isNull(
			probe_check_snapshot({ kind: 'workflow', repo: 'alpha', has: 'npm publish' }, snapshot)
		);
		assert.isString(
			probe_check_snapshot(
				{ kind: 'workflow', repo: 'alpha', file: 'check.yml', has: 'npm publish' },
				snapshot
			)
		);
		assert.isNull(
			probe_check_snapshot(
				{ kind: 'workflow', repo: 'alpha', file: 'check.yml', lacks: 'npm publish' },
				snapshot
			)
		);
		assert.isString(
			probe_check_snapshot({ kind: 'workflow', repo: 'alpha', has: 'run-audit' }, snapshot)
		);
	});

	test('a step that may fail without failing its job holds nothing', () => {
		const loose: StackSnapshot = {
			...snapshot,
			repos: [
				repo('alpha', {
					workflows: [
						{
							file: 'check.yml',
							on: [{ event: 'push' }],
							jobs: [
								{
									id: 'build',
									runs_on: 'x',
									steps: [{ run: 'npm ci' }, { run: 'npm run audit', continue_on_error: 'true' }]
								}
							]
						}
					]
				})
			]
		};
		assert.isString(
			probe_check_snapshot({ kind: 'workflow', repo: 'alpha', has: 'npm run audit' }, loose)
		);
	});

	test('a probe of something the repo does not have fails, a `lacks` included', () => {
		assert.isString(
			probe_check_snapshot({ kind: 'check_script', repo: 'beta', lacks: 'x' }, snapshot)
		);
		assert.isString(probe_check_snapshot({ kind: 'workflow', repo: 'beta', lacks: 'x' }, snapshot));
		assert.isString(
			probe_check_snapshot(
				{ kind: 'workflow', repo: 'alpha', file: 'none.yml', lacks: 'x' },
				snapshot
			)
		);
		assert.isString(
			probe_check_snapshot({ kind: 'check_script', repo: 'gamma', has: 'x' }, snapshot)
		);
	});
});

describe('probe_check_file', () => {
	const repos_dir = {
		read_text_if_exists: (path: string) =>
			Promise.resolve(path === 'alpha/package.json' ? '{"scripts":{"mutate":"x"}}' : null)
	};

	test('a file exists, and has a string when one is asked for', async () => {
		assert.isNull(
			await probe_check_file({ kind: 'file', repo: 'alpha', path: 'package.json' }, repos_dir)
		);
		assert.isNull(
			await probe_check_file(
				{ kind: 'file', repo: 'alpha', path: 'package.json', has: '"mutate"' },
				repos_dir
			)
		);
		assert.isString(
			await probe_check_file(
				{ kind: 'file', repo: 'alpha', path: 'package.json', has: 'nope' },
				repos_dir
			)
		);
		assert.isString(
			await probe_check_file({ kind: 'file', repo: 'alpha', path: 'gone.ts' }, repos_dir)
		);
	});
});

// the siblings are not in CI, so this holds the probes to the committed snapshot, and
// the snapshot task's `--check` holds that to the repos
describe('the probes of the coherence data', () => {
	const entries = coherence_probes();

	test('every probe names a stack repo and a string worth searching for', () => {
		assert.ok(entries.length > 0);
		for (const { record, probe } of entries) {
			assert.ok(stack_repos.has(probe.repo), `${record}: ${probe.repo}`);
			const text = probe.kind === 'file' ? (probe.has ?? probe.path) : (probe.has ?? probe.lacks);
			assert.ok(text.trim().length >= 3, `${record}: ${probe_label(probe)}`);
			// a probe holds a relationship, so it has no version in it to go stale
			assert.notMatch(text, /\d+\.\d+\.\d+/, `${record}: ${probe_label(probe)}`);
		}
	});

	test('every probe of a check script or a workflow holds against the snapshot', () => {
		const failed = entries.flatMap(({ record, probe }) => {
			if (!probe_is_snapshot(probe)) return [];
			const why = probe_check_snapshot(probe, stack_snapshot);
			return why === null ? [] : [`${record}: ${probe_label(probe)}: ${why}`];
		});
		assert.deepEqual(failed, []);
	});
});
