---
description: Gro gen — .gen.* files, the gen export, inputs, where codegen is used
---

# Code Generation

A `.gen.*` file produces a source file. The output is committed beside it,
and `gro gen --check`, a step of `gro check`, fails when the two have
drifted. Most repos have few gen files or none: fuz_css's utility classes and
the API docs metadata come from Vite plugins (`virtual:fuz.css`,
`virtual:svelte-docinfo`), not from gen. gro's own `src/docs/gen.md` has the
full mechanics.

## Naming

Drop the `.gen.` segment to get the output: `foo.gen.ts` writes `foo.ts`,
`theme.gen.css.ts` writes `theme.css`, `README.gen.md.ts` writes `README.md`.
The source is always `.ts`. One `.gen.` segment, at most one extension after
it.

## The `gen` export

`gen` is a function from a `GenContext` to the output, or a
`{generate, inputs?}` object. A project imports the `Gen` type from
`@fuzdev/gro/gen.ts`; this one is gro's own, so its imports are relative.

```typescript
// gro src/lib/gro_builtin_tasks.gen.ts
import { dirname } from 'node:path';

import type { Gen } from './gen.ts';
import { fs } from './fs.ts';
import { create_fs_paths } from './fs_paths.ts';
import { task_registry_find_builtins, task_registry_render_builtins } from './task_registry.ts';

/**
 * Writes `GroBuiltinTasks` and the builtin summaries from Gro's own tasks.
 *
 * @nodocs
 */
export const gen: Gen = {
	generate: async ({ origin_id, origin_path }) => {
		// Gro's `src/lib/`, this genfile's own directory
		const opened = await create_fs_paths(fs).open_dir_path(dirname(origin_id));
		if (!opened) throw Error(`no directory at ${dirname(origin_id)}`);
		const src_lib = opened.dir.dir(opened.path).readonly();
		const entries = await task_registry_find_builtins(src_lib);
		return task_registry_render_builtins(entries, dirname(origin_id), origin_path);
	},
	inputs: { patterns: ['*.task.ts'] }
};
```

- **A `@nodocs` doc comment on `gen`**, for the reason tasks carry it: every
  gen file exports the same name (see ./task-patterns.md).
- **Put `origin_path` in the generated-by banner**, so the output names its
  source.
- **The result** is a `string` (one file at the default name),
  `{content, filename?, format?}` (`filename` relative to the gen file or
  absolute; `format: false` skips the formatter), an array of those for
  several files, or `null` to write nothing.
- **A gen file is a composition root**: it may import gro's host modules.

## Inputs

In `gro dev` a gen file reruns when it or a module it imports changes.
**Declare every other file it reads as `inputs`**, or the output goes stale
until the next `gro gen`:

- `inputs` is an object with `files` (exact paths), `patterns`
  (gitignore-style, anchored at the project root: `*.json` at any depth,
  `/package.json` only at the root, no `./` prefix), or both.
- `'all'` for a gen that reads the whole tree, such as a snapshot of every
  class a library defines.
- Only changes under the watched directory (default `src/`) trigger a rerun,
  and a deletion never does. `gro dev` reads a gen file's `inputs` once, so
  an edit to them applies on restart. `gro gen` and `gro gen --check` always
  run every gen file.

## Where it is used

- **Action codegen** is the commonest: an app reads its action specs and
  emits typed method enums, metatypes, and handler interfaces through
  fuz_app's `actions/action_codegen.ts` (zzz, fuz_forge).
- **A gen a package ships** is re-exported at a project path, as tasks are:
  fuz_blog's `blog.gen.ts` writes the feed and its routes in each site that
  re-exports it.
- **A route tree from content**: docs.fuz.dev's `skill_docs.gen.ts` discovers
  the skills and returns a manifest, a data file per skill, and the
  `+page.svelte` routes from one gen.
- **A data file** (`foo.gen.json.ts`) computed from other files in the
  repo, with those files as its `inputs`.
- **A task registry** that types `invoke_task` for a project's own tasks (see
  ./task-patterns.md).
