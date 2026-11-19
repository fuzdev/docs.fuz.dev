import { describe, test, assert } from 'vitest';

import { build_stack_facets, type StackPageModule } from '#routes/projects/stack_facets.ts';

const module: StackPageModule = {
	stack_layers: [
		{
			name: 'apps',
			pieces: [
				{ name: 'alpha', languages: ['ts', 'rust'], status: 'ready', site: 'https://a.test/' }
			]
		},
		{ name: 'tools', pieces: [{ name: 'beta', languages: [], status: 'early' }] }
	],
	STACK_STATUSES: {
		ready: { label: 'ready', description: 'usable' },
		early: { label: 'early', description: 'expect gaps' }
	},
	STACK_LANGUAGES: { ts: { label: 'TypeScript' }, rust: { label: 'Rust' } }
};

describe('build_stack_facets', () => {
	test("files each project under its layer, with the page's own statuses and languages", () => {
		const { facets, problems } = build_stack_facets(module, ['alpha', 'beta']);
		assert.deepEqual(problems, []);
		assert.deepEqual(facets, {
			layers: ['apps', 'tools'],
			statuses: [
				{ id: 'ready', label: 'ready', description: 'usable' },
				{ id: 'early', label: 'early', description: 'expect gaps' }
			],
			languages: [
				{ id: 'ts', label: 'TypeScript' },
				{ id: 'rust', label: 'Rust' }
			],
			projects: [
				{
					name: 'alpha',
					layer: 'apps',
					status: 'ready',
					languages: ['ts', 'rust'],
					site: 'https://a.test/'
				},
				{ name: 'beta', layer: 'tools', status: 'early', languages: [], site: null }
			]
		});
	});

	test("reports a list that is not this site's, in names or in order", () => {
		assert.strictEqual(build_stack_facets(module, ['beta', 'alpha']).problems.length, 1);
		assert.strictEqual(build_stack_facets(module, ['alpha']).problems.length, 1);
	});

	test('reports a status or a language the page does not define', () => {
		const { problems } = build_stack_facets(
			{
				...module,
				stack_layers: [
					{ name: 'apps', pieces: [{ name: 'alpha', languages: ['go'], status: 'done' }] }
				]
			},
			['alpha']
		);
		assert.strictEqual(problems.length, 2);
	});
});
