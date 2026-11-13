---
description: Approved external npm packages for TS/Svelte repos, and peer vs dependency vs dev
---

# Approved npm Dependencies

The external npm packages the stack's TS and Svelte repos use. Prefer these,
and reach outside only with explicit approval (§Adding a dependency).

Each repo's `package.json` is the source of truth. This list is kept by hand
and leaves out what only one repo's domain needs (a map library, an editor
extension's typings, a benchmark's reference implementations). The stack's own
packages (the `@fuzdev` and `@ryanatkn` scopes, `svelte-docinfo`) are internal
and not listed.

## The list

- **Language and build**: `typescript`, `tslib`, `svelte`, `@sveltejs/kit`,
  `@sveltejs/vite-plugin-svelte`, `@sveltejs/adapter-static`,
  `@sveltejs/package`, `svelte-check`, `svelte2tsx`, `vite`, `vitest`, `jsdom`
- **Lint**: `eslint`, `eslint-plugin-svelte`, `typescript-eslint`; `@eslint/js`
  and `globals` only inside the shared `@ryanatkn/eslint-config`
- **Release**: `@changesets/changelog-git`, `@changesets/types`
- **Types**: `@types/node`, `@types/estree`, `@types/pg`, `@types/ws`,
  `@types/picomatch`, `@standard-schema/spec`
- **Runtime utilities**: `esm-env` (the `DEV` and `BROWSER` flags), `date-fns`
- **Parsing and source edits**: `zimmerframe` (AST walker), `magic-string`,
  `acorn`, `acorn-jsx`, `@sveltejs/acorn-typescript`, `@webref/css` (CSS
  reference data), `@jridgewell/trace-mapping`
- **Server** (fuz_app's optional peers): `hono`, `@hono/node-server`,
  `@hono/node-ws`, `@hono/bun`, `pg`, `@electric-sql/pglite`,
  `@node-rs/argon2`, `ws`
- **Tooling internals**: `chokidar` and `dotenv` (gro); `picomatch`,
  `tinyglobby`, and `commander` (svelte-docinfo)

**Not for app code**:

- `prettier` and `prettier-plugin-svelte` are retired. tsv formats every repo
  through `gro format`.
- Other schema libraries (`zod`, `valibot`, `arktype`, `typebox`) and
  equality helpers (`dequal`, `fast-deep-equal`) appear only as benchmark
  baselines in fuz_schema and fuz_util.
- A new CLI in TS parses with fuz_util's `args_parse`, not a parser package
  (see ./task-patterns.md §Args). `commander` stays where it is.

## Adding a dependency

Prefer a web standard, then a `node:` built-in, then this list. gro's host
modules replace the `node:` built-ins one at a time, with a Node
implementation and the gro runtime's behind one import; code that fetches
takes `fetch` as a dep, since on the gro runtime it is `net.fetch` and not a
global. New scripts and tasks run on Node through gro, never on Deno.

A new package needs explicit approval: its name, its purpose, what it
replaces or enables, and its transitive footprint. Upgrades are the
maintainer's. Removing a dependency nothing uses is pre-authorized: check
that nothing references it (build scripts and re-exports included), drop it,
and drop it from this list if that was its last user.

## Peer, dependency, or dev

For a **published library** the field is a correctness decision. The test:
_if a consumer ended up with a second copy of this package, would anything
break?_ Yes means a peer. No, but published code imports it, means
`dependencies`. Only the build or tests see it means `devDependencies`.

- **`peerDependencies`**: anything that must be one instance in the
  consumer's tree. That is a framework host (`svelte`, `@sveltejs/kit`) and
  anything whose values or types cross the library's API: `@fuzdev/fuz_schema`
  schemas, `esm-env` flags, the other `@fuzdev` libraries. Two copies break
  `instanceof`, Svelte context keys, fuz_schema's brand types, and the
  dev/prod gate. Mirror the range in `devDependencies` so the library's own
  build resolves it.
- **An optional peer** (`peerDependenciesMeta`) is for a path many consumers
  skip: a preprocessor, a server adapter, a module reached only by deep
  import. A singleton may be optional only when a _required_ peer already
  brings it in: `svelte` and `@sveltejs/kit` both depend on `esm-env`, so a
  library requiring either can leave `esm-env` optional (mdz, fuz_ui). With
  no such peer it is required (fuz_code), and npm installs it for the
  consumer. A types-only package erased at build (`@types/estree`) can be an
  optional peer either way.
- **`dependencies`**: an implementation detail the library imports and never
  hands across its API, such as the `magic-string` and `zimmerframe` inside a
  Svelte preprocessor, or `svelte/compiler` used purely as a parser
  (fuz_css). Never leave something published code imports in
  `devDependencies` alone: every consumer that reaches the path breaks.
- **`devDependencies`**: build and test only, never in `dist`.

**An app, site, or template is not a library.** Nothing installs it, so
everything is `dependencies` or `devDependencies`. An app that is also
packaged as a library (zzz) classifies its imports as a library does.
