---
description: Approved external npm package allowlist for TS/Svelte repos
---

# Approved npm Dependencies

The allowlist of external npm packages for the canonical TS/Svelte repos —
libraries, apps, sites, tooling (different-paradigm or pre-canonical repos
carry their own deps). Prefer these; reach outside only with explicit
approval (§Adding a dependency).

Source of truth is each repo's `package.json`; this hand-maintained list is
deliberately **not exhaustive** — narrowly repo-specific deps (one app's domain
library, an editor extension's typings, a benchmark-only reference impl) are
left out. Workspace-published packages (`@fuzdev` / `@ryanatkn` scopes,
`svelte-docinfo`) are internal and never appear here. Verify against the repos
periodically.

## Language & build toolchain

| Package                        | Purpose                                  |
| ------------------------------ | ---------------------------------------- |
| `typescript`                   | TypeScript compiler                      |
| `tslib`                        | TS runtime helpers                       |
| `svelte`                       | Component framework (runes)              |
| `@sveltejs/kit`                | Application framework                    |
| `@sveltejs/vite-plugin-svelte` | Svelte ↔ Vite integration                |
| `@sveltejs/adapter-static`     | Static-site adapter                      |
| `@sveltejs/acorn-typescript`   | TS-aware acorn parser (Svelte toolchain) |
| `@sveltejs/package`            | Library packaging (`svelte-package`)     |
| `svelte-check`                 | Svelte / TS diagnostics                  |
| `svelte2tsx`                   | Svelte → TSX for typechecking            |
| `vite`                         | Build tool / dev server                  |
| `vitest`                       | Test runner                              |
| `jsdom`                        | DOM implementation for tests             |

## Lint & format

| Package                | Purpose                                                                                       |
| ---------------------- | --------------------------------------------------------------------------------------------- |
| `eslint`               | Linter                                                                                        |
| `eslint-plugin-svelte` | Svelte lint rules                                                                             |
| `typescript-eslint`    | TypeScript lint integration                                                                   |
| `@eslint/js`           | ESLint's built-in JS rule presets (used only inside the shared eslint-config package)         |
| `globals`              | Global-identifier sets for ESLint configs (used only inside the shared eslint-config package) |

**Retired**: `prettier` + `prettier-plugin-svelte` — tsv (`gro format`)
formats every repo; don't add them (tsv keeps prettier only as its conformance
oracle).

## Release tooling

| Package                     | Purpose                                      |
| --------------------------- | -------------------------------------------- |
| `@changesets/changelog-git` | Git-based changelog generator for changesets |
| `@changesets/types`         | Changesets type definitions                  |

## Type definitions

| Package            | Purpose                    |
| ------------------ | -------------------------- |
| `@types/node`      | Node.js types              |
| `@types/deno`      | Deno runtime types         |
| `@types/estree`    | ESTree AST types           |
| `@types/pg`        | `pg` (node-postgres) types |
| `@types/ws`        | `ws` types                 |
| `@types/picomatch` | `picomatch` types          |

## Core utilities

| Package                     | Purpose                                                      |
| --------------------------- | ------------------------------------------------------------ |
| `esm-env`                   | Environment flags (`DEV` / `BROWSER`)                        |
| `zimmerframe`               | AST walker                                                   |
| `magic-string`              | Source-string edits with sourcemaps                          |
| `@webref/css`               | W3C CSS reference data                                       |
| `@jridgewell/trace-mapping` | Sourcemap decoding                                           |
| `date-fns`                  | Date utilities                                               |
| `valibot`                   | Schema validation in svelte-docinfo (its own public schemas) |
| `immer`                     | Immutable state updates (setup's state)                      |

(`dequal` and `fast-deep-equal` appear only as benchmark baselines in
fuz_util — not stack utilities; don't add them to app code.)

## Backend & server

| Package                | Purpose                          |
| ---------------------- | -------------------------------- |
| `pg`                   | PostgreSQL client                |
| `@electric-sql/pglite` | Embedded Postgres (WASM)         |
| `hono`                 | HTTP server framework            |
| `@hono/node-server`    | Hono Node adapter                |
| `@hono/node-ws`        | Hono Node WebSocket adapter      |
| `@hono/bun`            | Hono Bun adapter                 |
| `@hono/deno`           | Hono Deno adapter                |
| `@node-rs/argon2`      | Argon2 password hashing (native) |
| `ws`                   | WebSocket implementation         |

## Parsing & build internals

| Package                    | Purpose                  |
| -------------------------- | ------------------------ |
| `esbuild`                  | Bundler / transform      |
| `oxc-parser`               | Fast JS/TS parser        |
| `acorn`                    | JS parser (ESTree)       |
| `acorn-jsx`                | JSX plugin for acorn     |
| `chokidar`                 | File watching            |
| `dotenv`                   | `.env` loader            |
| `picomatch` / `tinyglobby` | Glob matching            |
| `commander`                | CLI argument parsing     |

## Adding a dependency

Prefer web standards, then `node:` built-ins (gro's host modules replace
these per module as they land, with a Node implementation and the gro
runtime's builtins behind one import; code that fetches takes `fetch` as a
dep, since the gro runtime has no global `fetch` and callers pass
`net.fetch`), then this list. New scripts and tasks
run on Node via gro, never on Deno. A new package needs explicit
approval — name, purpose, what it replaces or enables, transitive footprint.
Removing an unused dependency is pre-authorized: verify nothing references it,
drop it, and if it was the last user, drop it from this list in the same
change.

## Dependency classification (peer vs dependency vs dev)

For a **published library**, the `package.json` field is a correctness
decision. Litmus test: _if a consumer ended up with a second copy of this
package, would anything break?_ Yes → peer. No, but published code imports it →
`dependencies`. Only the build sees it → `devDependencies`.

- **`peerDependencies`** — must resolve to a **single instance** in the
  consumer's tree: a framework host (`svelte`, `@sveltejs/kit`;
  `svelte/compiler` used only as a parser shares no runtime state, so it may
  be a plain dependency, as in fuz_css) or anything whose instances/types
  cross the library's API boundary (`@fuzdev/fuz_schema` schemas, `esm-env`
  flags). Two copies break `instanceof`, fuz_schema brand identity and
  declaration-merged `SchemaMeta` keys, Svelte context keys, and the dev/prod
  env gate. Mirror the version in `devDependencies` so the
  library's own build resolves it. Required when the public API always
  reaches it; **optional** (via `peerDependenciesMeta`) for
  an opt-in path (a preprocessor, a deep-import module many consumers skip) —
  but **only when a _required_ peer guarantees it transitively**: `svelte` and
  `@sveltejs/kit` both depend on `esm-env`, so a lib requiring either can leave
  `esm-env` optional. A singleton on a path with **no** required framework peer
  (`esm-env` in a node-only utility like `fuz_util/log.ts`) must be a
  **required** peer — npm auto-installs those, so the consumer never hits a
  missing-module crash.
- **`dependencies`** — published code imports it as a self-contained detail
  never handed across the API boundary; pin a known-good version. Build-time
  helpers a consumer never touches (`magic-string`, `zimmerframe` in a Svelte
  preprocessor) belong here so the library ships its own copy. An optional peer
  is acceptable for such a helper only when a required framework peer already
  guarantees it (type-only `@types/estree` via `svelte`, erased at build).
  Never a `devDependency`-only import — that breaks any consumer who reaches
  the path.
- **`devDependencies`** — build/test only, never shipped in `dist`.

**Apps, sites, and templates are not libraries** — leaf deploy targets with no
installing consumers; everything is `dependencies`/`devDependencies`, never
peers.
