/**
 * The data behind the `/values` page: the values the stack's design is measured
 * against, the kind of thing each one is, the order each project states them in,
 * how that order changes by context, and decisions where one value beat another.
 *
 * The page renders these records as they are, so a claim is corrected here and
 * nowhere else. Every sentence is a claim about the stack that a reader can check,
 * and every project named is one the Fuz stack page announces: an unannounced
 * project may inform a value and is never cited. `src/routes/evidence_check.task.ts`
 * resolves the links and holds `stack_projects` to that page.
 *
 * @module
 */

import type { PaletteVariant } from '@fuzdev/fuz_css/variable_data.ts';

import type { EvidenceEntry } from '#routes/evidence.ts';

/** A value a design is measured against. Performance is one value with several axes. */
export type ValueId = 'correctness' | 'security' | 'performance' | 'controllability' | 'simplicity';

/** What performance is measured along. */
export type AxisId = 'speed' | 'startup' | 'size' | 'memory' | 'worst_case';

/** Anything a project ranks: a value, or one axis of performance. */
export type TermId = Exclude<ValueId, 'performance'> | AxisId;

/** The role a value plays in a decision, which is why one ranked list does not hold them. */
export type ValueKindId = 'gate' | 'default' | 'objective' | 'budget' | 'overarching';

export interface ValueKind {
	label: string;
	meaning: string;
}

export interface Term {
	label: string;
	kind: ValueKindId;
	/** The fuz_css palette the term is drawn in, the same wherever it appears. */
	palette: PaletteVariant;
}

export interface Value {
	/** Also the value's anchor on the page. */
	id: ValueId;
	name: string;
	/** The terms the value is ranked as: itself, or for performance its axes. */
	terms: Array<TermId>;
	/** What the value asks for, as one sentence. */
	means: string;
	/** The question to ask of a design. */
	question: string;
	/** mdz with one link: a decision already made that passes the question. */
	passes: string;
	/** Where the stack falls short of it today. */
	shortfall: string;
}

/** One entry in a project's stated order: a term, or something outside this page's set. */
export interface OrderItem {
	/** `null` for something the project ranks that is not one of this page's terms. */
	term: TermId | null;
	/** The project's own wording. */
	label: string;
}

/** The order a project states its priorities in. */
export interface StatedOrder {
	project: string;
	/** Highest first. A rank with several items is a stated tie. */
	ranks: Array<Array<OrderItem>>;
	/** What the project says applies to every choice and ranks nowhere. */
	overarching?: OrderItem;
	/** mdz with one link, to where the order is stated. */
	source: string;
}

/** A short statement of the page's own, with the artifacts it rests on. */
export interface Passage {
	text: string;
	/** mdz, each entry linking one public artifact. */
	evidence: Array<string>;
}

/** A situation that sets the order among the performance axes. */
export interface Context {
	id: string;
	name: string;
	/** Highest first. A rank with several axes is a tie. */
	order: Array<Array<AxisId>>;
	why: string;
	/** mdz with one link. */
	source: string;
}

/** A recorded decision where one term beat another. */
export interface Decision {
	project: string;
	won: TermId;
	lost: TermId;
	chose: string;
	cost: string;
	/** mdz with one link, to where the decision is recorded. */
	source: string;
}

/** The day these claims were last checked against the repos, as an ISO date. */
export const claims_checked = '2026-11-17';

/** Whether the maintainer has checked this page's claims. */
export const reviewed: boolean = false;

/**
 * The projects this page may name, which are the ones the Fuz stack page announces.
 * `evidence_check.task.ts` holds this list to that page's.
 */
export const stack_projects: Array<string> = [
	'fuz_template',
	'zzz',
	'zervo',
	'fuz_forge',
	'fuz_app',
	'fuz',
	'fuz_css',
	'fuz_ui',
	'fuz_code',
	'mdz',
	'fuz_blog',
	'gro',
	'tsv',
	'tsv-format',
	'svelte-docinfo',
	'fuz_repos',
	'fuz-stack',
	'corpora',
	'fuz_util',
	'fuz_schema',
	'blake3',
	'zap',
	'pglet'
];

/** In the order the page shows them. */
export const value_kinds: Record<ValueKindId, ValueKind> = {
	gate: { label: 'Gate', meaning: 'It has to hold before anything else is weighed.' },
	default: {
		label: 'Default',
		meaning: 'The safe form is what happens unless someone asks otherwise.'
	},
	objective: { label: 'Objective', meaning: 'It is pushed as far as it will go.' },
	budget: { label: 'Budget', meaning: 'It is free to spend until a limit is crossed.' },
	overarching: { label: 'Overarching', meaning: 'It applies to every choice and ranks nowhere.' }
};

export const value_kind_ids = Object.keys(value_kinds) as Array<ValueKindId>;

/** In the order the page shows them, which is also the decision matrix's. */
export const terms: Record<TermId, Term> = {
	correctness: { label: 'correctness', kind: 'gate', palette: 'a' },
	security: { label: 'security', kind: 'gate', palette: 'c' },
	speed: { label: 'speed', kind: 'objective', palette: 'b' },
	startup: { label: 'startup', kind: 'objective', palette: 'h' },
	worst_case: { label: 'worst case', kind: 'gate', palette: 'f' },
	size: { label: 'size', kind: 'budget', palette: 'd' },
	memory: { label: 'memory', kind: 'budget', palette: 'g' },
	controllability: { label: 'controllability', kind: 'default', palette: 'e' },
	simplicity: { label: 'simplicity', kind: 'overarching', palette: 'i' }
};

export const term_ids = Object.keys(terms) as Array<TermId>;

/** The purpose the values serve, in the project's own published words. */
export const headword = {
	text: 'The purpose is human agency: software one can own, control, extend, and swap out. The values below are what a design is checked against on the way there.',
	source:
		'The Fuz [intro post](https://www.fuz.dev/blog/1-fuz-is-a-free-software-stack-for-human-agency)'
};

/** How a claim about any of the values is made. A method, not a ranked value. */
export const method: Passage = {
	text: 'A claim comes from a measurement, the measurement is published where the work loses too, and what was tried and declined is written down with its numbers.',
	evidence: [
		'The [fuz_schema README](https://github.com/fuzdev/fuz_schema/blob/main/README.md), which says where it is not the fastest',
		"fuz_schema's [record of trades](https://github.com/fuzdev/fuz_schema/blob/main/docs/declined.md) that were built, measured and declined",
		"fuz's [policy](https://github.com/fuzdev/fuz/blob/main/CLAUDE.md#values-and-policy) to say planned when a thing is not built"
	]
};

/** What efficiency means here, beside performance. */
export const efficiency: Passage = {
	text: 'Performance is the measured result a person feels, ranked by context. Efficiency is the stance under it: every cost names its reason, and the cheapest work is the work not done.',
	evidence: [
		"fuz_schema's [priorities](https://github.com/fuzdev/fuz_schema/blob/main/README.md#priorities), where a feature not everyone needs is a separate export that bundles to nothing unused",
		"gro's [design](https://github.com/fuzdev/gro/blob/main/src/docs/runtime.md#design), where the wins are startup, loading, caching and work avoided"
	]
};

/** In rough order of priority, which is the order the page shows them. */
export const values: Array<Value> = [
	{
		id: 'correctness',
		name: 'Correctness',
		terms: ['correctness'],
		means: 'The software does what it says and nothing else, held to a reference where one exists.',
		question: 'What does this accept or produce that it should not?',
		passes:
			"fuz_schema's [priorities](https://github.com/fuzdev/fuz_schema/blob/main/README.md#priorities), where a fix of over-acceptance goes ahead of speed and size",
		shortfall:
			'Most projects have no outside reference to be held to, and where one exists the comparison often runs before a release and not on every change.'
	},
	{
		id: 'security',
		name: 'Security',
		terms: ['security'],
		means:
			'Code acts only on what it was handed, and a misconfiguration with a security consequence fails loudly.',
		question: 'What can this reach that it was not given?',
		passes:
			"gro's [authority model](https://github.com/fuzdev/gro/blob/main/src/docs/authority.md#imports-or-globals), where the network is an import and no global carries authority",
		shortfall:
			"gro's runtime says its security is not finished, and fuz_forge says its security is not ready to be trusted."
	},
	{
		id: 'performance',
		name: 'Performance',
		terms: ['speed', 'startup', 'worst_case', 'size', 'memory'],
		means:
			'Speed is pushed as far as it goes, size and memory are budgets that bind when crossed, and the time or memory an input can force is a limit, not an average.',
		question: 'Was it measured, on what, and against what?',
		passes:
			'The fuz-stack [performance reference](/skills/fuz-stack/references/rust-perf#measure), where a claim comes from a harness and states its noise floor',
		shortfall: 'Energy and browsers are never measured, and memory has almost no gate.'
	},
	{
		id: 'controllability',
		name: 'Controllability',
		terms: ['controllability'],
		means: 'What the software will do is visible, reviewable and bounded before it does it.',
		question: 'Can a person see what this will do before it does it, and stop it?',
		passes:
			"zap's rule that [a real run executes only a plan it has already previewed](https://github.com/fuzdev/zap/blob/main/docs/concepts.md#a-wetrun-executes-only-the-plan-you-reviewed)",
		shortfall:
			"gro's policy file, the reviewable record of what a project may reach, is designed and not built."
	},
	{
		id: 'simplicity',
		name: 'Simplicity',
		terms: ['simplicity'],
		means:
			'Small enough to audit and to hold in one head: few dependencies, few concepts, one way to do a thing.',
		question: 'What did this design refuse?',
		passes:
			"gro's [design](https://github.com/fuzdev/gro/blob/main/src/docs/runtime.md#design), where staying simple and small is what keeps the surface small enough to audit",
		shortfall:
			'Twin implementations, hand-written parsers and an owned runtime are complexity the stack chose to take on.'
	}
];

/** In the order the page shows them. */
export const stated_orders: Array<StatedOrder> = [
	{
		project: 'gro',
		ranks: [
			[{ term: 'security', label: 'security' }],
			[{ term: null, label: 'web standards' }],
			[{ term: 'controllability', label: 'developer control and ergonomics' }],
			[
				{ term: 'startup', label: 'startup first' },
				{ term: 'speed', label: 'speed' }
			],
			[
				{ term: 'size', label: 'binary size' },
				{ term: 'memory', label: 'memory' }
			]
		],
		overarching: { term: 'simplicity', label: 'simple and small' },
		source:
			"[gro's runtime design](https://github.com/fuzdev/gro/blob/main/src/docs/runtime.md#design)"
	},
	{
		project: 'tsv',
		ranks: [
			[{ term: 'correctness', label: 'correctness' }],
			[{ term: 'speed', label: 'speed' }],
			[
				{ term: 'size', label: 'binary size' },
				{ term: 'memory', label: 'memory usage' }
			],
			[{ term: null, label: 'extensibility' }]
		],
		overarching: { term: 'simplicity', label: 'staying simple' },
		source: 'The [tsv README](https://github.com/fuzdev/tsv/blob/main/README.md#tsv)'
	},
	{
		project: 'fuz_schema',
		ranks: [
			[{ term: 'correctness', label: 'correctness' }],
			[
				{ term: 'speed', label: 'speed' },
				{ term: 'size', label: 'size' }
			],
			[{ term: 'memory', label: 'memory' }],
			[{ term: 'simplicity', label: 'simplicity of the internals' }],
			[{ term: null, label: 'flexibility' }]
		],
		source:
			"[fuz_schema's priorities](https://github.com/fuzdev/fuz_schema/blob/main/README.md#priorities)"
	},
	{
		project: 'fuz',
		ranks: [[{ term: 'security', label: 'security' }], [{ term: 'speed', label: 'performance' }]],
		source: "[fuz's values](https://github.com/fuzdev/fuz/blob/main/CLAUDE.md#values-and-policy)"
	},
	{
		project: 'fuz_code',
		ranks: [[{ term: 'correctness', label: 'correct' }], [{ term: 'speed', label: 'fast' }]],
		source:
			"[fuz_code's guidelines](https://github.com/fuzdev/fuz_code/blob/main/CLAUDE.md#development-guidelines)"
	},
	{
		project: 'pglet',
		ranks: [
			[
				{ term: 'size', label: 'size' },
				{ term: 'startup', label: 'startup' }
			],
			[{ term: null, label: 'feature completeness' }]
		],
		source: "[pglet's tradeoffs](https://github.com/fuzdev/pglet/blob/main/TRADEOFFS.md#tradeoffs)"
	}
];

/** In the order the page shows them. */
export const contexts: Array<Context> = [
	{
		id: 'steady',
		name: 'A tool that runs for a while',
		order: [['speed'], ['size', 'memory']],
		why: 'The usual order: speed first, then the binary and its memory.',
		source: 'The [tsv README](https://github.com/fuzdev/tsv/blob/main/README.md#design)'
	},
	{
		id: 'loop',
		name: 'A short command, called in a loop',
		order: [['startup'], ['speed'], ['size', 'memory']],
		why: 'Short-lived runs dominate a loop an agent drives, so the start counts before the steady state.',
		source:
			"[gro's runtime design](https://github.com/fuzdev/gro/blob/main/src/docs/runtime.md#design)"
	},
	{
		id: 'bundle',
		name: 'A library shipped to a browser',
		order: [['speed', 'size'], ['memory']],
		why: 'Bytes cross a network, so they rank with speed, and a written rule sets what speedup a byte must buy.',
		source:
			"[fuz_schema's grading rules](https://github.com/fuzdev/fuz_schema/blob/main/docs/grading.md#rules)"
	},
	{
		id: 'wasm',
		name: 'WASM loaded by a page',
		order: [['size'], ['speed']],
		why: 'The build is chosen by measurement per runtime, and where bundle size matters the small one is right.',
		source: 'The [WASM reference](/skills/fuz-stack/references/wasm-patterns#wasm-bindgen-builds)'
	},
	{
		id: 'host',
		name: 'WASM run by a host',
		order: [['speed'], ['size']],
		why: 'A host can spend bytes for speed where a browser bundle cannot.',
		source: 'The [WASM reference](/skills/fuz-stack/references/wasm-patterns#component-model)'
	},
	{
		id: 'untrusted',
		name: 'Input a remote party wrote',
		order: [['worst_case'], ['speed', 'size'], ['memory']],
		why: 'The time or memory an input can force is ranked with correctness, ahead of speed and size.',
		source:
			"[fuz_schema's priorities](https://github.com/fuzdev/fuz_schema/blob/main/README.md#priorities)"
	},
	{
		id: 'fixture',
		name: 'A database for tests',
		order: [['size', 'startup'], ['speed']],
		why: 'A fixture is started often and shipped small, so both come before throughput.',
		source: "[pglet's tradeoffs](https://github.com/fuzdev/pglet/blob/main/TRADEOFFS.md#tradeoffs)"
	}
];

/** In the order the page shows them. */
export const decisions: Array<Decision> = [
	{
		project: 'fuz_schema',
		won: 'correctness',
		lost: 'speed',
		chose: 'Checking every key of a strict object, where counting the keys was faster',
		cost: 'A share of the time of every strict parse',
		source:
			'[declined](https://github.com/fuzdev/fuz_schema/blob/main/docs/declined.md#the-unknown-key-check-by-counting-the-keys)'
	},
	{
		project: 'fuz_code',
		won: 'correctness',
		lost: 'speed',
		chose: 'A correctness gain is taken when it costs a few percent of lexing time',
		cost: 'Speed stops being the tiebreak unless an input would turn pathological',
		source:
			'[guidelines](https://github.com/fuzdev/fuz_code/blob/main/CLAUDE.md#development-guidelines)'
	},
	{
		project: 'pglet',
		won: 'correctness',
		lost: 'speed',
		chose: 'Float text written digit for digit as PostgreSQL writes it',
		cost: 'A measured slowdown against the faster formatting',
		source:
			'[tradeoffs](https://github.com/fuzdev/pglet/blob/main/TRADEOFFS.md#float-text-186s-digits-at-a-measured-cost)'
	},
	{
		project: 'fuz_forge',
		won: 'correctness',
		lost: 'simplicity',
		chose: 'A second server kept as a reference twin, held to the first by shared tests',
		cost: 'Two implementations to keep in step',
		source: '[overview](https://github.com/fuzdev/fuz_forge/blob/main/CLAUDE.md#overview)'
	},
	{
		project: 'zap',
		won: 'security',
		lost: 'speed',
		chose: 'Security controls are read from the live machine on every run, with no cache',
		cost: 'Every plan pays for the reads',
		source:
			'[security](https://github.com/fuzdev/zap/blob/main/docs/security.md#security-controls-are-read-live-every-time)'
	},
	{
		project: 'fuz_schema',
		won: 'worst_case',
		lost: 'size',
		chose: 'An issue path that stays linear on deep input',
		cost: 'The bytes a smaller path-copying form would have saved',
		source:
			'[declined](https://github.com/fuzdev/fuz_schema/blob/main/docs/declined.md#a-prefix-that-copies-the-path)'
	},
	{
		project: 'gro',
		won: 'speed',
		lost: 'security',
		chose: 'One realm, mutable intrinsics and the JIT on by default',
		cost: 'Some hardening, which a user can ask for back',
		source: '[runtime design](https://github.com/fuzdev/gro/blob/main/src/docs/runtime.md#design)'
	},
	{
		project: 'tsv',
		won: 'speed',
		lost: 'size',
		chose: 'Profile-guided builds for the shipped CLI and native addon',
		cost: 'Larger binaries',
		source:
			'[performance](https://github.com/fuzdev/tsv/blob/main/docs/performance.md#profile-guided-builds)'
	},
	{
		project: 'tsv',
		won: 'size',
		lost: 'speed',
		chose: 'A minimal build for WASM, where size matters more',
		cost: 'The speed a fuller build would keep',
		source: '[design](https://github.com/fuzdev/tsv/blob/main/README.md#design)'
	},
	{
		project: 'fuz_schema',
		won: 'speed',
		lost: 'memory',
		chose: 'A lowercase conversion that always copies, where skipping the copy allocated less',
		cost: 'An allocation per parse, since allocation only breaks ties',
		source:
			'[declined](https://github.com/fuzdev/fuz_schema/blob/main/docs/declined.md#to_lower_case-returning-an-input-already-lowercase)'
	},
	{
		project: 'fuz_schema',
		won: 'memory',
		lost: 'speed',
		chose: 'No lookup table held by each object schema, where one made some checks faster',
		cost: 'The faster lookup on input out of the schema order',
		source:
			'[declined](https://github.com/fuzdev/fuz_schema/blob/main/docs/declined.md#a-map-from-each-key-to-its-position)'
	},
	{
		project: 'tsv',
		won: 'speed',
		lost: 'simplicity',
		chose: 'A cleanup of a hot path is measured like any change, and refused when it costs time',
		cost: 'Code that stays less tidy than it could be',
		source:
			'[performance](https://github.com/fuzdev/tsv/blob/main/docs/performance.md#a-sorted-table-search-whose-answer-is-a-few-bytes-away-is-a-scan--and-the-class-belongs-to-the-document-not-the-ask)'
	}
];

/** Every mdz string in this page's data that carries a link, with its record, in page order. */
export const values_entries = (): Array<EvidenceEntry> => [
	{ record: 'headword', content: headword.source },
	...method.evidence.map((content) => ({ record: 'method', content })),
	...efficiency.evidence.map((content) => ({ record: 'efficiency', content })),
	...values.map((v) => ({ record: `value: ${v.id}`, content: v.passes })),
	...stated_orders.map((o) => ({ record: `order: ${o.project}`, content: o.source })),
	...contexts.map((c) => ({ record: `context: ${c.id}`, content: c.source })),
	...decisions.map((d) => ({
		record: `decision: ${d.project}, ${d.won} over ${d.lost}`,
		content: d.source
	}))
];
