/**
 * The data behind the `/coherence` page: the practices that keep the stack's code
 * coherent while agents write a growing share of it, the ladder rungs they sit on,
 * their status marks, and the oracle comparisons.
 *
 * The page renders these records as they are, so a claim is corrected here and
 * nowhere else. Every sentence is a claim about the stack that a reader can check:
 * keep each one true of the repos as they stand, and give each practice at least one
 * public artifact as evidence.
 *
 * @module
 */

/** Where a practice does its work, from a person's judgment down to the system's shape. */
export type PracticeRungId = 'judgment' | 'conversation' | 'written' | 'checks' | 'structure';

/** How far the stack does what a practice says. */
export type PracticeStatusId = 'practised' | 'partial' | 'aspired';

export interface PracticeRung {
	id: PracticeRungId;
	label: string;
	/** What does the work on this rung, as one short sentence. */
	lives: string;
}

export interface PracticeStatus {
	id: PracticeStatusId;
	label: string;
	meaning: string;
}

export interface Practice {
	/** Also the record's anchor on the page. */
	id: string;
	name: string;
	rung: PracticeRungId;
	status: PracticeStatusId;
	/** What is done, as one sentence. */
	practice: string;
	/** The failure the practice finds or prevents. */
	catches: string;
	costs: string;
	/** How the practice itself goes wrong. */
	fails: string;
	/**
	 * mdz, each entry linking one public artifact that shows the practice.
	 * A link to this site is a root-relative path.
	 */
	evidence: Array<string>;
	/** Ids of related practices. Stated one way; `practices_relate` shows them both ways. */
	related: Array<string>;
}

/** One comparison of a project against something that already has the right behaviour. */
export interface OracleComparison {
	project: string;
	against: string;
	kind: string;
	how: string;
	/** When the comparison runs, which is how much weight it can bear. */
	runs: string;
}

/** The ladder, top to bottom. */
export const practice_rungs: Array<PracticeRung> = [
	{ id: 'judgment', label: 'Judgment', lives: 'A person decides.' },
	{
		id: 'conversation',
		label: 'Conversation',
		lives: 'Asked and checked again in each session.'
	},
	{ id: 'written', label: 'Written rules', lives: 'Files every session loads.' },
	{ id: 'checks', label: 'Mechanical checks', lives: 'A tool gives the verdict.' },
	{ id: 'structure', label: 'Structure', lives: 'The shape of the system rules it out.' }
];

export const practice_statuses: Array<PracticeStatus> = [
	{
		id: 'practised',
		label: 'Practised',
		meaning: 'Done routinely across the stack.'
	},
	{
		id: 'partial',
		label: 'Partial',
		meaning: 'Done in some projects, or only in part.'
	},
	{ id: 'aspired', label: 'Aspired', meaning: 'Held as a rule and not yet done.' }
];

/** In ladder order, which is the order the page shows them in. */
export const practices: Array<Practice> = [
	{
		id: 'few-hands',
		name: 'Few hands hold the shape',
		rung: 'judgment',
		status: 'practised',
		practice:
			'One person decides the scope, the design and what the system will not do, and agents do the implementation.',
		catches:
			'Features that do not fit, and designs that default to whatever the model has seen most often.',
		costs:
			'The project depends on one person, and a successor gets the code and its public docs but not the private planning notes.',
		fails:
			'When the non-goals are not written down, the agent fills the gap with its own defaults.',
		evidence: [
			'The Fuz [contributing page](https://www.fuz.dev/contributing), on discussion before code',
			'The [mdz README](https://github.com/fuzdev/mdz), which says agents generated the code and a person the designs',
			"mdz's written [list of what it does not include](https://github.com/fuzdev/mdz/blob/main/CLAUDE.md)"
		],
		related: ['irreversible-human', 'taste']
	},
	{
		id: 'review-loops',
		name: 'Review in loops, with a stopping rule',
		rung: 'conversation',
		status: 'practised',
		practice:
			'One writer changes the code and a read-only reviewer reports findings, and they alternate until a round finds nothing worth fixing.',
		catches: 'Defects the writer cannot see in its own work.',
		costs:
			"Every round costs tokens and time, and the reviewer is another agent: the maintainer's own review comes after the commit has landed on the main branch.",
		fails:
			"When the reviewer's own severity grades are accepted, and a loop closes with wrong answers filed as minor.",
		evidence: [
			'The [grimoire skill](/skills/grimoire), which describes the writer and reviewer loop'
		],
		related: ['leads', 'gates', 'instruments']
	},
	{
		id: 'leads',
		name: 'Treat claims as leads',
		rung: 'conversation',
		status: 'practised',
		practice:
			'An agent checks a survey result, a review finding or its own summary against the code before anyone acts on it, and runs the reference tool or a small experiment before building on a guess.',
		catches:
			'Confident wrong statements, which read exactly like the right ones, and work built on a guess that a short run would have corrected.',
		costs: 'Checking a claim repeats work that was already paid for once.',
		fails:
			'When someone accepts a claim that nothing uses a function from a search inside one package, without walking every consumer.',
		evidence: [
			'The [grimoire skill](/skills/grimoire), under "Leads, not facts"',
			'The [tsv fixture workflow](https://github.com/fuzdev/tsv/blob/main/docs/fixture_workflow.md), which runs the reference tool first and stops for approval'
		],
		related: ['review-loops', 'claims-as-data', 'oracles']
	},
	{
		id: 'taste',
		name: 'Write the taste down where the agent reads it',
		rung: 'written',
		status: 'practised',
		practice:
			'Conventions live in files that each session loads, and when an agent gets something wrong the correction is added there.',
		catches:
			"Code that drifts toward the average of the model's training data, and the same error repeating across sessions that share no memory.",
		costs: 'Rules pile up and need pruning, and a stale rule misleads every session that loads it.',
		fails: 'When a written warning is expected to prevent a mistake that only a check can prevent.',
		evidence: [
			"The [fuz-stack skill](/skills/fuz-stack), the stack's written conventions",
			'The [grimoire skill](/skills/grimoire), on how a mistake becomes guidance',
			"The tsv fixture workflow's [list of common mistakes](https://github.com/fuzdev/tsv/blob/main/docs/fixture_workflow.md)"
		],
		related: ['gates', 'distill', 'few-hands']
	},
	{
		id: 'distill',
		name: 'Distill and delete',
		rung: 'written',
		status: 'partial',
		practice: 'Agents condense raw notes into durable documents and then remove the notes.',
		catches: 'Stale statements that are trusted because they are written down.',
		costs: 'Deciding what to delete takes judgment, and deleting the wrong thing loses a reason.',
		fails:
			'When documents only grow. Here finished items are deleted, but the planning notes keep growing and old material is more often archived than removed.',
		evidence: ['The [grimoire skill](/skills/grimoire), on the lifecycle of notes'],
		related: ['taste', 'claims-as-data']
	},
	{
		id: 'gates',
		name: 'Gates go green before anything lands',
		rung: 'checks',
		status: 'practised',
		practice:
			'Types, lints, tests, format checks and drift checks on generated code run on every change, and the native and WebAssembly projects also hold build size to a committed limit.',
		catches: 'Whole classes of error that a reviewer would otherwise have to remember to look for.',
		costs: 'Gates take machine time on every change and need upkeep of their own.',
		fails:
			"When green is read as correct. The serious defects in this stack's recent record passed the local gates and were caught by corpus comparisons, mutation checks, cold-read review and CI.",
		evidence: [
			'[gro](https://github.com/fuzdev/gro), whose check task runs the gates for the TypeScript projects',
			'The fuz-stack [performance reference](/skills/fuz-stack/references/rust-perf), on gating sizes and counters'
		],
		related: ['fail-loud', 'oracles']
	},
	{
		id: 'oracles',
		name: 'Build against oracles and twins',
		rung: 'checks',
		status: 'practised',
		practice:
			'Where a reference exists, a harness checks output against it, with recorded results checked on every change and the live reference in heavier runs before a release.',
		catches:
			'Edge cases nobody thought to write a test for, because the reference and its corpus already contain them.',
		costs: 'A twin roughly doubles the implementation, and a reference can be wrong.',
		fails:
			'When both sides agree on the same bug, when the comparison never looks at the property that is wrong, or when someone absorbs a difference without fixing, documenting or detecting it.',
		evidence: [
			"tsv's [syntax tree compatibility](https://github.com/fuzdev/tsv/blob/main/docs/conformance_svelte.md) with Svelte's parser",
			"The [catalogue of tsv's deliberate differences](https://github.com/fuzdev/tsv/blob/main/docs/conformance_prettier.md) from Prettier",
			'The [twin reference](/skills/fuz-stack/references/twin-impl), on how the TypeScript and Rust twins are held together'
		],
		related: ['gates', 'instruments', 'race', 'one-source']
	},
	{
		id: 'instruments',
		name: 'Build instruments, and check them',
		rung: 'checks',
		status: 'partial',
		practice:
			'Where reading the code is the only check, agents build a tool to do the checking or break the code on purpose to show that a test catches it, and the careful harnesses first prove they can report a failure.',
		catches:
			'Defects that survive careful reading, and tests that pass whether or not the code is right.',
		costs: 'An instrument is software with its own bugs and its own maintenance.',
		fails:
			'When the harness has no control case, and it reports success for reasons unrelated to the code.',
		evidence: [
			"The fuz installer's [mutation gate](https://github.com/fuzdev/fuz/blob/main/scripts/install-test/README.md), which breaks one behaviour at a time and checks a test catches it",
			"fuz_schema's [mutants](https://github.com/fuzdev/fuz_schema/blob/main/docs/testing.md), which run the unmutated tests first",
			'The [tsv divergence detector](https://github.com/fuzdev/tsv/blob/main/docs/divergence_detector.md), with its required negative cases'
		],
		related: ['oracles', 'fail-loud', 'review-loops']
	},
	{
		id: 'race',
		name: 'Race the candidates',
		rung: 'checks',
		status: 'partial',
		practice:
			"For hot paths, agents build competing versions and measure them on real workloads, so far mostly in the formatter's performance work.",
		catches: 'Optimisations that were predicted to help and did not.',
		costs: 'Prototypes cost tokens and machine time, and wall-clock numbers need a quiet machine.',
		fails: 'When a micro-benchmark or a model of the cost stands in for the measured workload.',
		evidence: [
			"fuz_schema's [record of trades](https://github.com/fuzdev/fuz_schema/blob/main/docs/declined.md) that were built, measured and not taken",
			"fuz_schema's [grading](https://github.com/fuzdev/fuz_schema/blob/main/docs/grading.md) of a candidate against a baseline",
			'The fuz-stack [performance reference](/skills/fuz-stack/references/rust-perf), on measuring before claiming'
		],
		related: ['claims-as-data', 'oracles', 'fast-loop']
	},
	{
		id: 'claims-as-data',
		name: 'Claims as data',
		rung: 'checks',
		status: 'partial',
		practice:
			'Some figures are regenerated from recorded sources that carry their provenance, and documents are asked to mark what is built, what is designed and what is only proposed.',
		catches: 'Figures that were true when written and are still quoted long after.',
		costs: 'Every claim needs a source and a way to regenerate it.',
		fails: 'When the benchmark behind a figure predates the current build and nobody reruns it.',
		evidence: [
			'The [tsv benchmarks](https://tsv.fuz.dev/docs/benchmarks), whose prose figures are computed from the reports',
			'The [syntax highlighter benchmark results](https://syntax-highlighter-bench.ryanatkn.com/)',
			'A [gro design doc](https://github.com/fuzdev/gro/blob/main/src/docs/backstop.md) that marks what is built and what is only designed'
		],
		related: ['race', 'leads', 'distill']
	},
	{
		id: 'fail-loud',
		name: 'Fail loud',
		rung: 'checks',
		status: 'partial',
		practice:
			'A check that skips, a capped run or a fallback path reports that it did so and does not exit as a success.',
		catches: 'Gates that have stopped gating while still showing green.',
		costs: 'A loud failure interrupts work that a quiet fallback would have let continue.',
		fails:
			"When a gate's output is piped through a filter that hides its exit code, which has twice put a commit with a failing gate on a main branch here.",
		evidence: [
			"The [fuz-stack skill](/skills/fuz-stack), on reading the gate's exit code",
			'The fuz-stack [Rust reference](/skills/fuz-stack/references/rust-patterns), on suites that never pass by skipping',
			"tsv's [gate counts](https://github.com/fuzdev/tsv/blob/main/docs/gate_counts.md), which fail when the set of graded files changes",
			"fuz_app's [security doc](https://github.com/fuzdev/fuz_app/blob/main/docs/security.md), on turning a rate limiter off"
		],
		related: ['gates', 'instruments', 'irreversible-human']
	},
	{
		id: 'one-source',
		name: 'One source of truth',
		rung: 'structure',
		status: 'practised',
		practice:
			'Shared code moves into a library on first use when a second consumer is known, every caller moves in the same migration, and no compatibility layer stays behind.',
		catches: 'Two versions of the same thing drifting apart.',
		costs: 'A breaking change has to be carried through every consumer at once.',
		fails:
			"When an outside consumer exists and the migration is no longer the maintainer's to finish.",
		evidence: [
			"fuz_ui's [changelog entry](https://github.com/fuzdev/fuz_ui/blob/main/CHANGELOG.md) extracting mdz",
			"The [fuz-stack skill](/skills/fuz-stack)'s rule against compatibility layers"
		],
		related: ['oracles', 'few-hands']
	},
	{
		id: 'one-name',
		name: 'One name per concept, schemas as the source of truth',
		rung: 'structure',
		status: 'practised',
		practice:
			'One identifier names the same thing in TypeScript, Rust and SQL, and each data shape has one schema that its type, defaults and validation come from.',
		catches:
			'Translation errors at a boundary, and a type that says one thing while the validator checks another.',
		costs:
			"The naming goes against TypeScript's usual convention, and a schema change cascades through everything derived from it.",
		fails:
			'When a name is translated at a boundary, or a type is written by hand beside the schema it should come from.',
		evidence: [
			"The [fuz-stack skill](/skills/fuz-stack)'s shared rules",
			"[fuz_schema](https://github.com/fuzdev/fuz_schema), the stack's one schema library",
			'The [twin reference](/skills/fuz-stack/references/twin-impl), on keeping names the same across TypeScript and Rust'
		],
		related: ['one-source', 'oracles', 'taste']
	},
	{
		id: 'irreversible-human',
		name: 'Keep the irreversible human, by mechanism',
		rung: 'structure',
		status: 'partial',
		practice:
			'Publishing, version changes, new dependencies and deploys stay with a person, and where possible the tooling refuses the action so the agent does not have to remember.',
		catches: 'An unattended session doing something that cannot be undone.',
		costs: 'Work waits on a person at exactly the outward-facing steps.',
		fails:
			'When the limit is only a written rule, as it still is for version changes and new packages, or a deny rule that a differently spelled command gets past.',
		evidence: [
			"The [repos tool's documentation](https://github.com/fuzdev/fuz_repos/blob/main/docs/repos.md) of what it pushes and what it refuses"
		],
		related: ['few-hands', 'fail-loud', 'gates']
	},
	{
		id: 'fast-loop',
		name: 'Make the loop fast',
		rung: 'structure',
		status: 'partial',
		practice: 'Tools an agent calls in a loop are designed to answer in milliseconds.',
		catches: 'Checks that get skipped because they are slow.',
		costs: 'Speed work competes with features, and compiled languages have a slower inner loop.',
		fails: 'When a fast targeted check stands in for the full gate before landing.',
		evidence: ['The [tsv benchmarks](https://tsv.fuz.dev/docs/benchmarks)'],
		related: ['gates', 'race']
	}
];

export const oracle_comparisons: Array<OracleComparison> = [
	{
		project: 'tsv formatter',
		against: 'Prettier',
		kind: 'Reference implementation',
		how: "Fixtures hold Prettier's recorded output, and a fixture and corpus diff re-runs Prettier, with every difference catalogued",
		runs: 'Recorded output on every change, live diff before release'
	},
	{
		project: 'tsv formatter',
		against: 'Itself',
		kind: 'Law',
		how: 'Formatting twice gives the same result, on every fixture and across a real-code corpus',
		runs: 'Fixtures on every change, corpus sweep on demand'
	},
	{
		project: 'tsv parser',
		against: "Svelte's parser, acorn-typescript and Svelte's CSS parser",
		kind: 'Reference implementations',
		how: 'Deep diff of the syntax tree over real codebases, with differences classified against a catalogue',
		runs: 'Before release'
	},
	{
		project: 'tsv TypeScript parser',
		against: "The TypeScript compiler's recorded baselines",
		kind: "Incumbent's baselines",
		how: "The compiler's own test cases decide which programs are valid",
		runs: 'Before release'
	},
	{
		project: 'tsv parser',
		against: 'test262',
		kind: 'Conformance suite',
		how: 'Every program that should parse must parse, and wrongly accepted programs are reported but not gated',
		runs: 'Before release'
	},
	{
		project: 'tsv type stripping',
		against: "ts-blank-space, cross-checked with Node's type stripping",
		kind: 'Reference implementation',
		how: 'Output compared over fixtures and a corpus, against a reviewed list of accepted differences',
		runs: 'Before release'
	},
	{
		project: 'tsv WebAssembly build',
		against: 'tsv native build',
		kind: 'Twin',
		how: 'Both engines must return the same bytes',
		runs: 'In CI'
	},
	{
		project: 'tsv Svelte compiler',
		against: "Svelte's compiler",
		kind: 'Reference implementation',
		how: "Diff after a canonical reprint of both sides' output",
		runs: 'Paused, not built today'
	},
	{
		project: 'tsv typechecker',
		against: "TypeScript 7's recorded error baselines",
		kind: "Incumbent's baselines",
		how: 'Error codes and spans',
		runs: 'Paused, not built today'
	},
	{
		project: 'fuz_app backend, TypeScript',
		against: 'The fuz spine crates, Rust',
		kind: 'Twin',
		how: 'One test suite run against both over HTTP, WebSocket and SSE',
		runs: 'Locally, not in CI'
	},
	{
		project: 'fuz_forge server, TypeScript',
		against: 'Its Rust server',
		kind: 'Twin',
		how: 'The same cross-backend suite plus shared fixtures',
		runs: 'Locally, not in CI'
	},
	{
		project: 'pglet',
		against: 'Postgres',
		kind: 'Reference implementation',
		how: 'The same SQL through both, with results compared',
		runs: 'In CI on every push'
	},
	{
		project: 'fuz_schema, Rust side',
		against: 'The TypeScript library',
		kind: 'Reference implementation',
		how: 'Shared fixtures generated by the TypeScript side and asserted by the Rust tests, with differences declared',
		runs: 'In CI'
	},
	{
		project: 'fuz_schema',
		against: 'Zod and Valibot',
		kind: 'Reference implementations',
		how: 'Where the two agree, it gives the same result or declares the difference',
		runs: 'With the test suite'
	},
	{
		project: 'mdz streaming parser',
		against: 'Its one-shot parser',
		kind: 'Reference implementation',
		how: 'The same tree from whole and chunked input',
		runs: 'With the test suite'
	},
	{
		project: 'zap, working tree',
		against: 'zap, previous main build',
		kind: 'Earlier version',
		how: 'Both binaries run against identical virtual machines and must report the same, which shows equivalence and not correctness',
		runs: 'On demand'
	}
];

/**
 * Closes `related` symmetrically, so a practice that names another is also named by it.
 * The page highlights relations in both directions, and stating each pair once in
 * the data keeps the two directions from disagreeing.
 *
 * @returns each practice id mapped to its related ids, in the order of `practices`
 * @throws Error if a practice relates to an unknown id or to itself
 */
export const practices_relate = (practices: Array<Practice>): Map<string, Array<string>> => {
	const related: Map<string, Set<string>> = new Map(practices.map((p) => [p.id, new Set()]));
	for (const practice of practices) {
		for (const id of practice.related) {
			const other = related.get(id);
			if (!other) throw new Error(`practice "${practice.id}" relates to unknown "${id}"`);
			if (id === practice.id) throw new Error(`practice "${practice.id}" relates to itself`);
			related.get(practice.id)!.add(id);
			other.add(practice.id);
		}
	}
	return new Map(
		practices.map((p) => [
			p.id,
			practices.filter((other) => related.get(p.id)!.has(other.id)).map((other) => other.id)
		])
	);
};
