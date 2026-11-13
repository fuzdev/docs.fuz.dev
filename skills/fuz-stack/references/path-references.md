---
description: Path typography in docs (navigable vs module vs code-shaped) and import specifier rules
---

# Path References

In prose, the typography says what a path is: a **file you can navigate to**
is bare, and a **code identifier** is backticked. mdz turns a bare `./` or
`../` path into a link, so the wrong form is a broken link or a dead
reference. The last section covers import specifiers in source.

## Navigable paths are bare

- `./foo` and `../foo` are relative to the file they appear in.
- `~/dev/foo` is anchored at the workspace root and reads the same at any
  depth. Prefer it to a deep `../../foo`.

**A bare path is a promise that it resolves on disk.** A path that is only an
illustration goes in backticks, which mean "literal, don't follow": a
conceptual location (`./build/`), an example, an import quoted in prose.

- **No `'`, `*`, `_`, or `~` glued to a bare path.** mdz reads them as part
  of the path, so a possessive links to a file ending in `'s`, and a closing
  `**` or `_` directly after a path joins the link. Reword or backtick.
  Sentence punctuation after a path is fine.
- **A path directly after `(` doesn't link.** Write `(see ./x.md)`.
- **Don't backtick a navigable target.** A backticked workspace path reads as
  an identifier and links nothing.
- **Link syntax is for text that isn't the path**:
  `[@fuzdev/fuz_app](../../fuz_app)`. In a doc that only GitHub or npm
  renders, such as a README, a bare path isn't a link, and `[path](path)` is
  how to make one.

## Modules are backticked and `src/lib`-relative

A reference to a module in the same repo is its path under `src/lib`, in
backticks: `auth/account_schema.ts`. The backticks frame an identifier,
so a `./`, a `../`, or a `src/lib/` prefix contradicts them.

```
✅ `server/upload_route.ts`
❌ `src/lib/server/upload_route.ts`   redundant prefix
❌ `./src/lib/server/upload_route.ts` prefix plus ./
❌ `../server/upload_route.ts`        traversal inside backticks
❌ `./classroom_service.ts`           self-relative inside backticks
```

- From outside `src/lib` (a root `CLAUDE.md`, `docs/`), include the prefix so
  the reference is unambiguous: `src/lib/auth/CLAUDE.md`.
- A section reference puts `§Heading` outside the backticks.
- This form is same-repo only. A backticked path into another repo, or one
  that is deliberately literal, stays as written.

## Code-shaped non-paths are backticked

Commands (`gro check`, `npm run build`), top-level project files
(`package.json`, `vite.config.ts`), and system locations (`~/.fuz/`).

## Other repos

Point at a sibling repo with a bare navigable path
(`../other-repo/src/lib/foo.ts`). For a published package's module, the
import specifier is the reference: `@scope/pkg/foo.ts`.

- A bare cross-repo path must resolve. After a repo is renamed, the old path
  is a broken link.
- **TSDoc never points outside its repo.** Source comments render into
  published API docs, where the package has no siblings. Credit outside work
  in prose or with a URL.

## Docs rendered on a website

A doc published through mdz, as this skill is on docs.fuz.dev, links what an
editor only displays:

- **Backtick every `./` and `../` example that isn't a real `.md` file
  beside the doc.** Bare relative `.md` links are rewritten to routes; any
  other bare relative path becomes a broken link.
- **Backtick a route or any `/word`**, which would otherwise become an
  internal link.
- `~/dev/foo` is safe bare: mdz doesn't link that prefix.
- **A `_` at a word boundary opens italic**, and can run to the next one
  across code spans. Backtick identifiers that begin or end with an
  underscore, and split a sentence that holds several.

## Import specifiers

In source, an import names the real file and picks its form by whether the
module ships.

- **The real source extension**: `./foo.ts`, `./Foo.svelte`,
  `./state.svelte.ts`. Never `./foo` or `./foo.js` for a `.ts` file. gro's
  loader resolves exactly the file named, with no extension probing, and
  refuses a `.js` specifier that names a `.ts` file. The build rewrites
  relative `.ts` to `.js` in `dist`.
- **`src/lib` imports relatively, always.** `#lib` resolves against whichever
  package imports it, so library code that is generated or injected into a
  consumer would point at the consumer's `src/lib`. Code a preprocessor or
  generator emits for a consumer uses the package name
  (`@fuzdev/<pkg>/…`).
- **Outside `src/lib`, reach into it with `#lib/*`, and into another
  directory of `src/routes` with `#routes/*`** (`#lib/db/db.ts`,
  `#routes/library.ts`), the `package.json` subpath imports
  (`"imports": {"#lib/*": "./src/lib/*", "#routes/*": "./src/routes/*"}`).
  That covers routes, tests, servers started outside Vite, benchmarks, and
  `gro run` scripts, and one mechanism resolves under Vite, Node, Bun, and
  gro. A file in the same directory is imported relatively (`./tomes.ts`),
  and so are a test's own helpers.
- **Another package is `@fuzdev/<pkg>/sub.ts`**, resolved through that
  package's `exports`. A package with no subpath exports
  (`@fuzdev/blake3-wasm`) is imported by its bare name.
- **SvelteKit 3 has no `$lib`**, and `$routes` is a deprecated kit `alias`
  entry. `$app/*` stays, except `$app/environment` (use `$app/env`). `$env/*`
  is deprecated: env goes through `$app/env/public` and `$app/env/private`,
  which export only the variables declared in `src/env.ts` with
  `defineEnvVars`.
- The shared eslint config warns on `$lib` and `$routes` everywhere and on
  `#lib` and `#routes` inside `src/lib`. It doesn't see an inline
  `import('#lib/…')` in a type position, so keep those out of `src/lib` in
  review.
