/**
 * The data behind the `/glossary` page: the words this site and the stack
 * use in a sense of their own, each with one definition.
 *
 * A definition is a claim about how a word is used. Each one either cites
 * the public place the stack defines or most clearly uses the word, or is
 * marked as this site's own usage. Where the sources use a word in more than
 * one sense, the entry says which sense it defines and names the others,
 * since pretending a word has one meaning helps no reader.
 * `src/routes/evidence_check.task.ts` resolves the sources.
 *
 * @module
 */

import type { EvidenceEntry } from '#routes/evidence.ts';

/** The headings the terms are listed under. */
export type GlossaryGroupId = 'rungs' | 'checks' | 'comparisons' | 'agents' | 'planning';

export interface GlossaryTerm {
	/** Also the term's anchor on the page. */
	id: string;
	term: string;
	group: GlossaryGroupId;
	/** What the word means here, as one or two sentences. */
	definition: string;
	/** Other senses the sources use the word in, or other words they use for this sense. */
	also?: string;
	/** mdz with one link, to where the word is defined or most clearly used. Absent for this site's own usage. */
	source?: string;
}

/** The day these definitions were last checked against their sources, as an ISO date. */
export const claims_checked = '2026-11-19';

/** Whether the maintainer has checked the definitions. */
export const reviewed: boolean = false;

/** The model that wrote this file and the page that renders it. */
export const written_by = 'Claude Fable 5.2';

/** The page's opening. */
export const intro =
	'The words this site and the stack use in a sense of their own. Each has one definition here, and where the stack defines the word or uses it clearly, the place it does. Where the sources use a word in more than one sense, the entry says so.';

/** In the order the page shows them. */
export const glossary_groups: Record<GlossaryGroupId, string> = {
	rungs: 'The ladder',
	checks: 'Checks',
	comparisons: 'Twins and comparisons',
	agents: 'Working with agents',
	planning: 'Planning'
};

export const glossary_group_ids = Object.keys(glossary_groups) as Array<GlossaryGroupId>;

/** Grouped, and within a group in the order the page shows them. */
export const glossary_terms: Array<GlossaryTerm> = [
	{
		id: 'coherence',
		term: 'coherence',
		group: 'rungs',
		definition:
			'Software that still reads as one design: one way to do each thing, one name for each concept, documents that are still true, and checks that mean what they say.',
		source: "This site's [coherence](/coherence) pages"
	},
	{
		id: 'failure',
		term: 'failure',
		group: 'rungs',
		definition: 'One way agent-written work goes wrong. A row of the coherence grid.',
		source: "This site's [coherence](/coherence) pages"
	},
	{
		id: 'hold',
		term: 'hold',
		group: 'rungs',
		definition: 'Whatever stops a failure or catches it. A cell of the coherence grid.',
		also: 'The repos tool also holds a push or a sync that it will not run yet, which is a different sense.',
		source: "This site's [coherence](/coherence) pages"
	},
	{
		id: 'ladder',
		term: 'ladder',
		group: 'rungs',
		definition:
			"The levels a hold can sit on, from a person's judgment down to the shape of the system, each depending less on anyone remembering than the one before.",
		also: 'The fuz-stack skill has ladders of its own, for styling and for dependency injection, which are unrelated to this one.',
		source: "This site's [coherence](/coherence) pages"
	},
	{
		id: 'rung',
		term: 'rung',
		group: 'rungs',
		definition:
			'One level of the ladder. From the top: a person decides each time, a session carries out a procedure, a written rule is loaded, a tool gives a verdict, and the shape of the system rules the failure out.',
		source: "This site's [coherence](/coherence) pages"
	},
	{
		id: 'coverage',
		term: 'coverage',
		group: 'rungs',
		definition:
			'How much of the stack has a hold: throughout, or in places. It says nothing of how strong the hold is, which is its rung.',
		also: 'Test coverage and conformance coverage are the usual senses, and the pages use those too.',
		source: "This site's [coherence](/coherence) pages"
	},
	{
		id: 'gate',
		term: 'gate',
		group: 'checks',
		definition: 'A check that gives a pass-or-fail verdict on a change.',
		also: 'On the values page a gate is a kind of value, one that has to hold before anything else is weighed. The skills also use the word for a check on a request at runtime.',
		source: "This site's table of [gates](/coherence/gates)"
	},
	{
		id: 'probe',
		term: 'probe',
		group: 'checks',
		definition:
			'A string that a named file, check script or CI step of a repo must have, or must not have, for a row of a table on this site to still stand. A probe that passes says the text is still there, not that the check it names is sound.',
		source: "This site's table of [gates](/coherence/gates)"
	},
	{
		id: 'local-gate',
		term: 'local gate',
		group: 'checks',
		definition:
			'The command a session runs in a repo before work counts as done, with its exit code as the pass condition. Often just "the gate".',
		source: 'The fuz-stack skill on [the gate](/skills/fuz-stack#the-gate)'
	},
	{
		id: 'release-audit',
		term: 'release audit',
		group: 'checks',
		definition:
			'A check that walks the dependency graph of every shipped binary and refuses a forbidden crate, a test-only feature, a broken layering rule, or a lint table that has drifted.',
		also: 'The skill names it by its command, check-release.',
		source:
			'The spine reference on [check-release](/skills/fuz-stack/references/rust-spine#check-release)'
	},
	{
		id: 'drift',
		term: 'drift',
		group: 'checks',
		definition:
			'Two things that are meant to match no longer matching: a generated file and its source, a column list and the live schema, two twins, a doc comment and the code.',
		also: 'The coherence pages also say that a design drifts, meaning it stops reading as one design.'
	},
	{
		id: 'fixture',
		term: 'fixture',
		group: 'checks',
		definition:
			'A test case kept as files: an input, and an expected output that a task generates and nobody edits by hand.',
		also: 'A shared JSON table of cases that two implementations both read is called a case table.',
		source:
			'The testing reference on [fixture tests](/skills/fuz-stack/references/testing-patterns#fixture-tests)'
	},
	{
		id: 'pinned-count',
		term: 'pinned count',
		group: 'checks',
		definition:
			'A committed number of cases a check is expected to grade or pass, so that the check fails when the number moves.',
		source:
			"tsv's [pinned gate counts](https://github.com/fuzdev/tsv/blob/main/docs/gate_counts.md#pinned-gate-counts)"
	},
	{
		id: 'ledger',
		term: 'ledger',
		group: 'checks',
		definition:
			'A committed list of known, accepted differences from an oracle, each recorded with a tracking id or a reason. A difference that is not on it fails, and so does an entry that no longer matches anything.',
		also: 'The sources also say catalog, recorded difference and declared difference for the same idea, and tsv has a ledger of comments that is something else.',
		source:
			'The twin reference on [enforcement](/skills/fuz-stack/references/twin-impl#enforcement)'
	},
	{
		id: 'mutant',
		term: 'mutant',
		group: 'checks',
		definition:
			'A small break made to the code on purpose, to check that some test fails because of it.',
		source:
			"fuz_schema's [mutants](https://github.com/fuzdev/fuz_schema/blob/main/docs/testing.md#mutants)"
	},
	{
		id: 'oracle',
		term: 'oracle',
		group: 'comparisons',
		definition:
			"What a project's output is compared against and expected to agree with: an independent implementation, an outside suite, a twin, another build, a property the output must satisfy, or an earlier version.",
		source: "This site's table of [oracles in use](/coherence/oracles)"
	},
	{
		id: 'twin',
		term: 'twin',
		group: 'comparisons',
		definition:
			'One of two separately written implementations of the same thing, held to the same observable behavior by shared tests. Most often a TypeScript one and a Rust one.',
		source: 'The [twin reference](/skills/fuz-stack/references/twin-impl)'
	},
	{
		id: 'reference-implementation',
		term: 'reference implementation',
		group: 'comparisons',
		definition:
			'An independent implementation outside the project that already has the right behavior, as Prettier is for the tsv formatter and Postgres is for pglet.',
		also: "The twin reference also calls the TypeScript server of a pair the reference server, though it is inside the project. A skill's reference docs are a different sense of the word."
	},
	{
		id: 'differential',
		term: 'differential',
		group: 'comparisons',
		definition:
			'A test that puts the same case to two implementations, normalizes the answers, and fails on a difference that is not declared.',
		source:
			'The twin reference on [enforcement](/skills/fuz-stack/references/twin-impl#enforcement)'
	},
	{
		id: 'cross-backend-suite',
		term: 'cross-backend suite',
		group: 'comparisons',
		definition:
			'A test suite whose same test bodies run against each backend of a server over real HTTP, WebSocket and SSE.',
		source:
			"fuz_app's [cross-backend tests](https://github.com/fuzdev/fuz_app/blob/main/src/test/CLAUDE.md#cross-backend-self-tests-srctestcross_backend)"
	},
	{
		id: 'spine',
		term: 'spine',
		group: 'comparisons',
		definition:
			'The shared backend layers an app server is built on: database, auth, HTTP, realtime and actions. They exist as fuz_app in TypeScript and as the spine crates of the fuz repo in Rust.',
		also: 'Some of the Rust docs mean only the Rust crates by it.',
		source: 'The [twin reference](/skills/fuz-stack/references/twin-impl)'
	},
	{
		id: 'session',
		term: 'session',
		group: 'agents',
		definition:
			'One run of a coding agent, which starts with no memory of earlier runs beyond the files it loads.',
		also: 'Session is also the name of a rung, and in the backend docs a login session.',
		source: 'The [grimoire skill](/skills/grimoire), on stateless agent sessions'
	},
	{
		id: 'agent-harness',
		term: 'agent harness',
		group: 'agents',
		definition:
			'The program that runs a coding agent, carries out its tool calls and applies its permission settings.',
		also: 'A test harness or a measurement harness is a different thing: the code that runs a comparison.'
	},
	{
		id: 'skill',
		term: 'skill',
		group: 'agents',
		definition:
			'A folder of instructions in the Agent Skills format, a main file and optional reference docs, that an agent loads for a kind of task.',
		source: "This site's [skills](/skills)"
	},
	{
		id: 'maintainer',
		term: 'maintainer',
		group: 'agents',
		definition:
			"The person who sets a project's scope and design, and to whom versions, publishing, deploys and new dependencies are reserved.",
		also: 'The sources also say owner, operator and the human for this person.',
		source: "The fuz-stack skill's [shared rules](/skills/fuz-stack#shared-rules)"
	},
	{
		id: 'kept-action',
		term: 'kept action',
		group: 'agents',
		definition:
			'An action the coherence pages list as kept with a person, such as publishing, deploying or changing a version, with whatever stops an agent from taking it.',
		source: "This site's table of [actions kept with a person](/coherence/actions)"
	},
	{
		id: 'deny-rule',
		term: 'deny rule',
		group: 'agents',
		definition:
			"A permission rule in the agent harness's settings that refuses a command whose text starts with a given prefix.",
		source:
			"The repos tool's docs on [what agents push through](https://github.com/fuzdev/fuz_repos/blob/main/docs/repos.md#agents-push-through-repos-push)"
	},
	{
		id: 'dry-run',
		term: 'dry run and wetrun',
		group: 'agents',
		definition:
			"A dry run shows what a command would change and changes nothing, and wetrun is the flag that makes it do the work. zap, and a new command in the stack's Rust tools whose effect is hard to undo, are dry runs by default. Not every release or deploy command in the stack is.",
		source:
			"zap's [concepts](https://github.com/fuzdev/zap/blob/main/docs/concepts.md#dry-run-and-wetrun)"
	},
	{
		id: 'planning-layer',
		term: 'planning layer',
		group: 'planning',
		definition:
			'Where plans and notes that span sessions are kept, outside the code repos. The grimoire skill describes one form of it, a separate repo of Markdown.',
		source: "The fuz-stack skill's [shared rules](/skills/fuz-stack#shared-rules)"
	},
	{
		id: 'membrane',
		term: 'membrane',
		group: 'planning',
		definition:
			'The one-way rule that a planning layer may read every repo while nothing public refers to its contents.',
		source: "The grimoire skill's [key concepts](/skills/grimoire#key-concepts)"
	},
	{
		id: 'arc',
		term: 'arc',
		group: 'planning',
		definition:
			'A long-running implementation effort across many sessions, kept to one checkout with at most one live session.',
		source: 'The grimoire skill on [arcs](/skills/grimoire#arcs)'
	},
	{
		id: 'writer-and-reviewer-loop',
		term: 'writer and reviewer loop',
		group: 'planning',
		definition:
			'Within an arc, one writer edits and a read-only reviewer reports findings, in turns, until a round of review leaves nothing worth fixing.',
		also: 'The skill calls it the review loop.',
		source: 'The grimoire skill on [arcs](/skills/grimoire#arcs)'
	}
];

/** A group's terms, in page order. */
export const glossary_group_terms = (group: GlossaryGroupId): Array<GlossaryTerm> =>
	glossary_terms.filter((t) => t.group === group);

/** Every source in this data, with its term, in page order. */
export const glossary_entries = (): Array<EvidenceEntry> =>
	glossary_terms.flatMap((t) =>
		t.source === undefined ? [] : [{ record: `glossary: ${t.term}`, content: t.source }]
	);
