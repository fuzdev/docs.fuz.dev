# docs.fuz.dev

> experimental AI-generated docs and skills for Fuz, a zippy stack for human agency

docs.fuz.dev is a static site and the source of two agent skills for the
[Fuz](https://fuz.dev/) ecosystem, written by agents for both people and
agents to read.

**Website**: [docs.fuz.dev](https://docs.fuz.dev/)

For coding conventions, see Skill(fuz-stack).

## Scope

- The `fuz-stack` and `grimoire` skills, in `skills/`, and the routes that
  render them
- `/coherence` and `/values`, checkable claims about the stack, each
  rendered from one data file: `/coherence` as a section of several pages,
  `/values` as one page
- `/projects`, a page per project computed from those two data files
- A few browser tools under `/tools`

How far each has been reviewed differs. The site says once, on the landing
page, that it is machine-written and inconsistently reviewed; `/coherence`
and `/values` each carry their own review flags and the date their claims
were checked.

What the stack is belongs to [fuz.dev/stack](https://www.fuz.dev/stack), and
each package's API docs to its own site. This repo keeps no copy of either:
no dependency graph, no aggregated API docs, and no description of a project
(the landing and about pages show fuz_ui's package list). It does keep the
stack page's project names and repos, in `stack_projects.ts`, as the list of
what its data may name; the evidence task holds that list to the stack page.

## Gro commands

```bash
gro check      # typecheck, test, gen --check, format --check, lint (run before committing)
gro typecheck  # typecheck only (faster iteration)
gro test       # run tests with vitest
gro gen        # regenerate the skill routes from skills/, and the sidebar manifest
gro build      # build for production (static adapter)
gro deploy     # build, commit, and push to the deploy branch (the maintainer's)
gro task src/routes/evidence_check.task.ts  # resolve the claims' links against sibling checkouts
```

Every gen reads only this repo, so `gro check` and CI check generated files
for drift with nothing checked out beside it. The evidence task is the one
command that needs the sibling repos.

## Key dependencies

- Svelte 5 and SvelteKit, with the static adapter
- fuz_css (@fuzdev/fuz_css) - styling and the design system
- fuz_ui (@fuzdev/fuz_ui) - the app shell, theming, and the about page's components
- mdz (@fuzdev/mdz) - renders the skill docs and the evidence links
- fuz_code (@fuzdev/fuz_code) - syntax highlighting in the skill docs
- fuz_schema (@fuzdev/fuz_schema) - the evidence task's `Args`
- blake3 (@fuzdev/blake3-wasm) - hashing for `/tools/hash`
- svelte-docinfo - analyzes this repo for the about page's summary
- Gro (@fuzdev/gro) - task runner and toolchain

## Directory structure

```
skills/                   # the skill sources (see "Skills" below)
src/
├── lib/                  # DataInput.svelte, the input the hash tool reads
├── routes/
│   ├── +layout.svelte    # the shell every page sits in
│   ├── +page.svelte      # landing page
│   ├── site_sections.ts  # the site's sections: name, emoji, one-line summary
│   ├── SiteNav.svelte    # the sidebar, built from site_sections
│   ├── site_nav_manifest.gen.ts  # what the sidebar lists under two sections
│   ├── PageSections.svelte  # a page with a column listing its sections
│   ├── style.css         # the styles the two data pages share
│   ├── evidence.ts       # the evidence link checker
│   ├── evidence_check.task.ts
│   ├── library.ts        # this repo's own library metadata
│   ├── skills/           # the skills index, the generator, and its output (has its own CLAUDE.md)
│   ├── stack_projects.ts # the projects the data pages may name, with their repos
│   ├── coherence/        # the coherence section: its data file, page list, and pages
│   ├── projects/         # the project lens and its pages
│   ├── values/           # the values page, its data file and section names
│   ├── tools/            # the tools index, its manifest, and each tool
│   └── about/            # this repo's summary and ecosystem links
└── test/                 # tests for the two data files and the evidence checker
```

## Routes

- `/` - the intro, the site's sections from `site_sections.ts`, and the
  ecosystem's packages
- `/skills` - the skills index and how to install one
- `/skills/{skill}` - a skill's `SKILL.md`, rendered with mdz (generated)
- `/skills/{skill}/references` and `/skills/{skill}/references/{slug}` - a
  skill's reference docs (generated)
- `/coherence` - how agent-written work goes wrong and what holds each
  failure: the opening and the grid
- `/coherence/{family}` - a family of failures (`design`, `checks`, `claims`,
  `sessions`) and the holds of each
- `/coherence/{table}` - a table some holds point at (`moved`, `oracles`,
  `actions`, `gates`)
- `/values` - the values the stack's design is measured against (a sketch)
- `/projects` and `/projects/{name}` - each project of the stack as the two
  data pages speak of it (computed)
- `/tools` and `/tools/hash` - the tools index and the BLAKE3 hashing tool
- `/about` - this repo's summary and ecosystem links

## Site shell and sections

`src/routes/+layout.svelte` puts every page in fuz_ui's `AppShell`: a sticky
header (the breadcrumb, and on narrow screens the menu button) and
`SiteNav.svelte` as the sidebar, which opens as the shell's overlay on narrow
screens. The layout also sets the scroll padding that keeps an anchor's
target clear of the header.

`site_sections.ts` is the list of top-level sections, each a route of the
same name with an emoji and a one-line summary. The sidebar and the landing
page both render it, so adding, renaming, or reordering a section is an edit
there. Under a section the sidebar lists what that section's own data names:
the skills and their references from `skills/skills_manifest.ts`, the tools
from `tools/tools_manifest.ts`, the coherence section's pages from
`coherence/coherence_pages.ts`, the projects with a page from
`projects/project_lens.ts`, and for `/values` the page's sections.

`PageSections.svelte` gives a page a column of its sections on wide screens;
at or below 1000px the sidebar lists them instead. `/values`, each coherence
family page and each project page use it.

What the sidebar lists under `/coherence` and `/projects` comes from
`site_nav_manifest.ts`, generated from the data, so the layout every page
shares loads a few names and not the data files.

Routes are typed: the manifests are literal (`as const`), so
`resolve(skill.path)` checks against the routes that exist. Don't cast a
path to get past `resolve`; emit or declare the literal.

## The data pages

`/coherence` and `/values` share one pattern, and new pages of claims should
follow it:

- **One typed data file is the page.** Every sentence in it is a claim about
  the stack, so a claim is corrected there and nowhere else. The renderer
  adds no claims of its own; a number or summary it shows is computed from
  the data.
- **Each claim links a public artifact**, as mdz, landing on the section
  that shows it. Each data file lists its links for the checker
  (`coherence_entries`, `values_entries`).
- **`claims_checked`** is the date the claims were last checked against the
  repos, and **`reviewed`** records the maintainer's review. Move the date
  only after re-checking; leave the review flags to the maintainer.
- **A small module names the page's sections or the section's pages**
  (`values_sections.ts`, `coherence_pages.ts`) for headings, the column, the
  sidebar, and the links between pages.
- **Tests in `src/test/`** hold the data's internal consistency.
- **Only projects the [Fuz stack page](https://www.fuz.dev/stack) announces
  are named.** `stack_projects.ts` is this site's list of them, each with its
  repos. The evidence task holds that list to the stack page, and every repo
  a link names on either page to it. A project named only in prose is held
  by hand.

### Coherence

`src/routes/coherence/coherence.ts`: failures as rows, the ladder's rungs
(person, session, written, tool, shape) as columns, a hold in each cell, and
the inventories some holds point at (rules that moved down the ladder,
oracle comparisons, actions kept with a person, gates). Each failure row has
its own `reviewed` flag. The section's prose (`intro`, `passages`, each
family's `summary`) is in the data file too.

The section is several pages over that one file, listed in
`coherence_pages.ts`: the index is the opening and the grid, its rows grouped
by family; each family has a page of its failures and their holds
(`FamilyPage.svelte`, behind a thin route per family); and each table has a
page. A page does one job, so a new table or family is a new page, not a
longer one.

- **The rung is a hold's strength and its status is only its coverage**:
  `throughout` or `in_places`. A hold in places says what it leaves out in
  `gap`, and a test holds the two together, so what is not done never hides
  in `does`.
- **A rung that cannot hold a failure** is an `UnreachableHold`, which
  carries a reason and nothing else.
- **A blank cell** means nothing at that rung is aimed at the failure. The
  holds that apply to every row (review after landing, the gate) are listed
  once.
- **The tables sort by how soon a check reports** (`RunWhenId`), not by how
  much it catches.
- **The agent harness's deny rules are not public.** The page says so where
  it relies on them, and spells out no rule that fuz_repos's docs don't.

### Values

`src/routes/values/values.ts`: the values and the kind of thing each is
(gate, default, objective, budget, overarching), the order each project
states them in, how the order among the performance axes changes by context,
and recorded decisions where one value beat another. The page is a sketch: it draws the same data
several ways so the views worth keeping can be chosen, and its section
intros still carry sentences of their own, to move into the data file when
the views settle.

### Projects

`src/routes/projects/project_lens.ts` computes, for each entry of
`stack_projects.ts`, every record of the two data files that names the
project or links it: one of its repos, or for the project this site is, a
skill route. A record is searched whole, every string in it, and a test
walks both data files to hold that. `/projects/{name}` renders the lens and
links each record back to where it lives. The pages add no claims: a
sentence about a project is written on a data page, and a project the data
never names has no page.

A name is matched as a whole lowercase word, so `fuz` is not found in
`fuz_schema`, `fuz-stack` or `Fuz`, and never inside a link's URL. A record
about a class of repos ("the repos whose gate is gro's check") names no
project and is in no lens.

Where a new page goes: a view of one section's data is a page in that
section; a page that reads several sections, as this one does, or brings data
of its own, is a section of its own. A view is a route, so it can be linked
and read without scripts.

### Evidence check

`gro task src/routes/evidence_check.task.ts` resolves every evidence link on
both pages against this repo and its sibling checkouts: the file exists, and
for Markdown so does the heading the link names. It also holds
`stack_projects.ts`, and the repos the links name, to the stack page's list,
read from the fuz.dev checkout. Run it after changing either data file, and
when a cited repo renames a doc. `gro check` covers only the links to this
site's own skill pages, since the siblings aren't in CI. The checker is `src/routes/evidence.ts`.

A link that resolves says the document exists, not that the sentence beside
it is true. When a cited repo's docs and its code disagree, the page follows
the code.

## Skills

Each skill lives in `skills/<skill-name>/` in the
[Agent Skills](https://agentskills.io/) format
([spec](https://github.com/anthropics/skills)): a `SKILL.md` with YAML
frontmatter, and optionally `references/*.md`, each with a one-line
`description` in its frontmatter.

| Skill       | Purpose                                                                      |
| ----------- | ---------------------------------------------------------------------------- |
| `fuz-stack` | Coding conventions and patterns for `@fuzdev` TypeScript, Svelte 5, and Rust |
| `grimoire`  | Grimoire pattern: lore, quests, and arcs for cross-repo coordination         |

The skills are what agents working in the stack actually load, and
`/coherence` cites them as evidence, so an edit to one is an edit to a rule.
`fuz-stack`'s `SKILL.md` lists its references by task; the references index
at `/skills/fuz-stack/references` lists them with their descriptions.

`src/routes/skills/skill_docs.gen.ts` discovers the skills and generates
their routes and the manifest. After editing anything under `skills/`, run
`gro gen`. The pattern, and the mdz traps to avoid in skill Markdown, are in
`src/routes/skills/CLAUDE.md`.

## Project standards

- TypeScript strict mode
- Svelte 5 with runes API
- tsv with tabs, 100 char width
- Node >= 24.14
- Private package (not published to npm)

## Related projects

- [`fuz.dev`](../fuz.dev/CLAUDE.md) - the Fuz homepage and the stack page
- [`fuz_css`](../fuz_css/CLAUDE.md) - semantic-first CSS framework
- [`fuz_ui`](../fuz_ui/CLAUDE.md) - UI components and the app shell
- [`mdz`](../mdz/CLAUDE.md) - the markdown dialect the skill docs render with
- [`gro`](../gro/CLAUDE.md) - task runner and toolchain
