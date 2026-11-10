---
description: Injectable *Deps interfaces, mock factories, composition patterns
---

# Dependency Injection

Typed interfaces for side effects, real implementations as defaults, accepted
as params, tested with plain object mocks. No `vi.mock` — dependencies flow
through signatures, so code is runtime-independent (Node, Bun, the gro
runtime, tests) via parameterization, not magic mocks or ambient singletons.
New code doesn't target Deno.

The same discipline is what the gro runtime (`fgro`, experimental) builds
on: there, importing a host module (gro's own fs, process, spawn) is the
capability declaration, a task's grants are meant to be inferred from its
import graph, and no global carries authority (`fetch` is `net.fetch`, an
import), so nothing is ambient. Keeping platform access at the edges (L0 shims and
platform factories, never module-scope `node:*` in domain code) is what
keeps that inference small and legible, so the convention below pays twice.

## Convention

**Small standalone `*Deps` interfaces, composed bottom-up.** Leaf functions
import small interfaces directly; the entry point assembles app-level
composites for wiring and threads them down; leaf functions never take the
composite.

```typescript
// fuz_app's runtime layer is the exemplar
export interface EnvDeps {
	env_get: (name: string) => string | undefined;
	env_set: (name: string, value: string) => void;
}
export interface FsReadDeps {
	stat: (path: string) => Promise<StatResult | null>;
	read_text_file: (path: string) => Promise<string>;
	readdir: (path: string) => Promise<Array<string>>;
}
// One program, resolved and given its environment by whoever made it
export interface Program {
	out: (args: ReadonlyArray<string>) => Promise<ProgramOutput>; // {kind, code | signal, stdout, stderr}
}
export type ProgramFactory = (env: Readonly<Record<string, string>>) => Program | null;

// Functions declare exactly what they need via intersection
export const setup_env_file = async (
	deps: FsReadDeps & FsWriteDeps,
	env_path: string,
	example_path: string,
	options?: SetupEnvOptions
): Promise<SetupEnvResult> => { /* ... */ };

// A helper that spawns takes the programs it runs
export interface PostgresProgramDeps {
	createdb: ProgramFactory;
	dropdb: ProgramFactory;
}
export const reset_database = async (
	deps: PostgresProgramDeps & Pick<FsReadDeps, 'stat'> & FsRemoveDeps,
	database_url: string,
	options?: ResetDatabaseOptions
): Promise<ResetDbResult> => { /* ... */ };

// App-level composite — wiring layer only
export interface RuntimeDeps extends EnvDeps, FsReadDeps, FsWriteDeps, ProcessProbeDeps, LogDeps /* … */ {
	env_all: () => Record<string, string>;
	readonly args: ReadonlyArray<string>;
	cwd: () => string;
}
```

Platform factories build the composite once at the entry point —
`create_node_runtime(args)` (Node and Bun) and `create_mock_runtime(args)`.
There is no browser factory: browser/component DI is Svelte context (§Scope).

**Programs are handles, not a command capability.** `RuntimeDeps` runs no
program: a helper that spawns takes each program it runs as a `Program`, or a
`ProgramFactory` when the program's environment depends on run-time input (a
password read from a URL), built at the composition root that decides which
binary runs and what it sees. On a gro task root that's `spawn.find` /
`spawn.program` with an explicit `pass_env`
(`{createdb: (env) => spawn.find('createdb', {pass_env: ['PG*'], env})}`,
over the unnarrowed root, since a narrowed `spawn` refuses `env`); a
gro `SpawnProgram` satisfies `Program` with no import of gro, and `null` is a
missing tool to report. Process liveness is `ProcessProbeDeps.probe_process`
(signal 0), not a spawned `kill -0`.

**Why not `Pick<GodType>`**: `Pick<AppRuntime, 'env_get'>` forces every
consumer to import the god type. Standalone interfaces are shareable across
projects, trivially mocked (`{env_get: () => 'value', env_set: () => {}}`),
composable by intersection, and self-documenting. `Pick<>` on a _small_
`*Deps` is fine; a `Pick<>` narrowing reused across many sites is a named
interface waiting to happen — fuz_app's action factories take
`ActionFactoryDeps {log, audit}` (`auth/deps.ts`) rather than repeating
`Pick<RouteFactoryDeps, 'log' | 'audit'>` at every site.

**Bundles vs single capabilities**: `*Deps` names the injected **bundle**. Its
members are often pure-noun service interfaces or classes (`Keyring`, `Logger`,
`AuditEmitter`, `FactStore`), and a standalone single-capability interface
keeps its noun name (fuz_util's `FactStore` — "interface only, backends live
downstream"). Don't suffix a single service interface with `Deps`; the suffix
marks the parameter-bundle role.

## Parameter Type Suffixes

| Suffix     | Contains                            | Test behavior                              | Rule                                          |
| ---------- | ----------------------------------- | ------------------------------------------ | --------------------------------------------- |
| `*Deps`    | Capabilities (functions, services)  | Fresh mock factories per test case         | Things swapped for testing/platform           |
| `*Options` | Data (config values, limits, flags) | Literal objects, constructed once, reused  | Static values — no mock factory               |
| `*Context` | Scoped world for a callback/handler | Depends on scope (may contain deps + data) | The world available within a bounded scope    |

`*Context` examples: per-request `RouteContext` (`{db, pending_effects, ...}`),
per-setup-callback `AppServerContext`. A `*Context` may structurally satisfy a
`*Deps` — route handlers pass `RouteContext` to `query_*` functions because it
satisfies `QueryDeps = {db: Db}`. **No `*Config`** — `?` already expresses
optionality; all parameter bags are `*Options`. `*Input` is reserved for
mutation payloads.

**Keep the categories separate.** A `*Deps` mixing capabilities with config
values (thresholds, paths) blurs two things that test differently — split into
`*Deps` + `*Options`, or use the ad-hoc form below deliberately and say so.
(Rust collapses them into one `*Options` struct on purpose; TS holds them
apart — each is the language-appropriate shape.)

## Naming

| What              | Convention                  | Example                           |
| ----------------- | --------------------------- | --------------------------------- |
| Small interface   | `{Domain}Deps`              | `EnvDeps`, `FsReadDeps`, `FsDeps` |
| Capability bundle | `{Scope}Deps`               | `AppDeps`, `RouteFactoryDeps`     |
| Full composite    | `RuntimeDeps`               | extends all small `*Deps`         |
| Default impl      | `default_{domain}_deps`     | `default_fs_deps`                 |
| Mock factory      | `create_mock_{domain}_deps` | `create_mock_fs_deps`             |
| Stub              | `stub_{scope}_deps`         | `stub_password_deps`              |

Files: `deps.ts` (interfaces) + `deps_defaults.ts` (production defaults) + a
test-side mock module (fuz_css: `src/test/fixtures/mock_deps.ts`) — fuz_css's
`FsDeps` / `default_fs_deps` / `create_mock_fs_deps` (over the cache and the
default `style.css` load) is the cleanest exemplar; `FsSearchDeps` covers the
dev pre-scan's file search.

**Legacy `*Operations` (fuz_repos)**: `GitOperations` /
`default_git_operations` / `create_mock_git_ops` under a `GitopsOperations`
composite with an `ops` param — migrating to `*Deps` opportunistically (fuz_css
already did; fuz_repos's task entry points and `npm_registry.ts` take `*Deps`,
e.g. `GitopsPublishDeps`, `NpmRegistryDeps`). **Never author new
`*Operations`**; follow local naming when touching fuz_repos's `*Operations`
code.

## Layer Contracts (L0 platform vs L1 domain)

**L0 — platform shims** (`FsReadDeps`, `ProcessProbeDeps`): mirror the platform —
**positional params, throw on error**, like `Deno.readTextFile` / `node:fs`.
Stable, trivially implemented by any runtime.

**L1 — domain wrappers** (`FsDeps`, git/npm operations): **single
options-object params, uniform `Result` returns with typed errors** — reads,
writes, and queries all return `Result<{value: T}, FsError>`; no mixing
`string | null` reads with `Result` writes. Implementations route thrown errors
through a small local classifier (fuz_css's `deps_defaults.ts`
`fs_classify_error`), mapping
ENOENT/EACCES/EPERM/EEXIST to a discriminated `kind`:

```typescript
type FsError =
	| { kind: 'not_found'; message: string }
	| { kind: 'permission_denied'; message: string }
	| { kind: 'already_exists'; message: string }
	| { kind: 'io_error'; message: string };

if (!r.ok && r.kind !== 'not_found') throw new Error(r.message); // rm -f semantics
```

Callers branch on `kind`, not regex on `message`. The uniform shape keeps the
contract symmetric with the Rust twin. Don't mix the two contracts on one
interface; don't leak platform types (node's `SpawnOptions`) through an L1 shape.

## Consumption Patterns

- **Required first param** for internal/library functions:
  `create_account_route_specs(deps: RouteFactoryDeps, options: AccountRouteOptions)`.
- **Optional with default** for public API surfaces:
  `const { deps = default_fs_deps } = options;`.
- **Narrow intersection** — exactly the capabilities used:
  `deps: PostgresProgramDeps & Pick<FsReadDeps, 'stat'> & FsRemoveDeps`.
- **Ad-hoc per-function deps** — a unique combination gets its own co-located
  interface; use when sharing would add coupling without reuse:

  ```typescript
  export interface BootstrapAccountDeps {
  	db: Db;
  	token_path: string; // data mixed in deliberately — one-signature convenience
  	read_text_file: (path: string) => Promise<string>;
  	password: Pick<PasswordHashDeps, 'hash_password'>;
  	log: Logger;
  }
  ```

- **Composition root** — assembled once, flows down. fuz_app's two-step
  assembly: `create_app_backend(options)` builds `AppDeps` and returns it with
  lifecycle metadata; `create_app_server({backend, ...})` consumes it.
  Post-assembly extension points register through documented methods on the
  capability, not by re-shaping the bundle: the audit emitter's `add_listener`
  (same identifier as its Rust twin), and `AppDeps.connection_closer`'s
  `add(closer)` — `create_app_backend` creates the closer empty and
  `create_app_server` adds each WebSocket transport it mounts and its audit
  stream registry, so a revocation handler built from the bundle closes on
  every transport the server mounts. Both registrations return a remover
  (Rust: `add_listener` returns an id for `remove_listener`), and
  `create_app_server` runs its removers when assembly throws and on `close`, so
  the bundle's emitter and closer end where they started. `close` first runs
  the closer's `close_all_connections`, which leaves each member closing — a later
  WebSocket upgrade or stream is refused at once — so a transport, unlike the
  bundle, is spent with its server. A transport mounted
  by hand passes `deps.connection_closer` to its mount helper
  (`register_action_ws`, `create_audit_log_sse`), which adds it permanently —
  or passes `null` and adds it itself to hold the remover.

## Design Principles

- **Result returns, never throw** in L1; L0 mirrors the platform and throws.
- **Stateless capabilities** — mutable state (a `bootstrap_status` flag
  object) is passed separately, never smuggled into a deps bundle.
- **Runtime agnosticism** — no module-level env/fs imports in code that might
  run outside one runtime; load via deps. Direct platform imports are for
  platform factory files and explicitly single-runtime modules (document the
  carve-out at the module).
- **Logging in shared deps: required, never optional-with-fallback.** A shared
  module can't own a `Logger` singleton — the label belongs to the consumer.
  Where a consumer has no logger, its adapter delegates explicitly to
  `console.warn`. Diagnostic-only `log?` on leaf helpers (silently absent = no
  extra diagnostics) is a different, acceptable shape — the rule is about
  capabilities the function _needs_ on some path.

## Testing

Plain objects implementing the interfaces — no `vi.mock()`, no Sinon;
individual `vi.fn()` for call tracking is fine.

- **Mock factory with overrides** — every method with a sensible default,
  `Partial<T>` overrides spread last:
  `create_mock_git_deps = (overrides: Partial<GitDeps> = {}): GitDeps => ({ current_branch_name: async () => ({ ok: true, value: 'main' }), …, ...overrides })`.
- **In-memory state mock** — state object created separately so tests seed and
  inspect it: `create_mock_fs_deps(state: MockFsState)` reading/writing
  `state.files` and returning `{ok: false, kind: 'not_found', …}` on a miss.
- **Tracking mock** — `create_tracking_process_deps()` returns
  `{deps, get_spawned_commands}`: a call log exposed via getters next to the deps.
- **Stubs, two safety levels** (fuz_app `testing/stubs.ts`):
  `create_throwing_stub<T>(label)` — a Proxy throwing on any access. **Prefer
  this default** — a silent no-op can mask setup mistakes.
  `create_noop_stub<T>(label)` / `create_stub_app_deps()` (a whole no-op
  `AppDeps` bundle) for tests where incidental access is fine.
- **Observable runtime mock** — `create_mock_runtime(args)` returns full
  `RuntimeDeps` with observable state (`mock_env`, `mock_fs`, `exit_calls`,
  `mock_processes`); `exit` throws `MockExitError`. Programs fake separately:
  `create_mock_program(respond)` records `calls`,
  `create_mock_program_factory(program)` records `envs`, and
  `mock_program_exit(code, stderr, stdout)` builds an output. Stub factories
  accept the same narrow `*Deps` contracts production uses — never
  `Pick<GodType>`.

## Traps

- **Optional capability with a silent platform fallback** — `read_file?:`
  defaulting to a module-level `node:fs` import couples the module to one
  runtime and hides the effect. Require the dep, or default at an explicit
  platform factory — not per-field at module scope.
- **Optional capability whose absence skips a security effect** — with a
  per-factory `connection_closer?:`, a revocation handed none still succeeds
  and the connections it should have ended stay open; nothing fails. Make the
  capability a required member and name the no-op: a backend with no live
  connections passes `noop_connection_closer`, so opting out is written at the
  call site.
- **Category blurring under a `*Deps` name** — config values mixed with
  capabilities, several optional-with-fallback; tests can't tell what needs a
  mock vs a literal. Split, or use the ad-hoc form deliberately.
- **No seam at the call site** — functions called _by name_ from middleware
  (`query_account_by_id(...)` imported directly) leave `vi.mock` as the only
  seam; this is how module-mocking creeps back. Thread the function through a
  deps param. fuz_app documents its remaining auth `query_*` module-mock cluster
  as a carve-out with `vi.restoreAllMocks()` hygiene; treat any new instance as
  a smell.
- **God-type coupling** — `Pick<Composite>` at leaves, or passing the composite
  down more than one level.
- **Deps spreading** — `{...deps, extra}` downstream re-shapes the bundle
  mid-flight. Building a purpose-built object at a wiring point where sources
  converge is legitimate; spreading to _extend_ someone else's bundle is not.
  Inline narrowing (`{db}` selected from a bundle) is fine.
- **Forcing `*Deps` params across a component tree** — browser/UI uses Svelte
  context (`create_context`; fuz_app's `*_rpc_context` adapters).
  Function-param deps are for plain TS call graphs.

## Scope — where the pattern doesn't apply

- **Host modules and floor-tier contracts** — gro's host modules
  (`@fuzdev/gro/fs.ts`, `@fuzdev/gro/process.ts`, `@fuzdev/gro/spawn.ts`) export
  the platform surface, imported by composition roots, and `FsError`
  (`@fuzdev/gro/fs_error.ts`) and fuz_util's `Result` are the shared contracts
  `*Deps` interfaces are typed against — they're what default implementations are
  _made of_. Library code over them takes a handle as a parameter, as
  `@fuzdev/gro/git.ts` takes a `git` `SpawnProgram` a root builds.
- **Pure libraries** (parsers, renderers, formatters) have no side effects; a
  rendering/plugin seam (mdz's component injection) is composition, not DI.
- **Narrow duck-typed interfaces** matching multiple existing objects
  (svelte-docinfo's `AnalysisLog`, satisfied by fuz_util's `Logger` and Vite's
  logger) are the same spirit without the suffix.

## Rust Analog

`*Deps` is **TS-only** — Rust traits _are_ capabilities. Rust uses pure-noun
capability traits (`PasswordHasher`, `Storage`) and `*Options` structs, with
`cfg`/features, the crate graph, and enum dispatch covering much of what TS
solves with injection. Full treatment: ./rust-patterns.md §Dependency Injection.

## Quick Reference

| Flavor                                                                                  | Exemplar           | Injection style                                        |
| --------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------ |
| Narrow platform deps + `RuntimeDeps` composite                                          | fuz_app `runtime/` | Required first param; composite at entry points        |
| App capability bundle (`AppDeps`, `RouteFactoryDeps`, `QueryDeps`, `ActionFactoryDeps`) | fuz_app server     | Required first param; two-step composition root        |
| Focused domain deps (`FsDeps`)                                                          | fuz_css            | Optional param with default (`deps = default_fs_deps`) |
| Grouped legacy `*Operations`                                                            | fuz_repos          | Optional `ops` param — migrating to `*Deps`            |
