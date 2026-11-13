---
description: Svelte 5 in the stack — state, deriveds, contexts, snippets, attachments, events
---

# Svelte 5 Patterns

The stack's deltas over Svelte's own docs, not a runes tutorial. Runes mode
everywhere and no legacy syntax: no `$:`, `export let`, `on:click`, slots,
stores, `use:` actions, or `<svelte:component>`. Shared state is a class with
rune fields, provided through context.

## State

- **`$state.raw()` for a value that is only ever reassigned; `$state()` for
  an object or array mutated in place** (`push`, a property write, `bind:` on
  a property). Mutating a raw value changes it and updates nothing. For a
  primitive the two behave the same.
- **A field assigned in the constructor is declared with `!`**:

  ```typescript
  // fuz_ui theme_state.svelte.ts
  export class ThemeState {
  	theme: Theme = $state.raw()!;
  	color_scheme: ColorSchemePreference = $state.raw()!;

  	constructor(options?: ThemeStateOptions) {
  ```

- **`JSON.stringify` and `toJSON()` walk a `$state()` proxy. `structuredClone`,
  `postMessage`, and IndexedDB throw on one**: pass `$state.snapshot(value)`.
- **`const r = $state.snapshot(x)` loses the clone in server output** (seen on
  Svelte 5.57): the compiler emits `const r = x` there. Client output and
  expression positions (`return $state.snapshot(x)`) are fine.

## Deriveds

- **`readonly` on a `$derived` class field** unless reassigning it is the
  point.
- **A `$derived` that markup reads returns `undefined`; it doesn't throw.** A
  throw crashes every consumer's render. Guard at the call site.

  ```typescript
  // zzz thread.svelte.ts
  readonly model: Model | undefined = $derived.by(() =>
  	this.app.models.find_by_name(this.model_name)
  );
  ```

- **A `$derived` field that reads a field declared without an initializer
  uses `$derived.by(() => …)`.** A field assigned only in the constructor, or
  a parameter property, trips TS2729 "used before initialization" in a direct
  `$derived(this.app.lookup(this.name))`. A field declared `= $state.raw()!`
  counts as initialized. Both forms read lazily at runtime; only the
  typecheck differs.
- **A `$derived` belongs to the effect that was running when it was created.**
  State built during a component's init, in `onMount`, or in an `$effect`
  stops recomputing when that component or effect is destroyed, and reads
  return the last value (Svelte warns `derived_inert` in DEV). State that must
  outlive its creator is constructed outside any effect: an event handler, an
  async continuation, or a never-destroyed `$effect.root` (zzz's
  `create_detached`).
- **An immutable tree built at module scope uses getters with private
  caches, not `$derived`.** Svelte's server runtime memoizes a `$derived` only
  when it is created during a render, so a module-scope instance recomputes
  on every read while prerendering. fuz_ui's `Library`, `Module`, and
  `Declaration`:

  ```typescript
  #repo_url: Url | undefined;
  get repo_url(): Url {
  	return (this.#repo_url ??= repo_url_parse(this.pkg_json.repository)!);
  }
  ```

  Reactivity moves up a level: swap the instance, don't mutate it.

## State classes

- **No module-level runes for shared state.** A module-level `$state` behind
  getters is a hidden global: it can't be reset per test or session, a second
  instance is impossible, and under SSR it leaks between requests. Export a
  class, instantiate it at the right root, and share it by context:

  ```typescript
  export const world_ui_context = create_context<WorldUiState>();
  export class WorldUiState {
  	show_map: boolean = $state.raw(false);
  	show_sidebar: boolean = $state.raw(true);
  }
  // layout: world_ui_context.set(new WorldUiState()); descendants: world_ui_context.get()
  ```

- **A serializable class pairs `Foo`, `FooJson`, and `FooOptions`** (usually
  `Partial<FooJson>`), with `toJSON(): FooJson`. fuz_ui's `ThemeState` is the
  small exemplar. zzz's Cells make `FooJson` a fuz_schema schema and hydrate
  from it in a base class (see ./fuz-schema.md).
- **Collections that change are `SvelteMap` and `SvelteSet`** from
  `svelte/reactivity`. A collection read by several lookups keeps secondary
  indexes beside the primary map, so a derived does a `.get()` and not an
  array scan (zzz's `IndexedCollection`).
- **An imperative loop is a plain class with no runes**, mounted by a thin
  component: a canvas renderer, a `requestAnimationFrame` loop, a long-lived
  pointer tracker. Its fields stay non-reactive so per-frame writes schedule
  nothing, and the wrapper calls its `destroy()` on unmount.
- **Role-gated UI reads global grants**: `auth.is_admin` or
  `auth.has_global_role(role)` on fuz_app's `AuthState`, the rule the
  server's role gates apply. Never scan grant role names, which reads a
  grant scoped to one resource as authority everywhere.

## Contexts

`create_context<T>()` from `@fuzdev/fuz_ui/context_helpers.ts` is the one way
to define a context; nothing calls `setContext` or Svelte's `createContext`
directly. Without a fallback, `get()` throws when unset and `get_maybe()`
returns `undefined`. With `create_context(() => fallback)`, `get()` returns
the fallback. A library below fuz_ui in the dependency order carries its own
copy of the helper, as mdz does.

```typescript
export const frontend_context = create_context<Frontend>();
export const section_depth_context = create_context(() => 0);
```

**A context whose value can be replaced holds a getter**, `() => T`, so the
context itself never changes (`theme_state_context`, `library_context`). Read
it lazily. Calling the getter once at init captures a snapshot:

```typescript
theme_state_context.set(() => theme_state);
// a consumer
const get_theme_state = theme_state_context.get();
const theme_state = $derived(get_theme_state());
```

## Snippets and each blocks

- **`children` can take arguments.** fuz_ui's `Dialog` hands its content a
  `DialogContext`: `children: Snippet<[dialog: DialogContext]>`, rendered with
  `{@render children(context)}`.
- **A generic list component** declares `generics="T"` on the script tag and
  takes snippets typed over `T`, such as `Snippet<[item: T]>`: zzz's
  `SortableList`, fuz_ui's `RadioMenu`, fuz_app's `Datatable`.
- **A tree renders through recursive snippets, not a recursive component**,
  so the whole tree is one component instance and one set of context reads
  (mdz's `MdzNodeView`).
- **`icon?: string | Snippet`** branches on `typeof` at the render site
  (`Card`, `Alert`).
- **Every `{#each}` is keyed** (the lint config requires it), by identity:
  `(item.id)`. The index is a key only for a positional list that never
  reorders. Don't destructure an item that something binds to.

## Effects

An effect is the last resort. Compute with `$derived`, sync an element with
`{@attach}`, react to the user in an event handler.

- No `if (browser)` inside an effect: effects don't run on the server.
- `<svelte:window>` and `<svelte:document>` for global listeners, not an
  effect around `addEventListener`.
- `$effect.pre` for DEV-only prop validation (`GithubLink.svelte`).
- `effect_with_count(fn)` from `@fuzdev/fuz_ui/rune_helpers.svelte.ts` passes
  a run count, so a handler can skip the first run
  (`if (count === 1) return;`) before persisting a change.
- **Measure with a binding**: `bind:clientWidth`, `bind:clientHeight`, or
  `bind:contentRect`, not `bind:this` plus a `ResizeObserver` in an effect.

## Attachments

`{@attach}` replaces `use:`. An attachment lives in a `*.svelte.ts` module and
is exported as a factory that takes its config:

```typescript
// fuz_ui autofocus.svelte.ts
export const autofocus =
	(options?: FocusOptions): Attachment<HTMLElement | SVGElement> =>
	(el) => {
		el.focus({ focusVisible: true, ...options });
	};
```

- **An attachment that builds an expensive observer takes a getter**, as
  `intersect(() => params)` does, and reads it in an effect of its own.
  Reactive callbacks then update without rebuilding the observer.
- **An attachment runs in an effect**, so one that reads reactive state
  reruns when it changes. A class exposes attachments as fields to share its
  state with the element:

  ```typescript
  // zzz scrollable.svelte.ts (abridged)
  export class Scrollable {
  	target_class: string = $state.raw()!;
  	threshold: number = $state.raw()!;
  	scroll_y: number = $state.raw(0);
  	readonly scrolled: boolean = $derived(this.scroll_y > this.threshold);

  	container: Attachment = (element) => {
  		const onscroll = () => {
  			this.scroll_y = element.scrollTop;
  		};
  		const cleanup = on(element, 'scroll', onscroll);
  		onscroll(); // the event won't fire on mount
  		return cleanup;
  	};

  	// reruns when `scrolled` flips
  	target: Attachment = (element) => {
  		if (this.scrolled) {
  			element.classList.add(this.target_class);
  		} else {
  			element.classList.remove(this.target_class);
  		}
  		return () => element.classList.remove(this.target_class);
  	};
  }
  // <div {@attach scrollable.container} {@attach scrollable.target}>
  ```

## Props

- **Treat a prop as a value that will change.** Derive from it; never read it
  once at init.
- **Rest props are typed from `SvelteHTMLElements['div']`** (`svelte/elements`),
  intersected with the component's own props, spread as `{...rest}`, with the
  class merged as an array (`class={['card', rest.class]}`), since a caller
  may pass an array or object.
- **When the root tag varies**, don't intersect both element types. Type the
  shared rest as `HTMLAttributes<HTMLElement>` and take each branch's own
  attributes as an `*_attrs` prop: `Card`'s `a_attrs?: SvelteHTMLElements['a']`,
  `Alert`'s `button_attrs` and `div_attrs`.
- **`$props.id()`** for `id`/`for` pairs and SVG `<defs>` references. No
  counters, no `crypto` ids.
- Props are documented inline in the `$props()` type (see
  ./tsdoc-comments.md).

## Events

- **`on()` from `svelte/events` for a DOM listener added in code**: an
  attachment, a `.svelte.ts` class, a helper. It keeps ordering with
  Svelte's delegated handlers and returns its cleanup. This is the form for
  new code; some listeners still call `addEventListener`. Non-DOM targets (an
  `AbortSignal`, a `WebSocket`) take `addEventListener`.
- **Handling an event claims it.** `swallow(event)` from
  `@fuzdev/fuz_util/dom.ts` calls `preventDefault()` and
  `stopImmediatePropagation()`; reach for it where a handler would call
  `preventDefault` on a key or pointer event that other handlers could also
  see. `swallow(e, false)` uses `stopPropagation` in place of the immediate
  form, and `swallow(e, true, false)` leaves the default. A parent that must
  see the event first listens in the capture phase. A form's `onsubmit` just
  calls `preventDefault()`.
- A conditional handler passes `undefined` to detach:
  `onkeydown={active ? on_keydown : undefined}`.

## Styling

Component CSS, conditional classes, the theming API, and the scoped-selector
trap are in ./css-patterns.md §Components.
