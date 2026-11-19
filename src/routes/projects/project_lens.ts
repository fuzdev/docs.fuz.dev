/**
 * A project seen through the site's data: every record on the `/coherence`
 * and `/values` pages that names the project or links it. Computed, so a
 * project's page makes no claim the data pages do not.
 *
 * A record is searched whole, every string in it, so no field can be left
 * out. A record that speaks of a class of repos ("the TypeScript repos")
 * names no project and is in no lens. A record's probes are the exception:
 * their strings are commands and paths, where a project's name is only a
 * word in a command, so a probe counts by the repo it is of and nothing else.
 *
 * @module
 */

import { escape_regexp } from '@fuzdev/fuz_util/regexp.ts';

import {
	failure_holds,
	failures,
	intro,
	gate_gaps,
	gates,
	kept_actions,
	moved_rules,
	oracle_comparisons,
	type Failure,
	type Gate,
	type Hold,
	type KeptAction,
	type MovedRule,
	type OracleComparison,
	type RungId
} from '#routes/coherence/coherence.ts';
import type { Probe } from '#routes/probe.ts';
import { STACK_OWNER, type StackProject } from '#routes/stack_projects.ts';
import {
	contexts,
	decisions,
	efficiency,
	method,
	stated_orders,
	values,
	type Context,
	type Decision,
	type StatedOrder,
	type Value
} from '#routes/values/values.ts';

/** What the site's data says of one project. */
export interface ProjectLens {
	project: StackProject;
	/** The paragraphs of the coherence section's opening that name it, as mdz. */
	intro: Array<string>;
	/** The failures whose own name or summary names it, in grid order. */
	failures: Array<Failure>;
	/** The holds that name it, in grid order. */
	holds: Array<{ failure: Failure; rung: RungId; hold: Hold }>;
	comparisons: Array<OracleComparison>;
	gates: Array<Gate>;
	/** mdz, as the gates page lists them. */
	gate_gaps: Array<string>;
	kept_actions: Array<KeptAction>;
	moved_rules: Array<MovedRule>;
	/** The orders of priority that name it, which is its own when it states one. */
	stated_orders: Array<StatedOrder>;
	decisions: Array<Decision>;
	/** A decision that passes a value's question and names the project, as mdz, with the value. */
	passes: Array<{ value: Value; pass: string }>;
	/** The values whose shortfall names it. */
	shortfalls: Array<Value>;
	contexts: Array<Context>;
	/** mdz evidence for the values page's two passages that names it. */
	passage_evidence: Array<string>;
}

// the url of an mdz link, which is searched for a repo and never for a name
const LINK_URL = /\]\(([^)\s]*)\)/g;

// a name stands alone: not inside a longer name, a host, a path or a file name
const NAME_BEFORE = '(?<![\\w.\\-/@])';
const NAME_AFTER = '(?![\\w\\-]|\\.[a-z])';

interface ProjectMatcher {
	name: RegExp;
	repos: Array<RegExp>;
	routes: ReadonlyArray<string>;
}

const matchers: Map<StackProject, ProjectMatcher> = new Map();

const to_matcher = (project: StackProject): ProjectMatcher => {
	let matcher = matchers.get(project);
	if (!matcher) {
		const name = escape_regexp(project.name);
		matcher = {
			// the bare name, or the name as a package under the stack's npm scope
			name: new RegExp(`(?:${NAME_BEFORE}|@${STACK_OWNER}/)${name}${NAME_AFTER}`),
			repos: project.repos.map(
				(repo) => new RegExp(`github\\.com/${STACK_OWNER}/${escape_regexp(repo)}${NAME_AFTER}`)
			),
			routes: project.routes ?? []
		};
		matchers.set(project, matcher);
	}
	return matcher;
};

/**
 * Whether a text names a project or links it.
 *
 * A name counts as a whole lowercase word, so `fuz` is not found in `fuz_schema`,
 * `fuz-stack`, `fuz.dev` or `Fuz`, and never inside a link's url, where only a repo
 * of the project or a route of this site that renders it counts. A project whose
 * name is an ordinary word (`corpora`) is found wherever the word is written.
 */
export const text_mentions_project = (text: string, project: StackProject): boolean => {
	const matcher = to_matcher(project);
	const urls = Array.from(text.matchAll(LINK_URL), (m) => m[1]!);
	if (matcher.name.test(text.replace(LINK_URL, ']()'))) return true;
	return urls.some(
		(url) =>
			matcher.repos.some((repo) => repo.test(url)) ||
			matcher.routes.some((route) => url === route || url.startsWith(`${route}/`))
	);
};

/** The key a record keeps its probes under, at any depth. */
const PROBES_KEY = 'probes';

/** Every string in a record, however deep, leaving out its probes. */
export const record_strings = (record: unknown, strings: Array<string> = []): Array<string> => {
	if (typeof record === 'string') {
		strings.push(record);
	} else if (Array.isArray(record)) {
		for (const item of record) record_strings(item, strings);
	} else if (typeof record === 'object' && record !== null) {
		for (const [key, value] of Object.entries(record)) {
			if (key !== PROBES_KEY) record_strings(value, strings);
		}
	}
	return strings;
};

/** The repo of every probe in a record, however deep. */
export const record_probe_repos = (record: unknown, repos: Array<string> = []): Array<string> => {
	if (Array.isArray(record)) {
		for (const item of record) record_probe_repos(item, repos);
	} else if (typeof record === 'object' && record !== null) {
		for (const [key, value] of Object.entries(record)) {
			if (key === PROBES_KEY && Array.isArray(value)) {
				for (const probe of value as Array<Probe>) repos.push(probe.repo);
			} else {
				record_probe_repos(value, repos);
			}
		}
	}
	return repos;
};

/** Whether any string in a record names a project or links it, or a probe in it is of one of its repos. */
export const record_mentions_project = (record: unknown, project: StackProject): boolean =>
	record_strings(record).some((text) => text_mentions_project(text, project)) ||
	record_probe_repos(record).some((repo) => project.repos.includes(repo));

/** Everything the data pages say of a project. */
export const project_lens = (project: StackProject): ProjectLens => {
	const names = (record: unknown): boolean => record_mentions_project(record, project);
	return {
		project,
		intro: intro.filter(names),
		failures: failures.filter((f) => names([f.name, f.summary])),
		holds: failures.flatMap((failure) =>
			failure_holds(failure)
				.filter(({ hold }) => names(hold))
				.map(({ rung, hold }) => ({ failure, rung, hold }))
		),
		comparisons: oracle_comparisons.filter(names),
		gates: gates.filter(names),
		gate_gaps: gate_gaps.filter(names),
		kept_actions: kept_actions.filter(names),
		moved_rules: moved_rules.filter(names),
		stated_orders: stated_orders.filter(names),
		decisions: decisions.filter(names),
		passes: values.flatMap((value) => value.passes.filter(names).map((pass) => ({ value, pass }))),
		shortfalls: values.filter((value) => names(value.shortfall)),
		contexts: contexts.filter(names),
		passage_evidence: [...method.evidence, ...efficiency.evidence].filter(names)
	};
};

/** How many records a lens holds, which is zero for a project the data never names. */
export const project_lens_size = (lens: ProjectLens): number =>
	lens.intro.length +
	lens.failures.length +
	lens.holds.length +
	lens.comparisons.length +
	lens.gates.length +
	lens.gate_gaps.length +
	lens.kept_actions.length +
	lens.moved_rules.length +
	lens.stated_orders.length +
	lens.decisions.length +
	lens.passes.length +
	lens.shortfalls.length +
	lens.contexts.length +
	lens.passage_evidence.length;

/** A project page's sections that have something in them, each title by its anchor, in page order. */
export const project_lens_sections = (lens: ProjectLens): Record<string, string> => {
	const sections: Record<string, string> = {};
	if (lens.intro.length > 0) sections.opening = 'In the opening of the coherence section';
	if (lens.failures.length > 0 || lens.holds.length > 0) sections.holds = 'Holds that name it';
	if (lens.comparisons.length > 0) sections.oracles = 'Comparisons that name it';
	if (lens.gates.length > 0 || lens.gate_gaps.length > 0) sections.gates = 'Gates';
	if (lens.kept_actions.length > 0) sections.actions = 'Actions kept with a person';
	if (lens.moved_rules.length > 0) sections.moved = 'Rules that moved down';
	if (
		lens.stated_orders.length > 0 ||
		lens.decisions.length > 0 ||
		lens.passes.length > 0 ||
		lens.shortfalls.length > 0 ||
		lens.contexts.length > 0 ||
		lens.passage_evidence.length > 0
	) {
		sections.values = 'Values';
	}
	return sections;
};
