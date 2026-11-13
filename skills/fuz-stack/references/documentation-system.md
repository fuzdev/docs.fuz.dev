---
description: Docs sites — the pipeline, tomes, project setup, code examples in docs
---

# Documentation System

A `@fuzdev` docs site is **tomes** (hand-written pages) plus API docs
generated from the source's TSDoc. fuz_ui provides every component; a project
supplies its tomes, its branding, and the wiring below. Writing the TSDoc
itself is in ./tsdoc-comments.md.

## Pipeline

```
source files → svelte-docinfo plugin → virtual:svelte-docinfo (modules) ┐
                                                                         ├→ library_json_from_modules() → Library → tomes + API routes
package.json → vite_plugin_pkg_json  → virtual:pkg.json (pkg_json)       ┘
```

- **`svelte-docinfo`** analyzes the project's TS and Svelte in the
  _consumer's_ build and exposes the result as a virtual module. Its API is
  camelCase, since it serves the wider Svelte ecosystem. Set
  `onDuplicates: 'throw'` so a duplicate export name fails the build (the
  flat-namespace rule).
- **`vite_plugin_pkg_json`** (fuz_ui) exposes a publish-safe subset of
  `package.json`, keeping scripts and private config out of the client
  bundle.
- **`Library`** (fuz_ui, `library.svelte.ts`) wraps the two into `Module` and
  `Declaration` objects with lookups by path and by name.
- A project's own docs commit nothing but the glue module below. The
  analysis is never written to a file.

## Setup

fuz_template is the working example. Config lives in `vite.config.ts`: there
is no `svelte.config.js`.

**1. Plugins and ambient types.**

```typescript
// vite.config.ts
import svelte_docinfo from 'svelte-docinfo/vite.js';
import { vite_plugin_pkg_json } from '@fuzdev/fuz_ui/vite_plugin_pkg_json.ts';

export default defineConfig({
	plugins: [sveltekit({ /* … */ }), svelte_docinfo({ onDuplicates: 'throw' }), vite_plugin_pkg_json()]
});
```

```typescript
// src/app.d.ts
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference types="svelte-docinfo/virtual-svelte-docinfo.js" />
declare module 'virtual:pkg.json' {
	import type { PkgJson } from '@fuzdev/fuz_util/pkg_json.ts';
	const pkg_json: PkgJson;
	export default pkg_json;
}
```

A site that renders API docs installs `svelte-docinfo`, `@fuzdev/mdz`, and
`@fuzdev/fuz_code` as devDependencies. fuz_ui's docs components import all
three and declare none as a required dependency.

**2. The root layout sets site identity only.**

```svelte
<!-- fuz_template src/routes/+layout.svelte (style imports omitted) -->
<script lang="ts">
	import ThemeRoot from '@fuzdev/fuz_ui/ThemeRoot.svelte';
	import { SiteState, site_context } from '@fuzdev/fuz_ui/site.svelte.ts';
	import { logo_fuz_template } from '@fuzdev/fuz_ui/logos.ts';
	import type { Snippet } from 'svelte';
	import pkg_json from 'virtual:pkg.json';

	const { children }: { children: Snippet } = $props();

	// `glyph` and `repo_url` derive from `pkg_json`; `icon` stays explicit (structured `SvgData`).
	site_context.set(new SiteState({ icon: logo_fuz_template, pkg_json }));
</script>

<ThemeRoot>
	{@render children()}
</ThemeRoot>
```

**3. The library data is a shared module, provided per subtree.**

```typescript
// src/routes/library.ts
import { library_json_from_modules } from '@fuzdev/fuz_util/library_json.ts';
import { modules } from 'virtual:svelte-docinfo';
import pkg_json from 'virtual:pkg.json';

export const library_json = library_json_from_modules(pkg_json, modules);
```

```svelte
<!-- fuz_template src/routes/docs/+layout.svelte -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import Docs from '@fuzdev/fuz_ui/Docs.svelte';
	import { Library, library_context } from '@fuzdev/fuz_ui/library.svelte.ts';

	import { tomes } from './tomes.ts';
	import { library_json } from '#routes/library.ts';

	const { children }: { children: Snippet } = $props();

	const library = new Library(library_json);
	library_context.set(() => library);
</script>

<Docs {tomes}>
	{@render children()}
</Docs>
```

**4. Tomes.** `src/routes/docs/tomes.ts` exports `tomes: Array<Tome>`. Each
entry has a `slug` (the URL-safe route segment and lookup key), an optional
`title` for the display label, a `category` for the sidebar, the page's
`Component`, and its `related_tomes`, `related_modules`, and
`related_declarations`. Each tome is `src/routes/docs/{slug}/+page.svelte`:

```svelte
<script lang="ts">
	import TomeContent from '@fuzdev/fuz_ui/TomeContent.svelte';
	import TomeSection from '@fuzdev/fuz_ui/TomeSection.svelte';
	import TomeSectionHeader from '@fuzdev/fuz_ui/TomeSectionHeader.svelte';
	import { tome_get_by_slug } from '@fuzdev/fuz_ui/tome.ts';

	const tome = tome_get_by_slug('MyComponent'); // throws for a slug not in `tomes`
</script>

<TomeContent {tome}>
	<section><!-- introduction --></section>
	<TomeSection>
		<TomeSectionHeader text="Usage" />
		<!-- ... -->
	</TomeSection>
</TomeContent>
```

`TomeSectionHeader` picks its heading level from nesting depth.

**5. API routes.** `docs/api/+page.svelte` renders `<ApiIndex />`, and
`docs/api/[...module_path]/+page.svelte` renders
`<ApiModule {module_path} />` from `params.module_path ?? ''`.

## Traps

- **Don't build the `Library` in the root layout.** That pulls every
  analyzed module into the root chunk and constructs the `Library` on every
  page. Build it in the layout of the subtree that reads it.
- **`library_context.get()` throws when no ancestor set it, and only a
  render finds out.** Typecheck and tests pass; `gro build` fails at
  prerender. Every reader (`DeclarationLink`, `ModuleLink`, `TypeLink`,
  `DocsTertiaryNav`, an `Mdz` with `DocsLink` injected) needs a provider
  above it, so a page outside `/docs` that renders API links provides its
  own from the same `library.ts`. After moving a provider, run `gro build`.
- **A component with a `library` prop provides it to its subtree**
  (`ApiIndex`, `ApiModule`), so an aggregator can render another package's
  library without touching the site's context.
- **Widening the exposed `package.json` fields takes the same `keys` in two
  places**: `vite_plugin_pkg_json` and `library_json_from_modules`. A
  mismatch drops fields silently. Share one const between the call sites.
- **A library that one of its own dependencies imports needs a Vite
  alias.** fuz_ui's `dist` imports `@fuzdev/fuz_code/Code.svelte`, so on
  fuz_code's own docs site that name resolves through `node_modules`, to
  nothing or to a second, published copy with its own module state. Point it
  at the source:

  ```typescript
  // fuz_code vite.config.ts
  resolve: {
  	// fuz_ui imports `@fuzdev/fuz_code/Code.svelte`, an optional peer that isn't installed
  	// here, so point it at the source to share one `Code` with the site's `#lib` imports
  	alias: [
  		{
  			find: /^@fuzdev\/fuz_code\//,
  			replacement: fileURLToPath(new URL('./src/lib/', import.meta.url))
  		}
  	]
  },
  ```

  Use a plain Vite alias, not SvelteKit's deprecated `alias`, and only for a
  package whose module state the site shares with the dependency (contexts,
  components).

## Code examples in docs

An example teaches by its structure. The reader learns from the code, and
comments mark the beats.

- **A comment labels a section by concept**: `// one-shot hash`,
  `// streaming hasher`, not `// Call the hash function`.
- **A trailing comment carries a constraint or an alternative**, where the
  reader meets it: `const mac = keyed_hash(key, data); // key must be 32 bytes`.
- **Imports teach the API, names teach the data flow.** Comment only what the
  code can't say.
- **Realistic names and usage**, no `foo` and `bar`.
- Not: comments that restate the call, a comment longer than the code it
  annotates, sales prose ("blazing fast"), stating what the reader can see
  (`// returns a Uint8Array`).
