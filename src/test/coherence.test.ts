import { describe, test, assert } from 'vitest';

import {
	claims_checked,
	failure_holds,
	failures,
	gate_gaps,
	gates,
	hold_id,
	hold_status_ids,
	kept_actions,
	mechanism_ids,
	oracle_comparisons,
	oracle_kind_ids,
	run_when_ids,
	type InventoryId
} from '#routes/coherence/coherence.ts';
import { coherence_sections } from '#routes/coherence/coherence_sections.ts';

const assert_sorted = (indexes: Array<number>, message: string) => {
	assert.deepEqual(
		indexes,
		indexes.toSorted((a, b) => a - b),
		message
	);
};

describe('failures', () => {
	test('ids are usable as anchors', () => {
		for (const f of failures) assert.match(f.id, /^[a-z]+(-[a-z]+)*$/);
	});

	test('every anchor on the page is distinct: sections, failures and holds', () => {
		const anchors = [
			...Object.keys(coherence_sections),
			...failures.flatMap((f) => [f.id, ...failure_holds(f).map(({ rung }) => hold_id(f, rung))])
		];
		assert.strictEqual(new Set(anchors).size, anchors.length);
	});

	test('every text field is filled', () => {
		for (const f of failures) {
			assert.ok(f.name.trim(), `${f.id}: name`);
			assert.ok(f.failure.trim(), `${f.id}: failure`);
			assert.ok(failure_holds(f).length > 0, `${f.id}: no holds`);
			for (const { rung, hold: h } of failure_holds(f)) {
				const owner = hold_id(f, rung);
				assert.ok(h.label.trim(), `${owner}: label`);
				assert.ok(h.does.trim(), `${owner}: does`);
				for (const field of ['fails', 'cost', 'wanted'] as const) {
					const value = h[field];
					assert.ok(value === undefined || value.trim(), `${owner}: empty ${field}`);
				}
			}
		}
	});

	test('every status is used', () => {
		const used = new Set(failures.flatMap((f) => failure_holds(f).map(({ hold }) => hold.status)));
		assert.deepEqual(
			[...used].toSorted(),
			hold_status_ids.toSorted(),
			'a legend entry no hold uses teaches a mark the grid never shows'
		);
	});

	// each entry's single link is checked with the rest of the evidence in `evidence.test.ts`
	test('a hold that does something has evidence', () => {
		for (const f of failures) {
			for (const { rung, hold: h } of failure_holds(f)) {
				if (h.status === 'unreachable') continue;
				assert.ok(h.evidence.length > 0, `${hold_id(f, rung)}: no evidence`);
			}
		}
	});

	test('a rung that cannot hold a failure claims nothing else', () => {
		for (const f of failures) {
			for (const { rung, hold: h } of failure_holds(f)) {
				if (h.status !== 'unreachable') continue;
				const owner = hold_id(f, rung);
				assert.strictEqual(h.evidence.length, 0, owner);
				assert.strictEqual(h.fails, undefined, owner);
				assert.strictEqual(h.wanted, undefined, owner);
				assert.strictEqual(h.inventory, undefined, owner);
			}
		}
	});

	test('every inventory is reached from a hold', () => {
		const reached = new Set(
			failures.flatMap((f) => failure_holds(f).map(({ hold }) => hold.inventory))
		);
		// a record, so a new inventory fails to compile until it is listed here
		const inventories: Record<InventoryId, true> = { oracles: true, actions: true, gates: true };
		for (const id of Object.keys(inventories)) {
			assert.ok(reached.has(id as InventoryId), `no hold points at the ${id} table`);
		}
	});
});

test('the checked date is an ISO date', () => {
	assert.match(claims_checked, /^\d{4}-\d{2}-\d{2}$/);
	assert.ok(!Number.isNaN(Date.parse(claims_checked)));
});

describe('oracle_comparisons', () => {
	test('each row is filled and names a distinct comparison', () => {
		const keys = oracle_comparisons.map((c) => `${c.project}|${c.against}`);
		assert.strictEqual(new Set(keys).size, keys.length);
		for (const c of oracle_comparisons) {
			for (const field of ['project', 'against', 'how'] as const) {
				assert.ok(c[field].trim(), `${c.project}: ${field}`);
			}
		}
	});

	test("rows are written strongest first, by each row's strongest run", () => {
		assert_sorted(
			oracle_comparisons.map((c) => run_when_ids.indexOf(c.runs[0]!.when)),
			'oracle_comparisons'
		);
	});

	test('each row runs at least once, strongest first, each weight once, parts named when there are several', () => {
		for (const c of oracle_comparisons) {
			assert.ok(c.runs.length > 0, c.project);
			const indexes = c.runs.map((r) => run_when_ids.indexOf(r.when));
			// the page keys a row's runs by their weight
			assert.strictEqual(new Set(indexes).size, indexes.length, `${c.project}: a weight twice`);
			assert_sorted(indexes, c.project);
			if (c.runs.length > 1) {
				for (const r of c.runs) assert.ok(r.what?.trim(), `${c.project}: unnamed part`);
			}
		}
	});

	test('every kind is used', () => {
		const used = new Set(oracle_comparisons.map((c) => c.kind));
		assert.deepEqual([...used].toSorted(), oracle_kind_ids.toSorted());
	});
});

describe('kept_actions', () => {
	test('each row is filled, with its mechanisms strongest first', () => {
		for (const a of kept_actions) {
			assert.ok(a.action.trim() && a.how.trim(), a.action);
			assert.ok(a.held_by.length > 0, a.action);
			const indexes = a.held_by.map((m) => mechanism_ids.indexOf(m));
			assert.strictEqual(new Set(indexes).size, indexes.length, a.action);
			assert_sorted(indexes, a.action);
		}
	});

	test('every mechanism is used', () => {
		const used = new Set(kept_actions.flatMap((a) => a.held_by));
		assert.deepEqual([...used].toSorted(), mechanism_ids.toSorted());
	});
});

describe('gates', () => {
	test('each row is filled', () => {
		for (const g of gates) {
			for (const field of ['gate', 'catches', 'where'] as const) {
				assert.ok(g[field].trim(), `${g.gate}: ${field}`);
			}
		}
	});

	test('rows are written strongest first', () => {
		assert_sorted(
			gates.map((g) => run_when_ids.indexOf(g.runs)),
			'gates'
		);
	});

	test('every weight on the scale is used by a gate or an oracle', () => {
		const used = new Set([
			...gates.map((g) => g.runs),
			...oracle_comparisons.flatMap((c) => c.runs.map((r) => r.when))
		]);
		assert.deepEqual([...used].toSorted(), run_when_ids.toSorted());
	});
});

// the page keys each list by these, so a repeat would fail the render and not a test
describe('keys', () => {
	const assert_unique = (keys: Array<string>, what: string) => {
		assert.strictEqual(new Set(keys).size, keys.length, `${what} repeats`);
	};

	test('each list the page renders has distinct keys', () => {
		assert_unique(
			gates.map((g) => g.gate),
			'a gate'
		);
		assert_unique(
			kept_actions.map((a) => a.action),
			'an action'
		);
		assert_unique(gate_gaps, 'a gate gap');
		for (const f of failures) {
			for (const { rung, hold } of failure_holds(f)) {
				assert_unique(hold.evidence, `${hold_id(f, rung)}: an evidence entry`);
			}
		}
	});
});
