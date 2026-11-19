# Projects section

Every project in `stack_projects.ts` has a page at `/projects/{name}`, built
by `project_page.ts` from two sources: a committed snapshot of the stack
repos' own files, and the lens over the coherence and values data. Neither
adds a claim. A sentence about a project is written on a data page, and a
project the data never names has a page that says so.

The rules for reading another repo are in the root `CLAUDE.md` § Reading
other repos; this file says how the snapshot task applies them.

## The snapshot

`stack_snapshot.task.ts` reads each stack repo at its main branch and writes
`stack_snapshot.json`. For each repo it holds:

- **An edge for each dependency on another project**, at the strongest kind
  the repo declares, from its root `package.json` and its `cargo metadata`.
- **What it declares from outside the stack**, by name, outside the dev
  tables.
- **Its `check` script**, whether its `package.json` has an exports map, and
  the lines of its `CLAUDE.md` that comment its check command
  (`check_lines.ts`): a line in a code block that is `gro check` or
  `npm run check` with a `#` comment, or whose comment says to run it before
  committing.
- **Its workflows**: what triggers each, and each job's steps in file order,
  a step being a command or an action with how it is pinned, and whether it
  may fail without failing its job (`workflow_read.ts`, over
  `yaml_subset.ts`, which reads the YAML these files use and refuses the
  rest).
- **The commit it was read at.**

The same task reads the stack page's data into `stack_facets.json`: each
project's layer, status, languages and site, with the page's own gloss of
each status. A tagline or a layer's blurb stays on the stack page.

### Modules

- `stack_read.ts` is the reader. Each rule that turns a file into data is a
  pure, tested module beside it: `stack_edges.ts`, `check_lines.ts`,
  `workflow_read.ts`, `stack_facets.ts`.
- `stack_snapshot.ts` and `stack_facets.ts` are the schemas. `stack_data.ts`
  parses the committed files with them and is what the pages read.
- The task imports the schemas and never the parsed files, so it can rewrite
  a file that no longer parses.

### When to rerun

Both files are committed and dated, and the gate never regenerates them.
`--check` compares them with the repos and fails on a difference. Rerun the
task when a stack repo changes a manifest, a workflow or the line of its
`CLAUDE.md` that comments its check command, or when the stack page changes.
It does not fetch: run it after the siblings are pulled.

### What it refuses

It reads through git, so a sibling may have uncommitted work. It refuses
only where it must read a working tree:

- a repo whose `Cargo.toml` files differ from the main branch, or whose
  workspace takes in a crate the main branch does not have, since
  `cargo metadata` reads the working tree
- a stack page whose data file differs, since that is imported as a module

It fails and writes nothing when it cannot place a name it should know: an
`@fuzdev` package that maps to no project, a crate path that leads off the
stack, a git source that names a stack crate, a workflow it cannot read
whole, or a stack page whose projects are not this site's list.

### What it counts

- A registry crate is the stack's only when the stack may publish one by
  that name.
- What a test or tooling crate depends on (`xtask`, `testing_*`, a crate the
  release audit marks `dev_only`) is a dev dependency, whatever its manifest
  table says. A bench, debug or test-support crate under another name is not
  recognized, so what it uses is listed as the workspace's.
- No versions are recorded, an action's included, so the file changes when a
  relationship does.
- A package built into an ignored directory is in no committed manifest, so
  `stack_projects.ts` names those under `packages`.

### What a page says of it

A page quotes what the snapshot holds and does not say which command is the
gate. That is a claim, and belongs on a data page. The sentences a page
shows about the snapshot's limits are `snapshot_notes`, in
`stack_snapshot.ts`.

## The stack-wide pages

`project_views.ts` lists them, each a view of the snapshot across every
repo:

- `/projects/dependencies` - every dependency between the stack's projects
- `/projects/checks` - every repo's check script, how its `CLAUDE.md`
  comments it, the classes of repos the gates page speaks of, its CI
  workflows, and the actions they use
- `/projects/third-party` - what each repo declares from outside the stack

`repo_classes.ts` computes the classes of repos the gates table speaks of.

## The lens

`project_lens.ts` computes, for each entry of `stack_projects.ts`, every
record of the coherence and values data that names the project or links it:
one of its repos, or for the project this site is, a skill route.
`/projects/{name}` renders the lens and links each record back to where it
lives.

- **A record is searched whole**, every string in it, and a test walks both
  data files to hold that.
- **A record's probes are the exception**: a probe counts by the repo it is
  of, since its strings are commands, where `gro check` names no project.
- **A name is matched as a whole lowercase word**, so `fuz` is not found in
  `fuz_schema`, `fuz-stack` or `Fuz`, and never inside a link's URL.
- **A record about a class of repos** ("the repos whose check script runs
  gro's check") names no project and is in no lens.
