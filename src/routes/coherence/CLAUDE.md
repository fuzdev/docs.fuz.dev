# Coherence section

`/coherence` is how agent-written work goes wrong and what holds each
failure: several pages over one data file, `coherence.ts`. The pattern it
shares with the other data pages (one typed file is the page, each claim
links a public artifact, `claims_checked` and `reviewed`) is in the root
`CLAUDE.md` § The data pages.

## The data

`coherence.ts` holds failures as rows, the ladder's rungs (person, session,
written, tool, shape) as columns, a hold in each cell, and the inventories
some holds point at: rules that moved down the ladder, oracle comparisons,
actions kept with a person, and gates. Each failure row has its own
`reviewed` flag. The section's prose (`intro`, `passages`, each family's
`summary`) is in the data file too.

## Pages

`coherence_pages.ts` lists them, for headings, the sidebar and the links
between pages. A page does one job, so a new table or family is a new page,
not a longer one.

- `/coherence` - the opening and the grid, its rows grouped by family
- `/coherence/{family}` - a family's failures and the holds of each
  (`design`, `checks`, `claims`, `sessions`): `FamilyPage.svelte`, behind a
  thin route per family
- `/coherence/{table}` - a table some holds point at (`moved`, `oracles`,
  `actions`, `gates`)
- `/coherence/gaps` - every `gap`, blank rung, out-of-reach rung and `wanted`
  line by failure, the kept actions with no part that a tool refuses or a
  permission rule denies, and the CI gaps. It is computed, so a gap is
  corrected on the hold that states it.

## Holds

- **The rung is a hold's strength and its status is only its coverage**:
  `throughout` or `in_places`. A hold in places says what it leaves out in
  `gap`, and a test holds the two together, so what is not done never hides
  in `does`.
- **A rung that cannot hold a failure** is an `UnreachableHold`, which
  carries a reason and nothing else.
- **A blank cell** means nothing at that rung is aimed at the failure. The
  holds that apply to every row (review after landing, the gate) are listed
  once.
- **The opening is mdz**, and a paragraph of it that cites something is an
  evidence entry like any other. A paragraph that names a project is in that
  project's lens.
- **The agent harness's deny rules are not public.** The page says so where
  it relies on them, and spells out no rule that fuz_repos's docs don't.

## Tables

- **The tables sort by how soon a check reports** (`RunWhenId`), not by how
  much it catches.
- **A gate row that speaks of a class of repos names it** (`where_class`),
  and the page lists the class's members from the snapshot
  (`projects/repo_classes.ts`). A class says only what the snapshot shows: a
  repo that reaches the same check through a script its check script calls
  is not a member, so the row names it in words. A class of CI steps counts
  a command a change is held to: in a workflow that runs on a push or a pull
  request, in a step that fails its job, and not a shell comment.

## Probes

A row of the gates or oracles table may carry probes (`probe.ts`, in
`src/routes/`): a string that a named file, check script or CI step of a
repo must have, or must not have, for the row to stand. An oracle row
carries them per run, so each says when the comparison runs.

- **Where each is checked**: a probe of a check script or a workflow against
  the snapshot, by `src/test/probe.test.ts`, in the gate; a probe of a file
  by the evidence task.
- **Write one for a new row**, as short as will fail when the row stops
  being true, with no version or count in it.
- **A probe that passes** says a command is still wired where the row says,
  not that the check is sound.
- **A probe reads only the text it names.** A `lacks` does not see the same
  thing reached through another script or switched on by an environment
  variable, so prefer the string of the call itself over a name that also
  appears in a comment.
