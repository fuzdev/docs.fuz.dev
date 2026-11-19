import { describe, test, assert } from 'vitest';

import {
	build_stack_edges,
	crate_is_dev_only,
	type RepoManifests
} from '#routes/projects/stack_edges.ts';
import { workflow_run_commands } from '#routes/projects/workflow_commands.ts';
import type { StackProject } from '#routes/stack_projects.ts';

const projects: Array<StackProject> = [
	{ name: 'alpha', repos: ['alpha', 'alpha.site'] },
	{ name: 'beta', repos: ['beta'], packages: ['@stack/beta-wasm'] },
	{ name: 'gamma', repos: ['gamma'] }
];

const repo = (name: string, project: string, rest: Partial<RepoManifests> = {}): RepoManifests => ({
	repo: name,
	project,
	package_json: null,
	cargo: null,
	...rest
});

const crate = (
	name: string,
	dependencies: Array<{ name: string; kind?: string; path?: string; source?: string }>,
	rest: { publish?: Array<string> | null; metadata?: unknown } = {}
) => ({
	name,
	publish: rest.publish === undefined ? [] : rest.publish,
	metadata: rest.metadata,
	dependencies: dependencies.map((d) => ({
		name: d.name,
		kind: d.kind ?? null,
		path: d.path,
		source: d.source ?? null
	}))
});

const build = (manifests: Array<RepoManifests>) =>
	build_stack_edges(manifests, projects, '/repos', 'stack');

describe('build_stack_edges, npm', () => {
	test('keeps the strongest kind a repo declares, and only what is declared at that kind', () => {
		const { edges, problems } = build([
			repo('alpha', 'alpha', {
				package_json: {
					name: '@stack/alpha',
					peerDependencies: { '@stack/beta': '^1' },
					devDependencies: { '@stack/beta': '^1', '@stack/beta-wasm': '^1' }
				}
			}),
			repo('beta', 'beta', { package_json: { name: '@stack/beta' } })
		]);
		assert.deepEqual(problems, []);
		assert.deepEqual(edges, [
			{
				from: 'alpha',
				from_repo: 'alpha',
				to: 'beta',
				manifest: 'npm',
				source: undefined,
				kind: 'peer',
				via: ['@stack/beta']
			}
		]);
	});

	test('reads an optional peer from the meta table', () => {
		const { edges } = build([
			repo('alpha', 'alpha', {
				package_json: {
					name: '@stack/alpha',
					peerDependencies: { '@stack/beta': '^1' },
					peerDependenciesMeta: { '@stack/beta': { optional: true } }
				}
			}),
			repo('beta', 'beta', { package_json: { name: '@stack/beta' } })
		]);
		assert.strictEqual(edges[0]?.kind, 'peer_optional');
	});

	test("skips a repo's dependency on its own project, and names the repo that declares an edge", () => {
		const { edges } = build([
			repo('alpha', 'alpha', { package_json: { name: '@stack/alpha' } }),
			repo('alpha.site', 'alpha', {
				package_json: {
					name: 'site',
					private: true,
					devDependencies: { '@stack/alpha': '^1', '@stack/beta': '^1' }
				}
			}),
			repo('beta', 'beta', { package_json: { name: '@stack/beta' } })
		]);
		assert.deepEqual(
			edges.map((e) => [e.from, e.from_repo, e.to]),
			[['alpha', 'alpha.site', 'beta']]
		);
	});

	test('reports a name under the scope that maps to no project, and ignores other names', () => {
		const { edges, problems } = build([
			repo('alpha', 'alpha', {
				package_json: {
					name: '@stack/alpha',
					dependencies: { '@stack/unknown': '^1', '@other/thing': '^1', gamma: '^1' }
				}
			}),
			// a private root package is installed by nobody, so `gamma` on npm is someone else's
			repo('gamma', 'gamma', { package_json: { name: 'gamma', private: true } })
		]);
		assert.deepEqual(edges, []);
		assert.strictEqual(problems.length, 1);
		assert.match(problems[0]!, /@stack\/unknown/);
	});
});

describe('build_stack_edges, cargo', () => {
	const beta = repo('beta', 'beta', {
		cargo: { packages: [crate('beta_core', [], { publish: null }), crate('beta_private', [])] }
	});

	test('reads a path into a sibling checkout as that project, and skips one inside the repo', () => {
		const { edges, problems } = build([
			repo('alpha', 'alpha', {
				cargo: {
					packages: [
						crate('alpha_server', [
							{ name: 'beta_private', path: '/repos/beta/crates/beta_private' },
							{ name: 'alpha_core', path: '/repos/alpha/crates/alpha_core' }
						]),
						crate('alpha_core', [])
					]
				}
			}),
			beta
		]);
		assert.deepEqual(problems, []);
		assert.deepEqual(
			edges.map((e) => [e.from_repo, e.to, e.kind, e.source, e.via]),
			[['alpha', 'beta', 'runtime', 'path', ['beta_private']]]
		);
	});

	test('counts a registry crate only when the stack may publish one by that name', () => {
		const { edges } = build([
			repo('alpha', 'alpha', {
				cargo: {
					packages: [
						crate('alpha_server', [
							{
								name: 'beta_core',
								source: 'registry+https://github.com/rust-lang/crates.io-index'
							},
							{
								name: 'beta_private',
								source: 'registry+https://github.com/rust-lang/crates.io-index'
							},
							{ name: 'serde', source: 'registry+https://github.com/rust-lang/crates.io-index' }
						])
					]
				}
			}),
			beta
		]);
		assert.deepEqual(
			edges.map((e) => [e.to, e.source, e.via]),
			[['beta', 'registry', ['beta_core']]]
		);
	});

	test('reports a path off the stack, and a git source that names a stack crate', () => {
		const { edges, problems } = build([
			repo('alpha', 'alpha', {
				cargo: {
					packages: [
						crate('alpha_server', [
							{ name: 'elsewhere', path: '/repos/elsewhere/crates/elsewhere' },
							{ name: 'beta_core', source: 'git+https://example.com/beta' }
						])
					]
				}
			}),
			beta
		]);
		assert.deepEqual(edges, []);
		assert.strictEqual(problems.length, 2);
	});

	test('makes whatever a test or tooling crate depends on a dev dependency', () => {
		const dep = { name: 'beta_private', path: '/repos/beta/crates/beta_private' };
		const kinds = (crates: Array<ReturnType<typeof crate>>) =>
			build([repo('alpha', 'alpha', { cargo: { packages: crates } }), beta]).edges.map(
				(e) => e.kind
			);
		assert.deepEqual(kinds([crate('xtask', [dep])]), ['dev']);
		assert.deepEqual(kinds([crate('testing_alpha_server', [dep])]), ['dev']);
		assert.deepEqual(
			kinds([crate('tool', [dep], { metadata: { fuz_audit: { dev_only: true } } })]),
			['dev']
		);
		assert.deepEqual(kinds([crate('alpha_server', [{ ...dep, kind: 'build' }])]), ['build']);
		// and a shipped crate beside a tooling one still wins
		assert.deepEqual(kinds([crate('xtask', [dep]), crate('alpha_server', [dep])]), ['runtime']);
	});
});

describe('crate_is_dev_only', () => {
	test('reads the name and the audit metadata, and nothing else', () => {
		assert.ok(crate_is_dev_only({ name: 'xtask' }));
		assert.ok(crate_is_dev_only({ name: 'testing_spine_stub' }));
		assert.ok(crate_is_dev_only({ name: 'bench', metadata: { fuz_audit: { dev_only: true } } }));
		assert.ok(!crate_is_dev_only({ name: 'server', metadata: { fuz_audit: { dev_only: false } } }));
		assert.ok(!crate_is_dev_only({ name: 'server', metadata: null }));
		assert.ok(!crate_is_dev_only({ name: 'my_testing_helpers' }));
	});
});

describe('workflow_run_commands', () => {
	test('reads a plain command, with or without a list dash', () => {
		const yaml = `jobs:
  build:
    steps:
      - run: npm ci
      - name: Check
        run: npx @fuzdev/gro check --workspace --build
`;
		assert.deepEqual(workflow_run_commands(yaml), [
			'npm ci',
			'npx @fuzdev/gro check --workspace --build'
		]);
	});

	test('reads a literal block with its own indentation kept, and a folded block as one line', () => {
		const yaml = `    steps:
      - name: Two
        run: |
          case "$x" in
            a) echo a ;;
          esac

          cargo test --locked
      - name: Folded
        run: >-
          cargo xtask gates
          --check
      - name: After
        env:
          A: '1'
        run: echo done
`;
		assert.deepEqual(workflow_run_commands(yaml), [
			'case "$x" in\n  a) echo a ;;\nesac\n\ncargo test --locked',
			'cargo xtask gates --check',
			'echo done'
		]);
	});

	test('reads nothing from a file with no steps, or from a key that only contains the word', () => {
		assert.deepEqual(workflow_run_commands('on:\n  push:\n    branches: [main]\n'), []);
		assert.deepEqual(workflow_run_commands('      dry_run: true\n      rerun: yes\n'), []);
	});

	test('throws on what it cannot read, so a command is never half read', () => {
		assert.throws(() => workflow_run_commands('      - run: |2\n          x\n'));
		assert.throws(() => workflow_run_commands('      - run: | # why\n          x\n'));
		assert.throws(() => workflow_run_commands('      - run: npm ci\r\n'));
	});
});
