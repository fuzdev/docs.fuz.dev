---
description: Injectable *Deps interfaces, composition roots, layer contracts, test doubles
---

# Dependency Injection

Side effects are typed interfaces that functions take as parameters. A test
passes plain objects, a different runtime passes a different implementation,
and nothing reaches for an ambient singleton or a module mock.

The gro runtime builds on the same discipline: there a host module import is
a capability declaration, a run's authority is designed to be read from its
import graph, and no global carries authority (`fetch` is `net.fetch`, an import). Keeping
platform access at the edges is what keeps that graph small and legible.

## The convention

**Small standalone `*Deps` interfaces, composed bottom-up.** A leaf function
imports the small interfaces it needs and intersects them. The entry point
assembles a composite for wiring and passes pieces down. A leaf never takes
the composite.

```typescript
// fuz_app runtime/deps.ts
export interface EnvDeps {
	env_get: (name: string) => string | undefined;
	env_set: (name: string, value: string) => void;
}

// fuz_app dev/setup.ts: a function declares exactly what it uses
export const setup_env_file = async (
	deps: FsReadDeps & FsWriteDeps,
	env_path: string,
	example_path: string,
	options?: SetupEnvOptions
): Promise<SetupEnvResult> => { /* ... */ };

// fuz_app runtime/deps.ts: the composite, for the wiring layer only (abridged)
export interface RuntimeDeps
	extends EnvDeps, FsReadDeps, FsWriteDeps, ProcessProbeDeps, LogDeps /* … */ {
	env_all: () => Record<string, string>;
	readonly args: ReadonlyArray<string>;
	cwd: () => string;
}
```

- **Not `Pick<Composite, …>` at a leaf.** It makes every consumer import the
  composite. A standalone interface is shareable, composes by intersection,
  and mocks in one line (`{env_get: () => 'value', env_set: () => {}}`).
  `Pick` on a _small_ interface is fine, and a `Pick` repeated across sites
  wants a name: fuz_app's action factories take
  `ActionFactoryDeps {log, audit}`.
- **`*Deps` names the bundle, not the service.** A single capability keeps
  its noun: `Keyring`, `Logger`, `AuditEmitter`, `FactStore`.
- **Function-parameter deps are for plain TS call graphs.** A component tree
  uses Svelte context (see ./svelte-patterns.md §Contexts). A pure library
  (a parser, a formatter) has no effects to inject.

## Suffixes

| Suffix     | Holds                               | In a test                         |
| ---------- | ----------------------------------- | --------------------------------- |
| `*Deps`    | capabilities: functions, services   | a fresh fake per test             |
| `*Options` | data: values, limits, flags         | a literal object                  |
| `*Context` | the world available inside a scope  | depends on the scope              |

- **Keep capabilities and data apart.** A `*Deps` holding thresholds and
  paths beside its functions blurs what needs a fake and what needs a
  literal. Split it, or mix on purpose in one function's own interface and
  say so (§Shapes).
- **A parameter bag is `*Options`, never `*Config`.** `*Config` is for a
  config file's shape or a resolved settings record (`GroConfig`). `*Input`
  is a mutation payload.
- A `*Context` may satisfy a `*Deps` structurally: a route handler passes its
  `RouteContext` to a `query_*` function that takes `QueryDeps = {db}`.
- Names: `{Domain}Deps` (`EnvDeps`, `FsReadDeps`), `{Scope}Deps` for a wider
  bundle (`AppDeps`, `RouteFactoryDeps`), and `create_mock_*` for a fake.
  fuz_css names its production implementation `default_fs_deps` and its fake
  `create_mock_fs_deps`.
- Rust collapses capabilities and data into one `*Options` struct and has no
  `*Deps` suffix: a trait is already a capability (see ./rust-patterns.md
  §Dependency injection).

## Layers

**L0, platform shims** (`FsReadDeps`, `ProcessProbeDeps`) mirror the
platform: positional parameters, and they throw. Any runtime implements them
trivially.

**L1, domain deps** (fuz_css's `FsDeps`) take one options object and return a
`Result` whose error is a discriminated `kind`:

```typescript
// fuz_css deps.ts
export type FsError =
	| { kind: 'not_found'; message: string }
	| { kind: 'permission_denied'; message: string }
	| { kind: 'already_exists'; message: string }
	| { kind: 'io_error'; message: string };

export interface FsDeps {
	read_text: (options: { path: string }) => Promise<Result<{ value: string }, FsError>>;
	unlink: (options: { path: string }) => Promise<Result<object, FsError>>;
	// …
}
```

- **Callers branch on `kind`, never on the message.** `unlink` reports
  `not_found`, and a caller that wants `rm -f` ignores that kind explicitly.
- **Every method of an L1 interface returns a `Result`.** No `string | null`
  reads beside `Result` writes.
- **The implementation classifies what the platform threw** in one small
  function (fuz_css's `fs_classify_error`, by the error's `code`).
- **No platform types in an L1 shape** (Node's `SpawnOptions`,
  `BufferEncoding`).
- The error union is the package's own. gro's host modules throw an `FsError`
  class at L0: a different type that shares the name and some `kind` names.

## Programs

**A function that spawns takes each program as a handle, not a
run-this-command capability.** `RuntimeDeps` runs nothing.

```typescript
// fuz_app runtime/deps.ts
export interface Program {
	out: (args: ReadonlyArray<string>) => Promise<ProgramOutput>;
}
export type ProgramFactory = (env: Readonly<Record<string, string>>) => Program | null;

// fuz_app dev/setup.ts
export interface PostgresProgramDeps {
	createdb: ProgramFactory;
	dropdb: ProgramFactory;
}
export const reset_database = async (
	deps: PostgresProgramDeps & Pick<FsReadDeps, 'stat'> & FsRemoveDeps,
	database_url: string,
	options?: ResetDatabaseOptions
): Promise<ResetDbResult> => { /* ... */ };
```

The root decides which binary runs and what environment it sees. On gro that
is `spawn.program(name, {pass_env})`, or `spawn.find`, which returns `null`
for a missing tool so the caller can report it. A gro `SpawnProgram` satisfies
`Program` with no import of gro. A `ProgramFactory` is for a program whose
environment depends on a value read at run time, such as a password taken
from a URL:
`{createdb: (env) => spawn.find('createdb', {pass_env: ['PG*'], env})}`. Build
it on the unnarrowed `spawn`, since a narrowed one refuses `env`. Process
liveness is `probe_process` (signal 0), not a spawned `kill -0`.

## Roots

A **composition root** is where implementations are chosen: a server's entry
point, a CLI's `main`, a gro task, a gen file, a plugin, a script. It imports
the platform and builds the bundle once.

- **Platform factories build the composite**: fuz_app's
  `create_node_runtime(args)` (Node, and Bun runs it too) and
  `create_mock_runtime(args)`.
- **Keep a root thin, with its body in an exported function that takes
  deps.** A task that does its work inline can only be tested by mocking the
  modules it imports. fuz_repos's tasks are the shape:

  ```typescript
  // fuz_repos gitops_run.task.ts
  export const task: Task<Args> = {
  	Args,
  	summary: 'run a shell command across all repos in parallel',
  	run: async ({ args, log }) => {
  		await run_gitops_run(args, log);
  	}
  };

  export const run_gitops_run = async (
  	args: Args,
  	log: Logger,
  	deps: Partial<GitopsRunDeps> = {}
  ): Promise<void> => {
  	const { repos_ops, run_command } = { ...default_gitops_run_deps, ...deps };
  ```

  The body takes `deps` last, as a `Partial` merged over the root's
  defaults, so a test overrides one member. That is the exception to
  required-first (§Shapes), and it belongs to roots.
- **A server assembles in two steps**: fuz_app's `create_app_backend`
  builds `AppDeps`, and `create_app_server` consumes it.
- **Extend a built bundle through a method on the capability, not by
  reshaping the bundle**: the audit emitter's `add_listener`, the connection
  closer's `add`. Each registration returns its remover, and an assembler
  runs its removers when assembly throws and when it closes.

## Shapes

- **Required first parameter** for internal and library functions:
  `create_account_route_specs(deps: RouteFactoryDeps, options: AccountRouteOptions)`.
- **Optional with a default** at a public surface whose callers shouldn't
  have to wire it: fuz_css's generator options take `deps = default_fs_deps`.
- **One function's own interface** when a combination is unique and sharing
  it would only couple things. It may mix in data, deliberately:

  ```typescript
  // fuz_app auth/bootstrap_account.ts (comments trimmed)
  export interface BootstrapAccountDeps {
  	db: Db;
  	token_path: string;
  	read_secure_file: (path: string) => Promise<Uint8Array>;
  	delete_file: (path: string) => Promise<void>;
  	password: Pick<PasswordHashDeps, 'hash_password'>;
  	log: Logger;
  }
  ```

- **Files**, in fuz_css's layout: interfaces in `deps.ts`, production
  implementations in `deps_defaults.ts`, fakes in a test-side module. A
  library whose consumers need the fakes ships them from `src/lib`: fuz_app's
  `runtime/deps.ts`, `runtime/node.ts`, `runtime/mock.ts`.

## Principles

- **Deps are stateless.** Mutable state is passed beside the bundle, never
  inside it.
- **No module-scope platform import in code that may run elsewhere.** Direct
  `node:*` imports belong in platform factory files and in modules that are
  single-runtime on purpose, which say so at the top.
- **A logger a function needs is a required dep.** A shared module can't own
  a `Logger`: the label is the consumer's. An optional `log?` that only adds
  diagnostics is fine. fuz_app's `dev/setup.ts` helpers default theirs for
  CLI output, which is not the shape to copy.
- **A capability whose absence skips a security effect is required, and its
  no-op has a name.** With an optional `connection_closer?`, a revocation
  handed none still succeeds and leaves the connections open. fuz_app makes
  it a required member and a backend with nothing to close passes
  `noop_connection_closer`, so opting out is written at the call site.

## Testing

Plain objects that implement the interfaces. `vi.fn()` on a member to record
calls is fine; a mocking library is not needed.

- **A fake over shared state**, created apart so the test can seed and
  inspect it:

  ```typescript
  // fuz_css src/test/fixtures/mock_deps.ts
  export const create_mock_fs_deps = (state: MockFsState): FsDeps => ({
  	read_text: async ({ path }) => {
  		const value = state.files.get(path);
  		if (value === undefined) return { ok: false, kind: 'not_found', message: `not found: ${path}` };
  		return { ok: true, value };
  	},
  	// …
  });
  ```

- **A fake that records**: fuz_app's `create_mock_program(respond)` keeps its
  `calls`, and `create_mock_runtime(args)` exposes the env, files, and exit
  calls it saw.
- **A stub throws by default.** `create_throwing_stub<T>(label)` (fuz_app
  `testing/stubs.ts`) fails on any access, which catches a setup mistake that
  a silent no-op would hide. `create_noop_stub` is for a test where
  incidental access is expected.
- **A fake takes the same narrow interface production does**, never a `Pick`
  of the composite.

## Traps

- **An optional capability with a platform fallback** (`read_file?:`
  defaulting to a module-level `node:fs` import) couples the module to one
  runtime and hides the effect. Require it, or default at a root.
- **No seam at the call site.** A function imported and called by name from
  middleware leaves `vi.mock` as the only way in. Thread it through a deps
  parameter. fuz_app's auth `query_*` calls are the standing example of the
  cost.
- **Passing the composite down** more than one level, or `Pick<Composite>` at
  a leaf.
- **Spreading to extend someone else's bundle** (`{...deps, extra}`
  downstream). Building a purpose-made object where sources converge is
  wiring; reshaping a bundle in flight is not. Selecting from one (`{db}`) is
  fine.
- **New `*Operations`.** fuz_repos's `GitOperations`, `FsOperations`, and
  their siblings are an older shape; its newer seams are `*Deps`
  (`NpmRegistryDeps`, the tasks' `Gitops*Deps`). Follow local naming when
  touching the old ones and never add one.
