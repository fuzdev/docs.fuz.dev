import { describe, test, assert } from 'vitest';
import { mdz_parse, type MdzNode, type MdzNodeLink } from '@fuzdev/mdz/mdz.ts';

import {
	oracle_comparisons,
	practice_rungs,
	practice_statuses,
	practices,
	practices_relate,
	type Practice
} from '#routes/coherence/practices.ts';
import { skills } from '#routes/skills/skills_manifest.ts';

const collect_links = (nodes: Array<MdzNode>, links: Array<MdzNodeLink> = []) => {
	for (const node of nodes) {
		if (node.type === 'Link') links.push(node);
		if ('children' in node) collect_links(node.children, links);
	}
	return links;
};

// the site's own routes an evidence link may point at
const skill_paths = new Set(
	skills.flatMap((skill) => [
		`/skills/${skill.name}`,
		...skill.references.map((ref) => `/skills/${skill.name}/references/${ref.slug}`)
	])
);

const practice = (id: string, related: Array<string>): Practice => ({
	id,
	name: id,
	rung: 'checks',
	status: 'partial',
	practice: '',
	catches: '',
	costs: '',
	fails: '',
	evidence: [],
	related
});

describe('practices', () => {
	test('ids are unique and usable as anchors', () => {
		const ids = practices.map((p) => p.id);
		assert.strictEqual(new Set(ids).size, ids.length);
		for (const id of ids) assert.match(id, /^[a-z]+(-[a-z]+)*$/);
	});

	test('are listed in ladder order', () => {
		const rung_order = practice_rungs.map((r) => r.id);
		const indexes = practices.map((p) => rung_order.indexOf(p.rung));
		assert.deepEqual(
			indexes,
			indexes.toSorted((a, b) => a - b)
		);
	});

	test('every rung and status is one the page defines', () => {
		const rung_ids = new Set<string>(practice_rungs.map((r) => r.id));
		const status_ids = new Set<string>(practice_statuses.map((s) => s.id));
		for (const p of practices) {
			assert.ok(rung_ids.has(p.rung), `${p.id}: rung ${p.rung}`);
			assert.ok(status_ids.has(p.status), `${p.id}: status ${p.status}`);
		}
	});

	test('every text field is filled', () => {
		for (const p of practices) {
			for (const field of ['name', 'practice', 'catches', 'costs', 'fails'] as const) {
				assert.ok(p[field].trim(), `${p.id}: ${field}`);
			}
		}
	});

	test('every practice has evidence, and each entry is mdz with exactly one link', () => {
		for (const p of practices) {
			assert.ok(p.evidence.length > 0, `${p.id}: no evidence`);
			for (const entry of p.evidence) {
				const links = collect_links(mdz_parse(entry));
				assert.strictEqual(links.length, 1, `${p.id}: "${entry}"`);
			}
		}
	});

	test('evidence links are https, or a skill route that exists', () => {
		for (const p of practices) {
			for (const entry of p.evidence) {
				const link = collect_links(mdz_parse(entry))[0]!;
				if (link.link_type === 'internal') {
					assert.ok(skill_paths.has(link.reference), `${p.id}: no route ${link.reference}`);
				} else {
					assert.match(link.reference, /^https:\/\/[^\s)]+$/, `${p.id}: ${link.reference}`);
				}
			}
		}
	});

	test('related ids are stated once per practice', () => {
		for (const p of practices) {
			assert.strictEqual(new Set(p.related).size, p.related.length, p.id);
		}
	});
});

describe('practices_relate', () => {
	test('relates the real practices in both directions', () => {
		const related = practices_relate(practices);
		for (const p of practices) {
			const ids = related.get(p.id);
			assert.ok(ids && ids.length > 0, `${p.id}: unrelated`);
			for (const id of ids) {
				assert.ok(related.get(id)!.includes(p.id), `${id} does not relate back to ${p.id}`);
			}
		}
	});

	test('adds the reverse of a one-way relation, in list order', () => {
		const related = practices_relate([
			practice('a', []),
			practice('b', ['c', 'a']),
			practice('c', [])
		]);
		assert.deepEqual(related.get('a'), ['b']);
		assert.deepEqual(related.get('b'), ['a', 'c']);
		assert.deepEqual(related.get('c'), ['b']);
	});

	test('throws on an unknown id', () => {
		assert.throws(() => practices_relate([practice('a', ['missing'])]), /unknown "missing"/);
	});

	test('throws on a practice related to itself', () => {
		assert.throws(() => practices_relate([practice('a', ['a'])]), /relates to itself/);
	});
});

describe('oracle_comparisons', () => {
	test('each row is filled and names a distinct comparison', () => {
		const keys = oracle_comparisons.map((c) => c.project + c.against);
		assert.strictEqual(new Set(keys).size, keys.length);
		for (const c of oracle_comparisons) {
			for (const field of ['project', 'against', 'kind', 'how', 'runs'] as const) {
				assert.ok(c[field].trim(), `${c.project}: ${field}`);
			}
		}
	});
});
