import { describe, test, assert } from 'vitest';

import { gates } from '#routes/coherence/coherence.ts';
import { project_lens_sections } from '#routes/projects/project_lens.ts';
import { project_pages } from '#routes/projects/project_page.ts';
import { project_views } from '#routes/projects/project_views.ts';
import { repo_class_ids, repo_classes } from '#routes/projects/repo_classes.ts';
import {
	class_repos,
	project_used_by,
	project_uses,
	snapshot_missing_projects,
	stack_actions,
	stack_facets,
	stack_snapshot,
	stack_third_party
} from '#routes/projects/stack_data.ts';
import { dep_edge_is_dev, dep_kinds, type StackRepo } from '#routes/projects/stack_snapshot.ts';
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

describe('stack_snapshot, what each repo declares and runs', () => {
	test('every repo was read at a commit', () => {
		for (const r of stack_snapshot.repos) assert.match(r.commit, /^[0-9a-f]{40}$/, r.repo);
	});

	test('a step is one command or one action, and only an action is pinned', () => {
		for (const r of stack_snapshot.repos) {
			for (const workflow of r.workflows) {
				const where = `${r.repo}/${workflow.file}`;
				assert.ok(workflow.on.length > 0, `${where} has no trigger`);
				assert.ok(workflow.jobs.length > 0, `${where} has no job`);
				for (const job of workflow.jobs) {
					assert.ok(job.steps.length > 0, `${where}: ${job.id} has no step`);
					for (const step of job.steps) {
						assert.notStrictEqual(step.run === undefined, step.uses === undefined, where);
						assert.strictEqual(step.pin !== undefined, step.uses !== undefined, where);
						// the ref is not kept, so an upgrade of an action does not move the snapshot
						if (step.pin !== 'local') assert.notInclude(step.uses ?? '', '@', where);
					}
				}
			}
		}
	});

	test('what a repo declares from outside is sorted, once per manifest, and never from a dev table', () => {
		const stack_packages = new Set(stack_snapshot.edges.flatMap((e) => e.via));
		for (const r of stack_snapshot.repos) {
			const keys = r.third_party.map((d) => `${d.name}|${d.manifest}`);
			assert.strictEqual(new Set(keys).size, keys.length, r.repo);
			assert.deepEqual(
				r.third_party.map((d) => d.name),
				r.third_party.map((d) => d.name).toSorted((a, b) => a.localeCompare(b, 'en')),
				r.repo
			);
			for (const d of r.third_party) {
				assert.notStrictEqual(d.kind, 'dev', `${r.repo}: ${d.name}`);
				assert.ok(!d.name.startsWith('@fuzdev/'), `${r.repo}: ${d.name}`);
				if (d.manifest === 'npm') assert.ok(!stack_packages.has(d.name), `${r.repo}: ${d.name}`);
			}
		}
	});

	test('a check line is a commented command at a line of the file', () => {
		for (const r of stack_snapshot.repos) {
			for (const line of r.check_lines ?? []) {
				assert.ok(line.line >= 1 && Number.isInteger(line.line), r.repo);
				assert.ok(line.command.trim() !== '' && line.comment.trim() !== '', r.repo);
			}
		}
	});

	// controls with known answers, so a view that silently lists nothing fails here
	test('the views over the snapshot find what is known to be there', () => {
		const third_party = stack_third_party();
		const svelte = third_party.find((use) => use.name === 'svelte' && use.manifest === 'npm');
		assert.ok(svelte && svelte.repos.some(({ repo }) => repo.repo === 'fuz_ui'));
		assert.ok(third_party[0]!.repos.length >= third_party.at(-1)!.repos.length);
		// the schema library's own invariant: it asks a consumer to install nothing
		const schema = stack_snapshot.repos.find((r) => r.repo === 'fuz_schema')!;
		assert.deepEqual(
			schema.third_party.filter((d) => d.manifest === 'npm'),
			[]
		);
		const checkout = stack_actions().find((action) => action.uses === 'actions/checkout');
		assert.ok(checkout && checkout.repos.length > 1);
	});
});

describe('repo classes', () => {
	const members = (id: (typeof repo_class_ids)[number]): Array<string> =>
		class_repos(id).map((r) => r.repo);

	test('each class has the members that are known to be in it, and not the ones known to be out', () => {
		assert.include(members('check_gro'), 'fuz_ui');
		assert.notInclude(members('check_gro'), 'tsv');
		// corpora checks the workspace in CI, without building, and has no exports map
		assert.include(members('ci_gro_workspace'), 'corpora');
		assert.notInclude(members('ci_gro_build'), 'corpora');
		assert.notInclude(members('ci_gro_exports'), 'corpora');
		assert.include(members('ci_gro_build'), 'fuz_ui');
		assert.include(members('ci_gro_exports'), 'fuz_ui');
		// a site is no library
		assert.notInclude(members('ci_gro_exports'), 'docs.fuz.dev');
		assert.include(members('cargo'), 'fuz');
		assert.notInclude(members('cargo'), 'fuz_ui');
		assert.include(members('no_ci'), 'blake3');
	});

	test('a class reads the commands a change is held to, and not a comment or a manual run', () => {
		const base = stack_snapshot.repos.find((r) => r.repo === 'fuz_ui')!;
		const with_step = (run: string, event = 'push', continue_on_error?: string): StackRepo => ({
			...base,
			workflows: [
				{
					file: 'check.yml',
					on: [{ event }],
					jobs: [{ id: 'build', runs_on: 'x', steps: [{ run, continue_on_error }] }]
				}
			]
		});
		const { ci_gro_workspace, ci_gro_build } = repo_classes;
		assert.ok(ci_gro_workspace.has(with_step('npx gro check --workspace')));
		assert.ok(!ci_gro_workspace.has(with_step('npx gro check')));
		assert.ok(!ci_gro_workspace.has(with_step('# gro check --workspace runs elsewhere')));
		assert.ok(!ci_gro_workspace.has(with_step('npx gro check --workspace', 'workflow_dispatch')));
		assert.ok(!ci_gro_workspace.has(with_step('npx gro check --workspace', 'push', 'true')));
		assert.ok(ci_gro_build.has(with_step('npx gro check --workspace --build')));
		assert.ok(!ci_gro_build.has(with_step('npx gro check --build-only')));
	});

	test('a gate that speaks of a class names one with members', () => {
		const classed = gates.filter((g) => g.where_class !== undefined);
		assert.ok(classed.length > 0);
		for (const g of classed) assert.ok(class_repos(g.where_class!).length > 0, g.gate);
	});
});

describe('stack_facets', () => {
	test("it files this site's projects, in order, each under a layer, status and languages it defines", () => {
		assert.match(stack_facets.checked, /^\d{4}-\d{2}-\d{2}$/);
		assert.match(stack_facets.commit, /^[0-9a-f]{40}$/);
		assert.deepEqual(
			stack_facets.projects.map((p) => p.name),
			projects.map((p) => p.name)
		);
		const statuses = new Set(stack_facets.statuses.map((s) => s.id));
		const languages = new Set(stack_facets.languages.map((l) => l.id));
		for (const p of stack_facets.projects) {
			assert.include(stack_facets.layers, p.layer, p.name);
			assert.ok(statuses.has(p.status), p.name);
			for (const language of p.languages) assert.ok(languages.has(language), p.name);
			if (p.site !== null) assert.ok(URL.canParse(p.site), p.name);
		}
		// a layer with no project would be a heading over nothing
		for (const layer of stack_facets.layers) {
			assert.ok(
				stack_facets.projects.some((p) => p.layer === layer),
				layer
			);
		}
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
			assert.ok(page.facets, page.project.name);
		}
	});

	// a page lists its sections from one ordered list, so one the lens adds must be on it
	test('a page keeps every section its lens has', () => {
		for (const page of project_pages) {
			for (const id of Object.keys(project_lens_sections(page.lens))) {
				assert.ok(id in page.sections, `${page.project.name}: ${id}`);
			}
		}
	});

	test('a gate reaches a page by its class only when the lens does not already hold it', () => {
		const ui = project_pages.find((p) => p.project.name === 'fuz_ui')!;
		assert.ok(ui.class_gates.length > 0);
		assert.ok('gates' in ui.sections);
		for (const page of project_pages) {
			for (const { gate } of page.class_gates) {
				assert.notInclude(page.lens.gates, gate, page.project.name);
			}
		}
	});

	test('no stack-wide page takes a route a project would', () => {
		for (const view of project_views) {
			assert.ok(!names.has(view.path.slice('/projects/'.length)), view.path);
		}
	});
});
