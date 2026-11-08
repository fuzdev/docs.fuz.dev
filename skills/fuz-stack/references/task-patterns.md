---
description: Gro task system — .task.ts files, TaskContext, error handling
---

# Task Patterns

Gro tasks are `*.task.ts` modules exporting a `task` object. Imports: `Task`,
`TaskContext`, `TaskError` from `@fuzdev/gro`; `SilentError`, `InvokeTask`
from `@fuzdev/gro/task.ts`.

## Task Interface

```typescript
interface Task<TArgs = Args, TArgsSchema extends Schema<Args, Args> = Schema<Args, Args>, TReturn = unknown> {
	run: (ctx: TaskContext<TArgs>) => TReturn | Promise<TReturn>;
	summary?: string; // shown in `gro task` listing and --help
	Args?: TArgsSchema; // fuz_schema schema for CLI arg parsing
}
```

Tasks are either `Task` or `Task<Args>` — the other params are rarely
customized. `Args` is a `@fuzdev/fuz_schema` schema; the schema and
its inferred type are both exported as `Args`:

```typescript
// src/lib/greet.task.ts → `gro task src/lib/greet.task.ts --name Claude`; `--help` is generated from the schema
import type { Task } from '@fuzdev/gro';
import * as s from '@fuzdev/fuz_schema/schema.ts';
import { meta } from '@fuzdev/fuz_schema/meta.ts';

export const Args = s.object({
	name: s.with_default(meta(s.string, { description: 'who to greet', aliases: ['n'] }), 'world')
});
export type Args = s.Infer<typeof Args>;

export const task: Task<Args> = {
	summary: 'greet someone by name',
	Args,
	run: async ({ args, log }) => {
		log.info(`hello, ${args.name}!`);
	}
};
```

**Args conventions**:

- `s.object()`, which refuses unknown flags
- `meta(entry, {description, aliases})` for help text and short flags (`-n`),
  `meta` from `@fuzdev/fuz_schema/meta.ts` (fuz_util's `args.ts` declares
  `aliases` on `SchemaMeta`)
- `s.with_default(entry, x)`, `s.with_default_fn(entry, make)`, or
  `s.optional(entry)` for a flag that may be left out; an entry without one is
  required on the CLI. A defaulted flag is the default alone — an
  `s.optional` around it leaves a missing key out, so the default never applies
- `s.with_default_fn(entry, () => [])` for an array or object default — a
  `with_default` value is the same object on every parse
- integers as `s.pipe(s.number, s.safe_integer)`
- `/** @nodocs */` on the `Args` exports to keep them out of API docs
- positional args in `_: s.with_default_fn(s.array(s.string), () => [])` —
  `gro test foo bar --dir src/lib/` gives `_ = ['foo', 'bar']`
- opt-out booleans as `--no-*` duals — `typecheck: s.with_default(s.boolean, true)`
  paired with `'no-typecheck': s.with_default(s.boolean, false)`; `--help`
  shows only the `no-*` entry

Gro parses with `args_parse` from `@fuzdev/fuz_util/args.ts`: it expands
aliases, syncs `--no-*` duals, and returns `{ok: true, value}` or
`{ok: false, issues}`, each issue printable with fuz_schema's `format_issue`
(`bogus: expected no unknown keys, received number`). `--help` reads the
schema through fuz_schema's `introspect.ts` (`get_schema_fields`,
`format_schema_type`). A CLI outside Gro takes the same schemas through
fuz_util's `args_parse(argv_parse(argv), schema)`. `s.parse_or_throw(Args, value)`
skips alias expansion and `--no-*` sync — fine for a test that passes
canonical keys; `args_parse` for one that exercises flags.

## TaskContext

Fields: `args`, `config: GroConfig`,
`svelte_config: Promise<ParsedSvelteConfig>`, `graph`, `log`, `timings`,
`invoke_task`. `svelte_config` is lazy (resolved on first access).
`graph` is a `ModuleGraph` (the modules under `src/`, which imports which —
transitive `dependents` — and content-based change events via `watch`). It
loads on first use, so a task that never touches it starts no watch;
`config.watch` (`{dir, filter}`, default `src/`) sets what it watches, and an
invoked task shares its invoker's. `log`/`timings` are task-scoped.

**`invoke_task(name_or_path, args?, {config?})`** composes tasks by the CLI's
rule: an input containing a `/` or ending in `.task.ts`/`.task.js` is a task
path (relative to the project root, not the invoking task's directory, or
absolute), anything else a builtin name — so `invoke_task('test')` always
reaches gro's builtin, and there are no overrides. Omitting `config` passes
the current one. `check.task.ts` is the core example: it invokes `typecheck`,
`test`, `gen` (`{check: true}`), `format` (`{check: true}`), `lint`, with
`--no-*` flags gating each. Direct import (`test_task.run(ctx)`) skips the
logging, diagnostics, and forwarded args — rarely wanted. A failed invoked
task logs its own error once and rejects with a `SilentError` (the original
as `cause`), so the invoker reports only that it failed.

**Typed names and args**: `InvokeTask` checks a literal name against
`TaskRegistry` (a literal that's no builtin is refused) and args against the
input type of the task module's exported `Args` schema — defaulted args
optional, the rest required. Gro's builtins are typed out of the box; a
project types its own tasks with a genfile that writes a `ProjectTasks`
augmentation keyed by each task's root-relative path:

```typescript
// src/gro_tasks.gen.ts → src/gro_tasks.ts
import { fs } from '@fuzdev/gro/fs.ts';
import { create_fs_paths } from '@fuzdev/gro/fs_paths.ts';
import { gen_task_registry } from '@fuzdev/gro/task_registry.ts';

export const gen = gen_task_registry(create_fs_paths(fs));
```

`invoke_task('src/test/fixtures/ts/update.task.ts', …)` (a leading `./` is
stripped) checks against that task's args; a literal path missing from the
registry, or a name widened to `string`, accepts any args. A task without an
exported `Args` accepts any args, so export the schema. `gro dev`
regenerates on task add/change but not delete — run `gro gen` after removing
a task (`gro gen --check` in `gro check` catches it).

## Args Forwarding

`--` sections forward args to the tools a task calls, at any depth: in
`gro check -- vitest --run foo -- eslint --max-warnings -1`, the first arg
after each `--` names the command.

- **Outside tools** (`eslint`, `vitest`, `tsc`, `svelte-check`, `vite`,
  `svelte-package`) get their section's text **verbatim**, never parsed and
  reserialized. A forwarded flag a task also passes itself (`lint`'s
  `--max-warnings 0`, `typecheck`'s `--noEmit`) replaces the task's.
- **Gro tasks**: `-- gro test --coverage` parses and forwards `--coverage` to
  the builtin `test`; a project task is keyed by path,
  `-- gro task src/lib/foo.task.ts --a`. Forwarded args beat args passed to
  `invoke_task`.
- **Implicit forwarding** (`gro test -- --watch`) reads only the first section
  and only for the task the CLI invoked — `gro check -- --watch` gives the
  nested `test` nothing; use `-- vitest --watch` to reach it at any depth.
- A literal `--` can't be forwarded, except to `gro run`'s script.

**`gro run <path> ...rest`** runs a TS/JS file like `node`: everything after
the path reaches the script verbatim, `--` included (`gro run x.ts -- --flag`
hands the script `-- --flag`, so drop the `--`). A flag before the path other
than `--help` is a usage error. It exits with the script's exit code.

## Error Handling

| Error type    | Stack trace | Gro logs message | Use when                              |
| ------------- | ----------- | ---------------- | ------------------------------------- |
| Regular Error | Yes         | Yes              | Unexpected failures                   |
| `TaskError`   | No          | Yes              | Known failure; the message suffices   |
| `SilentError` | No          | No               | Already logged; just exit non-zero    |

The CLI exits `1`, or with a `TaskError`'s `exit_code` (an integer 1–255,
`new TaskError(message, {exit_code})`) when it fails the task the CLI invoked.

## Running and Listing — Names vs Paths

A name means only a builtin (`gro check`); a project task runs by path with
`gro task`, relative to the project root or absolute, `./` optional, the
`.task.ts`/`.task.js` suffix required — `gro task src/lib/db/migrate.task.ts`.
Nothing is searched. `gro` alone lists the builtins, `gro task` lists the
project's tasks under `src/`, and `gro task some/dir/` lists a directory. An
unknown name, a bare path (`gro src/lib/foo.task.ts`), or a path missing its
suffix errors with the `gro task` form to use. Flags go after the path.

A project task never shadows a builtin, and builtins invoking builtins
(`check` → `test`) always reach gro's own. To extend a builtin, compose: write
a task that invokes it by name, sharing its `Args` schema so the
passed-through `args` type-check against it (untyped `args` can fail with "no
properties in common"), and point the `package.json` script at the wrapper's
path:

```typescript
// src/lib/test.task.ts — run as `gro task src/lib/test.task.ts`
import type { Task } from '@fuzdev/gro';
import { Args } from '@fuzdev/gro/test.task.ts';

export const task: Task<Args> = {
	summary: 'run tests with custom setup',
	Args,
	run: async ({ invoke_task, args }) => {
		// setup
		await invoke_task('test', args); // always the builtin
		// teardown
	}
};
```

`gro check` still runs the builtin `test`, not the wrapper.
