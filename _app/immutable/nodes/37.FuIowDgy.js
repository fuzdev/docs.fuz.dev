import{dt as e,ft as t}from"../chunks/Bqh8G2yR.js";import{t as n}from"../chunks/BhLIK611.js";import{t as r}from"../chunks/CS-piQRQ.js";import{t as i}from"../chunks/pGYaDZDM.js";var a={slug:`overview`,title:`Grimoire`,content:`# Grimoire

A grimoire is a markdown meta-repo that sits beside the repos it coordinates
and holds working understanding about them — what was decided and why, what's
next, what connects to what. No deployable code: CLAUDE.md files carry context
agents load, skills carry reusable knowledge. The docs are living, revised as
projects change and understanding deepens.

**Patterns, not a spec**: what follows are broad patterns a personal grimoire
has proved out in practice. A grimoire is meant to evolve for its owner's
needs — adopt what fits, rename or drop what doesn't, invent what's missing.
Conventions sharpen through use: practice exposes a gap, a mistake reveals it,
the fix becomes guidance, and existing docs converge on it.

**Why**: units of work cut across repos. A grimoire gives them a home without
polluting implementation repos with planning artifacts, and gives stateless
agent sessions the context to orient across a whole ecosystem.

**Lifecycle**: the grimoire sits between implementation (repos) and published
docs. Raw agent memory distills into lore, lore feeds quests and
implementation, settled understanding crystallizes into each repo's own docs
and published docs, and new understanding flows back into lore. **Graduation** always means content
advances one stage and is deleted from the previous one.

## Core

### Lore (\`lore/{subject}/\`)

The grimoire's projection of a subject — usually a sibling repo, but also an
org, a skill, or a long-term vision. It holds planning context that doesn't
belong in the implementation: ecosystem role, decisions and their reasoning,
cross-repo relationships, what's next. A projection, not a copy: the test is
whether lore _adds_ something the repo doesn't provide. Restating what the repo
already says clearly is a liability; distilled understanding can live in both
places.

**Lore and repo docs** work as a pair. A repo's own \`docs/\` is the cleaner,
crystallized layer: short reference pages that say what is — the mechanism,
the commands, the rules, how to read the output. Lore has wider scope and more
noise: rationale at length, dated decisions, explorations, open questions,
measurement logs. As understanding settles it graduates from lore into repo
docs, and lore keeps the reasoning and history. Repo docs are public-repo
content, so they never point back into the grimoire.

**Growth**: start with \`TODO.md\` alone. Add \`CLAUDE.md\` when context or
decisions accumulate — most active entries settle on the pair, CLAUDE.md for
understanding and TODO.md for action. Split \`TODO_{TOPIC}.md\` files when a
topic outgrows its section, and add \`DECISIONS.md\`, design files, or subdirs
as the subject demands. Don't build structure speculatively.

**Lore CLAUDE.md** has a predictable shape; every section is optional:

\`\`\`md
# project_name

> One-line summary.

**Repo**: ../project_name | **Status**: freeform (active, design, dormant, …)

Ecosystem role, why it matters, key relationships.

## Decisions

Why, not what. Delete when obvious from code.

## Lore Docs

Table of every file in this entry with a one-line purpose.

## See Also

Related lore, quests, upstream/downstream projects.
\`\`\`

It never holds build commands, file structure, or API surface (the repo's
CLAUDE.md), nor metrics and status that go stale (TODO.md). Navigational file
references are bare paths — \`./path\`, \`../path\`, or a path from the grimoire
root (preferred over a deep \`../../\` chain); see the fuz-stack skill's
path-reference conventions.

**TODO.md** is forward-looking: task tracking and design exploration at any
level of progress or speculation — the \`TODO_\` prefix means "active thinking
about the future," not strictly a task list. Common sections, all optional:
\`## Active\` / \`## Planned\` (checkboxes), \`## Deferred\`, \`## Shipped\` (brief,
dated), \`## Active Docs\` (links to split files).

- \`- [ ] **Title** — description\`; done: \`- [x] **Title** — (2026-03-11) what was done\`
- Sub-bullets for decision branches and design considerations
- Quest-linked: \`- [ ] Item ([quest](../../quests/quest-name.md))\`

**Splitting**: move a topic into \`TODO_{TOPIC}.md\` (\`TODO_AUTH.md\`,
\`TODO_RELEASE.md\`) when it is a separate domain, has grown into a design
exploration with its own narrative, or serves a different reader (an
investigation vs a release checklist). Split files are self-contained, each
shaped to its content. The main TODO.md keeps general items plus an
\`## Active Docs\` table; in a heavily split entry it becomes mostly a routing
index.

**DECISIONS.md** is created lazily, once an inline \`## Decisions\` section
outgrows a few entries:

\`\`\`md
### Chose X over Y (2026-02-20)

Brief reasoning. What made X better, what was wrong with Y.
\`\`\`

Name the rejected option only when non-obvious. Decisions are scaffolding,
not records — delete one when the reasoning is obvious from the code or it has
become just how things are.

### Quests (\`quests/\`)

Cross-repo goals with a lifecycle. A quest is warranted when work spans 2+
repos or a significant goal has multiple phases; single-repo work stays in
lore TODOs.

\`\`\`md
- **Status**: open | active | blocked | done (freeform annotations welcome)
- **Repos**: which repos this touches
- **Depends**: quest IDs that must complete first
- **Blocks**: quest IDs waiting on this one
- **Urgency**: low | mid | high
- **Effort**: S | M | L
- **Uncertainty**: low | mid | high
- **Impact**: low | mid | high

## Goal

What success looks like.

## Tasks

- [ ] Concrete work items as checkboxes

## Notes

Decision log, observations, blockers.
\`\`\`

**Naming**: standalone quests are \`quests/{slug}.md\`; a group gets a short
prefix dir with a \`CLAUDE.md\` overview and numbered files
\`{prefix}/{prefix}-{n}_{slug}.md\`. \`quests/CLAUDE.md\` holds the conventions
and the index — the only discovery mechanism, so every quest is listed there.

**Quests vs lore TODOs**: quests own cross-repo coordination, lore owns
repo-local understanding. They link and never duplicate — a lore item links
its quest, a quest links lore for design context. A TODO that grows cross-repo
becomes a quest, and the lore item becomes a link to it.

**Done**: synthesize what was learned into lore — update how the lore models
the domain, don't just append a summary. Add a short \`quests/HISTORY.md\` entry
(repos, what was done, key choices), delete the quest file, and fix
cross-references and the index. Repo-local leftovers stay in lore TODOs, since
they were never copied into the quest; git holds the rest.

**Blocked** for over a month: update its dependencies, split it, or close it.

### Arcs

A quest is a goal; an **arc** is sustained execution — a long-running,
gate-driven implementation effort across many sessions. An arc may serve any
number of quests or lore TODOs, or none.

- **One arc ↔ one checkout ↔ at most one live session** — the repo's main
  checkout by default; a worktree or branch only when the operator chooses
  one. Single-threaded by convention, no locks; the operator owns isolation.
- **One reviewed commit per slice** — the work stays unstaged through review
  and is committed once review closes it. Review continues after the commit
  (see the work loop).
- **The checkout stays public-repo clean** — no grimoire references or arc
  narration in the implementation repo.
- **Lore is the arc's memory** — an index doc in \`lore/{project}/\` holds the
  resume state (status, milestone ladder, open items, landed log). Sessions
  update it as they go; a fresh session needs nothing else to continue.
- **A board doc lists active arcs** — one pointer row each, never a second
  source of truth. A closed arc's row is deleted; git keeps the history.
- **The session orchestrates** — it delegates code edits to writer subagents,
  one alive at a time, alternating with read-only reviewers; it keeps lore
  current between them and asks the human its fork questions early and in
  batches, so no step waits on an answer.
- **Review until the loop terminates** — every writer pass gets a read-only
  review. A slice closes on an empty round; on a round whose findings are all
  declined _and logged as tracked work_ (a real, in-scope finding is never
  declinable); or on exact, behavior-free fixes (comments, docs, test-only
  code) applied verbatim with the gates rerun. Any other change resets the
  loop. Treat a clean first round with suspicion.
- **Hand off through lore** — when context runs out, write the precise state,
  findings verbatim, the next action, and what sits unstaged into the index
  doc, commit the lore, and stop. Unreviewed work stays unstaged for the next
  session.

Worktrees are opt-in isolation — for an arc, or for small parallel work
without the arc apparatus.

## Supporting Layers

Each appears when a need does.

**Skills** (\`skills/\`) — [Agent skills](https://agentskills.io/): a \`SKILL.md\`
with YAML frontmatter plus optional \`references/\`, \`scripts/\`, and \`assets/\`
([spec](https://github.com/anthropics/skills)). They live in the grimoire or a
dedicated docs repo, and can have a lore entry for planning context.

**Writing** (\`writing/\`) — philosophy, vision, and frameworks spanning the
ecosystem. "How the auth system works" is lore; "why autonomy matters for
software design" is writing. Writing may link lore; lore shouldn't depend on
writing for implementation context.

**Glossary** (\`GLOSSARY.md\`) — shared definitions for the grimoire's
metaphors, named patterns, and domain terms. It pins taste to words so people
and agents read the same meaning, and matters most when the grimoire is
shared. Start one only when a term keeps needing re-explanation.

**Memory** (\`memory/\`) — agents accumulate working memory (in Claude Code,
per-project auto-memory: facts plus an index) in a machine-local, unversioned
store. Mirroring it into \`memory/{repo}/\` makes it survive, travel, and be
shared. Memory is raw accumulation one step before lore — a lead, not
authority. Keep it flat, one fact per file under an index; finished work
graduates into lore rather than being archived in memory. Reconcile it with a sync step rather than hand edits, derive the
mirrored set from the repo registry, keep it out of the self-observation
checks, and pick a conflict rule that never silently overwrites newer memory.
Once mirrored, the grimoire is the durable truth and the harness store is a
cache, so repo-side edits and deletions win — git gives storage, not
consistency.

**Self-observation** — lore and indexes make claims about the repos, so check
them against reality. Two read verbs, split by what they do with findings:

- **Scrying** gates — a failing scry blocks the run. Tiers help: _gate_ (must
  pass; any red is actionable), _watch_ (informational trends), _audit_ (heavy,
  opt-in). A cross-repo policy check is a scry when a hit should block.
- **Surveying** never gates — read-only cross-repo observation rendered as
  structured findings (JSON plus a generated markdown view) for discretionary
  triage. Each run overwrites the last and outputs aren't committed: the latest
  run is the only truth. Surveys prefer false positives to false negatives.

Both are **deterministic code, not model calls** — fast, offline, repeatable,
which is what lets a scry gate. Agents do the taste-laden authoring;
machine-checkable invariants become checks. Scope comes from a **declarative
repo registry** the checks read rather than hardcode: the owned repos plus the
reference checkouts the work consults (spec forks, comparison codebases), with
each check's opt-in or opt-out as a flag on the repo's entry rather than a
list inside the check. The registry is itself a claim the checks validate.

The write verbs mirror them: **tending** curates the grimoire's own docs;
**converging** is deterministic, registry-driven operation across repos —
observe against desired state, act only where safe by construction, report
the rest; **sweeping** is agent-driven code change across repos, one session
per repo (still a design, not yet proved out). Deterministic vs agentic, not
scope, is what separates converging from sweeping.

**Tending** (\`tending/\`) — curation passes over the grimoire's docs plus a
standing upkeep backlog. A grimoire-wide pass stays conservative: it makes
only clearly correct changes and queues the rest for the human. A focused pass
over one subject reads the whole scope first, and that full read earns deeper
autonomous rewriting. Either way:

- research read-only first, and verify each change against the live repo
- distill aggressively, amputate never — collapse finished detail to its
  conclusions, but keep every open item and the reasoning it references
- the subject repo's own docs are in scope too, under that repo's rules
- check inbound links and deep-linked headings before deleting or renaming
- watch for the most common staleness: "in progress" framing on work that has
  since landed

Open items go to the backlog as they're found. A pass summary is disposable;
the edited docs and a one-line history entry are what last.

## Work Loop

1. **Start** — read \`lore/{project}/\` (CLAUDE.md for context, TODO.md for
   active work), the quest index for goals touching the project, and the
   repo's own CLAUDE.md.
2. **Finish** — update the lore TODO.md (and CLAUDE.md for new decisions or
   changed relationships), check off quest tasks and update status, and ask
   whether anything should graduate — into repo docs, or out of lore.
3. **Review after landing** — work is reviewed before it's committed, and
   landed commits get post-commit review too: by agents when asked, and by the
   dev. Findings come back as new work in lore or the next slice.

## Health

Dense, quality information over volume — agents read this every session, and
noise wastes context and degrades judgment.

- **Distill.** Lore is the richest layer, accumulating crystallized
  understanding; creative bursts can live as noisy TODO docs. The ongoing work
  is distilling what's learned and removing what's resolved or superseded.
  Process notes (dates, PR numbers, what changed when) belong in detail docs —
  lore, quests, history files — never in always-loaded or index docs, which
  carry current state plus pointers.
- **No incidental numbers.** Counts and similar texture ("the 12 events",
  "340 tests passing") go stale the moment the thing counted changes — describe
  it instead. Keep a number only when it's load-bearing (a version, a limit, a
  threshold, a measured result a decision rests on) or lives somewhere
  timestamped or regenerated (commits, history entries, survey output).
- **Revive or delete stalled content.** Content that never graduates is the
  quieter problem — references to docs never written, TODOs untouched for
  months, entries that stopped tracking their repo. It isn't wrong, it's
  inert, and it still costs context.
- **Living and approximate.** Maintained, not correct — a grimoire tries to
  capture more of a body of work than any doc set can represent faithfully.
  When current state matters, read the repo. Past a threshold, stale context
  is worse than none.
- **Rewrite, don't just prune.** The hard staleness is conceptual: content
  written under an understanding that has since shifted — a decision whose
  tradeoffs no longer apply, a TODO assuming yesterday's architecture. Age
  isn't staleness, and timestamps won't catch drift. Each time you read a lore
  doc, ask whether its model still holds; delete what's dead, rewrite what's
  drifted.
- **Leads, not facts.** Survey rows, review findings, ledger entries, memory,
  even your own briefs carry confident wrong claims that read exactly like the
  right ones. Re-derive a claim before acting on it, and ask agents to verify
  before complying. "Nothing uses this" is unverified until the callers are
  traced out into every consuming repo. False claims cluster — fix the
  paragraph, not just the flagged sentence — and a correction needs the same
  depth as the refutation: knowing X is false says nothing about the nearest
  plausible Y.
- **Transparency as constraint.** The index docs — lore index, quest index,
  each entry's file table — list everything, so sprawl is visible. The index
  is a mirror that pressures the grimoire to stay lean, and dead-link checks
  keep it honest.

## Key Concepts

**Taste** — the grimoire encodes which patterns are valued, which tradeoffs
preferred, what good looks like. It can't be extracted from code. Taste makes
a grimoire _yours_, lets agents apply judgment fluidly instead of following
rigid rules, and is why shared grimoires must negotiate rather than merge.

**Membrane** — a grimoire spanning private and public work is one-way: it sees
every repo, and nothing public references its contents or its existence.
Deterministic checks scan the public surface and gate on a hit. The threat is
accident, not attack — an agent's helpful cross-reference, an autocompleted
path, a docs sweep too broad. The one sanctioned crossing is distillation:
content generalizes until the personal is gone (this skill is an example).
Keeping the grimoire inert — no runtime, no service, nothing listening — is
what lets it safely hold the union of a person's work.

**Agent-agnostic substrate** — the interface is "can you read a filesystem":
markdown plus git, zero protocol. Names may be tool-flavored (CLAUDE.md); the
substrate isn't. Compose with filesystem and git semantics — links, reference
paths, sync scripts, sibling checkouts — rather than serving layers, so every
edge is a claim the checks can validate. Open-ended composition without
self-observation is how wikis die.

**Private or shared** — a grimoire can be personal (spanning private and
public repos) or collaborative (a team evolving shared taste); either way,
synthesis needs coherent taste. How to segment a life's work isn't prescribed
— one grimoire, or several composed through the same reference and mirror
mechanics that compose repos. Collaboration is federation over merger: each
participant keeps their own grimoire and negotiates vocabulary at the boundary.
`};function o(o,s){t(s,!0),i(o,{get codeblock(){return n},children:(e,t)=>{r(e,{get content(){return a.content},base:`/skills/grimoire/`})},$$slots:{default:!0}}),e()}export{o as component};