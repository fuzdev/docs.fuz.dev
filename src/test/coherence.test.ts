import { describe, test, assert } from 'vitest';

import {
	coherence_entries,
	claims_checked,
	failure_blank_rungs,
	failure_holds,
	failure_reached_holds,
	failures,
	gate_gaps,
	gates,
	hold_id,
	hold_status_ids,
	families,
	family_failures,
	family_ids,
	intro,
	kept_actions,
	mechanism_ids,
	moved_rules,
	oracle_comparisons,
	oracle_kind_ids,
	passages,
	rung_ids,
	run_when_ids,
	written_by,
	type InventoryId
} from '#routes/coherence/coherence.ts';
import {
	coherence_family_paths,
	coherence_index_path,
	coherence_inventory_ids,
	coherence_inventory_pages
} from '#routes/coherence/coherence_pages.ts';

const assert_sorted = (indexes: Array<number>, message: string) => {
	assert.deepEqual(
		indexes,
		indexes.toSorted((a, b) => a - b),
		message
	);
};

const assert_unique_keys = (keys: Array<string>, what: string) => {
	assert.strictEqual(new Set(keys).size, keys.length, `${what} repeats`);
};

describe('failures', () => {
	test('ids are usable as anchors', () => {
		for (const f of failures) assert.match(f.id, /^[a-z]+(-[a-z]+)*$/);
	});

	// across the whole section, so an anchor never depends on which page it is on
	test('every failure and hold anchor is distinct', () => {
		const anchors = failures.flatMap((f) => [
			f.id,
			...failure_holds(f).map(({ rung }) => hold_id(f, rung))
		]);
		assert.strictEqual(new Set(anchors).size, anchors.length);
	});

	test("each family's rows sit together, in the families' order, and no family is empty", () => {
		assert_sorted(
			failures.map((f) => family_ids.indexOf(f.family)),
			'failures'
		);
		for (const id of family_ids) {
			assert.ok(family_failures(id).length > 0, `${id}: no failures`);
			assert.ok(families[id].label.trim() && families[id].summary.trim(), id);
		}
	});

	test('every text field is filled', () => {
		for (const f of failures) {
			assert.ok(f.name.trim(), `${f.id}: name`);
			assert.ok(f.summary.trim(), `${f.id}: summary`);
			assert.ok(failure_holds(f).length > 0, `${f.id}: no holds`);
			for (const { rung, hold: h } of failure_holds(f)) {
				const owner = hold_id(f, rung);
				assert.ok(h.label.trim(), `${owner}: label`);
				if (h.status === 'unreachable') {
					assert.ok(h.why.trim(), `${owner}: why`);
					continue;
				}
				assert.ok(h.does.trim(), `${owner}: does`);
				for (const field of ['gap', 'fails', 'cost', 'wanted'] as const) {
					const value = h[field];
					assert.ok(value === undefined || value.trim(), `${owner}: empty ${field}`);
				}
			}
		}
	});

	// the gaps page lists a row's blank rungs beside its holds, so the two must be the whole row
	test("a failure's blank rungs and its holds are every rung, with none in both", () => {
		for (const f of failures) {
			const held = failure_holds(f).map(({ rung }) => rung);
			const blank = failure_blank_rungs(f);
			assert.deepEqual([...held, ...blank].toSorted(), [...rung_ids].toSorted(), f.id);
		}
		assert.ok(
			failures.some((f) => failure_blank_rungs(f).length > 0),
			'no row has a blank rung, so the grid has no blank cell'
		);
	});

	test('every status is used', () => {
		const used = new Set(failures.flatMap((f) => failure_holds(f).map(({ hold }) => hold.status)));
		assert.deepEqual(
			[...used].toSorted(),
			hold_status_ids.toSorted(),
			'a legend entry no hold uses teaches a mark the grid never shows'
		);
	});

	// the mark and the text cannot disagree: a hold in places says what it leaves out,
	// and a hold with something left out is not marked as throughout
	test('a hold has a gap exactly when it is in places', () => {
		for (const f of failures) {
			for (const { rung, hold: h } of failure_reached_holds(f)) {
				assert.strictEqual(
					h.gap !== undefined,
					h.status === 'in_places',
					`${hold_id(f, rung)}: ${h.status} with${h.gap === undefined ? 'out' : ''} a gap`
				);
			}
		}
	});

	// each entry's single link is checked with the rest of the evidence in `evidence.test.ts`
	test('a hold that does something has evidence', () => {
		for (const f of failures) {
			for (const { rung, hold: h } of failure_reached_holds(f)) {
				assert.ok(h.evidence.length > 0, `${hold_id(f, rung)}: no evidence`);
			}
		}
	});

	test('a hold lists each inventory once, in page order', () => {
		const order: Array<string> = coherence_inventory_ids;
		for (const f of failures) {
			for (const { rung, hold: h } of failure_reached_holds(f)) {
				if (!h.inventories) continue;
				const owner = hold_id(f, rung);
				assert.ok(h.inventories.length > 0, `${owner}: an empty list`);
				const indexes = h.inventories.map((id) => order.indexOf(id));
				assert.strictEqual(new Set(indexes).size, indexes.length, `${owner}: a repeat`);
				assert_sorted(indexes, owner);
			}
		}
	});

	test('every inventory is reached from a hold', () => {
		const reached = new Set(
			failures.flatMap((f) =>
				failure_reached_holds(f).flatMap(({ hold }) => hold.inventories ?? [])
			)
		);
		// a record, so a new inventory fails to compile until it is listed here
		const inventories: Record<InventoryId, true> = {
			moved: true,
			oracles: true,
			actions: true,
			gates: true
		};
		for (const id of Object.keys(inventories)) {
			assert.ok(reached.has(id as InventoryId), `no hold points at the ${id} table`);
		}
	});

	// the grid's passage names the two holds that apply to every row, by their row's name
	test('the grid passage names failures that exist', () => {
		const quoted = Array.from(passages.grid.matchAll(/"([^"]+)"/g), (m) => m[1]!);
		assert.ok(quoted.length > 0);
		const names = new Set(failures.map((f) => f.name));
		for (const name of quoted) assert.ok(names.has(name), `no failure is named "${name}"`);
	});
});

describe('pages', () => {
	test('every page of the section has its own path, under the index', () => {
		const paths = [
			...Object.values(coherence_family_paths),
			...coherence_inventory_ids.map((id) => coherence_inventory_pages[id].path)
		];
		assert.strictEqual(new Set(paths).size, paths.length);
		for (const path of paths) assert.ok(path.startsWith(`${coherence_index_path}/`), path);
	});

	// the passage above a table is looked up by the table's id
	test('every table has a title and a passage', () => {
		for (const id of coherence_inventory_ids) {
			assert.ok(coherence_inventory_pages[id].title.trim(), id);
			assert.ok(passages[id].trim(), id);
		}
	});
});

describe('prose', () => {
	test('the opening and every passage are filled, and the opening repeats nothing', () => {
		assert.ok(intro.length > 0);
		assert.strictEqual(new Set(intro).size, intro.length);
		for (const paragraph of intro) assert.ok(paragraph.trim());
		for (const [id, passage] of Object.entries(passages)) assert.ok(passage.trim(), id);
		assert.ok(written_by.trim());
	});

	// a link in a passage would be one the evidence check never sees; the opening's are entries
	test("the passages carry no links, and the opening's links are checked", () => {
		for (const text of Object.values(passages)) {
			assert.ok(!text.includes(']('), text);
		}
		const checked = new Set(coherence_entries().map((entry) => entry.content));
		const linked = intro.filter((paragraph) => paragraph.includes(']('));
		assert.ok(linked.length > 0);
		for (const paragraph of linked) assert.ok(checked.has(paragraph), paragraph);
	});
});

describe('moved_rules', () => {
	test('each row is filled and distinct', () => {
		assert_unique_keys(
			moved_rules.map((m) => m.was),
			'a moved rule'
		);
		for (const m of moved_rules) {
			assert.ok(m.was.trim() && m.became.trim(), m.was);
		}
	});

	test('each rule moved to a tool or a shape, listed in ladder order', () => {
		const below_written = rung_ids.slice(rung_ids.indexOf('written') + 1);
		for (const m of moved_rules) {
			assert.ok(m.to.length > 0, m.was);
			for (const rung of m.to) {
				assert.ok(below_written.includes(rung), `${m.was}: ${rung} is not below a written rule`);
			}
			const indexes = m.to.map((rung) => rung_ids.indexOf(rung));
			assert.strictEqual(new Set(indexes).size, indexes.length, m.was);
			assert_sorted(indexes, m.was);
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

	test("rows are written soonest first, by each row's soonest run", () => {
		assert_sorted(
			oracle_comparisons.map((c) => run_when_ids.indexOf(c.runs[0]!.when)),
			'oracle_comparisons'
		);
	});

	test('each row runs at least once, soonest first, each weight once, parts named when there are several', () => {
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
	test('each row is filled, with its mechanisms hardest to get past first', () => {
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

	test('rows are written soonest first', () => {
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
	test('each list the page renders has distinct keys', () => {
		assert_unique_keys(
			gates.map((g) => g.gate),
			'a gate'
		);
		assert_unique_keys(
			kept_actions.map((a) => a.action),
			'an action'
		);
		assert_unique_keys(gate_gaps, 'a gate gap');
		for (const f of failures) {
			for (const { rung, hold } of failure_reached_holds(f)) {
				assert_unique_keys(hold.evidence, `${hold_id(f, rung)}: an evidence entry`);
			}
		}
	});
});
