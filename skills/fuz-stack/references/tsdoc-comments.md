---
description: TSDoc style guide — tags, conventions, drift detection
---

# TSDoc Comment Style Guide

Doc comments are extracted by `svelte-docinfo` (TypeScript AST → per-declaration
metadata, exposed via `virtual:svelte-docinfo`) and rendered by `mdz`, which
autolinks backticked identifiers to API docs. **Write standard JSDoc with the
tags below, backtick identifier references, and the system handles the rest.**

## Writing Good Documentation

### Prioritize "why" over "what"

Don't restate the function name. Explain why this exists, what problem it
solves, what depends on it.

```typescript
// Weak — restates the name and types
/** Creates a new session. */

// Strong — purpose and rationale
/**
 * Predicts the next version by analyzing all changesets in a repo.
 *
 * Critical for dry-run mode accuracy — allows simulating publishes without
 * actually running `gro publish` which consumes changesets.
 *
 * @returns predicted version and bump type, or null if no changesets
 */
```

Name algorithms so readers can look them up ("Uses Kahn's algorithm with
alphabetical ordering within tiers for deterministic results") and give
rationale for non-obvious parameter choices. Multi-step workflows get a
numbered list (`1. **Sort** — …`), usually in a `@module` comment paired with a
`@see` cluster for pipeline stages.

### Conciseness — anti-patterns

A wrong or filler comment costs more than it adds. Four patterns recur in
audits:

**1. Helper-contract `@throws` at every callsite.** Document the contract on
the helper, not on every caller that delegates to it.

```typescript
// Weak — same internal invariant repeated on every create_* query
/** @throws Error if the INSERT does not return a row (failed `assert_row` invariant) */
// Weak — generic driver error true of every SQL call
/** @throws Error propagated from the underlying driver on syntax errors, ... */
// Strong — lives on assert_row itself
/** @throws Error if `row` is undefined */
```

**2. `@mutates X - <verb that mirrors the function name>`.** The tag earns its
line only when it surfaces _what would surprise a reader_: specific
tables/columns, cross-table cascades, fire-and-forget effects, context keys
consumed downstream, counter or rate-limiter state.

```typescript
// Weak — set_session_cookie already says it
/** @mutates `c` - writes the `Set-Cookie` header */

// Useful — names columns / cascades / side channels
/** @mutates `app_settings` row - sets `open_signup`, `updated_at`, `updated_by` */
/** @mutates `permit_offer` siblings - stamps `superseded_at` on every other pending offer for the tuple */
/** @mutates Hono context - sets `SESSION_COOKIE_EXPIRES_AT_KEY`, and may clear the session cookie */
```

**3. Duplicate sentence** — a `@returns` and a prose sentence saying the same
thing. Pick one.

**4. Filler.** `@param X - the X` (drop it, but keep a qualifier: format,
constraint, edge case); step-by-step narration of self-evident behavior; hedges
("simply", "just", "essentially", "should never happen"); "useful for" bullet
lists that repeat the description.

```typescript
// Weak — every line restates name + type
/**
 * @param specs - route specs to register
 * @param method - HTTP method
 * @returns matching route spec, or `undefined`
 */
// Strong — only the line that adds a qualifier
/** @param path - request path (exact or with concrete param values) */
```

### Voice

`@mutates` and `@throws` are terse fragments —
`@mutates <target> - <verb> <scope>`. Backticks on every
table/column/symbol/constant name are house style. Multi-paragraph descriptions
are _earned_ by security or invariant rationale (TOCTOU, fail-closed,
sibling-supersede, ordering, init order). A union type alias documents its
members as a bullet list of backticked literals with ` - description`.

### CLAUDE.md is a map; TSDoc is the detail

Non-obvious semantics — wire shape, invariants, ordering, failure modes —
belong on the symbol's TSDoc, not in a downstream CLAUDE.md. CLAUDE.md entries
are one-line pointers: symbol name plus a hook. CLAUDE.md prose drifts because
it lives far from the code; TSDoc on the symbol is visible during the edit.

## Tag Reference

### Main description

Complete sentences ending in a period; blank line between summary and detail.

### `@param`

`@param name - description` — hyphen separator, source parameter order,
identifiers backticked. Single-sentence descriptions are lowercase fragments
with no period (`@param foo - the value to clamp`); multi-sentence descriptions
are capitalized sentences with periods, continuation lines indented
(`@param exclude_dev - If true, excludes dev dependencies to break cycles.` then
` *   Publishing uses exclude_dev=true …`). Acronyms and proper names (CSS, BLAKE3,
Fisher-Yates) stay capitalized. A legacy sentence-style file may stay internally
consistent until touched.

`@param options.field - description` documents a sub-property. Matching is by
parameter name, so destructured params (`fn({a, b}: T)` — TS names it `__0`)
can't be documented; name the parameter if it needs docs.

### `@returns`

`@returns` (not `@return`); same capitalization rules as `@param`. For async
functions describe what the `Promise` resolves to, not the `Promise`.

### `@throws`

`@throws ErrorType description` — type as first word, even if just `Error`
(`@throws TaskError if production cycles detected`). svelte-docinfo always
reads the unbraced first word as the type, so a description-only
`@throws if …` records `if` as the type, and a lone `@throws Error` (no
description) records no type. `{ErrorType}` parses exactly but isn't house
style.

### `@example`

Fenced code blocks (mdz renders examples as markdown); show the common case
first, additional `@example` tags for variants; `// =>` or `// →` comments for
return values — a bare call with no visible output teaches nothing. Constants
and simple predicates don't need examples. Interface fields can carry inline
`@example` tags too.

````typescript
/**
 * @example
 * ```typescript
 * mdz_from_tsdoc('{@link SomeType}')
 * // → '`SomeType`'
 * ```
 */
````

### `@deprecated`

Rarely used — the no-backwards-compatibility policy means deprecated code is
deleted. When used, include the backticked replacement.

### `@see`

- **External URLs** — `{@link url|text}` for display text, bare URL when
  self-explanatory
- **Sibling modules** — the lib-relative module path, backticked
  (`` @see `actions/action_rpc.ts` for the JSON-RPC dispatcher ``); see
  [Module path format](#module-path-format)
- **Identifiers** — backticked, not `{@link}`
  (`` @see `each_concurrent` for the side-effect variant ``)

### `@since`

Parsed, not currently used.

### `@default`

Documents defaults for interface fields and component props; place it on the
field's own doc comment:

```ts
/**
 * How the content is aligned in the viewport.
 * @default 'center'
 */
align?: DialogAlign;
```

### `@internal`

Not-stable public API (standard TSDoc semantics). A marker, not an exclusion —
extracted as `internalMessage`, the declaration stays fully documented so
consumers _can_ badge or filter (fuz_ui's `DeclarationDetail` shows an
`internal` badge plus the message; nothing filters on it yet). Trailing prose is
kept: say who uses it or why it's internal. Use it for power-user-importable
internals that should stay documented (deep extractor modules, orchestration
seams); to remove a symbol from docs entirely, use `@nodocs`.

```typescript
/** @internal Used by `analyzeCore` and the test harnesses — not stable API. */
```

### `@nodocs` (non-standard)

Drops the declaration from analysis output and duplicate checking. Dominant
use: exported-but-internal plumbing forced by the no-barrels convention (mdz
is the heaviest user); also build-system internals (Gro `Args`/`task`, `gen`
exports) and flat-namespace collisions.

```typescript
/** @nodocs */
export const Args = s.object({...});
```

**Never `@nodocs` a symbol external consumers import.** Rename one side of the
collision instead (SKILL.md §Flat Namespace) — hiding the primary surface also
hides it from generated docs and tomes.

### `@mutates` (non-standard)

`@mutates target - description`. Everything before the first ` - ` is the
target — a parameter, a path (`this.field`), or a multi-word reference
(`` `permit_offer` siblings ``); backticks in the target are stripped by the
parser. Same capitalization as `@param`. Document mutations visible outside the
function; locals, closure state, and pull-based caches are out of scope. A
bare `` @mutates `target` `` with no description parses but is discouraged —
if the mutation needs no description, the tag adds little.

**On class methods**, stateful classes mutate by design; tagging every
`add`/`remove`/`clear`/`set` is noise. `@mutates this[.field] - description`
earns its line when the mutation isn't obvious from the name:

- **Cross-field invalidation** — `Logger.clear_colors_override` also
  invalidates four cached prefix strings
- **Cross-resource side effects** — `attach_error_handler` also subscribes to
  `process.uncaughtException`
- **Implicit tracking** — `ProcessRegistry.spawn` also records the child for
  `despawn_all`
- **Mutation behind a query-shaped name** — `LruMap.get` reorders the recency list

Ranking when warranted: `@mutates this.field - description` >
`@mutates this - description` > bare > omit (correct when the name says it all).

```typescript
/**
 * Shuffles an array in place using the Fisher-Yates algorithm.
 * @mutates array - randomly reorders elements in place
 */
```

### `@module`

Module-level doc comment, tag at the end of the block; works in `.ts` and in a
`.svelte` component's `<script>`. Prioritize it for modules with design
rationale, pipeline stages, or cross-references; `##` headings (`## Design`,
`## Behavioral notes`) for complex modules.

### Tag order

description → `@param` (source order) → `@returns` → `@mutates` → `@throws` →
`@example` → `@deprecated` → `@see` → `@since` → `@default` → `@internal` →
`@nodocs`

### Where a tag has no effect

The parser discards these (svelte-docinfo emits `misplaced_tag` for the
overload and `@module` cases, but no consumer imports `diagnostics` today):

- Symbol-scope tags (`@example`, `@deprecated`, `@internal`, `@since`, `@see`,
  `@throws`, `@mutates`, `@default`, `@nodocs`) on a **non-primary overload
  signature** — put them on the first overload signature, whose JSDoc documents
  the symbol (`@param`/`@returns` are per-signature)
- `@nodocs` inside a `@module` comment — use the analyzer's `exclude` patterns
  to skip a module
- `@nodocs` on a member (class, interface, type alias, enum) or a component
  prop — still emitted, no warning; it applies to top-level declarations and
  export statements
- `@default` on a top-level function (dropped silently) — it lands on
  variables, members of interfaces/type aliases/classes (callable members
  included), and component props

`@defaultValue` / `@defaultvalue` / `@return` do take effect — they parse as
synonyms of `@default` / `@returns` — but aren't house style.

## Inter-linking with mdz

Backticked identifiers autolink; unmatched references fall through to plain
`<code>`. Autolinking applies in main descriptions, `@param`, `@returns`,
`@example`, and `@see`; `@throws` and `@mutates` render as plain text, so
backticks there display literally (still house style — consistency wins).
References are case-sensitive (`` `library` `` won't match `Library`).

**Wrap every mention of an exported identifier, module filename, or type name
in backticks** — functions, types, classes, module paths (`module_helpers.ts`,
`actions/composables.ts`, `DocsLink.svelte`), tag names in prose (`@param`),
enums and constants.

### Module path format

Module references must use the path `Library.module_by_path` indexes: the
`src/lib/`-relative path with the source extension. Anything else silently
falls through.

```typescript
// GOOD
/** @see `actions/action_rpc.ts` for the JSON-RPC dispatcher */
// BAD — `./` prefix
/** … from `./action_rpc.js` … */
// BAD — `.js` runtime extension
/** @see `action_rpc.js` */
// BAD — bare filename of a nested module (breaks when the file is at actions/action_rpc.ts)
/** @see `action_rpc.ts` */
// BAD — redundant `src/lib/`
/** @see `src/lib/actions/action_rpc.ts` */
```

Top-level files match by bare filename (`tome.ts`); nested files need the
sub-path. When in doubt, include the directory. The canonical format is
documented on `Module.path` in fuz_ui's `module.svelte.ts`.

**Never reference outside the repo from TSDoc** — the published API docs stand
alone, so an out-of-repo path is a dead link (./path-references.md §4).

### Internal paths

`/word` after whitespace autolinks as internal navigation — including HTTP
routes, which then break prerender. Backtick them:

```typescript
/** BAD — mdz autolinks /login and breaks prerender: - POST /login */
/** GOOD — renders as <code>: - `POST /login` */
```

## Svelte components

Document props inline in the `$props()` type annotation. Obvious props with no
default need no comment; focus on behavior, constraints, and non-obvious
defaults.

```svelte
<script lang="ts">
	// fuz_ui Dialog.svelte (abridged)
	const {
		show = true,
		dismissable = true,
		onbeforeclose,
		children,
		...rest
	}: Omit<SvelteHTMLElements['dialog'], 'children' | 'onclose'> & {
		/**
		 * Whether the dialog is shown. When the `<dialog>` mounts it opens via
		 * `showModal()`; when it unmounts it closes.
		 * @default true
		 */
		show?: boolean;
		/**
		 * Whether clicking outside the content closes the dialog. `Escape`
		 * closes it regardless of this.
		 * @default true
		 */
		dismissable?: boolean;
		/**
		 * Called before a user-initiated close. Return `false` to veto.
		 */
		onbeforeclose?: () => boolean | void;
		/** Rendered inside the overlay. Receives the `DialogContext` (e.g. `{close}`). */
		children: Snippet<[dialog: DialogContext]>;
	} = $props();
</script>
```

## Drift — Correctness Over Coverage

**A wrong doc comment is worse than a missing one** — readers trust it and
propagate the mistake. When refactoring a public API, re-read the TSDoc on
every touched symbol. Common drift:

- **`@throws` vs return shape** — declares `@throws` but the body returns
  `null`/`undefined` on that path (or vice versa); highest-value because
  callers branch on it
- **Signature changed** — `@param` order or names no longer match
- **Return shape widened** — new fields on a returned type go undocumented
- **Error semantics tightened** — a thrown class was replaced or an
  `error.data.reason` added, but `@throws` names the old one
- **Cross-refs rotted** — `@see some_helper.ts` points at a moved or deleted file
