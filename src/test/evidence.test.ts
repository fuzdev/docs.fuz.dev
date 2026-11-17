import { describe, test, assert } from 'vitest';
import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { coherence_entries } from '#routes/coherence/coherence.ts';
import {
	entries_to_links,
	evidence_check,
	evidence_target_parse,
	evidence_verdict_fails,
	github_heading_slugs,
	mdz_heading_ids,
	mdz_references,
	route_to_page_file,
	route_to_skill_doc,
	stack_page_project_names,
	type EvidenceCheckOptions,
	type EvidenceLink
} from '#routes/evidence.ts';
import { values_entries } from '#routes/values/values.ts';

// a `repos_dir` over an in-memory tree of `repo/path` to file text
const fake_repos_dir = (files: Record<string, string>): EvidenceCheckOptions['repos_dir'] => ({
	exists: async (path) => Object.keys(files).some((f) => f === path || f.startsWith(`${path}/`)),
	read_text_if_exists: async (path) => files[path] ?? null
});

const git_config = (owner: string, repo: string): string =>
	`[core]\n\tbare = false\n[remote "origin"]\n\turl = git@github.com:${owner}/${repo}.git\n`;

const link = (reference: string): EvidenceLink => ({ record: 'test', reference });

describe('evidence_target_parse', () => {
	test('reads the owner, repo, branch, file and fragment from a GitHub link', () => {
		assert.deepEqual(
			evidence_target_parse('https://github.com/fuzdev/tsv/blob/main/docs/audits.md#overview'),
			{
				kind: 'repo_file',
				owner: 'fuzdev',
				repo: 'tsv',
				ref: 'main',
				path: 'docs/audits.md',
				fragment: 'overview'
			}
		);
	});

	test('treats a link to a repo as a link to its README, on no named branch', () => {
		assert.deepEqual(evidence_target_parse('https://github.com/fuzdev/fuz_schema'), {
			kind: 'repo_file',
			owner: 'fuzdev',
			repo: 'fuz_schema',
			ref: null,
			path: 'README.md',
			fragment: null
		});
	});

	test('keeps the dots in a repo name', () => {
		const target = evidence_target_parse(
			'https://github.com/fuzdev/tsv.fuz.dev/blob/main/CLAUDE.md#benchmarks'
		);
		assert.ok(target.kind === 'repo_file');
		assert.strictEqual(target.repo, 'tsv.fuz.dev');
	});

	test('keeps a fragment that is not valid percent-encoding as written', () => {
		const target = evidence_target_parse('https://github.com/x/tsv/blob/main/a.md#50%-off');
		assert.ok(target.kind === 'repo_file');
		assert.strictEqual(target.fragment, '50%-off');
	});

	test('splits a route on this site from its fragment', () => {
		assert.deepEqual(evidence_target_parse('/skills/grimoire#health'), {
			kind: 'route',
			path: '/skills/grimoire',
			fragment: 'health'
		});
		assert.deepEqual(evidence_target_parse('/skills/fuz-stack'), {
			kind: 'route',
			path: '/skills/fuz-stack',
			fragment: null
		});
	});

	test('leaves any other site as external', () => {
		assert.deepEqual(evidence_target_parse('https://tsv.fuz.dev/docs/benchmarks'), {
			kind: 'external',
			url: 'https://tsv.fuz.dev/docs/benchmarks'
		});
	});
});

describe('github_heading_slugs', () => {
	test('lowercases, drops punctuation, and turns each space into a hyphen', () => {
		const slugs = github_heading_slugs(
			[
				'# Pinned Gate Counts',
				'## Raw-Find Scan Audit (`scan:audit`)',
				'## Steps 3-4: See It Fail + Approval Gate',
				'### `--new-branch`',
				'## 0.205.0',
				'## snake_case stays'
			].join('\n')
		);
		assert.deepEqual(
			[...slugs],
			[
				'pinned-gate-counts',
				'raw-find-scan-audit-scanaudit',
				// the dropped `+` leaves its two spaces, so two hyphens
				'steps-3-4-see-it-fail--approval-gate',
				'--new-branch',
				'02050',
				'snake_case-stays'
			]
		);
	});

	test('numbers a repeated heading from the second on', () => {
		assert.deepEqual(
			[...github_heading_slugs('## Rules\n\n## Rules\n\n## Rules')],
			['rules', 'rules-1', 'rules-2']
		);
	});

	test('skips a number that an earlier heading already took', () => {
		assert.deepEqual(
			[...github_heading_slugs('## Rules 1\n\n## Rules\n\n## Rules')],
			['rules-1', 'rules', 'rules-2']
		);
	});

	test('slugs the text of a linked heading, not its url', () => {
		assert.deepEqual(
			[...github_heading_slugs('## See [the docs](https://example.com/a-b)')],
			['see-the-docs']
		);
	});

	test('drops the underscores of emphasis and keeps the ones inside a name', () => {
		assert.deepEqual(
			[...github_heading_slugs('## _foo_ bar\n\n## the __bold__ one\n\n## a snake_case_name')],
			['foo-bar', 'the-bold-one', 'a-snake_case_name']
		);
	});

	test('drops inline HTML', () => {
		assert.deepEqual([...github_heading_slugs('## Notes <a id="x"></a>')], ['notes']);
	});

	test('reads a heading indented by up to three spaces', () => {
		assert.deepEqual([...github_heading_slugs('   ## indented\n    ## code')], ['indented']);
	});

	test('ignores a heading inside a code fence', () => {
		assert.deepEqual([...github_heading_slugs('```md\n# not a heading\n```\n\n# real')], ['real']);
	});

	test('closes a fence only on a run at least as long, of the same character', () => {
		const markdown = [
			'````md',
			'```',
			'# still inside the four',
			'```',
			'~~~~',
			'# still inside',
			'````',
			'# out'
		].join('\n');
		assert.deepEqual([...github_heading_slugs(markdown)], ['out']);
	});

	test('does not close a fence on a line with an info string', () => {
		const markdown = ['```', '```ts', '# still inside', '```', '# out'].join('\n');
		assert.deepEqual([...github_heading_slugs(markdown)], ['out']);
	});
});

describe('route_to_skill_doc', () => {
	test('maps a skill and a reference to their files', () => {
		assert.strictEqual(route_to_skill_doc('/skills/grimoire'), 'skills/grimoire/SKILL.md');
		assert.strictEqual(
			route_to_skill_doc('/skills/fuz-stack/references/twin-impl'),
			'skills/fuz-stack/references/twin-impl.md'
		);
	});

	test('returns null for a route that renders no skill doc', () => {
		assert.strictEqual(route_to_skill_doc('/coherence'), null);
		assert.strictEqual(route_to_skill_doc('/skills'), null);
		assert.strictEqual(route_to_skill_doc('/skills/fuz-stack/references'), null);
	});
});

describe('route_to_page_file', () => {
	test('maps a route, with or without a trailing slash, to its page file', () => {
		assert.strictEqual(route_to_page_file('/values'), 'src/routes/values/+page.svelte');
		assert.strictEqual(route_to_page_file('/tools/hash/'), 'src/routes/tools/hash/+page.svelte');
		assert.strictEqual(route_to_page_file('/'), 'src/routes/+page.svelte');
	});
});

describe('evidence_check', () => {
	const options: EvidenceCheckOptions = {
		site_repo: 'site',
		repos_dir: fake_repos_dir({
			'tsv/.git/config': git_config('fuzdev', 'tsv'),
			'tsv/docs/audits.md': '# Audits\n\n## Overview\n',
			'tsv/src/lib.rs': 'fn main() {}\n',
			// a checkout with no readable config, as a worktree has
			'bare/README.md': '# Bare\n',
			'site/skills/grimoire/SKILL.md': '# Grimoire\n\n## Health\n',
			'site/src/routes/coherence/+page.svelte': '<main></main>\n'
		})
	};
	const verdict = async (reference: string) =>
		(await evidence_check([link(reference)], options))[0]!.verdict;

	test('passes a file, a heading and a line that exist', async () => {
		assert.strictEqual(
			await verdict('https://github.com/fuzdev/tsv/blob/main/docs/audits.md'),
			'ok'
		);
		assert.strictEqual(
			await verdict('https://github.com/fuzdev/tsv/blob/main/docs/audits.md#overview'),
			'ok'
		);
		assert.strictEqual(
			await verdict('https://github.com/fuzdev/tsv/blob/main/src/lib.rs#L1'),
			'ok'
		);
	});

	test('passes a checkout whose remote it cannot read', async () => {
		assert.strictEqual(await verdict('https://github.com/anyone/bare'), 'ok');
	});

	// the control cases: a checker that cannot fail proves nothing by passing
	test('fails a repo that is not checked out', async () => {
		assert.strictEqual(
			await verdict('https://github.com/fuzdev/gone/blob/main/README.md'),
			'missing_repo'
		);
	});

	test('fails a link whose owner is not the checkout remote', async () => {
		assert.strictEqual(
			await verdict('https://github.com/someone/tsv/blob/main/docs/audits.md'),
			'wrong_owner'
		);
	});

	test('fails a link to another branch', async () => {
		assert.strictEqual(
			await verdict('https://github.com/fuzdev/tsv/blob/next/docs/audits.md'),
			'wrong_ref'
		);
	});

	test('fails a file that is not there', async () => {
		assert.strictEqual(
			await verdict('https://github.com/fuzdev/tsv/blob/main/docs/moved.md'),
			'missing_file'
		);
	});

	test('fails a heading that is not there, and a line past the end', async () => {
		assert.strictEqual(
			await verdict('https://github.com/fuzdev/tsv/blob/main/docs/audits.md#renamed'),
			'missing_fragment'
		);
		assert.strictEqual(
			await verdict('https://github.com/fuzdev/tsv/blob/main/src/lib.rs#L99'),
			'missing_fragment'
		);
	});

	test('checks a route against the skill doc it renders', async () => {
		assert.strictEqual(await verdict('/skills/grimoire#health'), 'ok');
		assert.strictEqual(await verdict('/skills/grimoire#gone'), 'missing_fragment');
		assert.strictEqual(await verdict('/skills/gone'), 'missing_file');
	});

	test('checks any other route against its page file, and leaves its anchors unchecked', async () => {
		assert.strictEqual(await verdict('/coherence'), 'ok');
		assert.strictEqual(await verdict('/coherence#grid'), 'unchecked');
		assert.strictEqual(await verdict('/gone'), 'missing_file');
	});

	test('reports what the disk cannot confirm as unchecked', async () => {
		assert.strictEqual(await verdict('https://tsv.fuz.dev/docs/benchmarks'), 'unchecked');
		assert.strictEqual(
			await verdict('https://github.com/fuzdev/tsv/blob/main/src/lib.rs#some-symbol'),
			'unchecked'
		);
	});
});

describe('mdz_heading_ids', () => {
	test('gives the ids the skill pages render, which collapse where GitHub does not', () => {
		const content = '## Steps 3-4: See It Fail + Approval Gate';
		assert.deepEqual([...mdz_heading_ids(content)], ['steps-3-4-see-it-fail-approval-gate']);
	});
});

describe('mdz_references', () => {
	test('finds each link in a string', () => {
		assert.deepEqual(mdz_references('The [a](/skills/x) and [b](https://example.com/b)'), [
			'/skills/x',
			'https://example.com/b'
		]);
	});
});

describe('evidence_verdict_fails', () => {
	test('lets through only what resolves or cannot be checked from disk', () => {
		assert.ok(!evidence_verdict_fails('ok'));
		assert.ok(!evidence_verdict_fails('unchecked'));
		assert.ok(evidence_verdict_fails('missing_file'));
		assert.ok(evidence_verdict_fails('wrong_ref'));
	});
});

describe('stack_page_project_names', () => {
	test('reads the projects and not the groups that hold them', () => {
		const source = `[
	{
		name: 'data',
		blurb: 'A group.',
		pieces: [
			{
				name: 'pglet',
				tagline: 'a project'
			},
			{ name: 'blake3', tagline: 'another' }
		]
	}
]`;
		assert.deepEqual([...stack_page_project_names(source)], ['pglet', 'blake3']);
	});
});

describe("the pages' data", () => {
	const entries = [...coherence_entries(), ...values_entries()];
	const links = entries_to_links(entries);

	test('every entry links exactly one artifact, by https or a route on this site', () => {
		for (const { record, content } of entries) {
			const references = mdz_references(content);
			assert.strictEqual(references.length, 1, `${record}: "${content}"`);
			const target = evidence_target_parse(references[0]!);
			if (target.kind === 'external') {
				assert.match(target.url, /^https:\/\/[^\s)]+$/, `${record}: ${target.url}`);
			}
		}
	});

	// counted a second way, from the text, so a link the parser drops is a failure here
	test('every link written in the data is one the checker sees', () => {
		const written = entries.reduce((n, e) => n + (e.content.match(/\]\(/g)?.length ?? 0), 0);
		assert.ok(written > 0);
		assert.strictEqual(links.length, written);
	});

	// the sibling repos are not in CI, so only this site's own routes are checked here;
	// `evidence_check.task.ts` checks the rest where the siblings are checked out
	test('links to this site resolve', async () => {
		const routes = links.filter((l) => evidence_target_parse(l.reference).kind === 'route');
		assert.ok(routes.length > 0);
		const to_path = (path: string) => join(process.cwd(), path.replace(/^site\//, ''));
		const results = await evidence_check(routes, {
			site_repo: 'site',
			repos_dir: {
				exists: async (path) =>
					access(to_path(path)).then(
						() => true,
						() => false
					),
				read_text_if_exists: async (path) => readFile(to_path(path), 'utf8').catch(() => null)
			}
		});
		const failed = results.filter((r) => evidence_verdict_fails(r.verdict));
		assert.deepEqual(failed, []);
	});
});
