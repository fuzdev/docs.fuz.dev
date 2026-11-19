import { describe, test, assert } from 'vitest';

import {
	contexts,
	decisions,
	efficiency,
	method,
	stated_orders,
	term_ids,
	terms,
	value_kind_ids,
	values,
	type TermId
} from '#routes/values/values.ts';
import { values_sections } from '#routes/values/values_sections.ts';

// the page keys each list by these, so a repeat would fail the render and not a test
test('each list of evidence has distinct entries', () => {
	for (const passage of [method, efficiency]) {
		assert.strictEqual(new Set(passage.evidence).size, passage.evidence.length);
	}
});

describe('terms and kinds', () => {
	test('each term has a color of its own', () => {
		const palettes = Object.values(terms).map((t) => t.palette);
		assert.strictEqual(new Set(palettes).size, palettes.length);
	});

	test('every kind is used', () => {
		const used = new Set(Object.values(terms).map((t) => t.kind));
		assert.deepEqual([...used].toSorted(), value_kind_ids.toSorted());
	});

	test('every term belongs to exactly one value', () => {
		const owned = values.flatMap((v) => v.terms);
		assert.deepEqual(owned.toSorted(), term_ids.toSorted());
	});
});

describe('values', () => {
	test('ids are distinct from each other and from the section anchors', () => {
		const anchors = [...Object.keys(values_sections), ...values.map((v) => v.id)];
		assert.strictEqual(new Set(anchors).size, anchors.length);
	});

	test('every field is filled', () => {
		for (const v of values) {
			for (const field of ['name', 'means', 'question', 'shortfall'] as const) {
				assert.ok(v[field].trim(), `${v.id}: ${field}`);
			}
			assert.ok(v.passes.length > 0, `${v.id}: passes`);
			assert.strictEqual(new Set(v.passes).size, v.passes.length, `${v.id}: a pass twice`);
			for (const passes of v.passes) assert.ok(passes.trim(), `${v.id}: passes`);
		}
	});
});

describe('stated_orders', () => {
	// the type holds each `project` to the stack's list
	test('each names its project once, and ranks each term at most once', () => {
		const projects = stated_orders.map((o) => o.project);
		assert.strictEqual(new Set(projects).size, projects.length);
		for (const o of stated_orders) {
			assert.ok(o.ranks.length > 0, o.project);
			const items = [...o.ranks.flat(), ...(o.overarching ? [o.overarching] : [])];
			const ranked: Array<TermId> = [];
			for (const item of items) {
				assert.ok(item.label.trim(), `${o.project}: unlabelled item`);
				if (item.term !== null) ranked.push(item.term);
			}
			assert.strictEqual(new Set(ranked).size, ranked.length, `${o.project}: a term twice`);
			// the page keys a rank's items by their label
			const labels = items.map((i) => i.label);
			assert.strictEqual(new Set(labels).size, labels.length, `${o.project}: a label twice`);
		}
	});
});

describe('contexts', () => {
	test('each orders two or more axes, each at most once', () => {
		const ids = contexts.map((c) => c.id);
		assert.strictEqual(new Set(ids).size, ids.length);
		for (const c of contexts) {
			assert.ok(c.name.trim() && c.why.trim(), c.id);
			const axes = c.order.flat();
			assert.ok(axes.length > 1, `${c.id}: an order needs two axes`);
			assert.strictEqual(new Set(axes).size, axes.length, `${c.id}: an axis twice`);
		}
	});
});

describe('decisions', () => {
	test('each names two different terms', () => {
		for (const d of decisions) {
			const owner = `${d.project}: ${d.won} over ${d.lost}`;
			assert.notStrictEqual(d.won, d.lost, owner);
			assert.ok(d.chose.trim() && d.cost.trim(), owner);
		}
	});
});
