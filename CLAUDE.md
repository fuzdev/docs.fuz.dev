# docs.fuz.dev

> experimental AI-generated docs and skills for Fuz, a zippy stack for human agency

docs.fuz.dev is a static site and the source of two agent skills for the
[Fuz](https://fuz.dev/) ecosystem, written by agents for both people and
agents to read.

**Website**: [docs.fuz.dev](https://docs.fuz.dev/)

For coding conventions, see Skill(fuz-stack).

## The site

Each section is a route and a directory of `src/routes/` by the same name:

- **`/skills`** - the `fuz-stack` and `grimoire` skills and their references,
  rendered with mdz from `skills/` through generated routes. Rules:
  `src/routes/skills/CLAUDE.md`
- **`/coherence`** - how agent-written work goes wrong and what holds each
  failure: a grid, a page per family of failures, a page per table, and the
  gaps gathered, all from `coherence/coherence.ts`. Rules:
  `src/routes/coherence/CLAUDE.md`
- **`/values`** - the values the stack's design is measured against (a
  sketch), from `values/values.ts`. Rules: § Values
- **`/projects`** - a page per project of the stack and pages across it
  (dependencies, checks, third-party code), all computed from the coherence
  and values data and a committed snapshot of the stack repos' own files.
  Rules: `src/routes/projects/CLAUDE.md`
- **`/glossary`** - the words the site and the stack use in a sense of their
  own, from `glossary/glossary.ts`. Rules: § Glossary
- **`/tools`** - browser tools, listed in `tools/tools_manifest.ts`;
  `/tools/hash` is BLAKE3 hashing
- **`/about`** - this repo's summary and ecosystem links

**A section's `CLAUDE.md` holds its rules.** Read it before changing the
section's data, its pages, or its tests in `src/test/`. Probes (`probe.ts`,
`src/test/probe.test.ts`) belong to the coherence section.

**No blog, and no writing in a person's voice.** Fuz does not use agents to
imitate human writing, as a matter of taste, so the blog form is off limits
here: no posts, essays, opinion or narrative, and no first-person voice. The
site's kinds of page are the ones above, each a form a machine can be held
to: rules an agent loads, claims that link their evidence, views computed
from data and from the repos' own files, definitions, and tools. A page
states what is so and where that can be checked; it does not argue, tell a
story or persuade. An idea that needs an argument is a person's to write
elsewhere.

How far each section has been reviewed differs. The site says once, on the
landing page, that it is machine-written and inconsistently reviewed;
`/coherence`, `/values` and `/glossary` each carry their own review flags and
the date their claims were checked.

What the stack is belongs to [fuz.dev/stack](https://www.fuz.dev/stack), and
each package's API docs to its own site. This repo keeps no copy of either:
no aggregated API docs and no description of a project (the landing and
about pages show fuz_ui's package list). It does keep three things read from
elsewhere, each written or held by a task where the siblings are checked
out:

- the stack page's project names and repos, in `stack_projects.ts`
- how the stack page files each project (layer, status, languages, site), in
  `projects/stack_facets.json`
- what each repo's own files declare, in `projects/stack_snapshot.json`

## Gro commands

```bash
gro check      # typecheck, test, gen --check, format --check (run before committing)
gro typecheck  # typecheck only (faster iteration)
gro test       # run tests with vitest
gro gen        # regenerate the skill routes from skills/, and the sidebar manifest
gro build      # build for production (static adapter)
gro deploy     # build, commit, and push to the deploy branch (the maintainer's)
gro task src/routes/evidence_check.task.ts  # resolve the claims' links and file probes against sibling checkouts
gro task src/routes/projects/stack_snapshot.task.ts  # reread the stack repos into the committed files (--check to compare)
```

The two tasks are the commands that need the sibling repos.

## Reading other repos

Data derived from another repo of the stack follows these rules:

- **A gen reads only this repo**, committed files included. So `gro check`
  and CI check generated files for drift with nothing checked out beside it.
- **A task may read any stack repo at `../name`**, and the stack page's repo.
  It writes a committed, dated file that pages and gens then read, and takes
  `--check` to compare without writing. It never runs in the gate.
- **A task that writes a file reads a sibling at its main branch**
  (`origin/main` as the checkout last fetched it), through git, so a sibling
  may be mid-work and nothing uncommitted or unpushed is published as the
  repo's. Where it must read the working tree it first refuses a tree that
  differs from the main branch there. The evidence task writes nothing and
  reads working trees, which its module doc says.
- **A committed file records what was read and where**: the day, and the
  commit of each repo, which a page uses for links that do not move. Neither
  is part of what `--check` compares.
- **No versions and no counts go in**, so a file changes when a relationship
  does and not on every release. Data that changes on every commit
  (measurements, test counts) does not belong in these files.
- **A task fails and writes nothing when it cannot read or place
  something.** What it drops silently is how a page ends up wrong.

## Layout

Beside the section directories:

```
skills/                   # the skill sources (see "Skills" below)
src/
├── lib/                  # DataInput.svelte, the input the hash tool reads
├── routes/
│   ├── +layout.svelte    # the shell every page sits in
│   ├── +page.svelte      # landing page
│   ├── site_sections.ts  # the site's sections: name, emoji, one-line summary
│   ├── SiteNav.svelte    # the sidebar, built from site_sections
│   ├── site_nav_manifest.gen.ts  # what the sidebar lists under /coherence, /projects and /glossary
│   ├── PageSections.svelte  # a page with a column listing its sections
│   ├── style.css         # the styles the coherence and values pages share
│   ├── stack_projects.ts # the projects the data pages may name, with their repos
│   ├── evidence.ts       # the evidence link checker
│   ├── evidence_check.task.ts
│   ├── probe.ts          # probes: what a file must show for a claim to stand (rules: coherence/CLAUDE.md)
│   └── library.ts        # this repo's own library metadata
└── test/                 # tests for the data files, the lens, the snapshot's rules, the probes, and the evidence checker
```

## Site shell and sections

`src/routes/+layout.svelte` puts every page in fuz_ui's `AppShell`: a sticky
header (the breadcrumb, and on narrow screens the menu button) and
`SiteNav.svelte` as the sidebar, which opens as the shell's overlay on narrow
screens. The layout also sets the scroll padding that keeps an anchor's
target clear of the header.

- **`site_sections.ts` is the list of top-level sections**, each with an
  emoji and a one-line summary. The sidebar and the landing page both render
  it, so adding, renaming, or reordering a section is an edit there.
- **Under a section the sidebar lists what that section's own data names**:
  the skills and their references (`skills/skills_manifest.ts`), the tools
  (`tools/tools_manifest.ts`), the coherence pages, the stack-wide project
  pages and the projects, and for `/values` and `/glossary` the page's
  sections. What it lists under `/coherence`, `/projects` and `/glossary`
  comes from `site_nav_manifest.ts`, generated from the data, so the layout
  every page shares loads a few names and not the data files.
- **`PageSections.svelte` gives a page a column of its sections** on wide
  screens; at or below 1000px the sidebar lists them instead.
- **Routes are typed.** The manifests are literal (`as const`), so
  `resolve(skill.path)` checks against the routes that exist. Don't cast a
  path to get past `resolve`; emit or declare the literal.
- **Where a new page goes**: a view of one section's data is a page in that
  section; a page that reads several sections, as `/projects` does, or
  brings data of its own, is a section of its own. A view is a route, so it
  can be linked and read without scripts.

## The data pages

`/coherence` and `/values` share one pattern, and new pages of claims should
follow it:

- **One typed data file is the page.** Every sentence in it is a claim about
  the stack, so a claim is corrected there and nowhere else. The renderer
  adds no claims of its own; a number or summary it shows is computed from
  the data.
- **Each claim links a public artifact**, as mdz, landing on the section
  that shows it. Each data file lists its links for the checker
  (`coherence_entries`, `values_entries`, `glossary_entries`).
- **`claims_checked`** is the date the claims were last checked against the
  repos, and **`reviewed`** records the maintainer's review. Move the date
  only after re-checking; leave the review flags to the maintainer.
- **A small module names the page's sections or the section's pages**
  (`values_sections.ts`, `coherence_pages.ts`) for headings, the column, the
  sidebar, and the links between pages.
- **Its prose is claims, not an essay.** An intro or a passage says what
  the data shows and how to read it, as short as lets the page be read, and
  is evidence-linked like any other record.
- **Tests in `src/test/`** hold the data's internal consistency.
- **Only projects the [Fuz stack page](https://www.fuz.dev/stack) announces
  are named.** `stack_projects.ts` is this site's list of them, each with its
  repos. The evidence task holds that list to the stack page, and every repo
  a link names to it. A project named only in prose is held by hand.

### Values

`src/routes/values/values.ts`: the values and the kind of thing each is
(gate, default, objective, budget, overarching), the order each project
states them in, how the order among the performance axes changes by context,
recorded decisions where one value beat another, and the checks a reader can
run on what the stack publishes without taking the publisher's word, each
with where it is built and what it does not yet cover. The page is a sketch:
it draws the same data several ways so the views worth keeping can be
chosen, and its section intros still carry sentences of their own, to move
into the data file when the views settle.

### Glossary

`src/routes/glossary/glossary.ts`: one definition per term, grouped, each
with the public place the stack defines or most clearly uses the word, or
marked as this site's own usage. Where the sources use a word in more than
one sense, `also` names the others. A definition is a claim: its source is
resolved by the evidence task with the rest, and the page carries its own
`claims_checked` and `reviewed`.

### Evidence check

`gro task src/routes/evidence_check.task.ts` resolves every evidence link in
the coherence, values and glossary data against this repo and its sibling
checkouts: the file exists, and for Markdown so does the heading the link
names. It checks the coherence data's probes of a file the same way, and
holds `stack_projects.ts`, and the repos the links name, to the stack page's
list, read from the fuz.dev checkout. The checker is
`src/routes/evidence.ts`.

Run it after changing a data file, and when a cited repo renames a doc.
`gro check` covers only the links to this site's own skill pages, since the
siblings aren't in CI.

A link that resolves says the document exists, not that the sentence beside
it is true. A probe says more, and only for the part of a sentence a file
can show. When a cited repo's docs and its code disagree, the page follows
the code.

## Skills

Each skill lives in `skills/<skill-name>/` in the
[Agent Skills](https://agentskills.io/) format
([spec](https://github.com/anthropics/skills)): a `SKILL.md` with YAML
frontmatter, and optionally `references/*.md`, each with a one-line
`description` in its frontmatter.

- `fuz-stack` - coding conventions and patterns for `@fuzdev` TypeScript,
  Svelte 5, and Rust. Its `SKILL.md` lists its references by task.
- `grimoire` - the grimoire pattern: lore, quests, and arcs for cross-repo
  coordination

The skills are what agents working in the stack actually load, and
`/coherence` cites them as evidence, so an edit to one is an edit to a rule.
After editing anything under `skills/`, run `gro gen`:
`src/routes/skills/skill_docs.gen.ts` discovers the skills and generates
their routes and the manifest. The pattern, and the mdz traps to avoid in
skill Markdown, are in `src/routes/skills/CLAUDE.md`.

## Key dependencies

- Svelte 5 and SvelteKit, with the static adapter
- fuz_css (@fuzdev/fuz_css) - styling and the design system
- fuz_ui (@fuzdev/fuz_ui) - the app shell, theming, and the about page's components
- mdz (@fuzdev/mdz) - renders the skill docs and the evidence links
- fuz_code (@fuzdev/fuz_code) - syntax highlighting in the skill docs
- fuz_schema (@fuzdev/fuz_schema) - the tasks' `Args`, and the schema the snapshot is parsed with
- blake3 (@fuzdev/blake3-wasm) - hashing for `/tools/hash`
- svelte-docinfo - analyzes this repo for the about page's summary
- Gro (@fuzdev/gro) - task runner and toolchain

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
