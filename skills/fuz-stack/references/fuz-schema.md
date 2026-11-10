---
description: fuz_schema conventions — strict objects, naming, brands, defaults, metadata, introspection
---

# fuz_schema Schemas

`@fuzdev/fuz_schema` is the stack's one schema library: the packages below
fuz_app (fuz_util, gro, fuz_css), CLI and task args (parsed by fuz_util's
`args_parse`, ./task-patterns.md), tooling, fuz_app, and the apps built on it.
Schemas are the source of truth for data — JSON shape, TS type (`Infer`),
defaults, metadata (`meta`), and serialization. A schema is plain data
(`{kind, def, run}`): walkable (`@fuzdev/fuz_schema/introspect.ts`),
exportable as JSON Schema (`to_json_schema`), and, for the portable subset,
loadable by the library's Rust side (`to_schema_json`). The library's README is
the API reference; this page is the stack's conventions over it.

```typescript
import * as s from '@fuzdev/fuz_schema/schema.ts';

export const MyThing = s.object({
	name: s.pipe(s.string, s.min_length(1)),
	count: s.with_default(s.safe_integer, 0),
	kind: s.one_of(['a', 'b'])
});
export type MyThing = s.Infer<typeof MyThing>;
```

**Imports split by layer**: fuz_util, gro, and fuz_css import the namespace
(`import * as s`); fuz_app and the apps use named imports
(`import {object, string, type Infer} from '@fuzdev/fuz_schema/schema.ts'`).
`void` is a reserved word, so a named import aliases it:
`import {void as fuz_void}`. This page writes `s.` throughout.

`Flavored` and `Branded` (the nominal types) also live in `schema.ts`; fuz_util
and fuz_app re-use them rather than defining their own.

## Schema helpers by layer

| Layer        | Module                                         | Capabilities                                                                                                                                                                                                 |
| ------------ | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Library      | `@fuzdev/fuz_schema/introspect.ts`             | `unwrap_schema`, `get_schema_meta` (outer layers), `find_schema_meta` (everything a value reaches), `get_schema_entries`, `get_schema_fields`, `format_schema_type`                                           |
| Library      | `@fuzdev/fuz_schema/meta.ts`                   | `meta`, `get_meta`; the `SchemaMeta` interface consumers extend by declaration merging                                                                                                                       |
| Spine        | `@fuzdev/fuz_app/primitive_schemas.ts`         | `Uuid` (+ `create_uuid`, `UuidWithDefault`), `Timestamp`, `Username` / `UsernameCanonical` / `UsernameProvided`, `Email`, `bounded_string`, `Blake3Hash`, `FactHashSchema`, `ActingActor`                     |
| Spine        | `@fuzdev/fuz_app/auth/name_schema.ts`          | `create_name_schema(label)` — the shared name grammar (`RoleName`, `ScopeKindName`, …)                                                                                                                      |
| HTTP         | `@fuzdev/fuz_app/http/schema_helpers.ts`       | `schema_to_surface()` (JSON Schema for API surfaces), `is_null_schema`, `is_void_schema`, `is_strict_object_schema`, `safe_parse_dropping_unknown_keys`                                                   |
| Testing      | `@fuzdev/fuz_app/testing/schema_generators.ts` | Schema-driven valid values and bodies, which feed the adversarial suites (`testing/adversarial_input*.ts`)                                                                                                    |
| Cells (zzz)  | `@fuzdev/zzz/cell_types.ts`, `path_schemas.ts` | `CellJson`, `cell_json_schema(entries, cell_class_name)`; path transforms (`PathWithTrailingSlash`, `PathWithoutTrailingSlash`, `PathWithLeadingSlash`)                                                      |

## Core Conventions

1. **`object` by default** — it rejects unknown keys (Zod's and valibot's
   `object` drop them; fuz_schema's is strict). Action inputs and outputs,
   union and `variant` members too; the API surface warns on a non-strict
   input. Forward compatibility is the reader's job: a reader of a remote
   payload (an action result, a peer's reply) parses with fuz_app's
   `safe_parse_dropping_unknown_keys`, as serde ignores unknown fields.
   **Exceptions**, each with a comment saying why: external data
   (`loose_object` keeps unknown keys, `strip_object` drops them — e.g. GitHub
   adds fields to API responses); persisted files read across versions
   (`strip_object`); REST error bodies (`rest_error` builds its own
   `loose_object`), JSON-RPC envelopes, and audit metadata (`loose_object`).
2. **PascalCase, schema and type share the name** — no `-Schema` suffix, no
   snake_case: `const Foo = s.object({...}); type Foo = s.Infer<typeof Foo>;`.
   (`FactHashSchema` is the exception, as its type `FactHash` lives in fuz_util.)
   The suffix is the library's: its own types are `ObjectSchema<T>`,
   `ArraySchema<T>`, `StringSchema`, and so on, and a consumer writes
   `FooSchema` only to name the *type of* an exported schema (§Exported
   Schemas).
3. **`meta(schema, {description})`** for descriptions and other metadata —
   §Metadata.
4. **`parse` returns a result, `parse_or_throw` throws** — §Validation at
   Boundaries. `parse` never throws.

## Input vs Output Types

Schemas with `with_default`, `with_default_fn`, or a `transform` have
different input and output types. `Infer<>` is the output (post-parse);
`InferInput<>` is what callers provide. Export `InferInput<>` as `FooInput`
when callers construct partial instances — constructor/factory parameters
(Cell instantiation, resource builders), config file shapes, form inputs,
partial data from storage. fuz_app's codegen types action callers by
`InferInput` (`ActionCallInputs`) and handlers by `Infer`, so a defaulted field
is optional at the call site.

```typescript
// zzz chat.svelte.ts — every Cell schema exports both
export const ChatJson = cell_json_schema(
	{
		name: s.with_default(s.string, ''),
		thread_ids: s.with_default_fn(s.array(Uuid), () => []),
		selected_thread_id: s.with_default(s.nullable(Uuid), null)
	},
	'Chat'
);
export type ChatJson = s.Infer<typeof ChatJson>; // all fields present
export type ChatJsonInput = s.InferInput<typeof ChatJson>; // defaults omittable
```

**Factory functions** accept the input type minus the discriminant and parse
to validated output with `parse_or_throw`. To validate one field alone, parse
with its entry, `s.parse_or_throw(Foo.def.name, value)`.

## Branded and Flavored Types

```typescript
// fuz_app primitive_schemas.ts — format + lowercase + brand
export const Uuid = s.brand(s.pipe(s.string, s.uuid, s.to_lower_case), 'Uuid'); // either case in, lowercase out
export type Uuid = s.Infer<typeof Uuid>;
export const create_uuid = (): Uuid => crypto.randomUUID() as Uuid;
export const UuidWithDefault = s.with_default_fn(Uuid, create_uuid);

// zzz diskfile_types.ts — check + brand for domain validation
export const DiskfilePath = s.brand(
	s.pipe(s.string, s.message(s.check((p: string) => is_path_absolute(p)), 'path must be absolute')),
	'DiskfilePath'
);
```

`brand` and `flavor` change only the output type and return the schema itself.
A plain value assigns to a flavored type but not a branded one; a branded
value comes from a parse or a cast. Marks compose: a brand of a branded schema
(`s.brand(Path, 'DirPath')`) is assignable to `Path`, not the reverse. Put the
`brand` outermost, after any step that changes the value (`to_lower_case`,
`transform`): a brand on a step before one is dropped. For compile-time-only
nominal typing with no schema, use the `Flavored` / `Branded` types
(./fuz-util.md §Type utilities). One fuz_schema install per app — a second
copy splits the brands (fuz_util's `FactHash`) and declaration-merged
`SchemaMeta` keys (./npm-dependencies.md).

## Defaults and Optionality

```typescript
count: s.with_default(s.safe_integer, 0),
thread_ids: s.with_default_fn(s.array(Uuid), () => []), // fresh value per parse for mutable defaults
port: s.optional(s.number),                              // may be omitted — request fields callers skip
email: s.nullable(Email),                                // present but null — DB columns, explicit "no value"
selected_thread_id: s.with_default(s.nullable(Uuid), null), // optional reference (Cell fields)
```

`with_default` hands out the one value it was given on every parse, so an
array or object default is shared by every output — use `with_default_fn`
for mutable defaults. Neither validates the default. A missing key reads as
`undefined`, so `optional`, `with_default`, and `with_default_fn` make a
key optional (and a `union` with such an option); `unknown` still needs its key (`s.optional(s.unknown)` for one
that may be missing). There is no `nullish`: write
`s.optional(s.nullable(X))`, sparingly. There is no `.catch()`: degrade an older stored shape
with a `union` of the shapes, or parse and fall back in code.

## Composing Object Schemas

There are no `extend`/`pick`/`omit`/`partial` helpers: an object schema's
`def` is its entries, so a new one is a spread into a factory.

```typescript
const Admin = s.object({ ...User.def, role: s.literal('admin') }); // extend; a later key overrides in place
const { password: _, ...public_entries } = User.def;
const PublicUser = s.object(public_entries); // omit
const LooseUser = s.loose_object(User.def); // another strictness
// a refined object is a `pipe`: extend its bare base, then pipe
const Range = s.pipe(s.object({ ...Bounds.def, step: s.number }), s.check(in_order));
```

A `meta`, `message`, or `brand` on the base is not carried over — reapply it.
**Cell schemas (zzz)** go through `cell_json_schema(entries, cell_class_name)`,
which spreads `CellJson.def` first and attaches `{cell_class_name}` meta for
the registry; every field has a default (instantiation from partial JSON), and
the `Cell` base class is generic over the schema
(`abstract class Cell<TSchema extends AnySchema>`).

## Exported Schemas

A package whose `dist` ships schemas emits their types into its declarations.
Every factory returns a type named for it over what it was given
(`s.ObjectSchema<{...entries}>`, `s.ArraySchema<...>`,
`s.VariantSchema<'kind', [...]>`), so a declaration prints names, not the
output and input written out. What still repeats is an unannotated schema held
by another, entries and all, so a schema other schemas hold gets its type named
once:

```typescript
const UserEntries = {
	/** A doc comment on an entry is the field's doc in the inferred types. */
	name: s.string,
	age: s.optional(s.number)
};
export interface UserSchema extends s.ObjectSchema<typeof UserEntries> {}
export const User: UserSchema = s.object(UserEntries);
export type User = s.Infer<typeof User>;
```

- A `variant` over named options needs no annotation: it prints
  `s.VariantSchema<'kind', readonly [UserSchema, BotSchema]>`.
- Where tools should print the output by name too (errors, hovers, generated
  docs), make it an interface: `export interface User extends
  s.SchemaStrictObjectOutput<typeof UserEntries> {}`, with a written-out union
  for a variant's output.
- A type written for shared entries is a `type` alias: an interface has no
  index signature and is not a `SchemaEntries`.
- A `pipe`'s output is computed by its steps and is still written out; name a
  heavy exported one with `interface FooSchema extends s.PipeSchema<Output,
  typeof First> {}`.
- **Keep the floor at the version built against.** A `dist` built against a
  fuz_schema that names a type prints that name, and over an older install
  `skipLibCheck` reads the missing name as `any` with no error. A package whose
  `dist` prints fuz_schema's types raises its range's floor whenever it
  upgrades. fuz_schema's own rule: before 1.0 a minor is a break, a type
  change that stops code compiling included, and a patch never is.

## Refinements, Formats, and Transforms

`pipe(schema, ...steps)` runs steps in order and **stops at the first
failure** (Zod runs an outer refine after a non-aborting inner failure). It
takes one to four steps; nest a `pipe` for more. Steps: `min_length` /
`max_length`, `min_value` / `max_value`, `integer`, `safe_integer` (Zod's
`int()`), `regex`, `check(fn)`, `check_at(key, fn)` (an object check that
reports at a field, like Zod's `refine` with `path`), `transform(fn)`,
`to_lower_case`. `message(schema_or_step, text)` sets the issue text.

- **Formats**: `s.pipe(s.string, s.uuid)` and `s.pipe(s.string, s.iso_datetime)`
  — prefer them to a `regex` for these, as they serialize to the Rust side
  where a `regex` doesn't. `uuid` takes RFC 9562 versions 1–8 and the nil and
  max UUIDs in any case; `iso_datetime` is UTC with a real date and at most 9
  fraction digits (fuz_schema's `docs/formats.md`). The wire timestamp is
  fuz_app's `Timestamp`.
- **No email or URL kind**: fuz_app's `Email` is its own regex, a URL is
  fuz_util's `Url`. Zod's `url()` trimmed; fuz_schema doesn't.
- **String lengths** count UTF-16 units (`String.length`); wire strings shared
  with a Rust twin use fuz_app's `bounded_string`, which the Rust spine counts
  the same way.
- **Transforms** (`transform`, `to_lower_case`) run at parse time; a
  `transform` doesn't serialize to JSON Schema output or the Rust side, and a
  root-level output `transform` fails server assembly (`schema_to_surface`
  throws) — keep transforms like zzz's `PathWith*` off action outputs.
- **Key order**: `object` returns the input itself when no entry changed it,
  where Zod returned a new object in schema order — output written to
  generated files keeps the input's key order unless reordered.

## Primitives

`string`, `number` (refuses `NaN` and the infinities), `boolean`, `bigint`,
`unknown`, `literal(v)`, `one_of([...])` (an enum), `void`; containers
`array`, `record(value)` (string keys, not validated), `object_with_rest(entries, rest)` (Zod's
`catchall`), `union`, `variant(key, options)`, `lazy(() => schema)` for
recursion (type the recursive schema as `s.Schema<T>`, or `s.Schema<T, TInput>`
where it holds a default: the annotation drops `kind`, `def`, and the input
type).

- **No input, no output** — `s.literal(null)` for HTTP input with no body
  (`input: s.literal(null)` in route specs); `s.void` for an action spec with
  no input (a bare `s.void` — `s.optional(s.void)` isn't read as void, so the
  dispatcher hands it `{}` and it refuses every call); `s.literal(null)` for a
  `request_response` action with nothing to return (a response always carries
  a `result`); `s.void` for a notification's output. fuz_app's
  `is_null_schema` / `is_void_schema` read these by shape.
- A type with no schema of its own: `s.unknown` and narrow in code, or
  `s.pipe(s.unknown, s.check(is_my_type)) as s.Schema<MyType>` — sparingly; a
  `check` keeps the type of the step before it, so only the cast types it.

## Unions and Enums

`variant(key, options)` when a field determines the shape; `union` when there's no single discriminant
or shapes mix with literals (a union of an enum with `s.literal(false)` for an
opt-out). A failed `union` reports one issue,
naming its options. On untrusted recursive input prefer `variant` — a
recursive `union` whose options walk children before telling themselves apart
is exponential in depth (`memo_union` when there's no discriminant).

**Extensible registries** validate at construction — fail at server init, not
request time: fuz_app's `create_role_registry(consumer_roles, {credential_types,
scope_kinds, grant_paths})` parses each role name with `RoleName` and throws
on invalid or duplicate names, builtin collisions, and unregistered
cross-axis entries.

## Metadata

`meta(schema, {...})` returns a copy carrying metadata in a `WeakMap`, so the
schema stays `{kind, def, run}`. `description` is built in; other keys are
added to `SchemaMeta` by declaration merging. `to_json_schema` copies every
key of every layer into its node, so a key must hold JSON and must not be
named like a JSON Schema assertion or applicator keyword (`type`, `pattern`,
…) — the emitter refuses both:

```typescript
declare module '@fuzdev/fuz_schema/meta.ts' {
	interface SchemaMeta {
		aliases?: Array<string>;
	}
}
```

fuz_app declares `sensitivity` (`@fuzdev/fuz_app/sensitivity.ts`):
`'secret'` masks the value in logs and API surface snapshots
(`meta(s.pipe(s.string, s.min_length(1)), {sensitivity: 'secret'})`),
`'personal'` (a search term about people) isn't masked; either keeps an action
input off the URL (a read goes as `POST`, not `GET`). A module that marks a
field without importing fuz_app's env modules adds
`import type {} from '@fuzdev/fuz_app/sensitivity.ts';` for the declaration.
fuz_app also declares `invalid_reason`, `empty_input_handler_guarded`, and
`readOnly` (`schema_meta.ts`).

Read metadata fail-safe: `get_meta` reads only the schema it is given;
`get_schema_meta` the outer wrapper layers; `find_schema_meta` every schema a
value can reach (pipe steps, union options, and with `{structural: true}`
object entries). A security-relevant read like `sensitivity` uses
`find_schema_meta` (fuz_app's `find_schema_sensitivity`).

## Schema Introspection

Switch on `schema.kind`, which narrows `def` (`SchemaNode`, `SchemaDefs`);
`is_schema(value)` checks the shape structurally. `message`, `brand`, `flavor`
and `meta` add no kind. Prefer the readers in `introspect.ts` over hand-written
walks: `unwrap_schema` (through `optional`/`nullable`/defaults/`pipe`/`lazy`),
`get_schema_entries` / `get_schema_fields` (an object's entries under its
wrappers, with default and description), `format_schema_type` (help output).
(fuz_app's `SchemaFieldInfo` is what its test generators read, not a general
field reader — use `get_schema_fields`.)

## Validation at Boundaries

- **`parse` for external input** where invalid data is a normal condition —
  `const result = s.parse(Schema, data); if (!result.ok) ...result.issues`.
  Route specs validate input this way and output in DEV only; issue details
  reach production responses only through `dev_only`.
- **`parse_or_throw` for fail-fast** where invalid data is a bug or fatal
  misconfig — internal assertions, factories, Cell field updates. It throws a
  `SchemaError` carrying the issues.
- **`parse` + custom throw** when the error needs context, carrying the raw
  input (fuz_app's env loading: `EnvValidationError(raw, issues)`).
- **`parse` + return null** for optional data that may be absent or invalid —
  an optional config file (`runtime.warn(...); return null`).
- **`s.is(Schema, value)`** for a yes/no with no issues built; it narrows to
  the *input* type (`InferInput`), not the output.

Issues are `{kind, expected, received, path, message}` and never hold the
failed value, so they're safe to log; `path` keys come from the input, so
treat them as untrusted text. Format one with `format_issue` (`path: expected
X, received Y`); `get_issue_value(issue, input)` reads the value back when
needed, and `format_issue_with_value(issue, input)` writes a failed string,
number, or boolean in place of its type (`received "funtion"`), for a caller
that still holds the input and may show it. A parse reports at most a hundred
issues; a `SchemaError` thrown by `parse_or_throw` lists ten and says how many
more failed. Recognize one across two installed copies by `error.name ===
'SchemaError'` and `error.issues`: `instanceof` is per copy.

## Quick Reference

| Convention                     | Correct                                                  | Wrong                                                   |
| ------------------------------ | -------------------------------------------------------- | ------------------------------------------------------- |
| Object schemas (internal)      | `s.object({...})`                                        | `s.loose_object({...})` without a reason                |
| Object schemas (external data) | `s.loose_object` / `s.strip_object` with comment         | `s.object({...})`                                       |
| Action outputs                 | `s.object({...})`; readers drop unknown keys             | `s.loose_object` for forward compat                     |
| REST error bodies, envelopes   | `s.loose_object({...})` — tolerates added fields         | `s.object({...})`                                       |
| Discriminated unions           | `s.variant('type', [s.object({type: s.literal('a'), ...})])` | `s.union` when a key decides the shape              |
| Descriptions                   | `meta(schema, {description: '...'})`                     | a comment the schema can't carry                        |
| Schema naming                  | `const MyThing = s.object(...)`                          | `const my_thing`, `const MyThingSchema`                 |
| Type inference (output)        | `type MyThing = s.Infer<typeof MyThing>`                 | separate name from schema                               |
| Type inference (input)         | `type MyThingInput = s.InferInput<typeof MyThing>`       | manual partial types                                    |
| Extend / omit                  | `s.object({...Base.def, x})`                             | a hand-rolled `extend` helper                           |
| IDs and paths                  | `s.brand(s.pipe(s.string, ...), 'MyId')`                 | plain `s.string`                                        |
| UUID / timestamp               | `Uuid`, `Timestamp` (fuz_app) — `s.uuid`, `s.iso_datetime` | a `regex`                                             |
| Mutable default                | `s.with_default_fn(s.array(X), () => [])`                | `s.with_default(s.array(X), [])` (shared)               |
| HTTP/API input                 | `s.parse(Schema, data)` and check `ok`                   | `parse_or_throw` on untrusted input                     |
| Factories                      | `s.parse_or_throw(Schema, data)`                         | `parse` with unnecessary error handling                 |
| Env loading                    | `parse` + custom throw (better error context)            | bare `parse_or_throw` (loses raw values)                |
| Optional config files          | `parse` + return null                                    | `parse_or_throw` (crashes on a bad file)                |
| No input (action)              | `s.void` (`fuz_void` as a named import)                  | `s.optional(s.void)`, omitting it                       |
| No body (route) / no result    | `s.literal(null)`                                        | `s.void` for a `request_response` output                |
| Optional reference             | `s.with_default(s.nullable(Uuid), null)`                 | `s.optional(Uuid)` (ambiguous undefined vs absent)      |
| Key-value maps                 | `s.record(ValueSchema)`                                  | `s.object` with dynamic keys                            |
