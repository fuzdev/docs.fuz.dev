---
description: Vitest patterns — file layout, assertions, DB tests, fixtures, test doubles
---

# Testing Patterns

Tests run on vitest through `gro test`. They live in `src/test/`, mirroring
`src/lib/`, never beside the source.

## Files

```
src/test/
├── module.test.ts
├── module.aspect.test.ts        # one module split by aspect
├── test_helpers.ts              # shared helpers
├── domain_test_helpers.ts       # helpers for one domain
├── domain_test_aspect.ts        # a shared suite factory, not a test file
├── domain/
│   ├── module.test.ts
│   └── module.db.test.ts
└── fixtures/
    └── feature_name/
        ├── case_name/
        │   ├── input.{ext}
        │   └── expected.json    # generated, never hand-edited
        ├── feature_name_test_helpers.ts
        └── update.task.ts       # regenerates this feature's expected files
```

| Pattern                            | Example                                       |
| ---------------------------------- | --------------------------------------------- |
| `{module}.test.ts`                 | `mdz.test.ts`                                 |
| `{module}.{aspect}.test.ts`        | `csp.base.test.ts`, `csp.security.test.ts`    |
| `{module}.svelte.{aspect}.test.ts` | `contextmenu_state.svelte.activation.test.ts` |
| `{module}.fixtures.test.ts`        | `svelte_preprocess_mdz.fixtures.test.ts`      |
| `{module}.db.test.ts`              | `account_queries.db.test.ts`                  |
| `{module}.integration.db.test.ts`  | `invite_signup.integration.db.test.ts`        |
| `{module}.cross.test.ts`           | a test against a spawned backend              |

The module name matches the source file, `.svelte.` included. Two suffixes
select a vitest project, `.db` and `.cross`, so they go last. The others only
describe the file.

## Structure

- `describe` blocks, one level or two (feature, then scenario), and `test()`,
  not `it()`.
- **Table tests use labeled tuples**, with `null` for a missing input. A case
  with its own extra assertions stays a standalone test.

  ```typescript
  const cases: Array<[label: string, initial: string | null, key: string, expected: string]> = [
  	['updates existing', 'KEY="old"', 'KEY', 'KEY="new"'],
  	['creates if missing', null, 'KEY', 'KEY="new"']
  ];
  test.each(cases)('%s', async (_label, initial, key, expected) => { ... });
  ```

- **A behavior shared by several implementations is a suite factory**: a
  module exporting `create_shared_*_tests(Component, name, options)` that
  wraps `describe`, with each test file a thin call. fuz_ui's contextmenu
  suite runs the same factories over two root components. fuz_app ships its
  factories as library exports (`describe_*` in `testing/`), so a consumer
  inherits whole categories of coverage by passing its route specs.

## Assertions

- **`assert` from vitest, not `expect`, because it narrows.**
  `assert(x instanceof Error)` narrows `x`; `expect(x).toBeInstanceOf(Error)`
  doesn't. `assert.ok(value)` is the guard for `T | undefined`. Where the
  value is known, say so: `assert.strictEqual`, `assert.deepEqual`,
  `assert.include`.
- **A spy's calls are asserted on `spy.mock.calls`**, with `assert.deepEqual`
  or `assert.strictEqual`. gro's tests use `expect` throughout; that is
  gro's local style, not the model.
- **Custom helpers are `assert_*`.**
- **`assert.throws` takes a constructor, a string, or a RegExp, never a
  predicate.** An arrow function fails with "errorLike is not a constructor".
  To inspect a thrown error, catch it and put `assert.fail` after the block,
  not inside the `try` where the catch would swallow it:

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

- **For a rejection, `assert_rejects`** from `@fuzdev/fuz_util/testing.ts`
  does that for you and returns the `Error`:

  ```typescript
  const err = await assert_rejects(() => local_repos_load({ ... }), /Failed to pull/);
  assert.include(err.message, 'repo-a');
  ```

  The same module has `create_mock_logger()` and
  `assert_property(obj, key, value)`, which narrows a discriminated union by
  any discriminator.
- **A `Result` narrows with `assert.ok(result.ok)`.**

## Placeholder values

A stand-in domain is a `*.fuz.dev` subdomain: `a.fuz.dev` and `b.fuz.dev` for
any two domains, `cdn.fuz.dev` and `untrusted-cdn.fuz.dev` for a scenario,
`source${i}.fuz.dev` for a generated set. A real third-party domain is fine
when the test documents an integration with that vendor. This is the form for
new tests. fuz_ui and fuz_repos follow it; most other suites use
`example.com`.

## DOM tests

`// @vitest-environment jsdom` above the imports. jsdom has no
`ResizeObserver` or `IntersectionObserver`, so stub them before the component
mounts:

```typescript
class ResizeObserverMock { observe = vi.fn(); unobserve = vi.fn(); disconnect = vi.fn(); }
vi.stubGlobal('ResizeObserver', ResizeObserverMock);
```

jsdom also normalizes CSS values: `setProperty('top', '0')` reads back
`'0px'`.

## Database tests

**Any test that opens a `Db` is named `.db.test.ts`.** Vitest `projects`
split the suite: unit tests run in parallel, and the `db` project runs every
DB file in one worker so they share a database instance.

```typescript
// vite.config.ts, the db project (fuz_forge)
{
	extends: true,
	test: {
		name: 'db',
		include: ['src/test/**/*.db.test.ts'],
		isolate: false,
		fileParallelism: false,
		sequence: { groupOrder: 2 }
	}
},
```

The unit project excludes `*.db.test.ts` and `*.cross.test.ts`.

- **fuz_app owns the fixtures** (`@fuzdev/fuz_app/testing/db.ts`). A consumer
  writes `src/test/db_fixture.ts`, which builds `describe_db` from one or
  more factories and the tables to truncate between tests:

  ```typescript
  // the shape of a db_fixture.ts
  const init_schema = async (db: Db): Promise<void> => {
  	await run_migrations(db, [AUTH_MIGRATION_NS]);
  };
  const default_factory = create_default_db_factory(init_schema);
  const pg_factory = create_pg_factory(init_schema, process.env.TEST_DATABASE_URL);
  export const describe_db = create_describe_db(
  	[default_factory, pg_factory],
  	auth_integration_truncate_tables
  );
  ```

  ```typescript
  describe_db('account queries', (get_db) => {
  	test('create returns an account with generated uuid', async () => {
  		const account = await query_create_account({ db: get_db() }, { username: 'alice', password_hash: 'hash123' });
  		assert.ok(account.id);
  	});
  });
  ```

- **Which engines is the consumer's choice.** The default factory is an
  in-memory Postgres (install `@fuzdev/pglet-wasm` as a devDependency);
  `create_pg_factory` runs the same suites on a real server when
  `TEST_DATABASE_URL` is set. fuz_app runs both. fuz_forge runs only
  PostgreSQL, the engine its production backend uses.
- **A factory hands each `create()` an empty schema**, so `init_schema` only
  migrates, and `describe_db` truncates the listed tables between tests.
  Don't write drop or teardown logic.
- **`isolate: false` shares module state between DB files.** Don't `vi.mock`
  in a `.db.test.ts`.
- **A DB test with the wrong name should fail, not pass slowly.** fuz_app's
  unit project has a `setupFiles` entry that calls `set_default_db_factory`
  with a factory whose `create()` rejects, naming the fix. It runs before any
  test module builds a factory.
- **`.integration.db.test.ts`** drives a whole app in process: fuz_app's
  `create_test_app` builds the server with middleware, routes, and a
  database, and returns the app with helpers that mint session and bearer
  headers.
- **`.cross.test.ts`** runs against a spawned backend, in its own vitest
  projects behind `FUZ_TEST_CROSS_BACKEND` so the default run doesn't need
  the binaries. Keep the suffix for that: mdz has an in-process test under
  the same name, which a project split would drop. The
  suites and their harness are fuz_app's (its `src/lib/testing/CLAUDE.md`);
  how TS and Rust twins are held together is in ./twin-impl.md.

## Fixture tests

Parsers, analyzers, and transformers test against a directory per case: an
input file and a generated `expected.json`. mdz is the exemplar.
svelte-docinfo uses the same mechanism under its own camelCase and
kebab-case names, which are not the shape to copy.

**Never write or edit `expected.json` by hand.** Add the input and run the
feature's update task, which regenerates every expected file and writes only
what changed:

```typescript
// mdz src/test/fixtures/mdz/update.task.ts
export const task: Task = {
	summary: 'generate expected.json files for mdz fixtures',
	run: async ({ log }) => {
		await run_update_task(
			{
				fixtures_dir: join(import.meta.dirname),
				input_extension: '.mdz',
				process: (input) => mdz_parse(input)
			},
			log
		);
	}
};
```

`gro task src/test/fixtures/mdz/update.task.ts` runs it. Review the diff of
the expected files as you would review code: it is the assertion. The test
loads every fixture and asserts each in one loop, with the fixture's name in
the failure message. `run_update_task` and the loader are the repo's own, in
its `test_helpers.ts`; helpers for one fixture category live inside that
fixture's directory.

## Test doubles

**Inject, don't module-mock.** Code takes its side effects as a `deps`
parameter and a test passes plain objects. The interfaces and the shapes of
fakes are in ./dependency-injection.md §Testing.

`vi.mock` is what remains where code has no seam, and a new use is a signal
to add one:

- **gro's task and plugin tests mock gro's own host modules**
  (`#lib/spawn.ts`, `#lib/fs.ts`) through shared mock modules, because a task
  imports those modules directly, and many of its internal modules too. A new
  root avoids this by keeping its body in an exported function that takes
  deps (see ./dependency-injection.md §Roots).
- **fuz_app's middleware tests mock the auth `query_*` modules**, which the
  middleware calls by name.
- Some UI tests mock `svelte` or `$app/navigation`.

Helpers local to a repo go in `src/test/test_helpers.ts`; a library whose
consumers need its fakes exports them from `src/lib` (fuz_app's `testing/`,
`runtime/mock.ts`).
