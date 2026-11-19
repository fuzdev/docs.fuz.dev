import { describe, test, assert } from 'vitest';

import {
	failure_holds,
	failures,
	gate_gaps,
	gates,
	hold_id,
	intro,
	kept_actions,
	moved_rules,
	oracle_comparisons,
	passages
} from '#routes/coherence/coherence.ts';
import {
	project_lens,
	project_lens_sections,
	project_lens_size,
	record_strings,
	text_mentions_project,
	type ProjectLens
} from '#routes/projects/project_lens.ts';
import { stack_projects, type StackProject } from '#routes/stack_projects.ts';
import {
	contexts,
	decisions,
	efficiency,
	headword,
	method,
	stated_orders,
	values
} from '#routes/values/values.ts';

const project = (name: string): StackProject => {
	const found = stack_projects.find((p) => p.name === name);
	assert.ok(found, `${name} is not a stack project`);
	return found;
};

describe('stack_projects', () => {
	test('each name and each repo appears once, and a name is usable in a path', () => {
		const names = stack_projects.map((p) => p.name);
		assert.strictEqual(new Set(names).size, names.length);
		const repos = stack_projects.flatMap((p) => p.repos);
		assert.strictEqual(new Set(repos).size, repos.length);
		for (const p of stack_projects) {
			assert.match(p.name, /^[a-z0-9_-]+$/);
			assert.ok(p.repos.length > 0, p.name);
		}
	});
});

describe('text_mentions_project', () => {
	const fuz = project('fuz');
	const tsv = project('tsv');
	const gro = project('gro');
	const fuz_stack = project('fuz-stack');

	test('finds a name as a whole word, with or without a possessive', () => {
		assert.ok(text_mentions_project('The install script of fuz and others', fuz));
		assert.ok(text_mentions_project("fuz's package installer", fuz));
		assert.ok(text_mentions_project('In tsv, agents', tsv));
		assert.ok(text_mentions_project('pglet and gro', gro));
	});

	test('finds a name as a package under the stack scope', () => {
		assert.ok(text_mentions_project('imports @fuzdev/gro in a task', gro));
		assert.ok(!text_mentions_project('imports @someone/gro in a task', gro));
	});

	test('does not find a name inside a longer name, a host, a file name or a capitalised word', () => {
		for (const text of [
			'fuz_schema tests its README',
			'the fuz-stack skill',
			'https://www.fuz.dev/stack',
			'an owner of fuzdev',
			'the Fuz stack page'
		]) {
			assert.ok(!text_mentions_project(text, fuz), text);
		}
		assert.ok(!text_mentions_project('tsv-format has no CI', tsv));
		assert.ok(!text_mentions_project('the page at https://tsv.fuz.dev/docs', tsv));
		assert.ok(!text_mentions_project('its gro.config.ts', gro));
		assert.ok(!text_mentions_project('Gro runs it', gro));
	});

	test('reads a link by its url alone, where a repo counts and a name does not', () => {
		assert.ok(text_mentions_project('[x](https://github.com/fuzdev/fuz/blob/main/a.md)', fuz));
		assert.ok(
			text_mentions_project('[x](https://github.com/fuzdev/tsv.fuz.dev/blob/main/a.md)', tsv)
		);
		assert.ok(text_mentions_project('[x](https://github.com/fuzdev/tsv)', tsv));
		assert.ok(
			text_mentions_project(
				'[x](https://github.com/fuzdev/vscode-extension-tsv-format)',
				project('tsv-format')
			)
		);
		for (const text of [
			'[x](https://github.com/fuzdev/tsv.fuz.dev/blob/main/a.md)',
			'[x](https://github.com/fuzdev/fuz_app/blob/main/README.md)',
			'[x](https://github.com/someone/fuz/blob/main/README.md)',
			'[x](https://github.com/fuzdev/mdz/blob/main/CLAUDE.md#fuz)'
		]) {
			assert.ok(!text_mentions_project(text, fuz), text);
		}
	});

	test('counts a route of this site for the project the route renders, and for no other', () => {
		assert.ok(text_mentions_project('The Rust [lint rules](/skills/fuz-stack#lints)', fuz_stack));
		assert.ok(text_mentions_project('The [skills](/skills)', fuz_stack));
		assert.ok(!text_mentions_project('See [values](/values)', fuz_stack));
		assert.ok(!text_mentions_project('The Rust [lint rules](/skills/fuz-stack#lints)', fuz));
	});
});

// every string of every record on the two data pages, with nothing left out by hand
const data_strings = record_strings([
	failures,
	oracle_comparisons,
	gates,
	gate_gaps,
	kept_actions,
	moved_rules,
	values,
	stated_orders,
	contexts,
	decisions,
	method.evidence,
	efficiency.evidence
]);

const project_lenses = stack_projects.map(project_lens);

const lens_strings = (lens: ProjectLens): Set<string> => {
	const { project: _, ...records } = lens;
	return new Set(record_strings(records));
};

describe('project_lenses', () => {
	// the claim the pages make: a record that names a project is in that project's lens
	test('every string in the data that names a project is in its lens', () => {
		assert.ok(data_strings.length > 0);
		let found = 0;
		for (const lens of project_lenses) {
			const strings = lens_strings(lens);
			for (const text of data_strings) {
				if (!text_mentions_project(text, lens.project)) continue;
				found++;
				assert.ok(strings.has(text), `${lens.project.name} is missing "${text}"`);
			}
		}
		assert.ok(found > 0, 'no string named any project, so nothing was checked');
	});

	// prose that is outside every record must name no project, or a lens would miss it
	test('the prose outside the records names no project', () => {
		for (const text of record_strings([intro, passages, headword, method.text, efficiency.text])) {
			for (const p of stack_projects) {
				assert.ok(!text_mentions_project(text, p), `"${text}" names ${p.name}`);
			}
		}
	});

	test('a lens has sections exactly when it has records', () => {
		for (const lens of project_lenses) {
			const sections = Object.keys(project_lens_sections(lens));
			assert.strictEqual(sections.length > 0, project_lens_size(lens) > 0, lens.project.name);
		}
	});

	test("a hold's anchor is distinct within a lens", () => {
		for (const lens of project_lenses) {
			const ids = lens.holds.map(({ failure, rung }) => hold_id(failure, rung));
			assert.strictEqual(new Set(ids).size, ids.length, lens.project.name);
		}
	});

	// a control on the matcher itself, with data whose answer is known
	test('tsv is named by its own comparisons and gro by none of them alone', () => {
		const tsv = project_lens(project('tsv'));
		assert.ok(tsv.comparisons.some((c) => c.project === 'tsv formatter'));
		assert.ok(tsv.holds.length > 0);
		const unreached = failures.flatMap((f) => failure_holds(f)).length;
		assert.ok(tsv.holds.length < unreached, 'every hold names tsv, so the matcher matches all');
	});
});
