---
description: Zod conventions — strictObject, branded types, introspection
---

# Zod Schemas

Zod schemas are the source of truth for fuz_app's app data and the apps
built on it — JSON shape, TypeScript type (`z.infer`), defaults, metadata
(`.meta()` → runtime reflection), and serialization. They're
runtime-inspectable (walkable via `@fuzdev/fuz_app/zod.ts`, exportable via
`z.toJSONSchema`) and JSON-native —
branded strings for timestamps (`Datetime`), IDs (`Uuid`), and paths avoid
serialization friction. Everything else — the packages below fuz_app, CLI
and task args (parsed by fuz_util's `args_parse`, ./task-patterns.md),
tooling, fuz_app's env loading (`BaseServerEnv`, `load_env`) and testing
daemon-info file — is `@fuzdev/fuz_schema`.

## Schema helpers by layer

| Layer        | Module                                                   | Capabilities                                                                                                                                                                       |
| ------------ | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spine        | `@fuzdev/fuz_app/zod.ts`                                 | Walkers — unwrap wrappers (`zod_unwrap_def`, `zod_get_base_type`, `zod_get_innermost_type`, `zod_unwrap_to_object`); field helpers (`zod_get_schema_keys`, `zod_get_field_schema`); `zod_extract_fields` → `SchemaFieldInfo` (`name`, `base_type`, `required`, `has_default`, `nullable`) |
| Spine        | `@fuzdev/fuz_app/primitive_schemas.ts`                   | `Uuid`, `Datetime`, `Blake3Hash`, `FactHashSchema` (output `FactHash`, a fuz_schema `Branded` from `@fuzdev/fuz_util/hash_schemas.ts`) + factories (`create_uuid`, `get_datetime_now`, `UuidWithDefault`, `DatetimeNow`)                                               |
| Cell helpers | `@fuzdev/zzz/zod_helpers.ts`                             | Path-transform schemas (`PathWithTrailingSlash`, `PathWithoutTrailingSlash`, `PathWithLeadingSlash`)                                                                               |
| HTTP         | `@fuzdev/fuz_app/http/schema_helpers.ts`                 | `schema_to_surface()` — JSON Schema via `z.toJSONSchema()` for snapshot-testable API surfaces                                                                                      |
| Testing      | `@fuzdev/fuz_app/testing/schema_generators.ts`           | Schema-driven test data — valid bodies, adversarial inputs                                                                                                                         |

## Core Conventions

1. **`z.strictObject()`** for all object schemas, including members of
   `z.discriminatedUnion()` / `z.union()`. **Exceptions**, each with a comment
   saying why: external data (`z.looseObject()`, or `z.object()`; e.g. GitHub
   adds fields to API responses); client-consumed response/error schemas
   (`z.looseObject()` so fields can be added without breaking clients);
   protocol shapes the other side may extend per spec (JSON-RPC messages).
2. **PascalCase, schema and type share the name** — no `-Schema` suffix, no
   snake_case.
3. **`.meta({description: '...'})`**, not `.describe()` — `.meta()` supports
   additional keys (`sensitivity`).
4. **`safeParse` for external input, `parse` for fail-fast** — §Validation at
   Boundaries.

```typescript
import { z } from 'zod';

export const MyThing = z.strictObject({
	name: z.string().min(1),
	count: z.number().int().default(0),
	kind: z.enum(['a', 'b'])
});
export type MyThing = z.infer<typeof MyThing>;
```

## Input vs Output Types

Schemas with `.default()` or `.transform()` have different input and output
types. `z.infer<>` is the output (post-parse); `z.input<>` is what callers
provide before defaults. Export `z.input<>` as `FooInput` when callers
construct partial instances via `.parse()` — constructor/factory parameters
(Cell instantiation, resource builders), config file shapes, form inputs,
partial data from storage. Skip it for internally-consumed schemas (action
spec `satisfies`).

```typescript
// zzz — every Cell schema exports both
export const ChatJson = CellJson.extend({
	name: z.string().default(''),
	thread_ids: z.array(Uuid).default(() => []),
	selected_thread_id: Uuid.nullable().default(null)
}).meta({ cell_class_name: 'Chat' });
export type ChatJson = z.infer<typeof ChatJson>; // all fields present
export type ChatJsonInput = z.input<typeof ChatJson>; // defaults omittable
```

**Factory functions** accept `z.input<>` minus the discriminant and parse to
validated output:

```typescript
// PackageResource = ResourceBase.extend({type: z.literal('package'), …}); PackageResourceInput = z.input<…>
export const package_resource = (config: Omit<PackageResourceInput, 'type'>): PackageResource =>
	PackageResource.parse({ type: 'package', ...config });
```

## Branded Types

```typescript
// fuz_app/primitive_schemas.ts — Zod 4 validators + brand
export const Uuid = z.uuid().toLowerCase().brand('Uuid'); // either case in, lowercase out
export const Datetime = z.iso.datetime().brand('Datetime');

// zzz/diskfile_types.ts — refine + brand for domain validation
export const DiskfilePath = z
	.string()
	.refine((p) => is_path_absolute(p), { message: 'path must be absolute' })
	.brand('DiskfilePath');

// simple string + brand (no runtime format check)
export const ResourceId = z.string().min(1).brand<'ResourceId'>();
```

Each pairs with `export type X = z.infer<typeof X>`. Dynamic defaults use
factories (`Uuid.default(create_uuid)`, `Datetime.default(get_datetime_now)`).
For compile-time-only nominal typing without validation, use `Flavored` from
`@fuzdev/fuz_schema/schema.ts` (./fuz-util.md §Type utilities).

## Defaults and Optionality

```typescript
count: z.number().int().default(0),
thread_ids: z.array(Uuid).default(() => []),       // factory for mutable defaults
port: z.number().optional(),                       // may be omitted — request fields callers skip
email: Email.nullable(),                           // present but null — DB columns, explicit "no value"
selected_thread_id: Uuid.nullable().default(null), // optional reference (Cell fields)
email: Email.nullish(),                            // null | undefined — sparingly; prefer optional/nullable
before: PreviousState.nullable().catch(null),      // fallback when a *present* value fails — older stored shapes
```

`.catch()` differs from `.default()` (missing field) — it's graceful
degradation for data written by an older schema version.

## Field-Level Validation and Transforms

`.shape` reuses one field's validator without parsing the whole object
(`PartJsonBase.shape.has_xml_tag.parse(value)`, or `.default(true)` to
override an inherited default in a subtype).

Transforms run at parse time; compose with `.pipe()`:

```typescript
export const PathWithTrailingSlash = z.string().transform((v) => ensure_end(v, '/'));
export const DiskfileDirectoryPath = PathWithTrailingSlash.pipe(DiskfilePath).brand('DiskfileDirectoryPath');
```

## Zod 4 Primitives

`z.uuid()` / `z.iso.datetime()` (paired with brands);
`z.toJSONSchema(schema)` (API surface snapshots); `z.prettifyError(error)`
(error messages); `z.record(K, V)` (resource maps, JSON rows).

Porting to fuz_schema, `z.uuid()` is `s.pipe(s.string, s.uuid)` and
`z.iso.datetime()` is `s.pipe(s.string, s.iso_datetime)`, which serialize to
fuz_schema's Rust crate where a `regex` doesn't. `uuid` also takes the max
UUID in any case, and `iso_datetime` caps a fraction at 9 digits (fuz_schema's
`docs/formats.md`). There is no email or URL kind: fuz_app's `Email` is its own
regex, and a URL is fuz_util's `Url`. A `.toLowerCase()` after it becomes
a fuz_schema `transform`, which doesn't serialize.

- `z.null()` for HTTP input with no body (`input: z.null()` in route specs);
  `z.void()` for an action spec with no input (a bare `z.void()`: a wrapped
  one such as `z.void().optional()` isn't read as void, so the dispatcher
  hands it `{}` and it refuses every call); `z.void()` or `z.void().optional()`
  for no output
- `z.custom<T>(check?)` embeds complex types without full validation — sparingly
  (`z.custom<z.ZodType>(...)` in fuz_app action specs)

## Schema Introspection

Prefer `instanceof` (`schema instanceof z.ZodObject`) and the public `.def`
getter (`schema.def.type`) — not `._zod.def` (same value, internal API).
`@fuzdev/fuz_app/zod.ts` unwraps optional/nullable/default/transform/pipe
wrappers (`zod_unwrap_def`, `zod_get_base_type`, `zod_get_innermost_type`,
`zod_unwrap_to_object`) and reads object fields (`zod_get_schema_keys`,
`zod_get_field_schema`). `zod_extract_fields` returns a `SchemaFieldInfo` per
field (`required`, `has_default`, `nullable`) — use it for
optional/nullable/default checks. fuz_util itself is zod-free.

## Unions and Enums

`z.discriminatedUnion()` when a field determines the shape (better errors);
`z.union()` when there's no single discriminant or shapes mix with literals
(fuz_app's `JsonrpcMessage`; a union of an enum with `z.literal(false)` for
an opt-out). Members are `z.strictObject()`.

**Extensible enums** use a factory that merges builtins with app-defined
entries and validates at construction — fail at server init, not request time:

```typescript
// fuz_app auth/role_schema.ts
const { Role, role_specs } = create_role_schema(
	[{ name: 'teacher', description: '…', grant_paths: ['admin'] }], // ReadonlyArray<RoleSpec>
	{ credential_types, scope_kinds, grant_paths } // optional registries for cross-axis validation
);
// Role: z.ZodType<string> for I/O boundaries; role_specs: ReadonlyMap<string, RoleSpec>
```

Throws on invalid/duplicate names, builtin collisions, unregistered cross-axis
entries.

## Schema Extension

`.extend()` adds or overrides fields, preserving strict mode:

```typescript
export const RequestResponseActionSpec = ActionSpec.extend({
	kind: z.literal('request_response').default('request_response'),
	auth: RouteAuth, // four-axis {account, actor, roles?, credential_types?}
	async: z.literal(true).default(true)
});
```

**Cell schemas (zzz)** are `CellJson.extend()`: every field has `.default()`
(instantiation from partial JSON); `.meta({cell_class_name})` links schema to
class for the registry; both `FooJson` and `FooJsonInput` (constructors and
`set_json()`) are exported; the base class is generic over the schema
(`abstract class Cell<TSchema extends z.ZodType>`) and validates with
`this.schema.parse()`.

## Metadata

`description` documents the field and carries into `z.toJSONSchema` output;
other keys are domain-specific. fuz_app's `SchemaFieldMeta`
(`@fuzdev/fuz_app/schema_meta.ts`) adds `sensitivity: 'secret'`, which masks
values in logs and API surface snapshots
(`token: z.string().min(1).meta({sensitivity: 'secret'})`), and
`sensitivity: 'personal'` for personal data (a search term about people),
which isn't masked. Both keep an action input off the URL: a read whose input
carries either goes as a `POST`, not a `GET`. fuz_app's fuz_schema env fields
carry the same key through `meta(schema, {sensitivity})`, which
`@fuzdev/fuz_app/sensitivity.ts` declares on fuz_schema's `SchemaMeta`.

## Validation at Boundaries

- **`safeParse` for external input** where invalid data is a normal condition —
  route-spec input middleware (parsed data stored as
  `c.set('validated_input', result.data)`; `dev_only(result.error.issues)`
  strips issue details from production responses), external API responses. Route
  specs validate input via `safeParse` and output in DEV only.
- **`parse` for fail-fast** where invalid data is a bug or fatal misconfig —
  internal assertions (`RoleName.parse(name)`), factories, Cell field updates.
- **`safeParse` + custom throw** when the error needs context, carrying the
  raw input in the thrown error (fuz_app's env loading does this in
  fuz_schema: `EnvValidationError(raw, issues)`).
- **`safeParse` + return null** for optional data that may be absent or invalid
  — an optional config file (`runtime.warn(...); return null`).

Format errors with Zod 4's built-ins: `z.prettifyError` (multi-line, error
messages), `z.treeifyError` (nested, mirrors the schema), `z.flattenError`
(`{formErrors, fieldErrors}`, forms).

## Quick Reference

| Convention                     | Correct                                                  | Wrong                                                    |
| ------------------------------ | -------------------------------------------------------- | -------------------------------------------------------- |
| Object schemas (internal)      | `z.strictObject({...})`                                  | `z.object({...})`                                        |
| Object schemas (external data) | `z.looseObject({...})` or `z.object({...})` with comment | `z.strictObject({...})`                                  |
| Response/error schemas         | `z.looseObject({...})` — tolerates added fields          | `z.strictObject({...})`                                  |
| Discriminated union members    | `z.strictObject({type: z.literal('a'), ...})`            | `z.object({type: z.literal('a'), ...})`                  |
| Descriptions                   | `.meta({description: '...'})`                            | `.describe('...')`                                       |
| Schema naming                  | `const MyThing = z.strictObject(...)`                    | `const my_thing`, `const MyThingSchema`                  |
| Type inference (output)        | `type MyThing = z.infer<typeof MyThing>`                 | separate name from schema                                |
| Type inference (input)         | `type MyThingInput = z.input<typeof MyThing>`            | manual partial types                                     |
| IDs and paths                  | `z.string().brand('MyId')`                               | plain `z.string()`                                       |
| HTTP/API input                 | `schema.safeParse(data)`                                 | `schema.parse(data)`                                     |
| Factories                      | `schema.parse(data)`                                     | `schema.safeParse(data)` with unnecessary error handling |
| Env loading                    | `safeParse` + custom throw (better error context)        | bare `parse` (loses raw values)                          |
| Optional config files          | `safeParse` + return null                                | `parse` (crashes on missing file)                        |
| No input                       | `z.void()`                                               | `z.void().optional()`, `z.undefined()`, omitting it      |
| No output                      | `z.void()` or `z.void().optional()`                      | `z.undefined()`, omitting the field                      |
| Optional reference             | `Uuid.nullable().default(null)`                          | `Uuid.optional()` (ambiguous undefined vs absent)        |
| Complex embedded types         | `z.custom<MyType>()`                                     | hand-rolled validation                                   |
| Key-value maps                 | `z.record(z.string(), ValueSchema)`                      | `z.strictObject` with dynamic keys                       |
