---
description: Svelte 5 runes, contexts, snippets, attachments
---

# Svelte 5 Patterns

The stack's deltas over Svelte's own docs, not a runes tutorial. Always runes
mode; no legacy syntax — `$:`, `export let`, `on:click`, slots, stores
(replaced by classes with `$state` fields), `use:` actions,
`<svelte:component this>` (components are dynamic by default),
`<svelte:self>` (import the component by name). Await expressions in
components (`experimental.async`) are not enabled in any stack repo.

## State Runes

### `$state()` vs `$state.raw()`

Only make a variable reactive when something reads it reactively (`$effect`,
`$derived`, template). Reactive state is `$state()`, including objects and
arrays mutated in place. `$state.raw()` is a **performance opt-out** for large
values only ever reassigned wholesale, never mutated (API responses). Mutating
a `raw` value silently does nothing, so `raw` also makes replace-don't-mutate
explicit — but choose by update pattern and size, not taste. Primitives:
`$state()`.

> Migration note: the earlier house style was `raw`-by-default, so existing
> fields across fuz_ui, fuz_app, and zzz are still `$state.raw()`. Write new
> code with `$state()`; migrate opportunistically, checking nothing depends on
> the raw non-reactivity.

`structuredClone`, `JSON.stringify` (including `toJSON()`), and `postMessage`
walk `$state()` proxies cleanly.

### `$state()!` for constructor-initialized fields

```typescript
export class ThemeState {
	theme: Theme = $state()!;
	constructor(options?: ThemeStateOptions) {
		this.theme = options?.theme ?? default_themes[0]!;
	}
}
```

Used across fuz_ui state classes and zzz Cell subclasses (older code spells
it `$state.raw()!`).

### `$state.snapshot()`

Deep plain copy (zzz Cell's `encode_property` returns `$state.snapshot(value)`
for serialization). Use it when handing a proxy to code doing reference-identity
checks on members; for plain serialization it's usually unnecessary. **Observed
quirk** (Svelte 5.56 + vite-plugin-svelte, unfiled):
`const r = $state.snapshot(x)` is silently elided to `const r = x` downstream of
`compileModule`; `return $state.snapshot(x)` and inline expression use work.

## Derived Values

`$derived` to compute from state — never `$effect` with assignment;
`$derived.by(() => ...)` for multi-step logic. Deriveds are writable (assign
to override). Derived objects aren't deeply reactive — in the rare case you
need that, create `$state` inside `$derived.by`.

### `$derived` in Classes

Mark `$derived` class properties `readonly` unless reassignment is intended.
Return `| undefined` rather than throwing from a `$derived` that templates
read — a throw render-crashes every consumer; guard at callsites:

```typescript
// zzz/thread.svelte.ts
readonly model: Model | undefined = $derived.by(() => this.app.models.find_by_name(this.model_name));
```

**Immutable data-wrapper classes use getters + memoization, not `$derived`.**
fuz_ui's `Library`/`Module`/`Declaration` were rewritten from `readonly x = $derived(…)` to plain getters with `#field ??=` caches:

```typescript
#repo_url: RepoUrl | undefined;
get repo_url(): RepoUrl {
	return (this.#repo_url ??= repo_url_parse(this.pkg_json.repository)!);
}
```

Reason: Svelte's server runtime only memoizes a `$derived` created during a
render, so a `Library` constructed at module scope (the normal docs-site shape)
rebuilds its whole tree on every property read during prerender. Rule: for an
immutable tree constructed at module scope, getters + private caches;
reactivity moves to the instance level (swap the `Library`, don't mutate it).
`$derived` fields are for instances whose dependencies change.

**Field-initializer order (plain classes).** Field initializers run before the
constructor body, so `readonly status = $derived(this.app.lookup(this.name))`
where `app`/`name` are constructor-assigned trips TS2729 "used before
initialization". Wrap in `$derived.by(() => …)`: TS doesn't descend into the
closure, and the read is lazy anyway. Cells don't hit this — `app` comes from
the base `Cell` constructor and schema fields use `$state()!`, which counts as
initialized in declaration order.

## Reactive Collections

`SvelteMap`/`SvelteSet` from `svelte/reactivity` are mutation-tracked
(standard `Map`/`Set` aren't); `$derived.by` over them recomputes on mutation
— fuz_ui's `DocsLinks` (`links: SvelteMap`, `fragments_onscreen: SvelteSet`).
For entity collections read by different lookups, maintain **secondary
indexes** — zzz's `IndexedCollection` (`indexed_collection.svelte.ts`):
`by_id: SvelteMap` plus `single_index(key)` / `where(key, value)` /
`derived_index(key)` (each a `$derived` rebuild, or kept in place for
immutable keys), `values` derived from `by_id`, so deriveds do `.get()`
lookups instead of array scans.

## Schema-Driven Reactive Classes

A serializable reactive class pairs `Foo`, `FooJson` (serialized shape), and
`FooOptions` (usually `Partial<FooJson>`), with `toJSON(): FooJson`. fuz_ui's
`ThemeState` is the simple exemplar (plain-interface `ThemeStateJson`); zzz's
Cell pattern upgrades the shape to a fuz_schema schema and automates hydration in a
`Cell` base class — same rune conventions (`$state()!` for schema fields,
`readonly $derived` for computed). See ./fuz-schema.md.

## Context Patterns

`create_context<T>()` from `@fuzdev/fuz_ui/context_helpers.ts` is the standard —
it predates Svelte's `createContext` and serves the same role over raw
`setContext`/`getContext`; don't "upgrade" it. Without a fallback, `get()`
throws if unset and `get_maybe()` returns `undefined`; with
`create_context(() => fallback)`, `get()` uses the fallback and `set()`'s value
is optional. Define in a shared module; a provider calls `.set()` at init,
consumers `.get()` at init:

```typescript
export const frontend_context = create_context<Frontend>();
export const section_depth_context = create_context(() => 0);
```

### Getter contexts

Contexts whose value may be reassigned wrap it in `() => T` so the context
reference stays stable — `theme_state_context` (`() => ThemeState` —
`theme_state` arrives as a reassignable prop), `library_context`
(`() => Library`). Set with a closure over reactive state; **read lazily** —
calling the getter once at init captures a snapshot and loses reactivity:

```typescript
theme_state_context.set(() => theme_state);
// consumer: .get() at init, then read lazily
const get_theme_state = theme_state_context.get();
const theme_state = $derived(get_theme_state());
```

Other lazy forms in real consumers: inside a template `{@const}`
(`MdzNodeView.svelte`) and as a prop default re-evaluated while the prop is
undefined (`const { value = get_theme_state() } = $props()` in
`ColorSchemeInput.svelte`). Components with an optional `library` prop resolve
prop-or-ancestor via
`set_library_context_with_fallback(() => library_prop, 'ApiIndex')` (fuz_ui's
`library.svelte.ts`) — prefers the prop, falls back to the ancestor, throws a
component-named error when neither exists. Direct value contexts
(`frontend_context`, `site_context`) are for values stable for the context's
lifetime. Inventory: grep `create_context<`.

## Snippets

Top-level snippets are referenceable from `<script>`; one that doesn't touch
component state can be exported from `<script module>`.

**Parameterized children**: `Dialog` passes a `DialogContext` back
(`{close, register_surface}` from `@fuzdev/fuz_ui/dialog.ts`; `register_surface`
marks click-outside-safe regions) —
`children: Snippet<[dialog: DialogContext]>`, rendered
`{@render children(context)}`. `ThemeRoot` passes multiple values
(`Snippet<[theme_state, style, theme_style_html]>`).

**Generics**: fuz_ui's only real `generics=` use is `Contextmenu.svelte`'s
tag-name generic (`generics="T extends string = 'span'"`); the generic
list-renderer shape (`items: T[]` + `item: Snippet<[T]>`) has no ecosystem
precedent yet.

**Optional / string-or-snippet props**:
`{#if snippet}{@render snippet()}{:else}…{/if}`; for `icon?: string | Snippet`
branch on `typeof` at render (`Card`, `Alert`; `Alert` also parameterizes with
`Snippet<[icon: string]>` to pass the resolved icon back).

## Each Blocks

Keyed — `{#each items as item (item.id)}` — with a unique key, never the
index. Don't destructure the item when something mutates it
(`bind:value={item.count}` needs the object reference).

## Effects

Effects are an escape hatch. Prefer `$derived` for computing; `{@attach}` for
syncing with external libraries or DOM; event handlers or function bindings
(`bind:value={get, set}`) for user interaction; `$inspect` for debug logging;
`createSubscriber` from `svelte/reactivity` for observing something external;
`untrack()` for reads that shouldn't create a dependency (config reads, breaking
bidirectional-sync loops). Don't wrap effect contents in `if (browser)` —
effects don't run on the server. Avoid updating `$state` inside effects.

- **Debugging**: `$inspect.trace(label)` as the first line of an `$effect` or
  `$derived.by` reports which dependency triggered a rerun.
- **Listeners**: `<svelte:window>`/`<svelte:document>` over `$effect` +
  `addEventListener`; element-scoped listeners go in `{@attach}` with `on()`.
- **`$effect.pre()`** runs before DOM updates — dev-mode prop validation
  (`if (DEV) $effect.pre(() => { if (!path && !href) throw … })` in
  `GithubLink.svelte`) and scroll management.
- **`effect_with_count(fn, initial = 0)`** from
  `@fuzdev/fuz_ui/rune_helpers.svelte.ts` passes a call count so the initial
  run can be skipped (`if (count === 1) return;` before persisting a change).

## Attachments

`{@attach}` replaces `use:` actions. Attachments live in `*.svelte.ts` and are
`(element) => cleanup | void`, typed as `Attachment` from `svelte/attachments`.
fuz_ui uses a **factory** — a function taking config and returning the
attachment (`{@attach my_attachment({...})}`):

```typescript
export const my_attachment =
	(options?: MyOptions): Attachment<HTMLElement | SVGElement> =>
	(el) => {
		// setup
		return () => { /* cleanup */ };
	};
```

| Pattern                       | When                                                  | Exemplar                 |
| ----------------------------- | ----------------------------------------------------- | ------------------------ |
| **Simple factory**            | Fire-once, no ongoing observation                     | `autofocus(options?)`    |
| **Lazy function** (`() => p`) | Reactive callbacks without rebuilding an observer     | `intersect(get_params)`  |
| **Direct params**             | Static config cached for later retrieval              | `contextmenu_attachment` |
| **Class method**              | Attachment shares reactive state with a class         | zzz `Scrollable`         |

- `autofocus` solves the HTML `autofocus` attribute not firing when an element
  mounts from a reactive `{#if}`.
- `intersect` takes `() => IntersectParamsOrCallback | null | undefined` (a bare
  callback or a params object: `onintersect`, `ondisconnect`, `count`,
  `options`) and runs `$effect` internally, so reactive callbacks update without
  recreating the IntersectionObserver (rebuilt only when options change, deep
  equality). Reach for the lazy form whenever the attachment builds an expensive
  observer from reactive values.
- `contextmenu_attachment(params)` caches menu params on the element's dataset;
  its cleanup removes the entry.

**Class-method attachments run in an effect context**, so one that reads
reactive state reruns when it changes — the reason to use this shape:

```typescript
// scrollable.svelte.ts (simplified)
export class Scrollable {
	scroll_y: number = $state(0);
	readonly scrolled: boolean = $derived(this.scroll_y > this.threshold);

	container: Attachment = (element) => {
		const onscroll = () => { this.scroll_y = element.scrollTop; };
		const cleanup = on(element, 'scroll', onscroll);
		onscroll(); // sync the initial value — the event won't fire on mount
		return cleanup;
	};

	// reruns whenever `this.scrolled` flips
	target: Attachment = (element) => {
		element.classList.toggle(this.target_class, this.scrolled);
		return () => element.classList.remove(this.target_class);
	};
}
// <div {@attach scrollable.container} {@attach scrollable.target}>
```

## Props

Treat props as though they will change: derive from them
(`let color = $derived(type === 'danger' ? 'red' : 'green')`), never assign once
at init. `let` (not `const`) when destructuring `$bindable()` props.

**Rest props**: intersect `SvelteHTMLElements['div']` (from `svelte/elements`,
not `HTMLAttributes<HTMLDivElement>`) with custom props for single-root
components, spread `{...rest}` and merge `class="card {rest.class}"`. When the
root tag varies (`Card` renders `<a>` or `<div>`), don't intersect both element
types — type shared rest props as `HTMLAttributes<HTMLElement>` and take
branch-specific attrs separately (`a_attrs?: SvelteHTMLElements['a']` — the
`*_attrs` shape used by `Card`, `Alert`, `Details`).

**`$props.id()`** gives an SSR-safe per-instance id for `id`/`for` pairs and
SVG `<defs>` references (`Sparkline`, `ProjectActivityChart`) — no hand-rolled
counters or `crypto` ids.

## Event Handling

Standard DOM syntax; conditional handlers pass `undefined` to remove
(`<svelte:window onkeydown={active ? on_window_keydown : undefined} />`).

**`on()` from `svelte/events`** for programmatic listeners in attachments,
`.svelte.ts`, and plain `.ts` — preserves ordering relative to delegated
declarative handlers and returns a cleanup. Always prefer it over
`addEventListener`, even outside components
(`on(element, 'wheel', onwheel, { passive: false })`).

**`swallow(event, immediate = true, preventDefault = true)`** from
`@fuzdev/fuz_util/dom.ts` combines `preventDefault()` and
`stopImmediatePropagation()` (`swallow(e, false)` → `stopPropagation` instead;
`swallow(e, true, false)` → no `preventDefault`). **Handling an event =
claiming it**: use `swallow` whenever you would call `preventDefault`; if a
parent must observe first, use the `capture` phase explicitly. Handlers that
only need `stopPropagation` (keeping game input from seeing chat keystrokes)
call `e.stopPropagation()` directly.

## Component Composition

`<script lang="ts" module>` for component-level exports — contexts and types
(`TomeSection.svelte` exports `register_section_header_context`,
`section_depth_context`, `section_id_context`).

## Runes in `.svelte.ts` Files

Prefer **classes** over module-level state: export a class, instantiate once
at the appropriate root, share via context.

**No module-level runes for shared state.** A module-level `$state` behind
getter/setter objects is a hidden global: it can't be reset per test, realm,
or session; its lifetime is the module's; a second instance is impossible;
and during SSR it leaks between requests. Same for factories closing over
`$state` and returning `{get query() {...}, set query(v) {...}}` proxies — a
common community pattern the stack doesn't use; rewrite as a class when
touching one.

```typescript
export const world_ui_context = create_context<WorldUiState>();
export class WorldUiState {
	show_map: boolean = $state(false);
	show_sidebar: boolean = $state(true);
}
// layout: world_ui_context.set(new WorldUiState()); descendants: world_ui_context.get()
```

Precedent: fuz_app's `SidebarState` (`ui/sidebar_state.svelte.ts`) with an
options-injected `enabled` getter override, provided by `AppShell.svelte` via
the getter context `sidebar_state_context`. For derived-heavy state, pair
writable `$state` fields with `readonly` deriveds — fuz_ui's `ApiSearchState`
(`api_search.svelte.ts`).

**Role-gated UI reads global grants.** Gate on `auth.is_admin` /
`auth.has_global_role(role)` from fuz_app's `AuthState`
(`ui/auth_state.svelte.ts`) — global grants only, the rule the server's role
gates apply — never on a scan of grant role names, which reads a grant scoped
to one resource as authority everywhere.

**Plain classes for imperative loops.** Canvas2D/WebGPU renderers, rAF loops,
and long-lived pointer listeners use a **plain class with no runes**, mounted
by a thin `.svelte` wrapper: private fields (`#hovered_id`) stay non-reactive
so rAF mutations don't schedule reruns; the wrapper binds dimensions, forwards
reactive sources via getter-backed options, and calls `destroy()` on unmount.

## CSS in Components

Minimal `<style>` blocks — many components have none; when one exists it holds
component-specific layout with all values from tokens (./css-patterns.md).
Use clsx-style arrays/objects in `class`, not the `class:` directive:

```svelte
<div class={['card', active && 'active', size]}></div>  <!-- not class="card" class:active -->
```

Theming and child-styling (`style:` on elements, `--prop={v}` on components,
`:global` as a last resort): ./css-patterns.md §Dynamic Theming.
