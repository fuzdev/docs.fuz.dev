---
description: fuz_schema conventions — strict objects, naming, brands, defaults, metadata, parsing at boundaries
---

# fuz_schema Schemas

`@fuzdev/fuz_schema` is the stack's one schema library, from fuz_util and
gro's task args up through fuz_app and the apps. A schema is the source of
truth for a piece of data: its JSON shape, its TS type, its defaults, and its
metadata. A schema is plain data (`{kind, def, run}`), so it can be walked,
exported as JSON Schema, and, for the portable subset, loaded by the library's
Rust side. The library's README is the API reference. This page is the stack's
conventions over it and the traps.

```typescript
import * as s from '@fuzdev/fuz_schema/schema.ts';

export const MyThing = s.object({
	name: s.pipe(s.string, s.min_length(1)),
	count: s.with_default(s.pipe(s.number, s.safe_integer), 0),
	kind: s.one_of(['a', 'b'])
});
export type MyThing = s.Infer<typeof MyThing>;
```

**Imports**: the library code of fuz_app and of the apps built on it imports
by name
(`import {object, string, type Infer} from '@fuzdev/fuz_schema/schema.ts'`),
aliasing the reserved word (`void as fuz_void`). Everything else imports the
namespace (`import * as s`): the libraries below fuz_app, tooling, tasks, and
most tests. Follow the files beside the one you are in. This page writes
`s.`.

## Rules

1. **`s.object` by default. It rejects unknown keys**, where Zod's and
   Valibot's `object` drop them. Action inputs and outputs, route inputs, and
   the members of a `union` or `variant` are all strict.
2. **Forward compatibility is the reader's job, not the schema's.** A reader
   of a remote payload (an action result, a peer's reply) parses with
   fuz_app's `safe_parse_dropping_unknown_keys`, as serde ignores unknown
   fields. It can't drop a key inside a `union`, so type a remote output that
   branches as a `variant`.
3. **`s.loose_object` (keeps unknown keys) and `s.strip_object` (drops them)
   are for data the stack doesn't author**, each with a comment saying why:
   a third party's API response, a file read across versions
   (`strip_object`), protocol envelopes (JSON-RPC), REST error bodies, audit
   metadata, and a blob defined to be extensible. The comment is the form for
   new code; many existing sites lack one, and fuz_app's REST route outputs
   are loose without one.
4. **PascalCase, and the schema and its type share the name.** No `Schema`
   suffix and no snake_case:
   `const Foo = s.object({…}); type Foo = s.Infer<typeof Foo>;`. `FooSchema`
   names the _type of_ an exported schema (§Exported schemas). fuz_app's
   `FactHashSchema` is a deliberate exception, because the type
   `FactHash` lives in fuz_util.
5. **`s.parse` at a boundary, `s.parse_or_throw` for an invariant**
   (§Parsing).
6. **`meta(schema, {description})` carries what a comment can't**
   (§Metadata).

## Input and output types

A schema with a default or a `transform` has two types. `s.Infer` is the
output, after parsing; `s.InferInput` is what a caller provides. Export the
input type as `FooInput` wherever callers build partial values: constructor
and factory parameters, config files, form state. fuz_app's codegen types an
action's callers by the input and its handler by the output, so a defaulted
field is optional at the call site.

```typescript
// zzz chat.svelte.ts (abridged, written with `s.`)
export const ChatJson = cell_json_schema(
	{
		name: s.with_default(s.string, ''),
		thread_ids: s.with_default_fn(s.array(Uuid), () => []),
		// …
		selected_thread_id: s.with_default(s.nullable(Uuid), null)
	},
	'Chat'
);
export type ChatJson = s.Infer<typeof ChatJson>; // all fields present
export type ChatJsonInput = s.InferInput<typeof ChatJson>; // defaults omittable
```

zzz's Cells are the heaviest users of the pair: `cell_json_schema` spreads
the base cell's entries and gives every field a default, so a Cell hydrates
from partial JSON, and the `Cell` base class is generic over the schema.

To validate one field alone, parse with its entry:
`s.parse_or_throw(Foo.def.name, value)`.

## Brands

```typescript
// fuz_app primitive_schemas.ts (gathered, written with `s.`)
export const Uuid = s.brand(s.pipe(s.string, s.uuid, s.to_lower_case), 'Uuid'); // either case in, lowercase out
export type Uuid = s.Infer<typeof Uuid>;
export const create_uuid = (): Uuid => crypto.randomUUID() as Uuid;
export const UuidWithDefault = s.with_default_fn(Uuid, create_uuid);
```

- **`s.brand` for an identifier or path that must have been validated.** A
  branded value comes from a parse or a cast. `s.flavor` marks the type
  without refusing plain values. Both change only the output type and return
  the schema itself.
- **The brand goes outermost**, after any step that changes the value
  (`to_lower_case`, `transform`). A brand on an earlier step is dropped.
- A brand of a branded schema (`s.brand(Path, 'DirPath')`) assigns to `Path`,
  not the reverse.
- **One fuz_schema install per app.** A second copy has its own brand types,
  its own `SchemaMeta` augmentation, and its own `SchemaError` class, which is
  why a library takes fuz_schema as a peer (see ./npm-dependencies.md). The
  metadata itself is shared between copies.

With no schema, use the `Flavored` and `Branded` types (see ./fuz-util.md
§Types).

## Defaults and optionality

```typescript
count: s.with_default(s.pipe(s.number, s.safe_integer), 0),
thread_ids: s.with_default_fn(s.array(Uuid), () => []), // a fresh value per parse
port: s.optional(s.number), // may be left out
email: s.nullable(Email), // present, may be null: DB columns
selected_thread_id: s.with_default(s.nullable(Uuid), null), // an optional reference
```

- **`with_default_fn` for an array or object default.** `with_default` hands
  out the one value it was given, so every output shares it. Neither
  validates the default.
- **A stored optional reference is `with_default(nullable(X), null)`**: a
  Cell field is always present, and `null` means none. An input field a
  caller may omit is `optional(X)`.
- A key may be missing only under `optional`, `with_default`,
  `with_default_fn`, a `union` holding one, or a bare `check`. `s.unknown`
  and `s.void` entries still need their key: write `s.optional(s.unknown)`
  for an unknown value that may be absent.
- There is no `nullish` (write `s.optional(s.nullable(X))`, sparingly) and no
  `.catch()` (degrade an older stored shape with a `union` of the shapes, or
  parse and fall back in code).

## Composing objects

There are no `extend`, `pick`, `omit`, or `partial` helpers. An object schema's
`def` is its entries, so a new schema is a spread:

```typescript
const Admin = s.object({ ...User.def, role: s.literal('admin') }); // a later key overrides
const { password: _, ...public_entries } = User.def;
const PublicUser = s.object(public_entries);
const LooseUser = s.loose_object(User.def);
// a refined object is a `pipe`: extend its bare base, then pipe
const Range = s.pipe(s.object({ ...Bounds.def, step: s.number }), s.check(in_order));
```

A `meta`, `message`, or `brand` on the base is not carried over. Reapply it.

## Exported schemas

A package whose `dist` ships schemas prints their types into its declarations.
A schema that other schemas hold gets its type named once, so declarations
print the name and not the entries again:

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

The README's "Exporting schemas from a library" covers variants, pipes, and
naming the output type.

**Raise the range's floor on every fuz_schema upgrade.** A `dist` built
against a fuz_schema that names a type prints that name, and over an older
install `skipLibCheck` reads the missing name as `any`, with no error. Before
1.0 a fuz_schema minor is a break and a patch never is.

## Pipes, formats, and transforms

- **`s.pipe(schema, ...steps)` stops at the first failing step**, so a later
  `check` can assume the earlier ones passed. It takes up to four steps; nest
  for more.
- **UUIDs and timestamps use the formats**: `s.pipe(s.string, s.uuid)` and
  `s.pipe(s.string, s.iso_datetime)` (fuz_app's `Uuid` and `Timestamp`). A
  format serializes to the Rust side and a `regex` doesn't.
- **There is no email or URL kind.** fuz_app's `Email` is its own regex;
  fuz_util's `Url` checks `URL.canParse` and doesn't trim.
- **An unbounded integer is `s.pipe(s.number, s.safe_integer)`**, as Zod's
  `int()`. `s.integer` accepts integers past the safe range, so use it with
  `min_value` and `max_value` that keep it inside. `s.number` refuses `NaN`
  and the infinities.
- **`s.check(fn)` doesn't narrow.** A check keeps the type of the step before
  it, even when `fn` is a type guard. A type with no schema of its own is
  `s.pipe(s.unknown, s.check(is_my_type)) as s.Schema<MyType>`, sparingly.
- **String lengths count UTF-16 units.** A wire string shared with a Rust
  twin uses fuz_app's `bounded_string`, which the Rust spine counts the same
  way.
- **A `transform` doesn't serialize**, to output-side JSON Schema or to the
  Rust side, and one at the root of an action or route output fails server
  assembly. Keep transforms off outputs.
- **Key order**: `object` returns the input itself when no entry changed
  anything, so the input's order is kept. Once an entry changes a value (a
  default filled in, a `transform`), the output is rebuilt in the schema's
  order.
- `s.record(value)` doesn't check its keys; `s.keyed_record(key, value)`
  does, and needs a fuz_schema 0.6 range.

## No input, no output

- An action with no input: a bare `s.void`. `s.optional(s.void)` isn't read
  as void, so the dispatcher hands it `{}` and it refuses every call.
- A `request_response` action with nothing to return: `s.literal(null)`. A
  response always carries a `result`.
- A notification's output: `s.void`.
- A route with no body: `input: s.literal(null)`.

## Unions

**`s.variant(key, options)` when one field decides the shape**; `s.union`
when none does, or when shapes mix with literals. A failed `union` reports one
issue naming its options. On untrusted recursive input a `union` whose options
walk their children before telling themselves apart costs time exponential in
the depth: use `variant`, or `s.memo_union` where there is no discriminant.
Recursion is `s.lazy(() => schema)`, with the schema typed `s.Schema<T>`, or
`s.Schema<T, TInput>` when it holds a default.

A registry that consumers extend validates when it is built, so a bad entry
fails at server init and not at request time (fuz_app's
`create_role_registry`).

## Metadata

`meta(schema, {…})` (`@fuzdev/fuz_schema/meta.ts`) returns a copy carrying
metadata beside the schema, which stays `{kind, def, run}`. `description` is
built in. A consumer adds a key by declaration merging:

```typescript
declare module '@fuzdev/fuz_schema/meta.ts' {
	interface SchemaMeta {
		aliases?: Array<string>;
	}
}
```

- **A key holds JSON and isn't named like a JSON Schema assertion or
  applicator keyword** (`type`, `pattern`). `to_json_schema` copies every key
  into its output and refuses both. Annotation names (`title`, `examples`)
  are fine.
- **Read security-relevant metadata with `find_schema_meta`**, which reaches
  every schema a value can pass through (pipe steps, union options, and with
  `{structural: true}` object entries). `get_meta` reads only the schema it is
  given, and `get_schema_meta` only the outer wrappers, so either can miss a
  mark.
- fuz_app's `sensitivity` key is the worked case: `'secret'` masks a value in
  logs and surface snapshots, and either `'secret'` or `'personal'` keeps an
  action input off the URL. It is read through `find_schema_sensitivity`. A
  module that marks a field without importing fuz_app's env modules adds
  `import type {} from '@fuzdev/fuz_app/sensitivity.ts';` for the declaration.

To walk a schema, switch on `schema.kind` or use the readers in
`@fuzdev/fuz_schema/introspect.ts` (`unwrap_schema`, `get_schema_fields`)
before hand-writing a walk. `message`, `brand`, `flavor`, and `meta` add no
`kind` of their own.

## Parsing

- **`s.parse` for input that can be wrong**:
  `const result = s.parse(Schema, data); if (!result.ok) …result.issues`.
  Route and action specs validate input this way.
- **`s.parse_or_throw` where invalid data is a bug** or a fatal
  misconfiguration: internal assertions, factories. It throws a `SchemaError`
  carrying the issues.
- **`parse` and a custom throw** when the error needs the raw input for
  context (fuz_app's env loading). **`parse` and return `null`** for optional
  data, such as a config file that may be absent or malformed.
- **`s.is(Schema, value)`** answers yes or no with no issues built. It
  narrows to the _input_ type.
- **`parse` can still throw**: a `RangeError` on input nested past the
  engine's stack, well short of what `JSON.parse` reads, and any exception
  your own `check` or `transform` throws. On untrusted JSON that can nest
  without bound, catch it or bound the depth first.

Issues are `{kind, expected, received, path, message}`. They never hold the
failed value, so they are safe to log, but `path` keys come from the input:
treat them as untrusted text. Print one with `format_issue`. Recognize a
`SchemaError` from another installed copy by `error.name === 'SchemaError'`
and `error.issues`, since `instanceof` is per copy.
