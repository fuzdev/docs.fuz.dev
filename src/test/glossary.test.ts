import { describe, test, assert } from 'vitest';

import {
	claims_checked,
	glossary_entries,
	glossary_group_ids,
	glossary_group_terms,
	glossary_terms,
	intro
} from '#routes/glossary/glossary.ts';

describe('glossary_terms', () => {
	test('each id is usable as an anchor and appears once, and so does each term', () => {
		for (const t of glossary_terms) assert.match(t.id, /^[a-z]+(-[a-z]+)*$/, t.id);
		const ids = glossary_terms.map((t) => t.id);
		assert.strictEqual(new Set(ids).size, ids.length);
		const terms = glossary_terms.map((t) => t.term);
		assert.strictEqual(new Set(terms).size, terms.length);
	});

	// the page also anchors each group's heading
	test('no term shares an anchor with a group', () => {
		for (const t of glossary_terms) {
			assert.ok(!(glossary_group_ids as Array<string>).includes(t.id), t.id);
		}
	});

	test('every text field is filled', () => {
		assert.ok(intro.trim());
		for (const t of glossary_terms) {
			assert.ok(t.term.trim() && t.definition.trim(), t.id);
			for (const field of ['also', 'source'] as const) {
				const value = t[field];
				assert.ok(value === undefined || value.trim(), `${t.id}: empty ${field}`);
			}
		}
	});

	test("every group has a term, and the terms are written a group at a time, in the groups' order", () => {
		for (const id of glossary_group_ids) {
			assert.ok(glossary_group_terms(id).length > 0, `${id}: no terms`);
		}
		const indexes = glossary_terms.map((t) => glossary_group_ids.indexOf(t.group));
		assert.deepEqual(
			indexes,
			indexes.toSorted((a, b) => a - b)
		);
	});

	// each source's single link is checked with the rest of the evidence in `evidence.test.ts`
	test("some terms cite a source and some are this site's own usage", () => {
		assert.ok(glossary_entries().length > 0);
		assert.ok(glossary_entries().length < glossary_terms.length);
	});
});

test('the checked date is an ISO date', () => {
	assert.match(claims_checked, /^\d{4}-\d{2}-\d{2}$/);
	assert.ok(!Number.isNaN(Date.parse(claims_checked)));
});
