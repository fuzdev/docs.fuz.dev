---
description: Query modules, named-column projections, and the schema drift guard — TS + Rust
---

# Database Query Patterns

**Applies to**: any module reading or writing Postgres rows: `fuz_app`'s
`*_queries.ts`, the spine crates' `*_queries.rs`, and a consumer's own tables
on either spine. SQL is hand-written by design, with no query builder and no
ORM: strings stay planner-visible, pglet-compatible, and readable across the
TS ↔ Rust twin (see ./twin-impl.md).

## Query module shape

One module per table. Every function is `query_<table>_<verb>`, takes its
database handle first (`deps: QueryDeps` in TS, a client in Rust), and has no
audit side effects. A mutation returns the row where the caller needs it
(`null` / `None` for not found), otherwise a `boolean` or nothing. Some older
names are verb-first; they match across the twins, and a rename moves both
sides.

```ts
const invite_expr = iso8601_timestamp_expr(INVITE_COLUMNS, ['claimed_at', 'created_at']);

export const query_create_invite = async (
	deps: QueryDeps,
	input: CreateInviteInput
): Promise<Invite> => {
	const row = await deps.db.query_one<Invite>(
		`INSERT INTO invite (email, username, created_by)
		 VALUES ($1, $2, $3)
		 RETURNING ${columns_sql(INVITE_COLUMNS, invite_expr(''))}`,
		[input.email ?? null, input.username ?? null, input.created_by]
	);
	return assert_row(row, 'INSERT INTO invite');
};
```

- **Values are parameterized, never interpolated.** Only column references,
  `$N::type` placeholders, and projection consts are spliced into the text.
  A dynamic identifier (a table name in DDL or `TRUNCATE`) passes through
  `assert_valid_sql_identifier` first.
- **`INSERT … RETURNING` rows pass through `assert_row(row, context)`** in
  TS: a missing row on an insert is a bug, not a not-found.
- **A unique violation surfaces as Postgres `23505`**
  (`is_pg_unique_violation`). The handler, not the query, turns it into a
  wire error.
- **Transactions are the caller's.** A query takes whatever handle it's given
  (pool or transaction) and never opens its own.
- **A bulk delete whose rows have a post-commit effect returns their ids**,
  not a count (`query_session_cleanup_expired`): the caller commits, then
  closes the connections of exactly what it deleted. Effects that leave the
  database run after the commit is answered, never inside the transaction.

## Named-column projections

Every read, `SELECT` and `RETURNING` alike, projects through the table's
exported column const. Never `SELECT *` or `RETURNING *` in a statement's
final projection.

```ts
export const INVITE_COLUMNS = [
	'id',
	'email',
	'username',
	'claimed_by',
	'claimed_at',
	'created_at',
	'created_by'
] as const satisfies ReadonlyArray<keyof Invite>;
```

Why: with `SELECT *` a dropped column hydrates as `undefined`, and a
`deleted_at === null` filter then rejects every row, a silent outage. A named
projection turns the same drift into a loud `column "…" does not exist` at
first read, and keeps a leftover column off a strict wire schema.

The const is a column-name array, exactly the table's column set. SQL text is
rendered **at the read site** by the helpers in `db/sql_columns.ts`:

| Helper | Use |
| --- | --- |
| `columns_sql(COLS, expr?)` | single-table reads and `RETURNING` → `a, b, c` |
| `qualify_columns(COLS, 'i', expr?)` | reads that alias the table → `i.a, i.b, i.c` |
| `omit_columns(COLS, 'token_hash')` | a client-safe subset; an unknown name throws, so a typo can't keep the secret column on the wire |
| `iso8601_timestamp_expr(COLS, ['created_at'])` | builds the override that projects the named timestamps as ISO strings, curried by alias: pass `expr('')` to `columns_sql`, `expr('i')` to `qualify_columns`; an unknown name throws |

- **A derived column is appended as an expression** beside the rendered
  const (a correlated `COUNT(*) AS grant_count`), never added to it.
- **One list per table.** No module-level qualified copy, no column list
  typed at a call site. Derive from the one const so one guard covers every
  projection.
- **With an `expr` override, a TS read qualifies its `ORDER BY` column**
  (`ORDER BY i.created_at`). The override is aliased back to the column's
  name, and Postgres resolves a bare name against output names first, so it
  would sort on the formatted text and skip the index. Rust emits no alias
  and needs no such rule.

## The drift guard

The projection makes a dropped column fail loud. A column added to the DDL
but not to the const would silently vanish from every read, so each const is
asserted against the live schema, both directions, by one registry test:

```ts
describe_db('column_projections', (get_db) => {
	test('every registered const names exactly its live table columns', async () => {
		for (const [table, columns] of Object.entries(column_projections)) {
			await assert_columns_match_live(get_db(), table, columns);
		}
	});
	test('every live public table is registered or exempted', async () => {
		// compares the catalog's table set to the registry plus its exemptions
	});
});
```

That is fuz_app's own registry, in its test directory
(`src/test/db/column_projections.ts`); a consumer keeps one for its tables.
A registry beats a test per const, which can't see a table that has no
const, though a consumer with a table or two may assert each const with
`assert_columns_match_live`. A live database is the only truth for a
migration chain's end state once migrations append `ALTER TABLE`s. The `/ready` deploy gate covers
the same drift at deploy time; this covers it at development time.

A failing drift test says the DDL and the const disagree. Decide which is
right; don't edit the projection to make it pass.

## Rust twin

The same discipline with the same table consts, so column order can be
diffed by eye across the spines.

```rust
/// The `cell_grant` table's columns, in projection order.
pub const CELL_GRANT_COLUMNS: [&str; 8] = [
    "id", "cell_id", "level", "actor_id", "role", "scope_id", "granted_by", "created_at",
];

fn grant_columns(alias: &str) -> String {
    qualify_columns(
        &CELL_GRANT_COLUMNS,
        alias,
        iso8601_timestamp_expr(&CELL_GRANT_COLUMNS, &["created_at"], alias),
    )
}

fn decode_grant_row(row: &tokio_postgres::Row) -> Result<CellGrantRow, CellError> {
    Ok(CellGrantRow {
        id: row.get(col!(CELL_GRANT_COLUMNS, "id")),
        cell_id: row.get(col!(CELL_GRANT_COLUMNS, "cell_id")),
        // … each index resolved by name at compile time; a closed-set text
        // column parses into its enum here, a miss being a decode error
    })
}
```

- **Signature**:
  `query_<table>_<verb>(client: &(impl GenericClient + ?Sized), …)` returning
  `Result<Row, E>` or `Result<Option<Row>, E>`. `E` is the driver error, or
  the crate's `thiserror` type where the crate has one.
- **`fuz_db::qualify_columns(&COLS, alias, expr)` always qualifies**, so one
  const serves single-table reads and JOINs (pass the table name for a bare
  read or `RETURNING`). There is no `columns_sql`. `expr` overrides single
  columns for a `::text` cast or a timestamp.
- **Timestamps project through
  `iso8601_timestamp_expr(&COLS, &["created_at"], alias)`**, which panics on
  a name outside `COLS` (a misspelled one would silently ship a raw Postgres
  timestamp). A projection that also overrides another column matches on it
  and falls through. Bind the timestamp closure to a local first: it borrows
  the slice literal, and a temporary built inside a `match` arm dies at the
  end of that arm.

  ```rust
  let timestamps = iso8601_timestamp_expr(&CELL_COLUMNS, &["created_at"], alias);
  qualify_columns(&CELL_COLUMNS, alias, |col| match col {
      "data" => Some(format!("{alias}.data::text")),
      _ => timestamps(col),
  })
  ```
- **Decode is positional on the wire and name-checked at compile time**,
  through one decoder per row shape. `fuz_db::col!(COLS, "level")` is a
  `const` lookup: zero runtime cost, an unknown name is a compile error, and
  the decoder follows the const through any insert or reorder. A read with
  extra expressions appends them after the const's columns and indexes from
  `COLS.len()`. Never write a bare integer index against a const-driven
  projection.
- **A narrowed projection is a literal const pinned to its derivation** by a
  unit test, so the decoder can `col!` into it and the base const's guard
  still covers it:
  `assert_eq!(API_TOKEN_CLIENT_COLUMNS.to_vec(), omit_columns(&API_TOKEN_COLUMNS, &["token_hash"]))`.
- **A purpose row gets its own const.** Where Rust reads a deliberately
  narrow row the TS twin doesn't (an identity pair, not the table), give the
  shape a private `<SHAPE>_COLUMNS` and decoder beside the table const, and
  unit-check it as a subset with `fuz_db::columns_not_in(&SHAPE, &TABLE)`.
  Scalar reads (`RETURNING id`, `SELECT EXISTS(…)`) and a single-site join
  whose projection sits beside its decoder stay literal.
- **The drift guard is a crate integration test**, `tests/columns.rs`,
  `#[ignore]`-gated like the other Postgres suites:
  `fuz_testing::assert_column_projections(&pool, &[…sets])`. Every live table
  in the migrated chains is a const or a reasoned exemption, and each const
  names exactly its live columns. Each spine crate exports a
  `fuz_db::ColumnProjections` set per migration chain
  (`AUTH_COLUMN_PROJECTIONS`, `CELL_COLUMN_PROJECTIONS`, …); a consumer
  composes `DB_COLUMN_PROJECTIONS` (always, first: it covers
  `schema_version`), the sets of the chains it migrates, and a set for its
  own tables. Never copy a spine chain's
  table list into a consumer, so a spine table addition reaches every
  registry through one edit.
- An action handler never commits; the dispatcher does. Code that opens its
  own transaction commits with `fuz_db::commit_checked` (see
  ./rust-spine.md).

## Anti-patterns

- `SELECT *` or `RETURNING *` on a table read, "mapper-fed" or not. The
  mapper narrows the wire, not the read. (Inside a CTE whose outer select
  projects through the const is fine.)
- A second column list: a qualified copy, a `SELECT id, name` typed at one
  site, a shared hand-typed list decoded by integer index.
- Folding a derived expression into the const.

Related: ./testing-patterns.md (`describe_db`, `.db.test.ts`),
./rust-spine.md, ./twin-impl.md.
