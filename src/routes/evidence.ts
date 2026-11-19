/**
 * Checks that the evidence links on the `/coherence` and `/values` pages point at
 * something that exists: a file in a sibling checkout, or a skill doc or page on this
 * site, and for Markdown the heading the link's fragment names.
 *
 * The pages' claims are about other repos, so this repo's own gate cannot see them go
 * stale. This is the instrument for that, run where the sibling checkouts are.
 *
 * What it cannot see: it reads each checkout's working tree, so a file that is not yet
 * committed or pushed passes, and it cannot tell a private repo from a public one. It
 * holds the repos the links name to the Fuz stack page's, and never reads a project's
 * name out of prose.
 *
 * @module
 */

import type { FsReadDir } from '@fuzdev/gro/fs.ts';
import { mdz_parse, type MdzNode } from '@fuzdev/mdz/mdz.ts';

/** An mdz string from a page's data that carries links, with the record it belongs to. */
export interface EvidenceEntry {
	/** The record the entry belongs to, for a failure message. */
	record: string;
	content: string;
}

/** Where an evidence link leads. */
export type EvidenceTarget =
	| {
			kind: 'repo_file';
			owner: string;
			repo: string;
			/** The branch the link names, or `null` for a link to the repo itself. */
			ref: string | null;
			path: string;
			fragment: string | null;
	  }
	| { kind: 'route'; path: string; fragment: string | null }
	| { kind: 'external'; url: string };

/** One evidence link, with the record it came from. */
export interface EvidenceLink {
	/** The record the link belongs to, for a failure message. */
	record: string;
	reference: string;
}

export type EvidenceVerdict =
	/** The file exists, and so does the heading or line when the link names one. */
	| 'ok'
	/** No checkout of the repo is beside this one. */
	| 'missing_repo'
	/** The checkout's remote is not the owner and repo the link names. */
	| 'wrong_owner'
	/** The link names a branch other than the one the checkouts are read at. */
	| 'wrong_ref'
	| 'missing_file'
	| 'missing_fragment'
	/**
	 * Nothing on disk can confirm it: another site, or a fragment in a file that is not
	 * Markdown or on a page that is not a skill doc.
	 */
	| 'unchecked';

export interface EvidenceResult extends EvidenceLink {
	verdict: EvidenceVerdict;
}

/** Whether a verdict fails the check. Only a link nothing on disk can confirm is let through. */
export const evidence_verdict_fails = (verdict: EvidenceVerdict): boolean =>
	verdict !== 'ok' && verdict !== 'unchecked';

export interface EvidenceCheckOptions {
	/** The directory holding this repo and its siblings, each under its repo name. */
	repos_dir: Pick<FsReadDir, 'exists' | 'read_text_if_exists'>;
	/** This repo's name in `repos_dir`, where a route's skill doc is read from. */
	site_repo: string;
}

/** The branch a link to a file must name, which is the one a checkout is expected to be on. */
const EVIDENCE_REF = 'main';

const GITHUB_FILE =
	/^https:\/\/github\.com\/([^/#]+)\/([^/#]+)(?:\/blob\/([^/#]+)\/([^#]+))?(?:#(.*))?$/;

// a fragment that is not valid percent-encoding is kept as written, and then matches no heading
const decode_fragment = (fragment: string): string => {
	try {
		return decodeURIComponent(fragment);
	} catch {
		return fragment;
	}
};

/**
 * Sorts a link's reference into a file in a repo, a route on this site, or another site.
 * A link to a repo's root is a link to its README.
 */
export const evidence_target_parse = (reference: string): EvidenceTarget => {
	if (reference.startsWith('/')) {
		const [path, fragment] = reference.split('#');
		return { kind: 'route', path: path!, fragment: fragment ?? null };
	}
	const match = GITHUB_FILE.exec(reference);
	if (!match) return { kind: 'external', url: reference };
	return {
		kind: 'repo_file',
		owner: match[1]!,
		repo: match[2]!,
		ref: match[3] ?? null,
		path: match[4] ?? 'README.md',
		fragment: match[5] ? decode_fragment(match[5]) : null
	};
};

// what GitHub drops from a heading before slugging it, beyond the punctuation the slug
// itself drops: a link's url, inline HTML, and the underscores of emphasis, which are
// the ones at a word's edges and never the ones inside a snake_case name
const heading_text = (raw: string): string =>
	raw
		.replace(/\s+#+\s*$/, '')
		.replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
		.replace(/<[^>]+>/g, '')
		.replace(/(^|[\s(])_{1,2}(?=\S)([^_]*?\S)_{1,2}(?=$|[\s).,:;!?])/g, '$1$2')
		.trim();

/**
 * The fragment ids GitHub gives a Markdown file's headings: lowercased, punctuation
 * dropped, each space a hyphen, and a repeated heading numbered from the second on,
 * skipping a number an earlier heading already took.
 *
 * Reads `#` headings only, so a setext heading (underlined with `=` or `-`) has no id
 * here and a link to one fails.
 */
export const github_heading_slugs = (markdown: string): Set<string> => {
	const slugs: Set<string> = new Set();
	const counts: Map<string, number> = new Map();
	// the open fence's marker, which only a bare run of the same character at least as
	// long closes: a closing fence carries no info string
	let fence: string | null = null;
	for (const line of markdown.split('\n')) {
		if (fence === null) {
			const open = /^ {0,3}(`{3,}|~{3,})/.exec(line);
			if (open) {
				fence = open[1]!;
				continue;
			}
		} else {
			const close = /^ {0,3}(`{3,}|~{3,})\s*$/.exec(line)?.[1];
			if (close !== undefined && close[0] === fence[0] && close.length >= fence.length) {
				fence = null;
			}
			continue;
		}
		const heading = /^ {0,3}#{1,6}\s+(.+)$/.exec(line);
		if (!heading) continue;
		const base = heading_text(heading[1]!)
			.toLowerCase()
			.replace(/[^\p{L}\p{M}\p{N}\p{Pc}\- ]/gu, '')
			.replace(/ /g, '-');
		let slug = base;
		let count = counts.get(base) ?? 0;
		while (slugs.has(slug)) {
			count++;
			slug = `${base}-${count}`;
		}
		counts.set(base, count);
		slugs.add(slug);
	}
	return slugs;
};

const collect_references = (nodes: Array<MdzNode>, references: Array<string> = []) => {
	for (const node of nodes) {
		if (node.type === 'Link') references.push(node.reference);
		if ('children' in node) collect_references(node.children, references);
	}
	return references;
};

const collect_heading_ids = (nodes: Array<MdzNode>, ids: Set<string> = new Set()) => {
	for (const node of nodes) {
		if (node.type === 'Heading') ids.add(node.id);
		if ('children' in node) collect_heading_ids(node.children, ids);
	}
	return ids;
};

/** The fragment ids this site gives a skill doc's headings, which are mdz's and not GitHub's. */
export const mdz_heading_ids = (content: string): Set<string> =>
	collect_heading_ids(mdz_parse(content));

const SKILL_ROUTE = /^\/skills\/([^/]+)(?:\/references\/([^/]+))?$/;

/**
 * The skill doc a route on this site renders, as a path in this repo.
 *
 * @returns `null` for a route that renders no skill doc
 */
export const route_to_skill_doc = (path: string): string | null => {
	const match = SKILL_ROUTE.exec(path);
	if (!match) return null;
	return match[2] ? `skills/${match[1]}/references/${match[2]}.md` : `skills/${match[1]}/SKILL.md`;
};

/**
 * The file in this repo that renders a static route's page. A route with a parameter
 * has no such file, so a link to one reads as missing.
 */
export const route_to_page_file = (path: string): string =>
	`src/routes${path.replace(/\/+$/, '')}/+page.svelte`;

/** Every link in an mdz string. */
export const mdz_references = (content: string): Array<string> =>
	collect_references(mdz_parse(content));

/** The links in a list of mdz entries, each with its entry's record. */
export const entries_to_links = (entries: Array<EvidenceEntry>): Array<EvidenceLink> =>
	entries.flatMap(({ record, content }) =>
		mdz_references(content).map((reference) => ({ record, reference }))
	);

/**
 * The names of the projects the Fuz stack page announces, read from its data file's
 * source. A project is a `name` followed by a `tagline`, which a group of projects lacks.
 */
export const stack_page_project_names = (source: string): Set<string> =>
	new Set(Array.from(source.matchAll(/\bname: '([^']+)',\s+tagline:/g), (m) => m[1]!));

/**
 * Each project the Fuz stack page announces with its repo, read from its data file's
 * source: a project's `repo` is the one written after its `name` and before the next.
 */
export const stack_page_project_repos = (source: string): Map<string, string> => {
	const projects = Array.from(source.matchAll(/\bname: '([^']+)',\s+tagline:/g));
	const result: Map<string, string> = new Map();
	for (const [index, match] of projects.entries()) {
		const chunk = source.slice(match.index, projects[index + 1]?.index);
		const repo = /\brepo: github\('([^']+)'\)/.exec(chunk)?.[1];
		if (repo !== undefined) result.set(match[1]!, repo);
	}
	return result;
};

/**
 * The repos the Fuz stack page announces, read from its data file's source: each
 * project's `repo`, and the repo of a project's site, which is named for the site's
 * host. A site without a repo of its own adds a name no link uses.
 */
export const stack_page_repo_names = (source: string): Set<string> =>
	new Set([
		...Array.from(source.matchAll(/\brepo: github\('([^']+)'\)/g), (m) => m[1]!),
		...Array.from(source.matchAll(/\bsite: 'https:\/\/([^/']+)/g), (m) => m[1]!)
	]);

/** The links to a file in a repo that is not `owner`'s or that `announced` leaves out. */
export const links_outside_repos = (
	links: Array<EvidenceLink>,
	owner: string,
	announced: ReadonlySet<string>
): Array<EvidenceLink> =>
	links.filter((link) => {
		const target = evidence_target_parse(link.reference);
		return target.kind === 'repo_file' && (target.owner !== owner || !announced.has(target.repo));
	});

// whether a checkout's git config names `owner/repo` on GitHub as a remote
const remote_matches = (git_config: string, owner: string, repo: string): boolean => {
	for (const line of git_config.split('\n')) {
		const url = /^\s*url\s*=\s*(\S+)/.exec(line)?.[1];
		if (!url) continue;
		const match = /github\.com[:/]([^/]+)\/(.+?)(?:\.git)?\/?$/.exec(url);
		if (match?.[1] === owner && match[2] === repo) return true;
	}
	return false;
};

/**
 * Checks each link against the files on disk: a repo link against that repo's checkout,
 * and a route on this site against the skill doc or page it renders.
 *
 * @returns one result per link, in order
 */
export const evidence_check = async (
	links: Array<EvidenceLink>,
	options: EvidenceCheckOptions
): Promise<Array<EvidenceResult>> => {
	const { repos_dir, site_repo } = options;
	const results: Array<EvidenceResult> = [];
	for (const link of links) {
		const target = evidence_target_parse(link.reference);
		let verdict: EvidenceVerdict;
		if (target.kind === 'external') {
			verdict = 'unchecked';
		} else if (target.kind === 'route') {
			const doc = route_to_skill_doc(target.path);
			if (doc === null) {
				// a page's anchors are in its markup, which is not read here
				if (!(await repos_dir.exists(`${site_repo}/${route_to_page_file(target.path)}`))) {
					verdict = 'missing_file';
				} else {
					verdict = target.fragment === null ? 'ok' : 'unchecked';
				}
			} else {
				const text = await repos_dir.read_text_if_exists(`${site_repo}/${doc}`);
				if (text === null) {
					verdict = 'missing_file';
				} else if (target.fragment === null || mdz_heading_ids(text).has(target.fragment)) {
					verdict = 'ok';
				} else {
					verdict = 'missing_fragment';
				}
			}
		} else if (!(await repos_dir.exists(target.repo))) {
			verdict = 'missing_repo';
		} else if (target.ref !== null && target.ref !== EVIDENCE_REF) {
			verdict = 'wrong_ref';
		} else {
			// a worktree's `.git` is a file, and then there is no config here to hold the link to
			const git_config = await repos_dir
				.read_text_if_exists(`${target.repo}/.git/config`)
				.catch(() => null);
			const text = await repos_dir.read_text_if_exists(`${target.repo}/${target.path}`);
			if (git_config !== null && !remote_matches(git_config, target.owner, target.repo)) {
				verdict = 'wrong_owner';
			} else if (text === null) {
				verdict = 'missing_file';
			} else if (target.fragment === null) {
				verdict = 'ok';
			} else if (/^L\d+$/.test(target.fragment)) {
				const line = Number(target.fragment.slice(1));
				verdict = line >= 1 && line <= text.split('\n').length ? 'ok' : 'missing_fragment';
			} else if (target.path.endsWith('.md')) {
				verdict = github_heading_slugs(text).has(target.fragment) ? 'ok' : 'missing_fragment';
			} else {
				verdict = 'unchecked';
			}
		}
		results.push({ ...link, verdict });
	}
	return results;
};
