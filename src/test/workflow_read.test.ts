import { describe, test, assert } from 'vitest';

import { workflow_commands, workflow_read } from '#routes/projects/workflow_read.ts';

const WORKFLOW = `name: check

on:
  push:
    branches: [main]
    tags: ['v*']
  pull_request:
    branches: ['**']
  schedule:
    - cron: '17 6 * * 1'
  workflow_dispatch:
    inputs:
      dry_run:
        type: boolean

permissions:
  contents: read

jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: ['24.14']
    steps:
      - uses: actions/checkout@df4cb1c069e1874edd31b4311f1884172cec0e10 # v6.0.3
        with:
          persist-credentials: false
      - name: Use Node.js
        uses: actions/setup-node@v6
      - uses: ./.github/actions/setup
      - run: npm ci
      - name: Check
        if: matrix.build == 'native'
        run: |
          npx @fuzdev/gro check --workspace --build
          echo done
  rust:
    runs-on: [self-hosted, linux]
    if: github.event_name != 'schedule'
    steps:
      - run: cargo test --locked
`;

describe('workflow_read', () => {
	const workflow = workflow_read(WORKFLOW);

	test('reads each trigger with its filters, and leaves out what a manual run asks for', () => {
		assert.deepEqual(workflow.on, [
			{ event: 'push', branches: ['main'], tags: ['v*'] },
			{ event: 'pull_request', branches: ['**'] },
			{ event: 'schedule', cron: ['17 6 * * 1'] },
			{ event: 'workflow_dispatch' }
		]);
	});

	test('reads the short forms of `on`', () => {
		const jobs = 'jobs:\n  a:\n    runs-on: x\n    steps:\n      - run: y\n';
		assert.deepEqual(workflow_read(`on: push\n${jobs}`).on, [{ event: 'push' }]);
		assert.deepEqual(workflow_read(`on: [push, pull_request]\n${jobs}`).on, [
			{ event: 'push' },
			{ event: 'pull_request' }
		]);
	});

	test('reads each job with its steps in file order', () => {
		assert.deepEqual(workflow.jobs, [
			{
				id: 'build',
				runs_on: 'ubuntu-latest',
				steps: [
					{ uses: 'actions/checkout', pin: 'commit' },
					{ name: 'Use Node.js', uses: 'actions/setup-node', pin: 'ref' },
					{ uses: './.github/actions/setup', pin: 'local' },
					{ run: 'npm ci' },
					{
						name: 'Check',
						if: "matrix.build == 'native'",
						run: 'npx @fuzdev/gro check --workspace --build\necho done'
					}
				]
			},
			{
				id: 'rust',
				runs_on: 'self-hosted, linux',
				if: "github.event_name != 'schedule'",
				steps: [{ run: 'cargo test --locked' }]
			}
		]);
	});

	test('workflow_commands is every command, across the jobs', () => {
		assert.deepEqual(workflow_commands(workflow), [
			'npm ci',
			'npx @fuzdev/gro check --workspace --build\necho done',
			'cargo test --locked'
		]);
	});

	test('a step that may fail without failing its job is kept, and is not a command the job is held to', () => {
		const read = workflow_read(
			'on: push\njobs:\n  a:\n    runs-on: x\n    steps:\n' +
				'      - run: flaky\n        continue-on-error: true\n' +
				'      - run: maybe\n        continue-on-error: ${{ matrix.experimental }}\n' +
				'      - run: held\n        continue-on-error: false\n'
		);
		assert.deepEqual(
			read.jobs[0]!.steps.map((step) => step.continue_on_error),
			['true', '${{ matrix.experimental }}', 'false']
		);
		assert.deepEqual(workflow_commands(read), ['held']);
	});

	test('throws on what it cannot read whole, so a workflow is never half read', () => {
		const job = (body: string): string => `on: push\njobs:\n  a:\n${body}`;
		// no jobs, no triggers
		assert.throws(() => workflow_read('on: push\n'));
		assert.throws(() => workflow_read('jobs:\n  a:\n    runs-on: x\n    steps:\n      - run: y\n'));
		// a job that calls another workflow
		assert.throws(() => workflow_read(job('    uses: ./.github/workflows/other.yml\n')));
		// a step that is both, or neither
		assert.throws(() =>
			workflow_read(job('    runs-on: x\n    steps:\n      - run: y\n        uses: a/b@v1\n'))
		);
		assert.throws(() => workflow_read(job('    runs-on: x\n    steps:\n      - name: Nothing\n')));
		// an action with no ref
		assert.throws(() => workflow_read(job('    runs-on: x\n    steps:\n      - uses: a/b\n')));
		// a filter this does not know
		assert.throws(() =>
			workflow_read(
				'on:\n  push:\n    branches-ignore: [x]\njobs:\n  a:\n    runs-on: x\n    steps:\n      - run: y\n'
			)
		);
	});
});
