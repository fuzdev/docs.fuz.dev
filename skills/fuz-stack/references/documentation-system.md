---
description: Docs pipeline — Tome system, layout architecture, project setup
---

# Documentation System

Pipeline, Tome system, and project setup for `@fuzdev` docs sites. TSDoc
authoring: ./tsdoc-comments.md.

## Pipeline

```
source files → svelte-docinfo plugin → virtual:svelte-docinfo (modules) ┐
                                                                         ├→ library_json_from_modules() → Library → Tome pages + API routes
package.json → vite_plugin_pkg_json  → virtual:pkg.json (pkg_json)       ┘
```

- **`svelte-docinfo`** (standalone package) analyzes TS/JS/Svelte via the
  TypeScript compiler API: declarations, TSDoc tags, re-exports merged into
  `alsoExportedFrom`, module sorting, and an opt-in flat-namespace duplicate
  check (`onDuplicates`, which fuz projects set to `'throw'`). Its API
  is camelCase (it targets the broad Svelte ecosystem). Its Vite plugin
  exposes `modules` and `diagnostics` (a union of kinds: tag problems like
  `misplaced_tag`, `duplicate_declaration`, `alias_lost`, transform and
  resolver failures; no repo consumes it yet) as `virtual:svelte-docinfo`.
  fuz_ui depends on it as a dev dependency for types and a few helpers; the
  per-project analysis runs in each _consumer's_ build.
- **`vite_plugin_pkg_json`** (fuz_ui) curates `package.json` to the
  publish-safe `PkgJson` subset as `virtual:pkg.json`, keeping `scripts`,
  `dependencies`, and private config out of the client bundle (and avoiding
  SvelteKit's `server.fs.allow` tripping on a cold HMR reload).
- **`library_json_from_modules(pkg_json, modules)`** (`@fuzdev/fuz_util/library_json.ts`)
  pairs them into the raw `LibraryJson`; **`Library`** (fuz_ui,
  `library.svelte.ts`) wraps it into `Module` / `Declaration` instances with
  lookup maps (`module_by_path`, `declaration_by_name`) and
  `search_declarations(query)`.
- **Rendering**: tomes + generated API pages. Backticked identifiers in TSDoc
  autolink because fuz_ui injects `DocsLink` as mdz's inline-code renderer,
  resolving against the `Library` (./mdz.md).

There is no committed `library.gen.ts`/`library.json`; the only committed
artifact is the hand-written `src/routes/library.ts` glue.

## Tome System

A **Tome** is a documentation page (`@fuzdev/fuz_ui/tome.ts`):

```typescript
interface Tome {
	slug: string; // URL segment + lookup key
	title?: string; // display label; falls back to slug
	category: string; // sidebar grouping (fuz_ui: guide/helpers/components; fuz_css: guide/systems/styles)
	Component: Component<any, any>;
	related_tomes: Array<string>; // other tome slugs
	related_modules: Array<string>; // source files in /docs/api/ ('theme_state.svelte.ts')
	related_declarations: Array<string>; // exports in API docs ('ThemeRoot')
}
```

Helpers from `tome.ts`: `tome_get_by_slug(slug)` (throws if missing),
`tome_to_pathname(tome, docs_path?, hash?)`, `tome_to_title(tome)`,
`tomes_context` (`() => Map<string, Tome>`, set by `Docs`), `tome_context`
(`() => Tome`, set by `TomeContent`). From `docs_helpers.svelte.ts`:
`docs_slugify(name)` (preserves case), `docs_links_context` (`DocsLinks`
section navigation), `DOCS_PATH_DEFAULT` / `DOCS_PATH` / `DOCS_API_PATH`.

## Setting Up Docs in a Project

Examples use the `#routes`/`#lib` subpath imports, declared in `package.json`
`imports` (SvelteKit 3 has no `$lib`). SvelteKit's own config goes in the
`sveltekit({...})` plugin options in `vite.config.ts` (there's no
`svelte.config.js`).

### 1. Vite plugins and ambient types

```typescript
// vite.config.ts
import svelte_docinfo from 'svelte-docinfo/vite.js';
import { vite_plugin_pkg_json } from '@fuzdev/fuz_ui/vite_plugin_pkg_json.ts';
export default defineConfig({
	plugins: [sveltekit(), svelte_docinfo({ onDuplicates: 'throw' }), vite_plugin_pkg_json()]
});
```

**Vite self-alias, for a library that a dependency imports back.** When an
installed dependency imports the library being built (fuz_ui's `dist` imports
`@fuzdev/fuz_code/Code.svelte` and `@fuzdev/mdz/mdz_contexts.ts`), it resolves
the name through `node_modules` — to nothing, or to a separate published copy —
never to the source being built. So the site build either fails or, when the
published copy is installed as a peer, silently runs two module instances (which
breaks shared contexts). Point the name at the source with a plain Vite alias —
not SvelteKit's deprecated `alias` — and only where a dependency actually imports
it (`grep -rl "@fuzdev/<self>/" node_modules/@fuzdev/*/dist`):

```typescript
// fuz_code's vite.config.ts (`fileURLToPath` from `node:url`)
resolve: {
	// fuz_ui's `dist` imports `@fuzdev/fuz_code/Code.svelte`, so point it at the source
	alias: [
		{
			find: /^@fuzdev\/fuz_code\//,
			replacement: fileURLToPath(new URL('./src/lib/', import.meta.url))
		}
	]
}
```

```typescript
// src/app.d.ts
/// <reference types="svelte-docinfo/virtual-svelte-docinfo.js" />
declare module 'virtual:pkg.json' {
	import type { PkgJson } from '@fuzdev/fuz_util/pkg_json.ts';
	const pkg_json: PkgJson;
	export default pkg_json;
}
```

**Footgun**: if a project widens the exposed `package.json` fields, the
**same `keys` set must reach both** `vite_plugin_pkg_json` and
`library_json_from_modules()` — a mismatch silently drops fields. Wire a shared
const (e.g. `src/routes/pkg_json_keys.ts`) to both callsites; no repo widens
today.

### 2. Root layout — site identity only

The root `+layout.svelte` wraps every route, so it sets only `site_context`
(icon, glyph, repo url — `glyph`/`repo_url` derive from `virtual:pkg.json`).
**Do not build the `Library` here** — that pulls the analyzed `modules` into
the root chunk and instantiates `Library` on every page.

```svelte
<script lang="ts">
	import pkg_json from 'virtual:pkg.json';
	const { children }: { children: Snippet } = $props();
	site_context.set(new SiteState({ icon: logo_my_project, pkg_json }));
</script>

<ThemeRoot>{@render children()}</ThemeRoot>
```

### 3. Library data — shared module, provided per subtree

```typescript
// src/routes/library.ts — module-level const: lazy on first import, shared by importers
import { library_json_from_modules } from '@fuzdev/fuz_util/library_json.ts';
import { modules } from 'virtual:svelte-docinfo';
import pkg_json from 'virtual:pkg.json';
export const library_json = library_json_from_modules(pkg_json, modules);
```

```svelte
<!-- src/routes/docs/+layout.svelte — covers all /docs/* -->
<script lang="ts">
	import Docs from '@fuzdev/fuz_ui/Docs.svelte';
	import { Library, library_context } from '@fuzdev/fuz_ui/library.svelte.ts';
	import { tomes } from '#routes/docs/tomes.ts';
	import { library_json } from '#routes/library.ts';
	const { children }: { children: Snippet } = $props();
	const library = new Library(library_json);
	library_context.set(() => library);
</script>

<Docs {tomes}>{@render children()}</Docs>
```

`library_context` holds a getter (`() => Library`). `library_context.get()`
**throws when unset, and only at SSR/prerender (`gro build`)** — not in
typecheck or tests — so it must be set by a common ancestor of every reader
(`DeclarationLink`, `ModuleLink`, `TypeLink`, `DocsTertiaryNav`, `Mdz` with
an injected `DocsLink`). Any consumer outside `/docs` (an `/about` page, a
`/skills` subtree) provides its own from the same `library.ts`. Components
taking a `library` prop project it for their subtree — `ApiIndex`/`ApiModule`
resolve prop-or-ancestor via `set_library_context_with_fallback` — so an aggregator can render a foreign
library without touching the site-level context. After moving any provider,
verify with `gro build`.

### 4. Tomes registry

`src/routes/docs/tomes.ts` exports `tomes: Array<Tome>`, each importing its
`+page.svelte` as `Component`.

### 5. Tome pages

Each tome is `src/routes/docs/{slug}/+page.svelte`:

```svelte
<script lang="ts">
	const tome = tome_get_by_slug('MyComponent');
</script>

<TomeContent {tome}>
	<section><!-- introduction --></section>
	<TomeSection>
		<TomeSectionHeader text="Usage" />
		<!-- ... -->
	</TomeSection>
</TomeContent>
```

`TomeSectionHeader` picks h2/h3/h4 from nesting depth; sections are tracked by
IntersectionObserver for the right-sidebar TOC.

### 6. API routes

`docs/api/+page.svelte` renders `<ApiIndex />`;
`docs/api/[...module_path]/+page.svelte` renders
`<ApiModule module_path={params.module_path ?? ''} />`.

## Layout and Components

`<Docs>` is a three-column responsive layout: `DocsPrimaryNav` (top bar —
breadcrumb, nav dialog toggle), `DocsSecondaryNav` (left — tomes by category),
`main`, `DocsTertiaryNav` (right — section headers). Right collapses below
~1000px, left below ~800px, both into a dialog from the top bar.

Contexts: `library_context` (`() => Library`, per docs-consuming subtree, never
root), `tomes_context` (set by `Docs`), `tome_context` (set by `TomeContent`),
`docs_links_context` (`DocsLinks`, fragment tracking).

Components a consumer wires: `Docs`, `TomeContent`, `TomeSection`,
`TomeSectionHeader`, `ApiIndex`, `ApiModule`, `LibrarySummary` (metadata
card). The full component
set is fuz_ui inventory (its `CLAUDE.md`). fuz_ui defines everything; other
projects import unchanged — only tomes, categories, and branding differ.

## README code examples

Code examples teach by structure, not by explanation: the reader learns from
the code, and comments provide narrative beats rather than restating it.

- **Comments as section labels** — name the conceptual category of what
  follows, not the syntax: `// one-shot hash`, `// streaming hasher` — not
  `// Call the hash function`.
- **Trailing comments for constraints and alternatives** — where the reader
  meets them: `const mac = keyed_hash(key, data); // key must be 32 bytes`.
- **Let code be self-documenting** — imports teach the API, names teach data
  flow, calls teach usage; comments carry only what code can't say
  (constraints, alternatives, non-obvious behavior).
- **Real patterns, not contrived demos** — realistic names and usage, no
  `foo`/`bar`.

Anti-patterns: comments that restate the function name; jargon headers
(`### Node.js — zero-config`); inline comments longer than the code they
annotate; sales-pitch prose ("blazing fast"); stating what the reader can
see (`// returns a Uint8Array`). In-code doc comments: ./tsdoc-comments.md.
