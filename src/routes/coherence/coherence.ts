/**
 * The data behind the `/coherence` page: the ways agent-written code goes wrong,
 * what holds each failure at each rung of the ladder, and the inventories some holds
 * point at (oracle comparisons, actions kept with a person, gates).
 *
 * The page renders these records as they are, so a claim is corrected here and
 * nowhere else. Every sentence is a claim about the stack that a reader can check:
 * keep each one true of the repos as they stand, and give each hold a public
 * artifact as evidence, linked to the section that shows it.
 * `src/routes/evidence_check.task.ts` resolves the links against this repo and its sibling
 * checkouts.
 *
 * @module
 */

import type { EvidenceEntry } from '#routes/evidence.ts';

/** What does the work of holding a failure, from a person's judgment to the system's shape. */
export type RungId = 'person' | 'session' | 'written' | 'tool' | 'shape';

/** How far a rung holds a failure. A rung with nothing to say has no hold at all. */
export type HoldStatusId = 'held' | 'partial' | 'unreachable';

/** When a check runs, strongest first, which is how much weight it can bear. */
export type RunWhenId = 'every_change' | 'ci' | 'release' | 'on_demand';

/** What a project compares itself against. */
export type OracleKindId = 'reference' | 'suite' | 'twin' | 'build' | 'law' | 'previous';

/** What stops an agent from taking an action that is kept with a person. */
export type MechanismId = 'tool' | 'deny' | 'default' | 'rule';

/** The inventories a hold can point at. Each is a table on the page. */
export type InventoryId = 'oracles' | 'actions' | 'gates';

export interface Rung {
	label: string;
	/** What does the work on this rung, as one short sentence. */
	lives: string;
}

/** An entry in one of the page's legends. */
export interface LegendEntry {
	label: string;
	meaning: string;
}

/** What one rung does about one failure. */
export interface Hold {
	status: HoldStatusId;
	/** A few words, for the grid cell. */
	label: string;
	/** What is done, or for `unreachable` why nothing can be. */
	does: string;
	/** How the hold goes wrong, which is the reason the next rung exists. */
	fails?: string;
	/** Only a cost that says something about this stack. */
	cost?: string;
	/** What the stack intends here and has not built. */
	wanted?: string;
	/**
	 * mdz, each entry linking one public artifact that shows the hold.
	 * A link to this site is a root-relative path.
	 */
	evidence: Array<string>;
	/** The table that lists this hold's instances. */
	inventory?: InventoryId;
}

/** One way agent-written code goes wrong, and what holds it at each rung. */
export interface Failure {
	/** Also the row's anchor on the page. A hold's anchor is `hold_id`'s. */
	id: string;
	name: string;
	/** What goes wrong, as one sentence. */
	failure: string;
	/** Whether the maintainer has checked this row's claims. */
	reviewed: boolean;
	/** By the rung that holds. A rung with nothing to say about the failure is absent. */
	holds: Partial<Record<RungId, Hold>>;
}

/** One part of a comparison and when it runs. */
export interface OracleRun {
	when: RunWhenId;
	/** Which part of the comparison, when a row has more than one. */
	what?: string;
}

/** One comparison of a project against something that already has the right behavior. */
export interface OracleComparison {
	project: string;
	against: string;
	kind: OracleKindId;
	how: string;
	/** Strongest first. */
	runs: Array<OracleRun>;
	/** mdz with one link, to the document that describes the comparison. */
	source: string;
}

/** One action the stack keeps with a person, and what stops an agent from taking it. */
export interface KeptAction {
	action: string;
	/** Strongest first. */
	held_by: Array<MechanismId>;
	how: string;
	/** mdz with one link. */
	source: string;
}

/** One kind of gate, and where and when it runs. */
export interface Gate {
	gate: string;
	catches: string;
	runs: RunWhenId;
	where: string;
	/** mdz with one link. */
	source: string;
}

/** The day these claims were last checked against the repos, as an ISO date. */
export const claims_checked = '2026-11-17';

/** The ladder, top to bottom. Each rung depends less on anyone remembering than the one before. */
export const rungs: Record<RungId, Rung> = {
	person: { label: 'Person', lives: 'A person decides, each time.' },
	session: { label: 'Session', lives: 'An agent does it again in each session.' },
	written: { label: 'Written', lives: 'A rule in a file that sessions load.' },
	tool: { label: 'Tool', lives: 'A tool gives the verdict.' },
	shape: { label: 'Shape', lives: 'The shape of the system rules it out.' }
};

/** The rungs in ladder order. */
export const rung_ids = Object.keys(rungs) as Array<RungId>;

/** In the order the legend shows them. */
export const hold_statuses: Record<HoldStatusId, LegendEntry> = {
	held: { label: 'Held', meaning: 'Done routinely across the stack.' },
	partial: { label: 'Partial', meaning: 'Done in some projects, or only in part.' },
	unreachable: { label: 'Out of reach', meaning: 'This rung cannot hold the failure.' }
};

export const hold_status_ids = Object.keys(hold_statuses) as Array<HoldStatusId>;

/** The legend entry for a hold's `wanted`, drawn beside the statuses. */
export const wanted_legend: LegendEntry = {
	label: 'Wanted',
	meaning: 'More is intended here and not built.'
};

/** Strongest first. */
export const run_whens: Record<RunWhenId, LegendEntry> = {
	every_change: {
		label: 'Every change',
		meaning: 'In the gate a session runs before landing, and again in CI.'
	},
	ci: { label: 'CI', meaning: 'In CI on every push, and not in the local gate.' },
	release: { label: 'Release', meaning: 'Before a release, and not on each change.' },
	on_demand: { label: 'On demand', meaning: 'When someone chooses to run it.' }
};

export const run_when_ids = Object.keys(run_whens) as Array<RunWhenId>;

/** In the order the legend shows them. */
export const oracle_kinds: Record<OracleKindId, LegendEntry> = {
	reference: {
		label: 'Reference',
		meaning: 'An independent implementation that already has the right behavior.'
	},
	suite: {
		label: 'Suite',
		meaning: 'A test suite or recorded baselines from outside the implementation under test.'
	},
	twin: { label: 'Twin', meaning: 'Two implementations in this stack built to match.' },
	build: { label: 'Build', meaning: 'The same source built or run two ways.' },
	law: { label: 'Law', meaning: 'A property the output must satisfy.' },
	previous: { label: 'Previous', meaning: 'An earlier version of the same thing.' }
};

export const oracle_kind_ids = Object.keys(oracle_kinds) as Array<OracleKindId>;

/** Strongest first. */
export const mechanisms: Record<MechanismId, LegendEntry> = {
	tool: { label: 'Tool refuses', meaning: 'The tool an agent uses will not do it.' },
	deny: {
		label: 'Permission rule',
		meaning: 'The agent harness denies the command, matched by its prefix.'
	},
	default: {
		label: 'Dry run by default',
		meaning: 'The command changes nothing until it is given an explicit flag.'
	},
	rule: { label: 'Written rule', meaning: 'An instruction the agent is expected to follow.' }
};

export const mechanism_ids = Object.keys(mechanisms) as Array<MechanismId>;

/** A hold's anchor on the page. */
export const hold_id = (failure: Failure, rung: RungId): string => `${failure.id}-${rung}`;

/** A failure's holds in ladder order, each with its rung. */
export const failure_holds = (failure: Failure): Array<{ rung: RungId; hold: Hold }> =>
	rung_ids.flatMap((rung) => {
		const hold = failure.holds[rung];
		return hold ? [{ rung, hold }] : [];
	});

/** In the order the page shows them. */
export const failures: Array<Failure> = [
	{
		id: 'average',
		name: "Design drifts to the model's average",
		failure:
			'Features that do not fit get built, and designs default to whatever the model has seen most often.',
		reviewed: false,
		holds: {
			person: {
				status: 'held',
				label: 'One owner per project',
				does: "One person sets each project's scope, design and non-goals, and agents write most of the code.",
				fails:
					'When a non-goal is not written down, and the agent fills the gap with its own defaults.',
				cost: 'The project depends on one person, and a successor gets the code and its public docs but not the planning notes kept outside the repos.',
				evidence: [
					'The [mdz README](https://github.com/fuzdev/mdz/blob/main/README.md), which says agents generated almost everything but the designs',
					"mdz's written [list of what it does not include](https://github.com/fuzdev/mdz/blob/main/CLAUDE.md#what-mdz-does-not-include)",
					'The Fuz [contributing page](https://www.fuz.dev/contributing), which asks for design discussion and limits pull requests to collaborators'
				]
			},
			written: {
				status: 'held',
				label: 'Conventions in loaded files',
				does: "The stack's conventions live in skill and project files that sessions load, each section leading with the rules that most often go wrong.",
				fails:
					'When a rule goes stale and misleads every session that loads it, and when rules pile up unpruned.',
				evidence: [
					"The [fuz-stack skill](/skills/fuz-stack), the stack's written conventions",
					"mdz's [project file](https://github.com/fuzdev/mdz/blob/main/CLAUDE.md), one of the files a session in that repo loads"
				]
			},
			tool: {
				status: 'partial',
				label: 'Lints for the mechanical rules',
				does: 'Lints and audits enforce the conventions that have a mechanical form: import paths, unique export names, denied Rust lints and the crate graph. Nothing checks naming, styling or scope.',
				fails: 'When a green lint run is read as the conventions being followed.',
				evidence: [
					'The fuz-stack skill on the [flat namespace](/skills/fuz-stack#flat-namespace), which a build-time check enforces',
					'The [release audit](/skills/fuz-stack/references/rust-spine#check-release), which holds the crate graph to its layering rules',
					'The Rust [lint rules](/skills/fuz-stack/references/rust-patterns#lints), denied as errors in the gate'
				]
			},
			shape: {
				status: 'unreachable',
				label: 'Fit is a judgment',
				does: 'Whether a feature belongs is a judgment about the whole design, and no structure makes that call.',
				evidence: []
			}
		}
	},
	{
		id: 'recurs',
		name: 'A known mistake comes back',
		failure: 'The same class of error repeats across sessions that share no memory.',
		reviewed: false,
		holds: {
			written: {
				status: 'held',
				label: 'The correction is written down',
				does: 'When an agent gets something wrong, the correction goes into a file that later sessions load.',
				fails:
					'When a written warning is expected to prevent a mistake that only a check can prevent.',
				evidence: [
					"The tsv fixture workflow's [list of common mistakes](https://github.com/fuzdev/tsv/blob/main/docs/fixture_workflow.md#common-mistakes), each with its symptom and fix",
					'The [grimoire skill](/skills/grimoire), on a mistake becoming guidance'
				]
			},
			tool: {
				status: 'partial',
				label: 'The gate',
				does: "Types, lints, tests, format checks and drift checks on generated code run in each repo's gate, and in most repos CI runs them again on every push.",
				fails:
					'When green is read as correct. Agents push to the main branch, so CI reports after a commit has landed and the local run is the only check before it.',
				evidence: [
					"gro's [check task](https://github.com/fuzdev/gro/blob/main/src/lib/check.task.ts), the gate for the TypeScript repos",
					'The Rust [gate](/skills/fuz-stack/references/rust-patterns#the-gate)',
					"tsv's [raw-find scan audit](https://github.com/fuzdev/tsv/blob/main/docs/audits.md#raw-find-scan-audit-scanaudit), a named class of bug turned into a gated check"
				],
				inventory: 'gates'
			},
			shape: {
				status: 'partial',
				label: 'Impossible states do not compile',
				does: 'In Rust, closed sets are enums and input structs reject unknown fields. In TypeScript, schema objects reject unknown keys. The flags for what a server mounts have no default, so a new one fails compilation until every config states it.',
				evidence: [
					'The Rust rules on [type modeling](/skills/fuz-stack/references/rust-patterns#type-modeling)',
					'The twin reference on [enforcement](/skills/fuz-stack/references/twin-impl#enforcement), where the flags for what a server mounts have no default',
					'The [schema rules](/skills/fuz-stack/references/fuz-schema#rules), where an object rejects unknown keys'
				]
			}
		}
	},
	{
		id: 'green',
		name: 'Green but wrong',
		failure:
			'Code passes its gates and is still incorrect, or a test passes whether or not the code is right.',
		reviewed: false,
		holds: {
			person: {
				status: 'partial',
				label: 'Review after landing',
				does: 'The maintainer reviews commits after they land on the main branch, and versions, publishing and deploys stay with the maintainer.',
				fails: 'When a defect sits on the main branch until that review reaches it.',
				wanted:
					'A view of the commits pushed across every repo, so the review has one place to happen.',
				evidence: [
					'The [grimoire skill](/skills/grimoire#work-loop), on review after a commit lands',
					"fuz_forge's [list of what is not built](https://github.com/fuzdev/fuz_forge/blob/main/docs/forge.md#not-built), which includes the cross-repo review surface"
				]
			},
			session: {
				status: 'partial',
				label: 'Writer and reviewer loop',
				does: 'In long-running work, one writer changes the code and a read-only reviewer reports findings, and they alternate until a round finds nothing worth fixing.',
				fails:
					"When the reviewer's own severity grades are accepted, and a loop closes with wrong answers filed as minor.",
				cost: 'The reviewer is another agent, so a round catches only what an agent can see.',
				evidence: [
					'The [grimoire skill](/skills/grimoire#arcs), which describes the loop and its stopping rule'
				]
			},
			tool: {
				status: 'partial',
				label: 'Oracles, mutants and control cases',
				does: 'Where a reference exists, a harness checks output against it. A few projects also break the code on purpose to show that a test catches it, and the careful harnesses first prove they can report a failure.',
				fails:
					'When both sides agree on the same bug, when the comparison never looks at the property that is wrong, or when a harness has no control case and reports success for reasons unrelated to the code.',
				cost: 'A twin roughly doubles the implementation, and an instrument is software with its own bugs.',
				wanted: 'Routine mutation and branch-coverage runs for tsv.',
				evidence: [
					"The fuz installer's [mutation gate](https://github.com/fuzdev/fuz/blob/main/scripts/install-test/README.md#mutation-gate), which breaks one behavior at a time and checks that a test catches it",
					"fuz_schema's [mutants](https://github.com/fuzdev/fuz_schema/blob/main/docs/testing.md#mutants), where a survivor needs a written reason",
					"The tsv divergence detector's [overmatching audit](https://github.com/fuzdev/tsv/blob/main/docs/divergence_detector.md#overmatching-audit), which requires a negative case for each pattern"
				],
				inventory: 'oracles'
			}
		}
	},
	{
		id: 'claim',
		name: 'A wrong claim gets acted on',
		failure:
			'A confident wrong statement reads like a right one, and work gets built on a guess that a short run would have corrected.',
		reviewed: false,
		holds: {
			person: {
				status: 'partial',
				label: 'Approval before code, in tsv',
				does: "In tsv's interactive sessions a person approves each failing fixture and the planned fix before any code is written.",
				evidence: [
					"The tsv fixture workflow's [approval gate](https://github.com/fuzdev/tsv/blob/main/docs/fixture_workflow.md#steps-3-4-see-it-fail--approval-gate)"
				]
			},
			session: {
				status: 'partial',
				label: 'Check the claim against the code',
				does: 'An agent checks a review finding, a survey row or its own summary against the code before acting on it, and runs the reference tool before building on a guess.',
				fails:
					'When someone accepts a claim that nothing uses a function from a search inside one package, without walking every consumer.',
				evidence: [
					"The tsv fixture workflow's [parser verification](https://github.com/fuzdev/tsv/blob/main/docs/fixture_workflow.md#22-parser-verification), which runs the canonical parser before any implementation"
				]
			},
			written: {
				status: 'held',
				label: 'Leads, not facts',
				does: 'The written rules call survey rows, review findings and memory leads to verify, and call the code the ground truth where it disagrees with a rule.',
				evidence: [
					'The [grimoire skill](/skills/grimoire#health), under "Leads, not facts"',
					'The [fuz-stack skill](/skills/fuz-stack), whose opening says the code is ground truth'
				]
			},
			tool: {
				status: 'partial',
				label: 'Figures computed from reports',
				does: 'The tsv benchmarks page computes every figure it publishes from committed reports that record their commit and machine, and a test fails when the prose stops matching the data. Elsewhere figures are written by hand.',
				fails:
					'When the benchmark behind a figure predates the current build: refreshing the reports is manual, and nothing checks their age.',
				evidence: [
					'The [tsv benchmarks](https://tsv.fuz.dev/docs/benchmarks), whose prose figures are computed from the reports',
					"The tsv site's [benchmarks notes](https://github.com/fuzdev/tsv.fuz.dev/blob/main/CLAUDE.md#benchmarks), on the test that gates the prose"
				]
			}
		}
	},
	{
		id: 'stale',
		name: 'A stale statement is trusted',
		failure: 'A statement that was true when written is still quoted long after.',
		reviewed: false,
		holds: {
			session: {
				status: 'partial',
				label: 'Distill, then delete',
				does: 'Agents condense raw notes into durable documents and delete finished items.',
				fails: 'When documents only grow.',
				cost: 'Deciding what to delete takes judgment, and deleting the wrong thing loses a reason.',
				evidence: [
					'The [grimoire skill](/skills/grimoire#health), on distilling and rewriting notes'
				]
			},
			written: {
				status: 'partial',
				label: 'Mark built from designed',
				does: 'Design docs in several projects mark what is built and what is only designed, and the written rules treat a wrong doc comment as worse than a missing one. No public rule asks for the status marks.',
				evidence: [
					'A [gro design doc](https://github.com/fuzdev/gro/blob/main/src/docs/backstop.md) that opens with its status',
					"fuz_forge's [list of what is not built](https://github.com/fuzdev/fuz_forge/blob/main/docs/forge.md#not-built)",
					'The rule that [a wrong doc comment is worse than a missing one](/skills/fuz-stack/references/tsdoc-comments#drift)'
				]
			},
			tool: {
				status: 'partial',
				label: 'Link and drift checks',
				does: 'The Rust workspaces fail on a broken doc link, tsv fails on any dead Markdown link or anchor in its repo, and each TypeScript gate fails when a generated file has drifted. Nothing checks links in the Markdown of the TypeScript repos.',
				fails: 'When the links resolve and the sentences around them are no longer true.',
				evidence: [
					"tsv's [doc-link audit](https://github.com/fuzdev/tsv/blob/main/docs/audits.md#doc-link-audit-docsaudit)",
					"gro's docs on [checking generated files](https://github.com/fuzdev/gro/blob/main/src/docs/gen.md#checking-generated-files)",
					'The Rust [lint rules](/skills/fuz-stack/references/rust-patterns#lints), which deny broken doc links'
				]
			},
			shape: {
				status: 'partial',
				label: 'Docs generated from source',
				does: 'API docs are generated from the source and the skill pages on this site from the skill files, so neither is written twice. Hand-written prose has no such source.',
				evidence: [
					'The [documentation system](/skills/fuz-stack/references/documentation-system) reference, on the pipeline from source to API pages',
					"This site's [skill docs generation](https://github.com/fuzdev/docs.fuz.dev/blob/main/src/routes/skills/CLAUDE.md#gen-file-pattern)"
				]
			}
		}
	},
	{
		id: 'copies',
		name: 'Two copies drift apart',
		failure:
			'Duplicated code diverges, a name is translated at a boundary, or a type says one thing while the validator checks another.',
		reviewed: false,
		holds: {
			written: {
				status: 'held',
				label: 'One name, one copy, no shims',
				does: 'The written rules give one identifier to the same thing in TypeScript, Rust and SQL, allow no compatibility layers or re-exports, and move shared code into one place once its reuse is known.',
				fails:
					"When an outside consumer exists and the migration is no longer the maintainer's to finish.",
				cost: "The naming goes against TypeScript's usual convention, and a breaking change has to be carried through every consumer at once.",
				evidence: [
					"The fuz-stack skill's [shared rules](/skills/fuz-stack#shared-rules)",
					'The twin reference on [naming parity](/skills/fuz-stack/references/twin-impl#naming-parity)',
					'The Rust rule to [extract a shared leaf on the third copy](/skills/fuz-stack/references/rust-dependencies#extract-a-shared-leaf-on-the-third-copy)'
				]
			},
			tool: {
				status: 'partial',
				label: 'Drift checks and twin suites',
				does: 'Each TypeScript gate fails on a drifted generated file, and shared suites hold the wire-visible names and shapes of the TypeScript and Rust twins equal. The Rust legs of those suites run on demand, and nothing checks internal names.',
				fails:
					'When a path is tested on one backend only, and the twins agree on the happy path and drift at the edges.',
				wanted: 'The Rust legs of the cross-backend suites in CI.',
				evidence: [
					'The twin reference on [enforcement](/skills/fuz-stack/references/twin-impl#enforcement)',
					"fuz_app's [CI workflow](https://github.com/fuzdev/fuz_app/blob/main/.github/workflows/check.yml), which runs the TypeScript legs and names the ones it skips",
					"tsv's [wire-type drift check](https://github.com/fuzdev/tsv/blob/main/docs/audits.md#wire-type-drift-check-checkast-types)"
				]
			},
			shape: {
				status: 'partial',
				label: 'One schema, one library',
				does: 'Within TypeScript one schema gives each data shape its type, defaults and validation, and each shared concern has one library. The Rust twins and the wire types of tsv are written by hand beside what they mirror.',
				fails: 'When a type is written by hand beside the schema it should come from.',
				cost: 'A schema change cascades through everything derived from it.',
				evidence: [
					'The [schema rules](/skills/fuz-stack/references/fuz-schema#rules)',
					"[fuz_schema](https://github.com/fuzdev/fuz_schema), the stack's one schema library",
					"fuz_ui's [changelog entry](https://github.com/fuzdev/fuz_ui/blob/main/CHANGELOG.md#02050) extracting mdz into its own library"
				]
			}
		}
	},
	{
		id: 'gate',
		name: 'A gate stops gating',
		failure: 'A check skips, caps its run or falls back, and still shows green.',
		reviewed: false,
		holds: {
			written: {
				status: 'held',
				label: 'Read the exit code',
				does: "The written rules make the gate's exit code the pass condition, never its filtered output.",
				fails:
					"When a gate's output is piped through a filter that hides its exit code, and the commit follows anyway.",
				evidence: [
					"The fuz-stack skill on [the gate](/skills/fuz-stack#the-gate), which says to read the gate's exit code",
					'The Rust [gate](/skills/fuz-stack/references/rust-patterns#the-gate), whose pass condition is the exit code'
				]
			},
			tool: {
				status: 'partial',
				label: 'Suites fail on a skip',
				does: 'The suites of zap, fuz and pglet fail when a test program or a prerequisite is missing, and the pinned counts of tsv fail when a count moves. Elsewhere a skip may only warn.',
				fails: 'When a skip stays green with a warning that nobody reads.',
				cost: 'A loud failure interrupts work that a quiet fallback would have let continue.',
				evidence: [
					"tsv's [pinned gate counts](https://github.com/fuzdev/tsv/blob/main/docs/gate_counts.md#pinned-gate-counts), which fail when the set of graded files changes",
					"pglet's [CI workflow](https://github.com/fuzdev/pglet/blob/main/.github/workflows/check.yml), which refuses to be green because a prerequisite was missing",
					'The Rust [testing rules](/skills/fuz-stack/references/rust-patterns#testing), on suites that never pass by skipping'
				]
			},
			shape: {
				status: 'partial',
				label: 'One gate definition, in tsv',
				does: "tsv's CI runs the same check command a session runs, so the two lists cannot drift. Elsewhere CI lists its steps again. Nothing structural stops a commit whose local gate was red.",
				evidence: [
					"tsv's [CI workflow](https://github.com/fuzdev/tsv/blob/main/.github/workflows/check.yml), which runs the same check command as a session does"
				]
			}
		}
	},
	{
		id: 'speedup',
		name: 'A predicted speedup that is not one',
		failure: 'An optimization is predicted to help, lands, and does not.',
		reviewed: false,
		holds: {
			session: {
				status: 'partial',
				label: 'Race the candidates',
				does: 'In fuz_schema and tsv, agents build candidate changes, grade them against a base on real workloads, and record what was declined and why.',
				fails: 'When a micro-benchmark or a model of the cost stands in for the measured workload.',
				cost: 'Wall-clock numbers need a quiet machine.',
				evidence: [
					"fuz_schema's [record of trades](https://github.com/fuzdev/fuz_schema/blob/main/docs/declined.md) that were built, measured and declined",
					"fuz_schema's [grading](https://github.com/fuzdev/fuz_schema/blob/main/docs/grading.md) of a candidate against a base",
					"tsv's [measurement process](https://github.com/fuzdev/tsv/blob/main/docs/performance.md#measurement-process)"
				]
			},
			written: {
				status: 'held',
				label: 'Measure before claiming',
				does: 'The written rules say a performance claim comes from a harness, states its noise floor, and is graded against its base.',
				evidence: [
					'The fuz-stack [performance reference](/skills/fuz-stack/references/rust-perf#measure)',
					"fuz_schema's [grading rules](https://github.com/fuzdev/fuz_schema/blob/main/docs/grading.md#rules)"
				]
			},
			tool: {
				status: 'partial',
				label: 'Size limits in CI',
				does: 'CI holds the WebAssembly builds of tsv, pglet and fuz_schema, and the native addon of tsv, under committed size limits. In gro and tsv, instruction counts are graded against a base on demand and held to no committed limit.',
				fails:
					'When the gated axis holds and the regression is on another: an instruction count is blind to code size.',
				evidence: [
					"tsv's [artifact validation](https://github.com/fuzdev/tsv/blob/main/docs/tasks.md#validateartifacts), with its size bands",
					"pglet's notes on [size and startup](https://github.com/fuzdev/pglet/blob/main/README.md#size-and-startup)",
					"fuz_schema's [CI workflow](https://github.com/fuzdev/fuz_schema/blob/main/.github/workflows/check.yml), which holds the WebAssembly build under a ceiling"
				]
			},
			shape: {
				status: 'unreachable',
				label: 'Speed is a measurement',
				does: 'Whether a change is faster is known only by measuring it, so no structure can rule a slow one out.',
				evidence: []
			}
		}
	},
	{
		id: 'slow',
		name: 'A slow check gets skipped',
		failure: 'A check is slow enough that sessions stop running it.',
		reviewed: false,
		holds: {
			written: {
				status: 'held',
				label: 'The full gate before landing',
				does: 'The written rules name the full gate as what runs before work counts as done, and warn that the faster checks skip test targets.',
				fails: 'When a fast targeted check stands in for the full gate before landing.',
				evidence: [
					'The fuz-stack skill on [the gate](/skills/fuz-stack#the-gate)',
					'The Rust [gate](/skills/fuz-stack/references/rust-patterns#the-gate), on what a quick check leaves out'
				]
			},
			tool: {
				status: 'partial',
				label: 'CI reruns the gate',
				does: 'CI runs the full gate on every push whatever the session ran, in every public code repo but a few.',
				fails: 'When the answer arrives after the commit has landed.',
				evidence: [
					"tsv's [CI workflow](https://github.com/fuzdev/tsv/blob/main/.github/workflows/check.yml)",
					"gro's [CI workflow](https://github.com/fuzdev/gro/blob/main/.github/workflows/check.yml)"
				],
				inventory: 'gates'
			},
			shape: {
				status: 'partial',
				label: 'Fast tools',
				does: 'The formatter and parser of tsv, and pglet as a test database, are built to answer quickly, and pglet states a startup target. Rust compile loops stay slow, and the heaviest gates, such as the corpus and conformance runs of tsv, run before a release and not on each push.',
				evidence: [
					'The [tsv README](https://github.com/fuzdev/tsv/blob/main/README.md), which ranks speed second among its priorities',
					"pglet's notes on [size and startup](https://github.com/fuzdev/pglet/blob/main/README.md#size-and-startup)",
					'The [tsv benchmarks](https://tsv.fuz.dev/docs/benchmarks)'
				]
			}
		}
	},
	{
		id: 'irreversible',
		name: 'An unattended session does something irreversible',
		failure:
			'A session publishes, changes a version, adds a dependency or deploys with nobody watching.',
		reviewed: false,
		holds: {
			person: {
				status: 'held',
				label: 'The maintainer releases',
				does: 'Versions, publishing, new dependencies, new packages and deploys stay with the maintainer.',
				cost: 'Work waits on a person at exactly the outward-facing steps.',
				evidence: [
					"The fuz-stack skill's [shared rules](/skills/fuz-stack#shared-rules)",
					"tsv's [release task](https://github.com/fuzdev/tsv/blob/main/docs/tasks.md#release), which is the owner's to run by hand"
				]
			},
			written: {
				status: 'held',
				label: 'Rules for versions and dependencies',
				does: 'A written rule is all that stops a version change, a new dependency or a new package. No check detects any of the three.',
				fails: 'When the rule is the only limit and a session does not load it.',
				evidence: [
					"The fuz-stack skill's [shared rules](/skills/fuz-stack#shared-rules)",
					'The same rule for [Rust crates](/skills/fuz-stack#rust-crates)'
				]
			},
			tool: {
				status: 'partial',
				label: 'A push gateway and deny rules',
				does: "Agents push through a tool that only fast-forwards the checked-out branch and never sends a tag, a force or a new remote branch. The agent harness denies raw pushes, as the tool's docs recommend, and the publish and deploy commands, in settings that are not public.",
				fails: 'When a differently spelled command gets past a deny rule that matches by prefix.',
				evidence: [
					"The repos tool's docs on [what agents push through](https://github.com/fuzdev/fuz_repos/blob/main/docs/repos.md#agents-push-through-repos-push), including the deny rules and their gap",
					'The same docs on [the push gateway](https://github.com/fuzdev/fuz_repos/blob/main/docs/repos.md#repos-push-the-gateway)'
				],
				inventory: 'actions'
			},
			shape: {
				status: 'partial',
				label: 'Dry run by default',
				does: 'A new command in a shipped Rust tool whose effect is hard to undo is a dry run until it is given an explicit flag, and the release scripts follow the same rule.',
				evidence: [
					'The [Rust rules](/skills/fuz-stack#rust-crates), where a hard-to-undo command is a dry run until told otherwise',
					"zap's rule that [a real run executes only a plan it has already previewed](https://github.com/fuzdev/zap/blob/main/docs/concepts.md#a-wetrun-executes-only-the-plan-you-reviewed)"
				]
			}
		}
	}
];

/** Strongest first, by each row's strongest `runs`. */
export const oracle_comparisons: Array<OracleComparison> = [
	{
		project: 'tsv formatter',
		against: 'Prettier',
		kind: 'reference',
		how: "Fixtures hold Prettier's output with each difference documented, the recordings are checked against a live, pinned Prettier, and a corpus diff fails on lost content or a new uncataloged difference",
		runs: [
			{ when: 'every_change', what: 'fixtures' },
			{ when: 'release', what: 'recordings and corpus diff' }
		],
		source: '[gate map](https://github.com/fuzdev/tsv/blob/main/benches/js/CLAUDE.md#gate-map)'
	},
	{
		project: 'tsv formatter',
		against: 'Itself',
		kind: 'law',
		how: 'Formatting twice gives the same result, on every fixture and across a real-code corpus',
		runs: [
			{ when: 'every_change', what: 'fixtures' },
			{ when: 'release', what: 'corpus' }
		],
		source:
			'[corpus bundle](https://github.com/fuzdev/tsv/blob/main/docs/audits.md#the-corpus-bundle-auditcorpus)'
	},
	{
		project: 'tsv formatter',
		against: 'Its input, reparsed',
		kind: 'law',
		how: 'Formatted output parses back to the same document as its source',
		runs: [
			{ when: 'every_change', what: 'fixtures' },
			{ when: 'release', what: 'corpus' }
		],
		source:
			'[round-trip audit](https://github.com/fuzdev/tsv/blob/main/docs/audits.md#formatreparse-round-trip-audit-roundtripaudit)'
	},
	{
		project: 'tsv formatter',
		against: 'Its input, rendered',
		kind: 'law',
		how: 'A Svelte component renders the same before and after formatting',
		runs: [
			{ when: 'every_change', what: 'fixtures' },
			{ when: 'release', what: 'corpus' }
		],
		source:
			'[render audit](https://github.com/fuzdev/tsv/blob/main/docs/audits.md#render-equivalence-audit-renderaudit)'
	},
	{
		project: 'tsv parser',
		against: "Svelte's parser, acorn-typescript and Svelte's CSS parser",
		kind: 'reference',
		how: "Fixtures hold the canonical parser's syntax tree, the recordings are checked against the live parser, and a deep diff over real codebases classifies every difference against a catalog",
		runs: [
			{ when: 'every_change', what: 'fixtures' },
			{ when: 'release', what: 'recordings and corpus diff' }
		],
		source:
			'[parse comparison](https://github.com/fuzdev/tsv/blob/main/benches/js/CLAUDE.md#parse-comparison)'
	},
	{
		project: 'tsv type stripping',
		against: "ts-blank-space, with Node's type stripping as a cross-check",
		kind: 'reference',
		how: "Fixtures hold ts-blank-space's output, a corpus diff runs against it, and a Node cross-check of the fixtures runs by hand",
		runs: [
			{ when: 'every_change', what: 'fixtures' },
			{ when: 'release', what: 'corpus diff' },
			{ when: 'on_demand', what: 'Node cross-check' }
		],
		source:
			'[strip fixtures](https://github.com/fuzdev/tsv/blob/main/docs/audits.md#strip-fixture-validation-stripfixturesvalidate)'
	},
	{
		project: 'tsv import scanner',
		against: "The canonical parsers' trees, and oxc-parser's module record",
		kind: 'reference',
		how: "Fixtures are checked against records read off the canonical parsers' trees, and the records must agree with oxc-parser's over a corpus",
		runs: [
			{ when: 'every_change', what: 'fixtures' },
			{ when: 'release', what: 'corpus' }
		],
		source:
			'[import differential](https://github.com/fuzdev/tsv/blob/main/docs/audits.md#import-corpus-differential-importscorpus)'
	},
	{
		project: 'tsv Svelte compiler',
		against: "Svelte's compiler",
		kind: 'reference',
		how: "Fixtures hold Svelte's compiled output and are diffed after a canonical reprint, and the recordings are checked against live Svelte",
		runs: [
			{ when: 'every_change', what: 'fixtures' },
			{ when: 'release', what: 'recordings' },
			{ when: 'on_demand', what: 'corpus' }
		],
		source:
			'[compile fixtures](https://github.com/fuzdev/tsv/blob/main/docs/audits.md#compile-fixture-validation-compilefixturesvalidate)'
	},
	{
		project: 'fuz_forge server, TypeScript',
		against: 'Its Rust server',
		kind: 'twin',
		how: 'Both unit suites assert against shared case tables, and a cross-backend suite runs both servers',
		runs: [
			{ when: 'every_change', what: 'shared case tables' },
			{ when: 'on_demand', what: 'cross-backend suite' }
		],
		source:
			'[parity fixtures](https://github.com/fuzdev/fuz_forge/blob/main/src/test/CLAUDE.md#parity-fixtures-fixturesparity)'
	},
	{
		project: 'pglet',
		against: 'Postgres',
		kind: 'reference',
		how: 'SQL fixtures run through both, compared in the binary format against recorded Postgres results and in the text format live',
		runs: [{ when: 'every_change' }],
		source:
			'[fixtures](https://github.com/fuzdev/pglet/blob/main/tests/README.md#fixtures-fixtures)'
	},
	{
		project: 'fuz_schema, Rust side',
		against: 'The TypeScript library',
		kind: 'twin',
		how: 'The TypeScript side generates fixtures and the Rust tests assert both evaluators against them, with differences declared',
		runs: [{ when: 'every_change' }],
		source: '[fixtures](https://github.com/fuzdev/fuz_schema/blob/main/docs/rust.md#fixtures)'
	},
	{
		project: 'fuz_schema',
		against: 'Zod and Valibot',
		kind: 'reference',
		how: 'Where the two agree, it gives the same result or declares the difference',
		runs: [{ when: 'every_change' }],
		source:
			'[differential](https://github.com/fuzdev/fuz_schema/blob/main/docs/testing.md#the-differential)'
	},
	{
		project: 'mdz streaming parser',
		against: 'Its one-shot parser',
		kind: 'twin',
		how: 'Whole and chunked input must give the same tree',
		runs: [{ when: 'every_change' }],
		source: '[architecture](https://github.com/fuzdev/mdz/blob/main/CLAUDE.md#architecture)'
	},
	{
		project: "gro's Rust runtime, built-in modules",
		against: "gro's Node implementations",
		kind: 'twin',
		how: 'Each case runs under the Rust runtime and must equal what the Node version printed, with differences declared per case',
		runs: [{ when: 'every_change' }],
		source:
			'[Rust workspace](https://github.com/fuzdev/gro/blob/main/CLAUDE.md#rust-workspace-experimental)'
	},
	{
		project: 'tsv WebAssembly build',
		against: 'tsv native build',
		kind: 'build',
		how: 'Both engines must return the same bytes, exit code and error output',
		runs: [{ when: 'ci' }],
		source:
			'[engine parity](https://github.com/fuzdev/tsv/blob/main/docs/audits.md#engine-parity-audit-enginesaudit)'
	},
	{
		project: 'fuz_app backend on Node',
		against: 'The same backend on Bun',
		kind: 'build',
		how: 'Every conformance case is sent to both and the answers compared',
		runs: [{ when: 'ci' }],
		source:
			'[cross-backend tests](https://github.com/fuzdev/fuz_app/blob/main/src/test/CLAUDE.md#cross-backend-self-tests-srctestcross_backend)'
	},
	{
		project: "fuz's package installer",
		against: 'npm',
		kind: 'reference',
		how: 'From one lockfile, what it installs must be a superset of what npm installs, with matching links',
		runs: [{ when: 'ci' }],
		source:
			'[installer gate](https://github.com/fuzdev/fuz/blob/main/scripts/fuzi-gate/README.md#what-it-asserts-per-fixture-both-libcs)'
	},
	{
		project: 'tsv parser',
		against: "The test suites of Svelte's compiler and acorn-typescript",
		kind: 'suite',
		how: 'Accept and reject verdicts must match, and differences in tree shape are reported without failing',
		runs: [{ when: 'release' }],
		source:
			'[suite conformance](https://github.com/fuzdev/tsv/blob/main/benches/js/CLAUDE.md#conformancesvelte-fixtures)'
	},
	{
		project: 'tsv TypeScript parser',
		against: "The TypeScript compiler's recorded baselines",
		kind: 'suite',
		how: "The compiler's baselines over its own test cases decide which programs are valid, and a rejection outside the ledger fails",
		runs: [{ when: 'release' }],
		source:
			'[the oracle](https://github.com/fuzdev/tsv/blob/main/docs/conformance_tsc.md#the-oracle)'
	},
	{
		project: 'tsv parser',
		against: 'test262',
		kind: 'suite',
		how: 'The programs that should parse must parse, held to a pinned count, and wrongly accepted programs are reported without failing',
		runs: [{ when: 'release' }],
		source:
			'[current results](https://github.com/fuzdev/tsv/blob/main/docs/conformance_test262.md#current-results)'
	},
	{
		project: 'blake3 WebAssembly builds',
		against: "The native blake3 crate's test vectors",
		kind: 'reference',
		how: 'Each build must reproduce test vectors generated from the native crate',
		runs: [
			{ when: 'release', what: 'the publish steps' },
			{ when: 'on_demand', what: 'by hand' }
		],
		source: '[test vectors](https://github.com/fuzdev/blake3/blob/main/CLAUDE.md#test-vectors)'
	},
	{
		project: 'tsv typechecker',
		against: "TypeScript 7's recorded error baselines",
		kind: 'suite',
		how: 'Error codes, spans and order are compared',
		runs: [{ when: 'on_demand' }],
		source:
			'[gating status](https://github.com/fuzdev/tsv/blob/main/docs/typechecker.md#gating-status)'
	},
	{
		project: 'fuz_app backend, TypeScript',
		against: 'The fuz spine crates, Rust',
		kind: 'twin',
		how: 'One suite runs against both over HTTP, WebSocket and SSE, and their schemas, action manifests and conformance answers are compared',
		runs: [{ when: 'on_demand' }],
		source:
			'[cross-backend tests](https://github.com/fuzdev/fuz_app/blob/main/src/test/CLAUDE.md#cross-backend-self-tests-srctestcross_backend)'
	},
	{
		project: 'zzz server',
		against: "fuz_app's shared cross-backend suites",
		kind: 'suite',
		how: 'The suites that fuz_app ships run against the zzz server',
		runs: [{ when: 'on_demand' }],
		source:
			'[development stage](https://github.com/fuzdev/zzz/blob/main/CLAUDE.md#development-stage)'
	},
	{
		project: 'zap, working tree',
		against: 'zap, previous main build',
		kind: 'previous',
		how: 'Both binaries run against identical virtual machines and must report the same, which shows equivalence and not correctness',
		runs: [{ when: 'on_demand' }],
		source:
			'[differential harness](https://github.com/fuzdev/zap/blob/main/docs/differential.md#the-differential-harness)'
	}
];

/** In the order the page shows them. */
export const kept_actions: Array<KeptAction> = [
	{
		action: 'Force-push or rewrite the main branch',
		held_by: ['tool', 'deny'],
		how: 'The push tool only fast-forwards, and raw pushes are denied',
		source:
			'[push gateway](https://github.com/fuzdev/fuz_repos/blob/main/docs/repos.md#repos-push-the-gateway)'
	},
	{
		action: 'Push a tag, which starts a release in CI for tsv and gro',
		held_by: ['tool', 'deny'],
		how: 'The push tool never sends a tag, and raw pushes are denied',
		source:
			'[push gateway](https://github.com/fuzdev/fuz_repos/blob/main/docs/repos.md#repos-push-the-gateway)'
	},
	{
		action: 'Create a remote branch',
		held_by: ['tool', 'deny'],
		how: "The push tool refuses to create one from an agent's shell",
		source:
			'[new branches](https://github.com/fuzdev/fuz_repos/blob/main/docs/repos.md#--new-branch)'
	},
	{
		action: 'Publish a package',
		held_by: ['deny', 'default', 'rule'],
		how: 'The harness denies the publish commands, in settings that are not public, and the release scripts change nothing without an explicit flag',
		source: '[release task](https://github.com/fuzdev/tsv/blob/main/docs/tasks.md#release)'
	},
	{
		action: 'Deploy a site or a server',
		held_by: ['deny', 'default', 'rule'],
		how: 'The harness denies the site deploy command, in settings that are not public. A server deploy changes nothing without an explicit flag and runs only a plan the tool has already previewed, which an agent can do itself',
		source:
			'[reviewed plans](https://github.com/fuzdev/zap/blob/main/docs/concepts.md#a-wetrun-executes-only-the-plan-you-reviewed)'
	},
	{
		action: 'Delete files or data',
		held_by: ['rule'],
		how: "Only a written rule in general. The stack's own Rust tools make a hard-to-undo command a dry run until it is given an explicit flag",
		source: '[Rust rules](/skills/fuz-stack#rust-crates)'
	},
	{
		action: 'Change a version or a changelog',
		held_by: ['rule'],
		how: 'Only a written rule: no check detects the change',
		source: '[shared rules](/skills/fuz-stack#shared-rules)'
	},
	{
		action: 'Add or upgrade a dependency',
		held_by: ['rule'],
		how: 'Only a written rule, with an allowlist to choose from',
		source: '[shared rules](/skills/fuz-stack#shared-rules)'
	},
	{
		action: 'Create a package or a crate',
		held_by: ['rule'],
		how: 'Only a written rule: the release audit checks the crate graph, not new members',
		source: '[shared rules](/skills/fuz-stack#shared-rules)'
	}
];

/** Strongest `runs` first. */
export const gates: Array<Gate> = [
	{
		gate: 'Types, tests, lints and format',
		catches: 'Type errors, regressions, lint errors and style drift',
		runs: 'every_change',
		where: 'The TypeScript and Svelte repos',
		source: '[check task](https://github.com/fuzdev/gro/blob/main/src/lib/check.task.ts)'
	},
	{
		gate: 'Drift in generated files',
		catches: 'A generated file that no longer matches its source',
		runs: 'every_change',
		where: 'The TypeScript and Svelte repos',
		source:
			'[checking generated files](https://github.com/fuzdev/gro/blob/main/src/docs/gen.md#checking-generated-files)'
	},
	{
		gate: 'Format, lints as errors, tests and doc links',
		catches: 'Lint and test failures and broken doc links',
		runs: 'every_change',
		where: 'The Rust workspaces',
		source: '[Rust gate](/skills/fuz-stack/references/rust-patterns#the-gate)'
	},
	{
		gate: 'Release audit',
		catches: 'Forbidden crates and test-only features in a release build',
		runs: 'every_change',
		where: 'fuz, fuz_forge, zap and pglet',
		source: '[release audit](/skills/fuz-stack/references/rust-spine#check-release)'
	},
	{
		gate: 'Pinned pass counts',
		catches: 'Conformance coverage that quietly shrinks or shifts',
		runs: 'every_change',
		where: "pglet, and tsv's fixture validation",
		source:
			'[pinned counts](https://github.com/fuzdev/tsv/blob/main/docs/gate_counts.md#pinned-gate-counts)'
	},
	{
		gate: 'Drift in the package exports map',
		catches:
			'An exports map that no longer matches the source, which the local gate rewrites instead of failing on',
		runs: 'ci',
		where: 'The TypeScript and Svelte repos',
		source: '[check task](https://github.com/fuzdev/gro/blob/main/src/lib/check.task.ts)'
	},
	{
		gate: 'Build, a clean tree after the run, and no planning notes in the repo',
		catches: 'A broken build, uncommitted output and planning docs at the repo root',
		runs: 'ci',
		where: 'The TypeScript and Svelte repos',
		source: '[check task](https://github.com/fuzdev/gro/blob/main/src/lib/check.task.ts)'
	},
	{
		gate: 'Committed size limits',
		catches: 'A binary or WebAssembly build that has grown',
		runs: 'ci',
		where: 'tsv, pglet and fuz_schema',
		source:
			'[artifact validation](https://github.com/fuzdev/tsv/blob/main/docs/tasks.md#validateartifacts)'
	},
	{
		gate: 'Mutation gate',
		catches: 'A test that passes whether or not the code is right',
		runs: 'ci',
		where: "fuz's installer",
		source:
			'[mutation gate](https://github.com/fuzdev/fuz/blob/main/scripts/install-test/README.md#mutation-gate)'
	},
	{
		gate: 'Conformance against committed ledgers',
		catches: 'A parser or formatter difference that no ledger records',
		runs: 'release',
		where: 'tsv',
		source: '[audits](https://github.com/fuzdev/tsv/blob/main/docs/audits.md#overview)'
	},
	{
		gate: 'Instruction counts against a base',
		catches: 'A performance regression, as a review rule and not a limit',
		runs: 'on_demand',
		where: 'gro and tsv',
		source: '[measure](/skills/fuz-stack/references/rust-perf#measure)'
	}
];

/** mdz, one link each: where a repo's CI runs less than its local gate, or does not run. */
export const gate_gaps: Array<string> = [
	'The Rust gate of zzz runs only locally, and [its CI is Node-only](https://github.com/fuzdev/zzz/blob/main/CLAUDE.md#development-workflow)',
	"[zervo's CI](https://github.com/fuzdev/zervo/blob/main/.github/workflows/check.yml) builds and tests nothing, because its browser engine is too heavy to build on each push",
	'[blake3](https://github.com/fuzdev/blake3) has no CI, so its size limits and test vectors run only by hand and before a release',
	"[This site's CI](https://github.com/fuzdev/docs.fuz.dev/blob/main/.github/workflows/check.yml) skips the check for drifted generated files"
];

/** Every mdz string in this page's data that carries a link, with its record, in page order. */
export const coherence_entries = (): Array<EvidenceEntry> => [
	...failures.flatMap((failure) =>
		failure_holds(failure).flatMap(({ rung, hold }) =>
			hold.evidence.map((content) => ({ record: hold_id(failure, rung), content }))
		)
	),
	...oracle_comparisons.map((c) => ({
		record: `oracle: ${c.project} against ${c.against}`,
		content: c.source
	})),
	...kept_actions.map((a) => ({ record: `action: ${a.action}`, content: a.source })),
	...gates.map((g) => ({ record: `gate: ${g.gate}`, content: g.source })),
	...gate_gaps.map((content) => ({ record: 'gate gap', content }))
];
