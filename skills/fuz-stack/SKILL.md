---
name: fuz-stack
description: Development conventions and coding patterns for the @fuzdev ecosystem — naming, file organization, testing, styling, documentation, and tooling for TypeScript, Svelte 5, and Rust projects. Use when writing or reviewing code in any @fuzdev project. Triggers include running gro commands (gro check, gro test, gro gen), styling with fuz_css, writing or splitting tests, generating code with .gen.ts files, naming functions or variables (snake_case conventions), organizing files in src/lib/ or src/test/, writing TSDoc comments, creating Svelte 5 components with runes, or formatting code. Also use for the Result type, fixture-based testing, CSS utility classes, TODO_ docs, breaking changes policy, async concurrency patterns, Gro task system, type utilities (Flavored, Branded), dependency injection patterns (*Deps/*Options/*Context interfaces, AppDeps, RuntimeDeps, mock factories), or setting up documentation (tomes, svelte-docinfo, API routes, docs layout). Also covers the ecosystem's Rust workspaces — cargo and clippy lints, thiserror error handling, the dependency-injection escalation ladder, enum-dispatch and make-impossible-states idioms, spine-consumer servers (zzz_server, fuz_forge_server), daemon lifecycle, and CLI and xtask patterns. Triggers include running cargo or clippy, editing Cargo.toml, naming or organizing Rust crates, or working on the fuz and fuzd daemon, the zap convergence engine, or the spine crates.
license: 0BSD
metadata:
  author: ryanatkn
  version: 0.1.0
---

# Fuz stack conventions

> **Pre-alpha**: conventions are actively evolving. When code or a project's
> `CLAUDE.md` conflicts with this skill, the code is ground truth.
>
> **À la carte**: each project adopts only what serves it. Deep imports and
> the flat namespace make this natural at the package level too.
>
> **Skip for**: planning/lore-only edits, third-party code review, simple
> git/shell operations. Repo `CLAUDE.md` is authoritative for project-specific
> patterns — this skill covers shared conventions across TypeScript, Svelte,
> and Rust.

## Why These Conventions

The stack is designed so the full lifecycle — produce, deploy, operate — is
accessible to anyone with intent and an AI partner. Consistent,
self-describing patterns let an agent learn once and apply everywhere:
snake_case aligns TS, Rust, and SQL with zero renaming; schemas are the
single source of truth for data shape, type, defaults, and validation
(fuz_schema everywhere except fuz_app's app data and the apps on it, which
are Zod); `fuz_app` is the shared backend spine (auth, sessions, DB, SSE)
that zzz and the apps build on.

## Package Ecosystem

Each package's `CLAUDE.md` is authoritative for what it actually uses.

| Package        | Description                                                                     |
| -------------- | ------------------------------------------------------------------------------- |
| `fuz_util`     | foundation utilities (zero deps) — hashing, async, schemas, types               |
| `fuz_schema`   | performance-focused Standard Schema library — all but fuz_app data, `Flavored`  |
| `gro`          | security-first JS runtime and toolchain on V8 (today a Node task runner)        |
| `fuz_css`      | semantic-first CSS framework and design system                                  |
| `mdz`          | minimal markdown dialect — parser, renderer, Svelte preprocessor                |
| `fuz_ui`       | Svelte 5 components — themes, layouts, overlays, auto-docs                      |
| `fuz_app`      | stack spine — auth, sessions, DB, SSE, route specs                              |
| `fuz_docs`     | experimental AI-generated docs and skills for Fuz                               |
| `fuz_template` | starter template — SvelteKit web apps, Rust native tools, or both               |
| `fuz_code`     | syntax styler for TypeScript, Svelte, Markdown, and more                        |
| `fuz_blog`     | blog software from scratch with SvelteKit                                       |
| `fuz_repos`    | multi-repo management                                                           |
| `blake3`       | BLAKE3 hashing compiled to WASM (`@fuzdev/blake3-wasm` + `blake3-wasm-small`)   |
| `zzz`          | software garage — produce software with AI assistance                           |
| `zap`          | convergence — deploy and operate infrastructure                                 |

**Dependency flow**: `fuz_schema → fuz_util → gro + fuz_css → mdz → fuz_ui → fuz_app → zzz, apps`.
zap sits beside the chain: its site builds on fuz_ui; its Rust engine links
only fuz's spine-free system leaves (`fuz_eval`, which pulls in `fuz_sys`),
plus `fuz_audit` for its xtask — never the HTTP/DB spine.

**Deps**: prefer the approved allowlists (./references/npm-dependencies.md,
./references/rust-dependencies.md). Adding or upgrading needs approval;
removing an unused dep is pre-authorized.

## Coding Conventions

### Naming — snake_case + PascalCase

Functions, variables, and constants you define are `snake_case`
(`SCREAMING_SNAKE_CASE` for constants); types, classes, and components are
`PascalCase`. **Not camelCase.** External APIs keep their native casing
(`.map()`, `addEventListener()`, `initSync`).

```typescript
export const git_current_branch_name = async (): Promise<GitBranch> => { ... };
export function create_context<T>(fallback?: () => T) { ... }
const DEFAULT_TIMEOUT = 5000;
type PackageJson = {};
class DocsLinks {}
// file: src/lib/DocsLink.svelte
```

Why: cross-language alignment (same identifiers in TS, Rust, and SQL —
`keyed_hash`, `get_user_sessions`) and legibility (`package_json_load` vs
`packageJsonLoad`).

### Naming Patterns

Two forms, chosen by **disambiguation** in the flat namespace:

| Pattern               | Example                  | Use case                                       |
| --------------------- | ------------------------ | ---------------------------------------------- |
| `domain_action`       | `git_push`               | bare action ambiguous → prefix the domain      |
| `domain_is_adjective` | `git_workspace_is_clean` | boolean in a domain cluster                    |
| `action_domain`       | `escape_js_string`       | self-descriptive action, domain qualifies      |
| `to_target`           | `to_file_path`           | conversions                                    |
| `format_target`       | `format_number`          | formatting                                     |
| `create_domain`       | `create_context`         | factories                                      |

Rule of thumb: domain-prefix when the bare name is ambiguous (`git_push` not
`push`); action-first when self-descriptive (`truncate`, `strip_start`). File
names signal which: `git.ts` → `git_*`, `string.ts` → action-first.

Action verbs: `parse`, `create`, `get`, `to`, `is`, `has`, `format`,
`render`, `analyze`, `extract`, `load`, `save`, `escape`, `strip`, `ensure`,
`validate`, `should`.

### Flat Namespace — Fail Fast

All exported identifiers must have **unique names across all modules**. The
check is opt-in in `svelte-docinfo`, and fuz projects turn it on with
`svelte_docinfo({onDuplicates: 'throw'})`, which fails the build listing every
conflict with module path and kind. Resolve by renaming the side that
is _not_ the primary public API, or `/** @nodocs */` the loser — but `@nodocs`
hides it from docs and tomes, so it's wrong when external consumers use it.

- Component is primary (class is state/helper): suffix the class `State` /
  `Info` (`DocsLink.svelte` + `DocsLinkInfo`; precedent `ThemeState`,
  `AuthState`, `SidebarState`).
- Class is primary (stateful, consumers instantiate it): suffix the component
  `View` / `Pane` (zzz's `Chat` + `ChatView.svelte`; mdz's `MdzNode` +
  `MdzNodeView.svelte`).

### File Organization

- **`src/lib/`** — exportable code: `PascalCase.svelte`, `*.ts`, `*.svelte.ts`
  (runes), `*.gen.ts` (generated)
- **`src/test/`** — tests (NOT co-located), mirroring `lib/`
- **`src/routes/`** — SvelteKit routes
- **No barrels** — import every module by full path
  (`@fuzdev/fuz_app/env/load.ts`); package `exports` use wildcards
- **No re-exports in TypeScript** — each TS symbol has one canonical module;
  callers import it from there. Don't `export {X} from './y.ts'` or re-export an
  import to spare callers an import line — two paths to one symbol drift and
  hide its source. Exceptions are modules whose job is to aggregate or wrap:
  generated registries and a hand-written entry over a non-importable generated
  module (wasm-pack's `pkg/`)
- **Subdirectories** at 3+ closely related files sharing a domain concept
  (`lib/auth/`, `lib/env/`, `lib/db/` in fuz_app) — not preemptively; a lone
  file stays at `lib/` root; the subdirectory is part of the import path
  (`@fuzdev/fuz_app/env/load.ts`), and tests mirror it
  (`src/lib/auth/keyring.ts` → `src/test/auth/keyring.test.ts`). Domain files
  split by role: `account_schema.ts`, `account_queries.ts`,
  `account_routes.ts`, `session_middleware.ts`

### Code Style

- TypeScript strict mode, explicit types; Svelte 5 runes; tsv formatting with
  tabs, 100 char width
- **Import extensions**: the real source extension — `./bar.ts`,
  `./Foo.svelte`, never `.js`-for-a-`.ts`-file — gro's loader resolves exactly
  the named file, no extension probing. Library code (`src/lib`)
  imports relative; everything else (`src/routes`, `src/test`) uses the
  `#lib/*` / `#routes/*` package.json subpath imports (`#lib/db/db.ts`).
  Cross-package `@fuzdev/pkg/foo.ts` resolves via the package's `exports`
  `.js`/`.ts` mirror. Full rules: ./references/path-references.md §5.
- **Comments**: JSDoc (`/** */`) = sentences with periods; inline (`//`) =
  fragments, no capital or period
- **No backwards compatibility**: delete unused code, rename directly, no
  deprecated stubs or shims. Document breaks in changesets.

## Gro Commands

Gro is installed globally — run `gro` directly, never `npx gro`.

```bash
gro check        # CI command: typecheck + test + gen --check + format --check + lint
gro test         # vitest
gro typecheck    # faster iteration
gro gen          # run *.gen.ts generators (gro gen --check verifies no drift)
gro format       # tsv
gro lint         # ESLint
gro build        # production build
gro publish      # changesets version + npm publish + git push
gro deploy       # build + force push to deploy branch
gro release      # publish + deploy
gro changeset    # create a changeset
gro sync         # gen + update exports
gro run file.ts  # execute TS; everything after the path goes to the script
gro task         # list project tasks under src/
gro task src/lib/foo.task.ts  # run a project task by path
```

`SKIP_EXAMPLE_TESTS=1 gro test` skips slow example tests in repos that
support the flag. A name means only a builtin; a project task runs by path,
`.task.ts` suffix required — nothing is searched, and a project task never
shadows a builtin. To extend a builtin, write a task that invokes it by name
(composition, not an override) and point the `package.json` script at it.
Custom tasks: ./references/task-patterns.md.

## Code Generation

`*.gen.ts` files export `gen`; `foo.gen.ts` → `foo.ts`, `foo.gen.css.ts` →
`foo.css`. Return `string`, `{content, filename?, format?}`, an array, or
`null`. Most projects run `gro gen` rarely — fuz_css utility classes come from
the `vite_plugin_fuz_css` plugin (`virtual:fuz.css`) and API metadata from the
`svelte-docinfo` plugin, not gen tasks. See ./references/code-generation.md.

## TSDoc/JSDoc Conventions

Full guide: ./references/tsdoc-comments.md.

- Main description: complete sentences ending in a period
- `@param name - description`: hyphen separator; single sentence = lowercase
  fragment, no period; multi-sentence = capitalized with periods. `@returns`
  (not `@return`) follows the same rule
- `@module` at the end of a module-level comment
- `@mutates target - description`: the description must name what a reader
  wouldn't guess (columns, cascades, side channels); omit the tag when the
  method name already says it
- `@internal`: not-stable API, stays documented; `@nodocs`: removed from docs
  and flat-namespace validation
- Backtick identifier references — mdz autolinks them to API docs

**Tag order**: description → `@param` → `@returns` → `@mutates` → `@throws` →
`@example` → `@deprecated` → `@see` → `@since` → `@default` → `@internal` →
`@nodocs`

## Documentation System

Projects use **tomes** (not "stories") plus auto-generated API docs. Pipeline:
source → `svelte-docinfo` Vite plugin → `virtual:svelte-docinfo` →
`library_json_from_modules()` → `Library` → Tome pages + API routes. Setup,
layout, components, and README code-example style:
./references/documentation-system.md.

## mdz — Strict Markdown Dialect

`mdz` (`@fuzdev/mdz/mdz.ts`) is a small, unambiguous grammar, **not a
CommonMark/GFM superset** — ambiguous input stays literal text. Bold/strike are
doubled (`**`/`~~`); italic is single `_` at word boundaries, so `snake_case`
renders verbatim. fuz_ui renders TSDoc through it, injecting `DocsLink` for
inline code and fuz_code's `Code` for blocks via getter contexts in
`@fuzdev/mdz/mdz_contexts.ts`; backticked identifiers that resolve to API
symbols become links. Full surface, injection seam, and the
`svelte_preprocess_mdz` preprocessor: ./references/mdz.md.

## Path References in Docs

mdz auto-linkifies bare `./`/`../` paths, so typography carries meaning:

- **Navigational paths** — bare (`./foo`, `../foo`, `~/dev/foo`); a bare path
  is a promise it **resolves on disk**. Backtick illustrative paths
  (`` `./build/` ``) as the escape hatch.
- **src/lib module references** — backticked, src/lib-relative, no leading
  `./`/`../`/`src/lib/` (`auth/account_schema.ts`).
- **Cross-repo** — bare `../other-repo/...` for navigation or the
  `@scope/pkg/foo.ts` specifier for identity; TSDoc must not point outside its
  own repo.
- **Code-shaped non-paths** — backticks (`gro check`, `package.json`, `~/.fuz/`).

Full rules and formatter cautions: ./references/path-references.md.

## Svelte 5 Patterns

`$state()` for all reactive state — it proxies objects and arrays so in-place
mutation (push, splice, property writes, `bind:` on object properties)
triggers updates. `$state.raw()` is a performance opt-out for large
wholesale-replaced values, not a default. Contexts go through
`create_context<T>()` from `@fuzdev/fuz_ui/context_helpers.ts`. Everything
else — `$derived.by`, SvelteMap/SvelteSet, schema-driven classes, snippets,
attachments, props, events, module-level-rune pitfalls:
./references/svelte-patterns.md.

## fuz_css

**Default styling is the baseline — justify every deviation.** fuz_css styles
semantic HTML (buttons, inputs, headings, links, lists, code, tables,
`<aside>`, `<blockquote>`, `<details>`, `<small>`, `<kbd>`, …) via
low-specificity `:where()` selectors, and block elements space themselves via
**flow margin**. The most common mistake is adding `mb_*`/`gap_*`/`p_*` where
flow margin already spaces, or re-declaring color/font the element carries.
Most app files have no `<style>` block at all.

```svelte
<!-- BAD: headings and paragraphs already carry flow margin -->
<h2 class="mb_md">{title}</h2><p class="mb_md">{body}</p>
<!-- GOOD: correct rhythm with zero classes -->
<h2>{title}</h2><p>{body}</p>
```

**Styling ladder** — stop at the first rung that suffices:

1. Semantic HTML (right element, no class)
2. Built-in conventions (`.selected`, `.palette_a`–`.palette_j`, `.inline`, `.unstyled`)
3. Composite classes (`row`, `column`, `box`, `panel`, `chip`, `ellipsis`)
4. Token or keyword classes (`p_md`, `gap_lg`, `flex`)
5. Literal classes (`justify-content:space-between`, `width:100%`, `hover:opacity:80%`)
6. `<style>` block with design tokens

Rungs 3–5 are one tier — mix freely; the real cuts are semantic-vs-class and
classes-vs-`<style>`. Don't churn existing `<style>` blocks into class strings.
Token classes are `snake_case`; keyword classes are bare CSS keywords (`flex`,
`sticky`), plus `hidden`; component-local classes are `kebab-case` (`site-header`)
and never take a keyword's name. Full reference: ./references/css-patterns.md.

## Dependency Injection

**Small standalone `*Deps` interfaces, composed bottom-up.** Leaf functions
import small interfaces directly, never `Pick<Composite>`.

- **Suffixes** — `*Deps` (capabilities; fresh mock factories per test),
  `*Options` (data/config; literal objects), `*Context` (scoped world for a
  callback). No `*Config`. Single-capability service interfaces keep pure-noun
  names (`Keyring`, `FactStore`).
- **Files** — `deps.ts` + `deps_defaults.ts` + test-side `mock_deps.ts`
  (fuz_css is the exemplar). fuz_repos's `*Operations` is legacy — never
  author new ones.
- **Composition roots** — `AppDeps` (fuz_app server, assembled once in a
  two-step root); `RuntimeDeps` (env/fs/commands, platform factories for
  Node/mock; the Deno factory stays until the Deno exit, no new Deno code).
  On the gro runtime a task's import graph is the composition root: host-module
  imports declare capabilities and grants are inferred from them; no global
  carries authority (`fetch` is `net.fetch`, an import), nothing is ambient.
- **Contracts** — L1 domain deps take a single `options` object and return
  `Result` with typed error kinds; L0 platform shims mirror the platform and
  throw. Plain-object mocks, no mocking libs; throwing stubs over silent no-ops.
- **Scope** — function-param deps are for plain TS call graphs; browser/UI DI
  is Svelte context, not `*Deps` params.

Full guide: ./references/dependency-injection.md.

## Common Utilities

`@fuzdev/fuz_util`:

- **`Result<TValue, TError>`** — `({ok: true} & TValue) | ({ok: false} & TError)`;
  properties sit directly on the result
- **`to_error_message(value, fallback?)`** (`error.ts`) — normalizes an unknown
  caught value to a string
- **`Logger`** — hierarchical (`new Logger('module')`, `.child()`), level via
  the `PUBLIC_LOG_LEVEL` env var
- **`Timings`**, **`run_dag()`**, **`each_concurrent` / `map_concurrent` /
  `map_concurrent_settled` / `AsyncSemaphore` / `Deferred`**
- `OmitStrict`, `PickUnion` (`types.ts`); **`Flavored`/`Branded`** come from
  `@fuzdev/fuz_schema/schema.ts`

See ./references/fuz-util.md.

## Zod Schemas

Zod schemas are the source of truth for fuz_app's app data and the apps
built on it — JSON shape, TS type, defaults, metadata, and serialization;
schema changes cascade through the stack. Everything else is
`@fuzdev/fuz_schema`: the packages below fuz_app (fuz_util, gro, fuz_css),
CLI and task args (./references/task-patterns.md), tooling, and
fuz_app's testing daemon-info file. Porting from Zod, mind that a Zod object parse
returns a new object in schema key order while fuz_schema `object` returns
the input itself when no entry changed it (`strip_object` copies, in schema
order, only when an unknown key is present) — output written to generated
files changes key order unless reordered.

- **`z.strictObject()`** by default. `z.looseObject()` / `z.object()` only
  for external data, client-consumed response/error shapes, and extensible
  protocol shapes — with a comment saying why.
- **PascalCase, schema and type share the name**:
  `const Foo = z.strictObject({...}); type Foo = z.infer<typeof Foo>;`
- **`.meta({description})`**, not `.describe()` — both work in Zod 4, but
  `.meta()` is the convention and carries extra keys (`sensitivity`)
- **`.brand()`** for validated nominal types (`Uuid`, `Datetime`, `DiskfilePath`)
- **`safeParse` at boundaries**, `parse` for internal assertions

See ./references/zod-schemas.md.

## Query Modules (DB)

One module per table; functions are `query_<table>_<verb>(deps: QueryDeps, …)`;
`assert_row` on `INSERT … RETURNING`. Every read projects through the table's
exported `*_COLUMNS` const — never `SELECT *` — rendered at the site via
`columns_sql` / `qualify_columns` / `omit_columns`, and drift-guarded against
the live schema (`assert_columns_match_live`). The Rust twin uses the same
identifiers with positional decode. See ./references/db-patterns.md.

## Testing

Tests in `src/test/`, mirroring `lib/`. `assert` from vitest, chosen for type
narrowing (`assert(x instanceof Error)` narrows; `expect(...).toBeInstanceOf`
doesn't). Custom helpers are `assert_*`. `describe` blocks (one or two
levels), `test()` not `it()`. Split suites by aspect:
`{module}.{aspect}.test.ts`; DB tests use `.db.test.ts` to share one WASM database
instance via vitest `projects`. Parsers/transformers use fixtures under
`src/test/fixtures/<feature>/<case>/` — **never hand-edit `expected.json`**;
regenerate via `gro task src/test/fixtures/<feature>/update.task.ts`. See
./references/testing-patterns.md.

## TODOs

Leave **copious** `// TODO:` comments — expected, not debt to hide. For
multi-session work, create `TODO_*.md` in the project root with status, next
steps, and decisions; delete when complete; **update before ending a
session.**

## Rust Crates

The Rust workspaces (`fuz`/`fuzd`, the spine crates consumed by `zzz_server` /
`fuz_forge_server`, `zap`, the `blake3`/`tsv` bindings) share conventions
distinct from the TS side: snake_case carries over, but Rust solves with the
type system and crate graph what TS solves with `*Deps`. These references own
_conventions_ (adoptable by any workspace); each repo's `CLAUDE.md` owns its
_inventory_.

- ./references/rust-patterns.md — new-workspace checklist, lints (and the
  crate-override re-declare trap), release profile, `thiserror` taxonomy +
  `.hint()`/`.exit_code()`/classifiers, graceful shutdown + periodic upkeep,
  the DI escalation ladder, make-impossible-states idioms (zap_types is the
  reference), CLI/exit codes, shared patterns (sandboxed eval, the one `$HOME`
  lookup, transactional state files, CAS, bounded reads, type state, secret
  masking)
- ./references/db-patterns.md — query modules, `*_COLUMNS` + `col!` decode,
  drift guard (TS twin in the same doc)
- ./references/rust-spine.md — spine crate map, `run_app` / `RunAppOptions` /
  the `testing_*` sibling binary, upkeep tasks, WS/SSE admission, `fuz_http`
  JSON-RPC envelope, env loading, daemon lifecycle, `check-release` +
  crate-layering rules
- ./references/rust-perf.md — profiling, arenas, lock hygiene, `unsafe` escape hatch
- ./references/rust-dependencies.md — approved crates, crate-vs-feature isolation
- ./references/twin-impl.md — TS ↔ Rust twin architecture, naming parity, wire
  crates, serde boundary conformance, digests (algorithm, encoding and
  compare rule per hash and secret), tool twins (fuz_template's molt)
- ./references/wasm-patterns.md — WASM, C-FFI, and N-API binding crates
