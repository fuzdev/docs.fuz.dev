---
description: Vitest patterns, fixtures, mocks, assertion helpers
---

# Testing Patterns

## File Organization

```
src/
├── lib/               # source code
│   └── domain/
└── test/              # all tests (NOT co-located), mirroring lib/
    ├── module.test.ts
    ├── module.aspect.test.ts       # split by aspect
    ├── test_helpers.ts             # shared test utilities
    ├── domain_test_helpers.ts      # domain-specific helpers
    ├── domain_test_aspect.ts       # shared test factory (NOT a test file)
    ├── domain/
    │   ├── module.test.ts
    │   └── module.db.test.ts
    └── fixtures/
        ├── update.task.ts          # runs all child update tasks
        └── feature_name/
            ├── case_name/
            │   ├── input.{ext}
            │   └── expected.json   # generated
            ├── feature_name_test_helpers.ts
            └── update.task.ts      # regeneration task for this feature
```

### Test File Naming

| Pattern                            | Example                                       |
| ---------------------------------- | --------------------------------------------- |
| `{module}.test.ts`                 | `mdz.test.ts`                                 |
| `{module}.{aspect}.test.ts`        | `csp.base.test.ts`, `csp.security.test.ts`    |
| `{module}.svelte.{aspect}.test.ts` | `contextmenu_state.svelte.activation.test.ts` |
| `{module}.fixtures.test.ts`        | `svelte_preprocess_mdz.fixtures.test.ts`      |
| `{module}.db.test.ts`              | `account_queries.db.test.ts`                  |
| `{module}.integration.db.test.ts`  | `invite_signup.integration.db.test.ts`        |

Module name matches the source file; `.svelte.` preserves the source
extension.

### Assertions

`assert` from vitest, chosen for **type narrowing**:
`assert(x instanceof Error)` narrows `x`; `expect(x).toBeInstanceOf(Error)`
doesn't. `assert.ok` is the standard guard narrowing `T | undefined` — don't
swap it for `assert.isDefined` or others unless failure diagnostics improve
without losing narrowing. Strengthen when the value is **known**:
`assert.strictEqual`, `assert.include`/`notInclude` for membership (shows
contents on failure). Custom helpers are `assert_*`, not `expect_*`.

`assert.throws()` takes an Error constructor, string, or RegExp — **never a
function predicate** (`"errorLike is not a constructor"`). To inspect a thrown
error, put `assert.fail` **after** the catch, never inside the try where it
would be swallowed:

```typescript
try {
	fn();
} catch (e) {
	assert(e instanceof Error);
	assert.include(e.message, 'expected substring');
	return;
}
assert.fail('Expected error');
```

For async rejection, `assert_rejects` from `@fuzdev/fuz_util/testing.ts`
places `assert.fail` outside the catch for you and returns the `Error`; the
pattern arg is optional:

```typescript
const err = await assert_rejects(() => local_repos_load({ ... }), /Failed to pull/);
assert.include(err.message, 'repo-a');
```

### Test Placeholder Domains

Stand-in domains are `*.fuz.dev` subdomains — `a.fuz.dev`/`b.fuz.dev` for
"any domain", `cdn.fuz.dev`/`api.fuz.dev`/`untrusted-cdn.fuz.dev` for
scenarios, `source${i}.fuz.dev` for generated sets — not `example.com`,
RFC-2606 TLDs, or arbitrary strings. Real third-party domains are fine when the
test documents integration with that vendor.

### jsdom Environment

`// @vitest-environment jsdom` before imports (fuz_ui contextmenu/intersect,
zzz cell/UI state, fuz_app auth_state/popover). Gotchas: jsdom normalizes CSS
values (`setProperty('top', '0')` stores `'0px'`); it lacks `ResizeObserver`
and `IntersectionObserver` — stub before importing components:

```typescript
class ResizeObserverMock { observe = vi.fn(); unobserve = vi.fn(); disconnect = vi.fn(); }
vi.stubGlobal('ResizeObserver', ResizeObserverMock);
```

## Database Testing

fuz_app owns the infrastructure (`testing/db.ts`); fuz_app and zzz both run
the vitest projects split below.

### The `.db.test.ts` Convention

Any test using a `Db` instance uses `.db.test.ts`, with `.db` immediately
before `.test.ts` (`foo.integration.db.test.ts`). Vitest `projects` run all DB
tests in one worker (`isolate: false` + `fileParallelism: false`) sharing one
WASM database instance per driver (a cold start saved per file); non-DB tests
stay parallel. The default factory (`create_default_db_factory`, pglet-wasm —
install `@fuzdev/pglet-wasm` as a devDependency) and `create_pglite_factory`
share their instance via a module-level cache; every factory, pg included,
resets the schema (`DROP SCHEMA public CASCADE`) per `create()`, so
`init_schema` only migrates.

To switch the default driver for a run, call `set_default_db_factory` (e.g.
with `create_pglite_factory`) from a `setupFiles` entry on the `db` project —
it is read when a factory is built, so it must run before any test module
imports. fuz_app's own switch is `FUZ_TEST_DB_DEFAULT`; its `unit` project
installs a refusing default factory so a DB test missing the `.db.test.ts`
suffix fails loudly.

```typescript
// vite.config.ts (simplified from fuz_app)
const max_threads = Math.max(1, Math.ceil(availableParallelism() / 2));
export default defineConfig({
	plugins: [sveltekit()],
	test: {
		projects: [
			{
				extends: true,
				test: {
					name: 'unit',
					include: ['src/test/**/*.test.ts'],
					exclude: ['src/test/**/*.db.test.ts', 'src/test/**/*.cross.test.ts'],
					maxWorkers: max_threads,
					sequence: { groupOrder: 1 }
				}
			},
			{
				extends: true,
				test: {
					name: 'db',
					include: ['src/test/**/*.db.test.ts'],
					isolate: false,
					fileParallelism: false,
					sequence: { groupOrder: 2 }
				}
			}
		]
	}
});
```

fuz_app additionally gates a `cross_backend_*` project family behind
`FUZ_TEST_CROSS_BACKEND=1` — per-runtime projects (`rust_spine_stub`,
`ts_node`, `ts_deno`, `ts_bun`) running `src/test/cross_backend/*.cross.test.ts`,
plus `parity` and `security` projects with their own global setups.

Because `isolate: false` shares module state, avoid `vi.mock()` in
`.db.test.ts`; if unavoidable, `vi.restoreAllMocks()` (not `clearAllMocks`)
in `afterEach`.

### describe_db

Consumers create a `db_fixture.ts` from fuz_app's factories:

```typescript
// src/test/db_fixture.ts (fuz_app's own runs four drivers: pglite, pg, pglet-server, pglet-wasm)
const init_schema = async (db: Db): Promise<void> => {
	await run_migrations(db, [AUTH_MIGRATION_NS]);
};
export const default_factory = create_default_db_factory(init_schema);
export const pg_factory = create_pg_factory(init_schema, process.env.TEST_DATABASE_URL);
export const db_factories = [default_factory, pg_factory];
log_db_factory_status(db_factories);
export const describe_db = create_describe_db(db_factories, auth_integration_truncate_tables);
```

```typescript
// src/test/auth/account_queries.db.test.ts
describe_db('account queries', (get_db) => {
	test('create returns an account with generated uuid', async () => {
		const account = await query_create_account({ db: get_db() }, { username: 'alice', password_hash: 'hash123' });
		assert.ok(account.id);
	});
});
```

**Integration tests** (`.integration.db.test.ts`) use `create_test_app()` from
`#lib/testing/app_server.ts` for a full Hono app with middleware, routes, and
database — takes
`{session_options: create_session_config('test_session'), create_route_specs: (ctx) => my_routes(ctx)}`,
returns
`{app, create_session_headers, create_bearer_headers, create_account, cleanup}`.
In-process harnesses leave `create_app_server`'s `auth_cleanup` off, as
`create_test_app` does — a background pass deletes rows and writes audit rows
mid-test.

## Test Helpers

**Shared** (`@fuzdev/fuz_util/testing.ts` — depends only on vitest, so it fits
fuz_util's zero-runtime-deps constraint):
`assert_rejects` (above); `create_mock_logger()` (vi.fn methods + tracking
arrays like `info_calls`); `assert_property(obj, key, value)` — the general
discriminated-union narrower (`assert_property(r, 'ok', true)`, or any
discriminator). Its `const V` type param is load-bearing: without it `Extract`
collapses to the full union and the narrowing silently vanishes — keep the
signature intact if you copy it. For `Result`, `assert.ok(result.ok)` narrows
directly.

**Repo-local**: `src/test/test_helpers.ts` for domain factories (gro's
`create_mock_task_context`, fuz_repos's `create_mock_repo`); fuz_ui's adds
component lifecycle (`mount_component` / `unmount_component` wrapping
`mount`/`unmount` into a `document.body` container) and DOM event factories
(`create_keyboard_event`, `create_mouse_event`, `create_touch_event`,
`set_event_target`). fuz_app's test infrastructure lives in `src/lib/testing/`
as library exports.

**Domain-specific**: `{domain}_test_helpers.ts` beside the tests; helpers for
one fixture category go **inside** that fixture directory
(`fixtures/mdz/mdz_test_helpers.ts`), not at `src/test/` root.
(svelte-docinfo's kebab-case `test-helpers.ts` with camelCase helpers like
`runUpdateTask` is a pre-existing-style repo, not the canonical shape.)

## Shared Test Factories

When components share behavior (`ContextmenuRoot` and
`ContextmenuRootForSafariCompatibility`), extract test logic into factory
modules exporting `create_shared_*_tests(Component, name, options)` that
wrap `describe(...)`; test files become thin wrappers calling the factory.
fuz_ui's contextmenu suite is the exemplar
(`contextmenu_test_{core,rendering,keyboard,nested,positioning,scoped,edge_cases,link_entries}.ts`).

## Fixture-Based Testing

For parsers, analyzers, and transformers (mdz's `mdz` and
`svelte_preprocess_mdz`; svelte-docinfo's `ts`, `tsdoc`, `svelte`, nested
further by sub-kind). Each case is a directory with an input file and a
generated `expected.json`; each feature has an `update.task.ts` using
`run_update_task` from the repo's `test_helpers.ts` (alongside
`load_fixtures_generic`), which diffs and writes only on change:

```typescript
// src/test/fixtures/mdz/update.task.ts
export const task: Task = {
	summary: 'generate expected.json files for mdz fixtures',
	run: async ({ log }) => {
		await run_update_task(
			{ fixtures_dir: import.meta.dirname, input_extension: '.mdz', process: (input) => mdz_parse(input) },
			log
		);
	}
};
```

Run one feature: `gro task src/test/fixtures/mdz/update.task.ts`. A parent
`src/test/fixtures/update.task.ts` can fan out via `invoke_task` —
svelte-docinfo's runs `tsdoc`/`ts`/`svelte` by task path, suffix included
(`'src/test/fixtures/ts/update.task.ts'`), which type-check through its
`src/gro_tasks.gen.ts` task registry (./task-patterns.md); its `svelte` child goes through
the shared `runUpdateTask` with a `processAll` hook
(`analyzeSvelteFixtureModules`), building one shared TS program across
fixtures since Svelte type analysis needs a shared checker.

The test loads all fixtures in `beforeAll` and asserts each in one loop with
the fixture name in the message:

```typescript
// helpers from ./fixtures/<feature>/<feature>_test_helpers.ts
for (const fixture of fixtures) {
	const result = await run_preprocess(fixture.input, DEFAULT_TEST_OPTIONS, `${fixture.name}.svelte`);
	assert.equal(result, fixture.expected.code, `Fixture "${fixture.name}" failed`);
}
```

**CRITICAL: never manually create or edit `expected.json`.** Create inputs and
run the update task.

**fuz_repos** uses a different fixture shape: repos built in memory from data
files (`fixtures/repo_fixtures/*.ts` → `LocalRepo`s via
`load_repo_fixtures.ts`, key-list configs in `fixtures/configs/`, and
`create_fixture_gitops_ops` in `fixtures/mock_operations.ts` serving each
fixture's changesets), covering publishing, cascades, cycles, private packages,
major bumps, peer deps, and isolation.

## Mock Patterns

**DI is preferred**: functions take a deps parameter; tests inject plain
objects — no mocking library. Interfaces, factory naming, stub tiers, and the
tracking/in-memory/throwing shapes: ./dependency-injection.md. Factories are
`create_mock_*(overrides: Partial<T> = {})` spreading overrides last.

**`vi.mock()` is a legacy escape hatch**, not a pattern — it exists where code
predates DI (gro's build/deploy/cache tests) or a call site has no seam. Where
a seam exists, use it: fuz_repos's `operations_defaults.test.ts` passes the
default operations a fake gro `SpawnProgram` instead. fuz_app module-mocks its
auth `query_*` cluster from several middleware tests; the bearer-auth subset
is factored into `testing/middleware.ts` as table-driven
`describe_bearer_auth_cases` / `create_bearer_auth_test_app` — a documented
carve-out. Treat any _new_ `vi.mock` as a signal to add a deps seam. When
unavoidable: gro uses `vi.clearAllMocks()` in `beforeEach` +
`vi.resetAllMocks()` in `afterEach`; `.db.test.ts` needs `vi.restoreAllMocks()`.

Vitest types `.mock.calls` as precise tuples — use `as any` in
`assert.deepEqual(spy.mock.calls[0], ['hello', 42] as any)`.

## Environment Flags

```typescript
const SKIP = !!process.env.SKIP_EXAMPLE_TESTS;
describe.skipIf(SKIP)('vite plugin examples', () => { ... });
```

| Flag                              | Repo         | Purpose                                           |
| --------------------------------- | ------------ | ------------------------------------------------- |
| `SKIP_EXAMPLE_TESTS`              | fuz_css      | Skip slow Vite plugin integration tests           |
| `TEST_DATABASE_URL`               | fuz_app      | Enable PostgreSQL tests (the default always runs) |
| `FUZ_TEST_DB_DEFAULT`             | fuz_app      | Default driver: `pglet-wasm`, `pglite`, `pglet-server` |
| `FUZ_TEST_CROSS_BACKEND`          | fuz_app, zzz | Enable the `cross_backend_*` vitest projects      |
| `FUZ_TESTING_RUST_SPINE_STUB_BIN` | fuz_app      | Path to the Rust spine stub binary for cross runs |

## Test Structure

Use `describe` blocks: one level is common, two (feature → scenario) for
larger modules; flat `test()` calls are fine for very small files. `test()`, not
`it()`.

**Parameterized tests** use labeled tuple types; `null` for "missing" cases;
tests with dynamic expectations or extra assertions stay standalone:

```typescript
const cases: Array<[label: string, initial: string | null, key: string, expected: string]> = [
	['updates existing', 'KEY="old"', 'KEY', 'KEY="new"'],
	['creates if missing', null, 'KEY', 'KEY="new"']
];
test.each(cases)('%s', async (_label, initial, key, expected) => { ... });
```

**Composable suites (fuz_app)**: `describe_*` factories in `src/lib/testing/`
(library exports) let a consumer inherit whole coverage categories — attack
surface, integration, admin, audit completeness, rate limiting, round-trip
validation, data exposure — plus a cross-process bundle,
`describe_standard_cross_process_tests`. They take
config (`session_options`, `create_route_specs`, `rpc_endpoints`, `bootstrap`)
and skip groups whose config is absent. The roster is fuz_app inventory
(`src/lib/testing/CLAUDE.md`).

**WebSocket round-trip tests** run **in-process** — no HTTP server, no Deno —
driving the real dispatcher and transport so per-action auth, validation,
`ctx.notify`, and broadcast fan-out run through real code. DB-backed WS tests
use `.db.test.ts` and the shared default factory; non-DB WS tests build a fresh
harness per test with ad-hoc action specs. A real-upgrade (cross-process) test
that waits for a server-initiated message, or needs connections registered in a
known order, opens through `create_admitted_ws_transport`
(`testing/transports/ws_transport.ts`): an open socket is not yet an admitted
connection, and a push sent before admission is dropped, not queued.

**Serde boundary conformance** (Rust ↔ hand-written TS): round-trip + coverage
guard rather than codegen — ./twin-impl.md §Serde boundary conformance.
