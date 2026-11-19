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
- `/coherence` and `/values`, two pages of checkable claims about the stack,
  each rendered from one data file
- A few browser tools under `/tools`

How far each has been reviewed differs. The site says once, on the landing
page, that it is machine-written and inconsistently reviewed; `/coherence`
and `/values` each carry their own review flags and the date their claims
were checked.

What the stack is belongs to [fuz.dev/stack](https://www.fuz.dev/stack), and
each package's API docs to its own site. This repo keeps no copy of either:
no package list of its own (the landing and about pages show fuz_ui's), no
dependency graph, no aggregated API docs.

## Gro commands

```bash
gro check      # typecheck, test, gen --check, format --check, lint (run before committing)
gro typecheck  # typecheck only (faster iteration)
gro test       # run tests with vitest
gro gen        # regenerate the skill routes from skills/
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
│   ├── PageSections.svelte  # a page with a column listing its sections
│   ├── style.css         # the styles the two data pages share
│   ├── evidence.ts       # the evidence link checker
│   ├── evidence_check.task.ts
│   ├── library.ts        # this repo's own library metadata
│   ├── skills/           # the skills index, the generator, and its output (has its own CLAUDE.md)
│   ├── coherence/        # the coherence page, its data file and section names
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
- `/coherence` - how agent-written code goes wrong and what holds each failure
- `/values` - the values the stack's design is measured against (a sketch)
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
from `tools/tools_manifest.ts`, and for `/coherence` and `/values` the page's
sections.

`PageSections.svelte` gives those two pages a column of their sections on
wide screens; at or below 1000px the sidebar lists them instead.

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
- **A `*_sections.ts` module** names the page's sections for its headings,
  its column, and the sidebar.
- **Tests in `src/test/`** hold the data's internal consistency.
- **Only projects the [Fuz stack page](https://www.fuz.dev/stack) announces
  are named.** The evidence task holds `/values` to that list; `/coherence`
  follows it by hand.

### Coherence

`src/routes/coherence/coherence.ts`: failures as rows, the ladder's rungs
(person, session, written, tool, shape) as columns, a hold in each cell, and
the inventories behind three holds (oracle comparisons, actions kept with a
person, gates). Each failure row has its own `reviewed` flag.

### Values

`src/routes/values/values.ts`: the values and the kind of thing each is
(gate, default, objective, budget, overarching), the order each project
states them in, how the order among the performance axes changes by context,
and recorded decisions where one value beat another. `stack_projects` is the
list of projects it may name. The page is a sketch: it draws the same data
several ways so the views worth keeping can be chosen, and its section
intros still carry sentences of their own, to move into the data file when
the views settle.

### Evidence check

`gro task src/routes/evidence_check.task.ts` resolves every evidence link on
both pages against this repo and its sibling checkouts: the file exists, and
for Markdown so does the heading the link names. It also holds
`stack_projects` to the stack page's list, read from the fuz.dev checkout.
Run it after changing either data file, and when a cited repo renames a doc.
`gro check` covers only the links to this site's own skill pages, since the
siblings aren't in CI. The checker is `src/routes/evidence.ts`.

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
