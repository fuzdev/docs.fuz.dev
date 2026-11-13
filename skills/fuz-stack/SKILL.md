---
name: fuz-stack
description: Development conventions and coding patterns for the @fuzdev ecosystem — naming, file organization, testing, styling, documentation, and tooling for TypeScript, Svelte 5, and Rust projects. Use when writing or reviewing code in any @fuzdev project. Triggers include running gro commands (gro check, gro test, gro gen), styling with fuz_css, writing or splitting tests, generating code with .gen.ts files, naming functions or variables (snake_case conventions), organizing files in src/lib/ or src/test/, writing TSDoc comments, creating Svelte 5 components with runes, or formatting code. Also use for the Result type, fixture-based testing, CSS utility classes, breaking changes policy, async concurrency patterns, Gro task system, type utilities (Flavored, Branded), dependency injection patterns (*Deps/*Options/*Context interfaces, AppDeps, RuntimeDeps, mock factories), or setting up documentation (tomes, svelte-docinfo, API routes, docs layout). Also covers the ecosystem's Rust workspaces — cargo and clippy lints, thiserror error handling, the dependency-injection escalation ladder, enum-dispatch and make-impossible-states idioms, spine-consumer servers (zzz_server, fuz_forge_server), daemon lifecycle, and CLI and xtask patterns. Triggers include running cargo or clippy, editing Cargo.toml, naming or organizing Rust crates, or working on the fuz and fuzd daemon, the zap convergence engine, or the spine crates.
license: 0BSD
metadata:
  author: ryanatkn
  version: 0.1.0
---

# Fuz stack conventions

> **Pre-alpha**: conventions are still moving. When code or a project's
> `CLAUDE.md` conflicts with this skill, the code is ground truth.
>
> **À la carte**: each project adopts what serves it.
>
> **Skip for**: planning/lore-only edits, third-party code review, simple git
> or shell operations.

**Read by language.** §Shared rules applies to everything. A TS or Svelte
task reads §TypeScript and Svelte; a Rust task skips to §Rust Crates. Each
part is the rules that most often go wrong, then a list of references to read
by task. The references own conventions, patterns, and traps; each repo's
`CLAUDE.md` owns its inventory (modules, commands, options).

## Shared rules

The stack is built so that producing, deploying, and operating software is
within reach of one person and an AI partner. Consistent, self-describing
patterns are what let an agent learn a rule once and apply it in every repo.

- **snake_case across TS, Rust, and SQL**, so one identifier names the same
  thing in every layer (`query_session_get_valid`, `keyed_hash`) with no
  renaming at a boundary.
- **Schemas are the source of truth for data**: shape, type, defaults, and
  validation come from one definition, and a schema change cascades.
- **No backwards compatibility.** Rename or delete in place and update every
  caller. No deprecated stubs, shims, or compat aliases. A published package
  records a consumer-visible change in a changeset (`gro changeset`).
- **A new dependency needs approval**, and so does a new package or crate.
  Prefer the allowlists in ./references/npm-dependencies.md and
  ./references/rust-dependencies.md. Upgrades are the maintainer's. Removing
  a dependency nothing uses is pre-authorized.
- **Versions, publishing, and deploys are the maintainer's.** Don't run
  `gro publish`, `gro deploy`, or `gro release`.
- **`// TODO` comments are welcome**, not debt to hide. `// TODO @many` marks
  one that applies in several places. A planning doc that spans sessions
  lives outside the repo, in whatever planning layer the workspace has:
  `gro check` refuses a `TODO*.md` at a repo's root on CI.

## Packages

**Dependency order**:
`fuz_schema → fuz_util → gro, fuz_css → fuz_code, mdz → fuz_ui → fuz_app → apps`.

| Package          | What it is                                                          |
| ---------------- | ------------------------------------------------------------------- |
| `fuz_schema`     | the stack's schema library                                          |
| `fuz_util`       | foundation utilities, with no `dependencies` of its own             |
| `gro`            | task runner and toolchain; becoming a JS runtime on V8              |
| `fuz_css`        | semantic-first CSS framework and design system                      |
| `fuz_code`       | syntax highlighting                                                 |
| `mdz`            | strict markdown dialect: parser, renderer, Svelte preprocessor      |
| `fuz_ui`         | Svelte 5 components, theming, the docs system                       |
| `fuz_app`        | the TS backend spine: auth, sessions, DB, actions, realtime         |
| `svelte-docinfo` | static analysis of TS and Svelte, behind the API docs               |
| `tsv`            | formatter and parser for TS, Svelte, and CSS (Rust)                 |

fuz_app's Rust twin is the spine crates in the `fuz` repo; servers such as
zzz's and fuz_forge's are built on those, and fuz_app's cross-backend suites
hold the two to one wire contract.

## TypeScript and Svelte

### Naming

Functions, variables, and `.ts` files are `snake_case`. Types, classes,
components, and schemas are `PascalCase`. Primitive constants are
`SCREAMING_SNAKE_CASE`. **Not camelCase.** An external API keeps its own
casing (`.map()`, `addEventListener()`). svelte-docinfo follows the wider
Svelte ecosystem's conventions instead (camelCase, kebab-case files, an index
barrel), because that ecosystem is its audience.

```typescript
export const git_current_branch_name = async (
	git: SpawnProgram,
	options?: SpawnCallOptions
): Promise<GitBranch> => { ... };
export function create_context<T>(fallback?: () => T) { ... }
const DEFAULT_TIMEOUT = 5000;
export const Args = s.object({ ... }); // a schema shares its type's name
class DocsLinks {}
// file: src/lib/DocsLink.svelte
```

The name's form is chosen by what disambiguates it in a flat namespace:

| Pattern               | Example                   | When                            |
| --------------------- | ------------------------- | ------------------------------- |
| `domain_action`       | `git_push`                | the bare action is ambiguous    |
| `domain_is_adjective` | `git_workspace_is_clean`  | a boolean in a domain cluster   |
| `action_domain`       | `escape_js_string`        | the action reads on its own     |
| `to_target`           | `to_file_path`            | a conversion                    |
| `create_domain`       | `create_context`          | a factory                       |
| `query_table_verb`    | `query_session_get_valid` | a SQL query function            |

The file says which: `git.ts` holds `git_*`, `string.ts` holds action-first
names.

### Flat namespace

**Every exported name is unique across a package's modules.** svelte-docinfo
checks it, and projects turn the check on with
`svelte_docinfo({onDuplicates: 'throw'})`, which fails the build listing each
conflict. Resolve one by renaming the side that isn't the primary API:

- **The component is primary**: suffix the class `State` (`ThemeState`,
  `AuthState`, `SidebarState`).
- **The class is primary** (consumers instantiate it): suffix the component
  `View` (zzz's `Chat` and `ChatView.svelte`).
- **The `@nodocs` tag removes an export from the check and from the docs.**
  It is right for the `task`, `Args`, and `gen` exports that every task and
  gen file shares, and wrong for anything a consumer imports.

### Files

- **`src/lib/`** is exportable code, **`src/routes/`** is the SvelteKit app,
  and **`src/test/`** is every test, mirroring `lib/`. Tests are never
  beside the source.
- **No barrels, with a few exceptions.** Import each module by its path
  (`@fuzdev/fuz_app/env/load.ts`, `@fuzdev/gro/task.ts`); package `exports`
  are wildcards. The exceptions are gro's bare `@fuzdev/gro` entry, which
  re-exports a few types for task and gen files, and svelte-docinfo's index.
- **No re-exports.** A symbol has one module, and callers import it from
  there. Two paths to one symbol drift and hide its source. The exceptions
  are modules whose job is to aggregate or wrap: a generated registry, a
  hand-written entry over generated output that can't be imported directly
  (wasm-pack's `pkg/`), and a project file that re-exports a task or gen a
  package ships, so gro can run it by path.
- **Most repos keep `src/lib` flat** and cluster by filename prefix
  (`git.ts`, `sveltekit_shim_*.ts`): the libraries, and zzz, the largest app.
  **fuz_app and fuz_forge group each domain into a subdirectory**
  (`lib/auth/`, `lib/db/`), which becomes part of the import path and which
  the tests mirror. Follow the repo, and don't open a subdirectory for a file
  or two.
- **A domain's files split by role**: `account_schema.ts`,
  `account_queries.ts`, `account_routes.ts`.

### Code style

- **Formatting is `gro format`'s** (tsv). Don't hand-format.
- **An import names the real file**: `./bar.ts`, `./Foo.svelte`, never `.js`
  for a `.ts` file. `src/lib` imports relatively. Outside it, `#lib/*` and
  `#routes/*` reach into those trees and a file in the same directory is
  imported relatively. Another package is `@fuzdev/pkg/foo.ts`. Rules and
  reasons: ./references/path-references.md §Import specifiers.

### The gate

```bash
gro check       # everything below, the command to run before calling work done
gro typecheck   # svelte-check or tsc
gro test        # vitest; `gro test foo` filters
gro gen         # run *.gen.ts files; `gro gen --check` fails on drift
gro format      # tsv; `gro format --check` verifies
gro lint        # eslint
gro sync        # svelte-kit sync + package.json exports; run when check says they drifted
```

- **Run `gro` directly**, never through `npx`.
- **`gro check` syncs first** (`svelte-kit sync`, `package.json` exports),
  then runs typecheck, tests, `gen --check`, a `package.json` drift check,
  `format --check`, and lint.
- **The test step runs when vitest is a declared dependency**, or when args
  are forwarded to the tests. Without either, `gro check` skips tests when
  there are no test files and fails naming them when there are.
- **A name is a builtin; a project task runs by path**:
  `gro task src/lib/foo.task.ts`. `gro` lists the builtins.
- **Read the gate's exit code.** Don't pipe it through a filter and then
  commit.

### The rules by topic

- **Styling** — fuz_css styles semantic HTML, and block elements space
  themselves. The default is the baseline: name the gap before adding a
  class or a `<style>` block. Work down the ladder (element, built-in
  convention, composite, token or keyword class, literal class, `<style>`)
  and never hardcode a spacing or color value. Local classes are
  `kebab-case` and never take a fuz_css class name.
- **Svelte** — runes only. Shared state is a class with rune fields, shared
  through `create_context` from `@fuzdev/fuz_ui/context_helpers.ts`, never
  module-level runes.
- **Schemas** — `@fuzdev/fuz_schema` is the one schema library. `s.object`
  rejects unknown keys and is the default. A schema and its type share a
  PascalCase name. `s.parse` at a boundary, `s.parse_or_throw` for an
  invariant, `s.with_default_fn` for a mutable default.
- **Dependency injection** — side effects are small `*Deps` interfaces taken
  as parameters and composed bottom-up; data is `*Options`. A function that
  spawns takes each program as a handle. A root (a server entry, a task) is
  thin, with its body in a function that takes deps. Tests pass plain
  objects, not module mocks. In the browser, DI is Svelte context.
- **Results and errors** — `Result` from `@fuzdev/fuz_util/result.ts` for a
  failure the caller handles, an exception for a bug. `to_error_message(e)`
  for a caught `unknown`.
- **Tests** — `assert` from vitest (it narrows), `test()` not `it()`, files
  split by aspect (`module.aspect.test.ts`), any test with a database named
  `.db.test.ts`. Fixture `expected.json` files are generated, never
  hand-edited.
- **SQL** — one module per table, new functions named `query_<table>_<verb>`
  taking `QueryDeps`, and every read projected through the table's `*_COLUMNS`
  const, never `SELECT *`.
- **TSDoc** — say why, not what. Backtick every identifier; on API pages
  they become links. A URL is bare or a markdown link, never `{@link}`.
  `@param name - description`, `@returns`,
  `@throws ErrorType description`, and `@mutates target - description` for a
  mutation a reader wouldn't guess.
- **Docs prose** — a bare `./` or `../` path is a promise that it resolves on
  disk and renders as a link; backtick an illustrative one. A module is its
  backticked `src/lib`-relative path. mdz is not GFM: single `*` is literal,
  and `snake_case` survives.
- **Tasks and gen** — a task's `Args` is a fuz_schema schema. Generated
  files are committed and `gro check` fails on drift.

### Read by task

- ./references/svelte-patterns.md — components and state classes: state and
  deriveds, contexts, snippets, attachments, props, events
- ./references/css-patterns.md — any styling: the defaults, the ladder,
  tokens, class rules and traps, extraction, component CSS
- ./references/fuz-schema.md — defining or parsing a schema: strictness,
  brands, defaults, composing, metadata, exported schemas
- ./references/fuz-util.md — `Result`, errors, `Logger`, timings,
  concurrency, nominal types
- ./references/dependency-injection.md — anything with side effects:
  `*Deps` and `*Options`, layers, programs, roots, fakes, traps
- ./references/testing-patterns.md — writing or splitting tests: layout,
  assertions, DB tests, fixtures, test doubles
- ./references/db-patterns.md — any SQL: query modules, `*_COLUMNS`
  projections, the drift guard (TS and Rust)
- ./references/twin-impl.md — anything with a Rust twin, and any hash, token,
  or secret format
- ./references/tsdoc-comments.md — writing doc comments: tag forms, links,
  where tags are dropped, drift
- ./references/path-references.md — paths in docs and comments, and import
  specifiers in source
- ./references/mdz.md — writing mdz content or wiring its renderer
- ./references/documentation-system.md — setting up or changing a docs site:
  the pipeline, tomes, the library context
- ./references/task-patterns.md — writing or invoking a gro task
- ./references/code-generation.md — writing a `.gen.*` file
- ./references/npm-dependencies.md — before adding a package, or choosing
  between peer, dependency, and dev

## Rust Crates

The Rust workspaces (the `fuz` CLI and `fuzd` daemon, the spine crates and
the servers on them, `zap`, gro's runtime, `tsv`, `pglet`, the binding
crates) share conventions distinct from the TS side: snake_case carries over,
but Rust solves with the type system and crate graph what TS solves with
`*Deps`. The references own _conventions_, each repo's `CLAUDE.md` owns its
_inventory_, and each crate's rustdoc owns its invariants.

The essentials, each expanded in ./references/rust-patterns.md:

- **Gate**: `cargo fmt --all --check` (by `-p` package where path deps
  reach a sibling checkout, which `--all` would reformat),
  `cargo clippy --workspace --all-targets -- -D warnings`,
  `cargo test --workspace`, `cargo doc` with warnings denied, and
  `cargo xtask check-release` where the workspace has it. `cargo check`
  skips test targets, and real-Postgres suites are `#[ignore]`: a green
  `cargo test` hasn't run them.
- **No `unsafe`** outside a dedicated boundary crate. **No `unwrap`,
  `expect`, or `panic!`** in production code without
  `#[expect(clippy::…, reason = "…")]`.
- **Errors** are `thiserror` enums with the cause in `#[source]`. The binary
  prints the whole chain and returns an `ExitCode`: by default `2` when the
  caller must fix something local, `1` otherwise. `fuz`, `fuzi`, `zap`, and
  `tsv` assign more; read a tool's table before touching its exits.
- **A shipped CLI** parses with argh through an exit-code-correct wrapper,
  never `argh::from_env()`. A new command whose effect is hard to undo is a
  dry run until `--wetrun`.
- **Closed sets are enums**, input structs deny unknown fields, and
  impossible states don't compile.
- **DI** is a concrete `*Options` struct by default (no `*Deps` suffix in
  Rust), with enum dispatch before trait objects.
- **Names** follow ordinary Rust style, except identifiers that mirror a TS
  twin or the wire.
- **Don't re-roll** a file, process, or home-directory primitive. `fuz_sys`
  has it, hardened; a workspace that doesn't depend on `fuz_sys` mirrors its
  shape without adding the dep.
- **A new dependency or a new crate needs approval.**

Read by task:

- ./references/rust-patterns.md — any Rust work: workspace setup, the gate,
  lints, release profile, errors, shutdown, type modeling, the DI ladder,
  testing, CLI and exit codes, system safety (state files, bounded reads,
  the kernel box, config eval)
- ./references/rust-spine.md — writing or changing a server on the spine:
  the `run_app` shape, the server toolkit, the `testing_*` sibling binary,
  env and browser gates, actions and the JSON-RPC envelope, realtime, a
  CLI's daemon lifecycle, `check-release`
- ./references/db-patterns.md — any SQL: query modules, `*_COLUMNS`
  projections, `col!` decode, the drift guard (TS and Rust)
- ./references/twin-impl.md — anything with a TS twin, and any hash,
  token, or secret format: naming parity, the cross-backend harness, wire
  shapes, serde boundary conformance, digests (algorithm, encoding, and
  compare rule per hash and secret)
- ./references/rust-perf.md — a performance claim or hot path: measuring and
  gating against a base, arenas, hot-path idioms, locks
- ./references/wasm-patterns.md — WASM, N-API, and C FFI binding crates and
  their npm packaging
- ./references/rust-dependencies.md — before adding or choosing a crate: the
  allowlist, manifest conventions, isolate-by-crate
