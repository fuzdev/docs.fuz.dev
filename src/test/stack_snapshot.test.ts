import { describe, test, assert } from 'vitest';

import { project_pages } from '#routes/projects/project_page.ts';
import {
	project_used_by,
	project_uses,
	snapshot_missing_projects,
	stack_snapshot
} from '#routes/projects/stack_data.ts';
import { dep_edge_is_dev, dep_kinds } from '#routes/projects/stack_snapshot.ts';
import { stack_projects, stack_repos, type StackProject } from '#routes/stack_projects.ts';

const projects: ReadonlyArray<StackProject> = stack_projects;
const names = new Set(projects.map((p) => p.name));
const project_of = (name: string): StackProject => projects.find((p) => p.name === name)!;

// the siblings are not in CI, so this holds only what the committed file says of itself;
// the task's `--check` holds it to the repos where they are checked out
describe('stack_snapshot', () => {
	test('the date it was read is an ISO date', () => {
		assert.match(stack_snapshot.checked, /^\d{4}-\d{2}-\d{2}$/);
		assert.ok(!Number.isNaN(Date.parse(stack_snapshot.checked)));
	});

	test("it has every repo of every stack project, once, in the list's order", () => {
		assert.deepEqual(snapshot_missing_projects(), []);
		assert.deepEqual(
			stack_snapshot.repos.map((r) => r.repo),
			projects.flatMap((p) => [...p.repos])
		);
		for (const r of stack_snapshot.repos) {
			assert.ok(project_of(r.project).repos.includes(r.repo), `${r.repo} is not ${r.project}'s`);
			assert.ok(r.npm || r.cargo, `${r.repo} has neither manifest`);
		}
	});

	test('an edge joins two different stack projects through at least one package', () => {
		assert.ok(stack_snapshot.edges.length > 0);
		for (const e of stack_snapshot.edges) {
			const edge = `${e.from_repo} -> ${e.to}`;
			assert.ok(names.has(e.from) && names.has(e.to), edge);
			assert.notStrictEqual(e.from, e.to, edge);
			assert.ok(stack_repos.has(e.from_repo), edge);
			assert.ok(project_of(e.from).repos.includes(e.from_repo), `${edge}: not ${e.from}'s repo`);
			assert.ok(e.via.length > 0, edge);
			assert.deepEqual(e.via, e.via.toSorted(), edge);
			// only a crate has a source, and it always has one
			assert.strictEqual(e.source !== undefined, e.manifest === 'cargo', edge);
		}
	});

	// the pages key a table of edges by these
	test('a repo declares each project at most once per manifest', () => {
		const keys = stack_snapshot.edges.map((e) => `${e.from_repo}|${e.to}|${e.manifest}`);
		assert.strictEqual(new Set(keys).size, keys.length);
	});

	test('the edges are in the order the task writes them', () => {
		const sorted = stack_snapshot.edges.toSorted(
			(a, b) =>
				a.to.localeCompare(b.to, 'en') ||
				a.from_repo.localeCompare(b.from_repo, 'en') ||
				a.manifest.localeCompare(b.manifest, 'en')
		);
		assert.deepEqual(stack_snapshot.edges, sorted);
	});

	test('the edges outside the dev tables have no cycle', () => {
		const declared = stack_snapshot.edges.filter((e) => !dep_edge_is_dev(e));
		assert.ok(declared.length > 0);
		const uses: Map<string, Set<string>> = new Map();
		for (const e of declared) uses.set(e.from, (uses.get(e.from) ?? new Set()).add(e.to));
		const visiting: Set<string> = new Set();
		const done: Set<string> = new Set();
		const visit = (name: string, path: Array<string>): void => {
			if (done.has(name)) return;
			assert.ok(!visiting.has(name), `a cycle: ${[...path, name].join(' -> ')}`);
			visiting.add(name);
			for (const next of uses.get(name) ?? []) visit(next, [...path, name]);
			visiting.delete(name);
			done.add(name);
		};
		for (const name of names) visit(name, []);
	});
});

describe('project dependencies', () => {
	test("every edge is one project's use and another's consumer, strongest kind first", () => {
		let seen = 0;
		for (const project of projects) {
			for (const edges of [project_uses(project), project_used_by(project)]) {
				seen += edges.length;
				const kinds = edges.map((e) => dep_kinds.indexOf(e.kind));
				assert.deepEqual(
					kinds,
					kinds.toSorted((a, b) => a - b),
					project.name
				);
			}
		}
		assert.strictEqual(seen, stack_snapshot.edges.length * 2);
	});

	// a control with a known answer: gro is built with tsv, and no manifest depends on the template
	test('known edges are where they should be', () => {
		const find = (name: string) => project_pages.find((p) => p.project.name === name)!;
		assert.ok(find('tsv').used_by.some((e) => e.from === 'gro' && e.kind === 'runtime'));
		assert.ok(find('gro').uses.some((e) => e.to === 'tsv'));
		assert.deepEqual(find('fuz_template').used_by, []);
	});

	test('every project has a page whose sections include its repo commands', () => {
		for (const page of project_pages) {
			assert.ok('commands' in page.sections, page.project.name);
		}
	});
});
