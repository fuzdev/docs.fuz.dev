---
description: fuz_util — Result, error helpers, Logger, Timings, concurrency, DAG, type utilities
---

# fuz_util

Shared utilities from `@fuzdev/fuz_util` (zero deps; `@fuzdev/fuz_schema` and
`esm-env` are required peers). Modules named below are paths under the package
(`@fuzdev/fuz_util/result.ts`).

## Result (`result.ts`)

`Result<TValue, TError>` is `({ok: true} & TValue) | ({ok: false} & TError)`:
properties sit directly on the result, not under `.value`/`.error` wrappers.

```typescript
const parse_config = (text: string): Result<{ value: Config }, { message: string }> => {
	try {
		return { ok: true, value: JSON.parse(text) };
	} catch (e) {
		return { ok: false, message: to_error_message(e) };
	}
};

const result = parse_config(text);
if (result.ok) use(result.value); else log.error(result.message);
const config = unwrap(parse_config(text)); // throws ResultError if !ok — requires the {value} convention
```

Helpers: `OK` / `NOT_OK` (frozen `{ok: true}` / `{ok: false}` for results with
no data); `unwrap()` (returns `.value`, throws `ResultError` carrying
`.result`); `unwrap_error()` (returns the whole narrowed `{ok: false} & TError`,
throws if ok).

Conventions: spread data directly (`{ok: true, ...data}`); use `{value}` when
`unwrap()` is expected and `{message}` for errors; prefer `Result` for
expected failures (parsing, validation), exceptions for programmer mistakes
and system failures. In tests, `assert.ok(result.ok)` narrows the union.

## Error helpers (`error.ts`)

- **`to_error_message(value, fallback?)`** — the standard `catch (err)`
  normalizer: `value.message` for `Error`, else `fallback ?? String(value)`
- **`unreachable(value: never)`** — exhaustive-match guard throwing
  `UnreachableError` (catchable separately when a default case must be
  distinguishable); usable where an expression is required (ternaries, Svelte
  markup), unlike `throw`

## Logger (`log.ts`)

```typescript
const log = new Logger('my_module');
const child_log = log.child('submodule'); // label 'my_module:submodule'; inherits level/colors/console
```

Level resolution: `PUBLIC_LOG_LEVEL` env var → `'off'` under Vitest → `'debug'`
in dev (`DEV` from `esm-env`) → `'info'` in prod. Levels: `off`, `error`,
`warn`, `info`, `debug`. No static state — level, colors, and console are
instance properties; children inherit until they set their own, and
`clear_level_override()` / `clear_colors_override()` /
`clear_console_override()` restore inheritance. The `root` getter walks to
the root logger for global configuration. Colors are disabled under `NO_COLOR`
or `CLAUDECODE`. Shared library modules take a logger via deps rather than
owning one (./dependency-injection.md §Design Principles).

## Timings (`timings.ts`)

```typescript
const timings = new Timings();
const stop = timings.start('operation'); // nestable
await work();
const elapsed_ms = stop(); // does not log
```

Duplicate keys auto-suffix (`operation_2`). `Timings` doesn't log —
`print_timings(timings, log)` from `print.ts` outputs at debug level.
`create_stopwatch(decimals?)` is the single-timer primitive (call the returned
function for elapsed ms; pass `true` to reset). Gro's `TaskContext` carries a
`Timings` for task performance.

## Concurrency (`async.ts`)

Three bounded-concurrency functions over iterables. All require
`concurrency >= 1`, accept an optional `AbortSignal`, pass `(item, index)` to
`fn` (which may be sync), spawn the next item as each settles, and resolve
immediately on empty input.

| Function                 | Returns results | Fail behavior           | Use when               |
| ------------------------ | --------------- | ----------------------- | ---------------------- |
| `each_concurrent`        | No              | Fail-fast               | Side effects only      |
| `map_concurrent`         | Yes (ordered)   | Fail-fast               | Transform + collect    |
| `map_concurrent_settled` | Yes (settled)   | Collects all (no throw) | Best-effort collection |

**Fail-fast**: on first rejection, stop spawning and reject — partial results
are lost; with `signal`, abort immediately. **Settled** follows
`Promise.allSettled` — never rejects; on abort it resolves with partial
results: completed items keep their settlements, in-flight items reject with
the abort reason, never-pulled items are absent.

```typescript
const results = await map_concurrent(file_paths, 5, async (path) => readFile(path, 'utf8'));
// results[i] corresponds to file_paths[i]
```

Also: `AsyncSemaphore(permits)` for limiting arbitrary code paths (`acquire()`
in `try`, `release()` in `finally`; `permits >= 0`, `Infinity` disables limiting
without changing call sites); `create_deferred<T>()` →
`{promise, resolve, reject}` (used by `run_dag()` and `throttle`); `wait`
(delay); `is_promise` (thenable guard); `AsyncStatus`
(`'initial' | 'pending' | 'success' | 'failure'`, for UI lifecycle).

## DAG execution (`dag.ts`)

`run_dag()` executes dependency-graph nodes concurrently; nodes declare
`depends_on`, independent nodes run in parallel up to `max_concurrency`
(built on `AsyncSemaphore` + `Deferred`).

```typescript
interface BuildStep extends DagNode { command: string; }

const result = await run_dag<BuildStep>({
	nodes,
	execute: async (node) => { await run_command(node.command); },
	max_concurrency: 4,
	stop_on_failure: true // default
});
if (!result.success) log.error(result.error); // e.g. "2 node(s) failed"
```

`DagNode` is `{id, depends_on?}` extending `Sortable` (`sort.ts`, topological
validation). `DagOptions` adds `on_error`/`on_skip`/`should_skip`,
`max_concurrency` (default `Infinity`), `stop_on_failure` (default `true`),
`skip_validation`; `DagResult` aggregates per-node results with counts and
`duration_ms`. Failed dependencies cascade — dependents are skipped with reason
`'dependency failed'`.

## DOM helpers (`dom.ts`)

- **`swallow(event, immediate?, preventDefault?)`** — claims an event
  (preventDefault + stopImmediatePropagation by default). Design principle and
  usage: ./svelte-patterns.md §Event Handling.
- **`handle_target_value(cb, swallow = true)`** — wraps an input handler with
  value extraction: `<input oninput={handle_target_value((v) => { name = v; })} />`.

## Type utilities (`types.ts`)

**Nominal typing.** `Flavored<TValue, TName>`, defined in
`@fuzdev/fuz_schema/schema.ts` beside the `flavor`/`brand` schema helpers that
produce the same types, is the primary approach: an _optional_ invisible
brand, so unflavored base values assign without casting but different flavors
are incompatible:

```typescript
type Email = Flavored<string, 'Email'>;
type Address = Flavored<string, 'Address'>;
const email1: Email = 'foo@bar.com'; // ok — plain string assigns
const email2: Email = 'foo' as Address; // error — Address !== Email
```

Real uses: `PathId` (`path.ts`), `GitOrigin`/`GitBranch` (gro's `git.ts`, `flavor`
schemas), color channel types (`colors.ts`), `Url` (`url.ts`, paired with a
fuz_schema schema of the same name), `BlogPostId` (fuz_blog), `InputPath`
(gro), `ReorderableId` (zzz). `Branded<TValue, TName>` (requires a cast, also
from fuz_schema) is for values that must not assign from a bare base value:
fuz_util's `FactHash` (`hash_schemas.ts`), produced only by hashing or
`is_fact_hash`. A schema's `s.brand()` is the form when the value crosses a
runtime boundary and should validate (`Uuid` in fuz_app; ./fuz-schema.md
§Branded and Flavored Types).

**Strict and distributive.** `OmitStrict<T, K extends keyof T>` — `Omit`
that rejects non-keys (standard `Omit` lets typos compile); widely used.
`PickUnion<T, K>` / `KeyofUnion<T>` — `Pick`/`keyof` that distribute over
unions.

**Class and element helpers.** `Assignable<T, K>` removes `readonly` (zzz's
self-referential init: `(this as Assignable<typeof this, 'app'>).app = this`);
`ClassConstructor<TInstance>` (zzz's Cell registry is
`Map<string, ClassConstructor<Cell>>`); `ArrayElement<T>`.

**Exported but unused**: `PartialExcept`, `PartialOnly`, `PartialValues`,
`NotNull` have no references outside `types.ts`; `Defined` has one. Don't
model new code on them — use an inline mapped type until a recurring need
appears.
