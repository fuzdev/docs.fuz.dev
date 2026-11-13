---
description: Gro tasks — .task.ts modules, Args schemas, invoke_task, names vs paths, errors
---

# Task Patterns

A gro task is a `*.task.ts` module exporting a `task` object. This page is the
conventions and traps; the full mechanics are gro's own `src/docs/task.md`.

```typescript
// src/lib/greet.task.ts, run as `gro task src/lib/greet.task.ts --name Claude`
import type { Task } from '@fuzdev/gro/task.ts';
import * as s from '@fuzdev/fuz_schema/schema.ts';
import { meta } from '@fuzdev/fuz_schema/meta.ts';

/** @nodocs */
export const Args = s.object({
	name: s.with_default(meta(s.string, { description: 'who to greet', aliases: ['n'] }), 'world')
});
export type Args = s.Infer<typeof Args>;

/** @nodocs */
export const task: Task<Args> = {
	summary: 'greet someone by name',
	Args,
	run: async ({ args, log }) => {
		log.info(`hello, ${args.name}!`);
	}
};
```

- **Import from the module**: `@fuzdev/gro/task.ts` has `Task`, `TaskContext`,
  `TaskError`, `SilentError`, and `InvokeTask`. The bare `@fuzdev/gro` entry
  re-exports a few of them and older files use it.
- **A `@nodocs` doc comment on `Args` and `task`.** Every task module exports
  those two names, so in a library's `src/lib` they would collide under the
  flat-namespace check.

## Names and paths

**A name means a builtin. A project task runs by path.** `gro check` reaches
gro's `check`; `gro task src/lib/db/migrate.task.ts` runs yours, relative to
the project root, the `.task.ts` suffix required. Nothing is searched, and a
project task never shadows a builtin. `gro` alone lists the builtins,
`gro task` the project's tasks under `src/`. Flags go after the path.

- **To change what a builtin does, wrap it.** Write a task that invokes the
  builtin by name, reuse its `Args` so the pass-through type-checks, and
  point the `package.json` script at the wrapper's path:

  ```typescript
  // src/lib/test.task.ts, run as `gro task src/lib/test.task.ts`
  import type { Task } from '@fuzdev/gro/task.ts';
  import { Args } from '@fuzdev/gro/test.task.ts';

  /** @nodocs */
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
- **To run a task a package ships, re-export it at a project path**:
  `export * from '@fuzdev/fuz_repos/gitops_plan.task.ts';` in
  `src/lib/gitops_plan.task.ts`. Nothing looks in `node_modules`.

## Args

`Args` is a fuz_schema schema, exported with its inferred type under the same
name. `--help` is generated from it.

- **`s.object`**, so an unknown flag is refused.
- **`meta(entry, {description, aliases})`** gives the help text and the short
  flags (`-n`).
- **A flag that can be left out is `s.with_default`, `s.with_default_fn`, or
  `s.optional`.** An entry with none of them is required. Don't wrap a
  default in `s.optional`: a missing key then stays missing and the default
  never applies.
- **An array or object default uses `s.with_default_fn(entry, () => [])`.**
  A `with_default` value is the same object on every parse.
- **Positionals** are `_: s.with_default_fn(s.array(s.string), () => [])`.
- **Integers** are `s.pipe(s.number, s.safe_integer)`.
- **An opt-out boolean is a `--no-*` pair**:
  `typecheck: s.with_default(s.boolean, true)` beside
  `'no-typecheck': s.with_default(s.boolean, false)`. Help shows only the
  `no-` entry.
- gro parses with `args_parse` from `@fuzdev/fuz_util/args.ts`, which expands
  aliases and syncs the `no-` pairs. A CLI outside gro uses the same call:
  `args_parse(argv_parse(argv), schema)`. `s.parse_or_throw(Args, value)`
  does neither, which is fine for a test passing canonical keys.

## Context

`run` receives
`{args, config, svelte_config, graph, log, timings, invoke_task}`.
`svelte_config` and `graph` load on first use, so a task that doesn't touch
them pays nothing. A task reaches the filesystem and child processes by
importing gro's host modules itself (see ./dependency-injection.md §Roots for
keeping that testable).

**`invoke_task(name_or_path, args?, {config?})`** follows the CLI's rule: an
input with a `/` or a `.task.ts` suffix is a path from the project root,
anything else a builtin.

- **Invoke, don't import and call.** `other_task.run(ctx)` skips the logging,
  the forwarded args, and the error handling.
- **A failed invoked task has already logged its error.** It rejects with a
  `SilentError` carrying the original as `cause`, so the invoker reports only
  that it failed.
- **An invoked task shares its invoker's `timings` and module graph**, so a
  `config` passed to it doesn't change what the graph watches; `log` is a
  child of the invoker's.
- **Literal names and args are type-checked** against gro's builtins out of
  the box. A project types its own tasks with a genfile whose output augments
  the registry, keyed by each task's root-relative path:

  ```typescript
  // svelte-docinfo src/gro_tasks.gen.ts
  import { gen_task_registry } from '@fuzdev/gro/task_registry.ts';
  import { fs } from '@fuzdev/gro/fs.ts';
  import { create_fs_paths } from '@fuzdev/gro/fs_paths.ts';

  export const gen = gen_task_registry(create_fs_paths(fs));
  ```

  A task without an exported `Args` accepts anything, so export the schema.
  `gro dev` regenerates the registry when a task is added or changed, not
  when one is deleted: run `gro gen` after removing a task.

## Forwarding args

A `--` section forwards to a tool that some task in the run calls, at any
depth. The first word after each `--` names the tool:
`gro check -- vitest --run foo -- eslint --max-warnings -1`.

- **An outside tool gets its section verbatim**, and a forwarded flag
  replaces the same flag the task passes itself.
- **A gro task is `-- gro test --coverage`**, or by path
  `-- gro task src/lib/foo.task.ts --a`. Forwarded args beat the args passed
  to `invoke_task`.
- **`gro test -- --watch` is special to `gro test` invoked directly.**
  `gro check -- --watch` gives the nested `test` nothing: write
  `gro check -- vitest --watch`.
- **`gro run <path> …rest`** runs a TS file like `node` does. Everything after
  the path reaches the script, a `--` included, and gro exits with the
  script's code. A flag before the path, other than `--help`, is an error.

## Errors

| Throw         | Stack | Message logged | Use when                              |
| ------------- | ----- | -------------- | ------------------------------------- |
| an `Error`    | yes   | yes            | something unexpected                  |
| `TaskError`   | no    | yes            | a known failure the message explains  |
| `SilentError` | no    | no             | already logged; just exit non-zero    |

The CLI exits `1`, or the `exit_code` of a `TaskError` thrown by the task it
invoked (`new TaskError(message, {exit_code})`, 1 to 255).
