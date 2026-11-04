---
description: Path typography — navigational vs src/lib module vs code-shaped
---

# Path References in Documentation

The typography says whether a target is a **navigable file** (bare path) or a
**code-tree identifier** (backticked, no leading `./`). mdz auto-linkifies bare
`./`/`../` paths after whitespace, so getting this wrong produces broken links
or unlinked paths.

## 1. Navigational paths (bare, no backticks)

For docs, READMEs, and any reference that points to a file by location:

- `./foo`, `../foo` — relative to the file's directory
- `~/dev/foo` — workspace-root anchored; reads cleanly at any depth
- `setup/foo` — bare workspace-root anchor; preferred over deep
  `../../setup/foo` from nested files

**A bare path is a promise it resolves on disk**, relative to the file it
appears in. An illustrative path — a conceptual location (`./build/`), an
example (`./foo/bar`), an import in prose (`import './fuz.css'`) — goes in
**backticks**, the escape hatch meaning "literal, don't follow."

**No possessives on bare paths**: mdz treats `'` as a path character, so
`./foo.md's` links to a 404 ending in `'s`. Reword or backtick.

## 2. src/lib module references (backticked, src/lib-relative)

A backticked reference to a **same-repo** src/lib module is the bare
src/lib-relative form — never `../foo.ts`, `./foo.ts`, `src/lib/foo.ts`, or
`./src/lib/foo.ts`. The backticks frame a module identifier; traversal or a
`src/lib/` prefix contradicts that framing.

- From inside src/lib: "`auth/account_schema.ts`" means
  `src/lib/auth/account_schema.ts`
- From outside src/lib (root CLAUDE.md, docs/, src/test/): include the prefix
  — "`src/lib/auth/CLAUDE.md`" — unambiguous at any depth (the
  src/lib-relative form is also acceptable from src/test/)
- Applies to subsystem CLAUDE.mds ("`auth/CLAUDE.md`"); section refs put
  `§Heading` outside the backticks

```
✅ `server/upload_route.ts`
❌ `src/lib/server/upload_route.ts`   redundant prefix
❌ `./src/lib/server/upload_route.ts` prefix plus ./
❌ `../server/upload_route.ts`        traversal inside backticks
❌ `./classroom_service.ts`           self-relative inside backticks
```

**Backticks remain an escape hatch.** This rule applies only to references
that resolve to a same-repo module. A backticked cross-repo path,
deliberately-literal example, or explanatory path is left exactly as written —
don't rewrite `` `../some-other-repo/x.ts` `` into module form.

## 3. Code-shaped non-paths (backticks)

CLI commands (`gro check`, `deno task scry`), top-level project files
(`package.json`, `gitops.config.ts`), system/config identifiers (`~/.fuz/`,
`~/.mg/config.json`).

## 4. Cross-repo references

Point at another workspace repo with a **bare** navigational path
(`../other-repo/src/lib/foo.ts`, `~/dev/other-repo/...`). The backticked
module form is same-repo only — it resolves against the current repo's module
index. For a published package's module, the import specifier
(`@scope/pkg/foo.ts`) is the code reference.

- A bare cross-repo path must resolve — a stale `../old-name/...` after a
  repo rename is a broken link
- **TSDoc must not `../` out of the repo** — source comments render into
  published API docs where the package has no siblings. Attribute external
  inspiration in prose or link a URL. Backticked explanatory paths remain the
  escape hatch.

## 5. Import specifiers (source code, not prose)

Imports use the real source extension (`.ts` / `.svelte.ts` / `.svelte`),
never `.js`-for-a-`.ts`-file, and pick the alias by **whether the module
ships**. Gro's loader and server builds enforce the extension: a relative or
absolute import resolves to exactly the file it names, with no extension
probing and no `.js`→`.ts` mapping (`./foo.ts`, not `./foo` or `./foo.js` — a
`.js` specifier loads the `.js` file), and a `#lib/x.js` naming a `.ts` file
is refused with the fix. Aliases:

- **`src/lib` (ships as `dist`) → relative only** (`./sibling.ts`). The build
  rewrites `.ts`→`.js` into `dist` (svelte-package 3 also rewrites `#` imports
  to relative ones, but `dist` is kept free of subpath imports by convention, and
  gro's dist tooling assumes it). The hard reason is generated and injected code:
  `#lib`/`#routes` resolve against whichever package imports them, so a
  preprocessor's injected import or a generator's output that lands in a
  consumer would point at the consumer's `src/lib` — that code uses the package
  name (`@fuzdev/<pkg>/…`), never `#lib`.
- **Everything else → `#lib/*` / `#routes/*`** package.json subpath imports
  (`"imports": {"#lib/*": "./src/lib/*"}`): routes, tests, and
  spawn-outside-Vite entries (Deno/Node servers, benchmarks, `gro run`
  scripts). One mechanism resolves across Vite, Node, Bun, Deno, and Gro's
  loader. SvelteKit 3 removed `$lib`, and `$routes` was a config `alias`
  (deprecated in kit 3), so neither is built in.
- **Cross-package** `@fuzdev/<pkg>/sub.ts` resolves via the target's `exports`
  `.js`/`.ts` mirror to its `dist`. Packages without subpath exports
  (`@fuzdev/blake3-wasm`) are imported by bare name.

`$app/*` stays (virtual modules). Env goes through `$app/env/public` /
`$app/env/private`, exporting only the vars declared in `src/env.ts` with
`defineEnvVars` from `@sveltejs/kit/env` (kit 3 has no `PUBLIC_` prefix rule);
`$env/*` and `$app/environment` are deprecated re-exports — use
`$app/env/public|private` and `$app/env`. `@ryanatkn/eslint-config` warns on
`$lib`/`$routes` everywhere and on `#lib`/`#routes` inside `src/lib`, covering
`import`/`export` declarations and `import type` but **not** inline
`import('#lib/…')` type positions (base `no-restricted-imports` doesn't visit
`TSImportType`) — svelte-package rewrites those in `dist`, but keep them out of
`src/lib` in review.

## Web-rendered caveat

In files published via mdz on a website (this skill renders on docs.fuz.dev),
non-`.md` `./foo` and `../foo` examples must be backticked or mdz renders them
as broken `<a>` tags. Bare relative `.md` links are fine — docs.fuz.dev's
`skill_docs.gen.ts` rewrites them to routes. `~/dev/foo` and bare
workspace-root paths are safe bare (mdz doesn't linkify those prefixes).

## Anti-patterns

The linkifier won't fire on these, costing tokens and navigability:

- **Mixing forms**: backticks + `./` or `../` is the worst of both worlds.
  Pick bare (navigational) or module form.
- **Backticking a navigable target**: "`~/dev/fuz_util`" reads as an
  identifier; write bare `~/dev/fuz_util`.
- **Redundant link syntax when text equals target**: `[../README.md](../README.md)`
  → bare `../README.md`. Reserve `[text](url)` for a visible token that isn't
  the path (`[@fuzdev/fuz_app](../../fuz_app)`).

## Formatter cautions

- A line wrapping after `+` becomes a sublist (`cell + fact` → `+ cell_history`
  reflows as a bullet). Rephrase or keep the `+` mid-line.
- Bare `_` in prose mixed with backticked identifiers can parse as italic
  delimiters and mangle text. Backtick `_`-bearing identifiers even in light
  prose; when several appear in one sentence, restructure as a bullet list.
