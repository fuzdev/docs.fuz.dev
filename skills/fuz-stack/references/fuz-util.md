---
description: fuz_util — Result, error helpers, Logger, Timings, concurrency, DAG, type utilities
---

# fuz_util

`@fuzdev/fuz_util` is the foundation library: no runtime dependencies, with
`@fuzdev/fuz_schema` and `esm-env` as required peers. Import each module by
path (`@fuzdev/fuz_util/result.ts`). This page is what to reach for and the
traps; each module's TSDoc is the reference.

## Result (`result.ts`)

`Result<TValue, TError>` is `({ok: true} & TValue) | ({ok: false} & TError)`.
The data sits on the result itself, not under a wrapper.

```typescript
const parse_config = (text: string): Result<{ value: Config }, { message: string }> => {
	try {
		return { ok: true, value: JSON.parse(text) };
	} catch (e) {
		return { ok: false, message: to_error_message(e) };
	}
};

const result = parse_config(text);
if (result.ok) use(result.value);
else log.error(result.message);
```

- **`Result` for a failure the caller is expected to handle** (parsing,
  validation, a missing file); an exception for a programmer mistake or a
  failure nothing can act on.
- **Hand-written results carry `{value}` on success and `{message}` on
  failure**, the shape `unwrap(result)` reads (it returns `.value` or throws a
  `ResultError` holding the result). A domain error adds a discriminating
  `kind` beside the message (see ./dependency-injection.md). The generated
  RPC clients return `Result<{value}, {error}>` with a JSON-RPC error object.
- `OK` and `NOT_OK` are the frozen results with no data. `unwrap_error`
  returns the narrowed failure and throws on success.
- In a test, `assert.ok(result.ok)` narrows.

## Errors (`error.ts`)

- **`to_error_message(value, fallback?)`** is the one normalizer for a caught
  `unknown`: the `message` of an `Error`, else `fallback ?? String(value)`.
- **`unreachable(value)`** ends an exhaustive match by throwing
  `UnreachableError`. It is a call, so it fits where `throw` can't: a ternary,
  Svelte markup.

## Logger (`log.ts`)

`new Logger('module')`, and `log.child('part')` for the label `module:part`.
Level, colors, and console are instance state: a child inherits from its
parent until it sets its own, and `root` reaches the top of the chain.

- **A shared library module takes its logger from its caller**; the label
  belongs to the consumer (see ./dependency-injection.md). fuz_app's server
  modules accept an optional `log` and fall back to one they label.
- **The default level is decided once, when the module loads**:
  `PUBLIC_LOG_LEVEL` from `process.env`, else `'off'` under Vitest, else
  `'debug'` in dev (`DEV` from `esm-env`) and `'info'` in production. An
  invalid `PUBLIC_LOG_LEVEL` throws at import. Levels run `off`, `error`,
  `warn`, `info`, `debug`.
- Colors default on only when writing to the global `console` with stdout
  and stderr both terminals (and in a browser), and off under `NO_COLOR`,
  `NODE_DISABLE_COLORS`, `CLAUDECODE`, or `TERM=dumb`; `FORCE_COLOR`
  overrides.

## Timings (`timings.ts`)

`const stop = timings.start('key')`, then `stop()` returns the elapsed
milliseconds and records them. `Timings` never logs;
`print_timings(timings, log)` (`print.ts`) does, at `debug`, so nothing
prints at the production default. Starting a key that is still
running records under `key_2`; starting one that has stopped overwrites its
timing. Gro's `TaskContext` carries one.

## Concurrency (`async.ts`)

Three bounded runners over an iterable. Each takes `concurrency >= 1`, calls
`fn(item, index)`, and accepts an `AbortSignal`.

| Function                 | Results        | On a rejection                   |
| ------------------------ | -------------- | -------------------------------- |
| `each_concurrent`        | none           | stops starting items and rejects |
| `map_concurrent`         | in input order | stops starting items and rejects |
| `map_concurrent_settled` | settlements    | keeps going, never rejects       |

Nothing is cancelled: calls already in flight run on and their outcomes are
dropped. On abort the first two reject with the signal's reason. The settled
form resolves on abort too, with what finished: completed items keep their
settlements, in-flight ones reject with the abort reason, and items never
started are absent.

Also: `AsyncSemaphore(permits)` to bound an arbitrary code path
(`await acquire()`, then `try` with `release()` in `finally`; `Infinity` turns
the limit off without touching call sites), `create_deferred<T>()`,
`wait(ms)`, and `AsyncStatus` for UI state.

## DAG (`dag.ts`)

`run_dag({nodes, execute, max_concurrency?, stop_on_failure?})` runs nodes that
name their `depends_on`, in parallel where the graph allows. `execute` throws
to fail a node. The result reports `success` and per-node `results`; a node
whose dependency failed is skipped, not run. `stop_on_failure` defaults to
`true`.

## DOM (`dom.ts`)

`swallow(event, immediate = true, preventDefault = true)` prevents the default
and stops propagation in one call; when to use it is in ./svelte-patterns.md
§Events. `handle_target_value(cb)` wraps an input handler with the value
pulled out, swallowing the event by default.

## Types

**Nominal types** come from `@fuzdev/fuz_schema/schema.ts`, beside the
schema helpers that produce them.

- **`Flavored<TValue, TName>` is the default.** The mark is optional, so a
  plain value assigns without a cast and two different flavors don't assign to
  each other. Use it for identifiers and units: fuz_util's `PathId`.
- **`Branded<TValue, TName>` when a bare value must not pass.** A value gets
  the type from a parse, a guard, or a cast: fuz_util's `FactHash`.
- **With a schema, mark the schema**: `s.flavor(s.string, 'GitBranch')` or
  `s.brand(…)`, and infer the type (see ./fuz-schema.md §Brands). A
  `Flavored<s.Infer<typeof X>, 'X'>` alias over an unmarked schema (fuz_util's
  `Url`, gro's `InputPath`) types the alias only: a schema composed from `X`
  outputs the plain type. New code marks the schema.

**From `types.ts`**: `OmitStrict<T, K>` in place of `Omit`, which accepts keys
that don't exist, so a typo compiles. `Assignable<T, K>` strips `readonly` for
an initializer that must write a readonly field. `ClassConstructor<T>` and
`ArrayElement<T>` do what they say.

**Don't model new code on** `PickUnion`, `KeyofUnion`, `PartialExcept`,
`PartialOnly`, `PartialValues`, `NotNull`, or `Defined`: exported, with next
to no callers. Write the mapped type inline until a need recurs.
