---
description: TS ↔ Rust twin implementations — convergence, naming parity, wire crates, digests
---

# Twin Implementations (TS ↔ Rust)

**Twin-impl spine**: the same backend spine — auth, db, http, realtime,
actions — ships in two implementations, TypeScript in `fuz_app` and Rust in the
spine crates (./rust-spine.md), held observably equivalent on the wire.
Consumers pick one or both — a user-facing capability, not just a dev practice.

**Twin-impl convergence**: whichever implementation lands the better shape —
security, correctness, abstraction, forensic detail — becomes canonical and
the other ports to converge. Bidirectional.

fuz_forge is the canonical twin consumer: its TS (Hono) and Rust (`fuzfd`,
axum) servers are co-maintained at full wire parity.

## Roles

- **Reference impl = run, not compiled.** The TS server is never shipped; it
  runs directly (`deno run`) as the parity twin for tests, benches, and local
  dev. The Rust binary is the production deploy; compiling a never-shipped TS
  server is dead weight.
- **The CLI is not a twin.** A CLI is a _client_ of the server — two CLIs prove
  nothing about the wire. A CLI is either **shipping** (compiled single-file
  binary) or **retired** (deleted); no "run-directly TS CLI reference" middle
  state.

## Naming parity

Shared spine concepts — types, fields, error-reason literals, named steps of a
shared algorithm — carry **parallel identifiers** modulo case convention
(`post_commit_effects` ↔ `PostCommitEffects`). A cross-impl mismatch for the
_same_ concept is a convergence defect, closed like a bug; when one side
renames, the other follows. Two subtleties: **distinct concepts keep distinct
names on both sides** (if TS has eager `pending_effects` and deferred
`post_commit_effects`, Rust carrying only the deferred one must not call it
`PendingEffects`); and parity is at the **identifier** level, not the file
level — module names may differ where scope differs. Identifier parity lets an
agent learn a concept once and find it in either spine; snake_case alignment
makes it cheap.

## Enforcement

- **The cross-backend harness** (`fuz_app`) drives both backends with the same
  requests and asserts responses **byte-for-byte** — status, body, headers.
  Consumers inherit shared _conformance principals_ (credential type × context
  combinations — daemon-token-with-Origin, invalid-token variants) so a new
  upstream auth edge case tests every consumer.
- **A declared difference is a capability flag**, not a branch on the backend's
  name or a hand-skipped case. Each backend config carries a
  `BackendCapabilities`; a suite gates a case with `test_if(capabilities.X, …)`
  (`ws_handshake_pipelining`, `ws_account_actions`) or picks how one case reads
  a result on the flag (`ws_refusal_body`). Every flag is required, so a
  full capabilities literal — the family defaults, a consumer's hand-written
  one — fails to compile until it declares a new flag; a preset spread off a
  family default inherits that default.
- **`testing_spine_stub`** is the domain-free third consumer exercising the
  Rust spine without any business logic, so spine parity is tested
  independently of zzz/fuz_forge.
- **Strict-schema parsing of read bodies** — parsing every populated read-RPC
  response with the strict TS schema catches missing/extra/renamed fields
  wholesale.
- **Schema parity** — DB introspection compared across backends, zero excluded
  tables as the target.
- **Env contract tests that _reject retired variable names_** — env handling is
  hand-written on both sides, so this is the strongest anti-drift guard.
- **Where the harness can't reach**, Rust unit serialization tests
  (`serde_json::to_value(dto) == json!(…)`) stand in.

**Twins silently diverge on paths tested on one backend only** — especially
auth/error negatives (401 anti-enumeration, malformed input, browser-context
guards). Two hand-written stacks agree on the happy path and drift on the
edges; port single-backend tests to cross tests. A live behavior difference is
either converged or documented as intentional (a version _value_ differs while
the parity test asserts the shape).

**Scope the burden**: parity is self-policing where the substrate bottoms out
in shared upstream code (`fuz_app`, the spine crates). A consumer's real
parity surface is only what it hand-writes twice — RPC handlers, domain
parsing, auth glue, env loading, subprocess use. Keep that small.

## The wire crate

Hand-written wire shapes both Rust client and server need — input validators
(slug/segment grammars), typed output DTOs — live in a dedicated `*_wire`
crate (`fuz_forge_wire`): pure logic, no spine dep. Boundaries:

- **Stack-wide constants stay spine-canonical.** JSON-RPC error codes belong to
  `fuz_http::JsonrpcErrorCode` (TS: `fuz_app`'s `jsonrpc_errors`), referenced
  by enum, never copied or spelled as magic numbers.
- **DTO serialization parity**: no `skip_serializing_if` (nullable fields emit
  `null` like TS); `#[serde(rename = "ref")]`/`"type"` for keyword fields;
  discriminated unions as `#[serde(tag = "kind", rename_all = "snake_case")]`;
  DTOs carry the **full** field set (never a client's duck-typed subset); field
  order matches the wire; booleans are real `bool`.

## Structure mirroring

Module boundaries mirror the twin's seams — if TS splits git subprocess and
record-parsing into `git/read.ts` + `git/parse.ts`, Rust splits the same way,
so byte-format contracts (`%H%x00…` format strings, RS/NUL framing) are
diffable module-to-module. Canonicalize internal identifiers on the cleaner
idiom (often the Rust name; TS tends wordier) — wire- and schema-visible forms
must already match, so internal renames are cleanup.

**Utility twins** follow the same discipline at micro scale —
`fuz_sys::env::parse_stringbool` ↔ `z.stringbool()`, the `DaemonInfo` schema
shared between zzz's Rust CLI and `fuz_app`, the `lru`-backed `RateLimiter`
twinning `fuz_app`'s `LruMap`, `fuz_sys::periodic::spawn_periodic` ↔
`fuz_app`'s `start_periodic` (same schedule; shutdown differs because a promise
cannot be dropped — the Rust task drops a pass in progress, the TS `stop()`
waits it out). When porting
a utility, find its twin first; diverging semantics under a shared name is the
same defect class as a name mismatch.

## Serde boundary conformance

When a Rust crate owns a serde JSON boundary (`#[serde(deny_unknown_fields)]`)
that hand-written TypeScript authors against (a typed config builder whose
output the Rust engine parses), keep the TS types **hand-written** and guard
them with a round-trip test, not `schemars`/`ts-rs`. Codegen is a _second_
encoding of the boundary that can itself drift from serde's tagging/rename; a
round-trip validates against the **real serde parser**. Reserve codegen for
field-level coverage enforcement or a published JSON Schema.

Two-layer guard (zap's TS config library):

1. **Round-trip conformance.** One typed "kitchen-sink" fixture exercising
   every type/field/variant, `import type`'d against the TS types and
   `export default`ing a builder. Gated twice: `gro typecheck` catches
   **types-too-strict** (a valid shape TS rejects); a Rust integration test
   evaluates it and parses the emitted JSON with the real config type,
   catching **types-too-loose** (TS accepts, serde rejects). `import type` is
   erased at runtime, so the evaluator needs no module resolution.
2. **Coverage guard.** Iterate the Rust canonical variant list
   (`ResourceType::ALL`) and assert the fixture exercises **every** variant —
   catches a variant added in Rust but absent from TS, which round-trip alone
   can't see. Pair with a loud floor (`assert!(items.len() >= N)`) so a vanished
   fixture fails instead of passing.

Optionally a thin e2e smoke through the shipped binary. Both it and the
round-trip test skip-with-notice when their runtime or binary is absent, the
same discipline as DB/Deno-gated tests (./testing-patterns.md §Environment
Flags). Gotcha: an evaluator that stubs clock/RNG to throw requires
pure-literal fixtures.

## Digests

Hashes and secrets are the twin surface where a lenient side drifts
silently: both spines must refuse the same strings, not only accept the same
ones. Rust spine names are spine crates (./rust-spine.md).

| Concept | Algorithm | Encoding | TS home | Rust home | Compare rule |
| --- | --- | --- | --- | --- | --- |
| Fact address | BLAKE3 | `blake3:` + 64 lowercase hex | fuz_util `hash_schemas.ts` (`FACT_HASH_EXACT`, `is_fact_hash`); fuz_app `FactHashSchema` | `ContentHash::parse_fact_hash`, the `fuz_crypto::fact_hash` serde adapter, `fuz_auth::is_valid_fact_hash` | exact grammar at every ingress; an off-form value is absent, never normalized |
| Fact disk location | BLAKE3 | `file:<2 hex>/<62 hex>`, lowercase | fuz_app `db/file_fact_url.ts` (`parse_file_fact_url`, `file_fact_url_addresses`) | `fuz_fact::parse_fact_file_url`, `ParsedFactUrl::addresses` | the URL must address the row's own hash before any read; a mismatch is refused as not found |
| Other content digests | BLAKE3 | bare 64 lowercase hex | fuz_util `hash_blake3`; fuz_app `Blake3Hash` | the `fuz_crypto` `blake3_hex` adapters | the adapters refuse to write a non-BLAKE3 hash |
| Session token at rest | BLAKE3, unkeyed | 64 lowercase hex | fuz_app `auth/session_queries.ts` `hash_session_token` | `fuz_auth::hash_session_token` | hash, then look up |
| API token at rest | BLAKE3 of the whole `secret_fuz_token_…` | 64 lowercase hex | fuz_app `auth/api_token.ts` `hash_api_token` | `fuz_auth::hash_api_token` | hash, then look up |
| Password | Argon2id, m=19456 t=2 p=1 | PHC string | fuz_app `auth/password_argon2.ts` | `fuz_auth` `password_argon2.rs` | library verify; an unknown account verifies against the same precomputed dummy hash |
| Session cookie | HMAC-SHA256 | `<identity>:<expires_at>.<sig>`; `expires_at` ASCII digits within `u64`; `sig` standard padded base64 of the 32-byte MAC; keys of 32+ characters | fuz_app `auth/keyring.ts`, `auth/session_cookie.ts` | `fuz_auth` `keyring.rs`, `session_cookie.rs` | strict decode (one spelling per MAC), then the MAC verify |
| Daemon token | none (raw secret) | 43 base64url characters | fuz_app `auth/daemon_token.ts` | `fuz_auth` `daemon_token.rs` | constant time |
| Bootstrap token | none (raw secret) | the file's bytes minus one optional trailing LF | fuz_app `auth/bootstrap_account.ts` | `fuz_auth` `bootstrap.rs` | raw bytes in constant time; no other trimming |
| Shell-checked download | SHA-512 | sidecar line `<128 lowercase hex>  <name>\n` | build scripts (`gro.config.ts`) | `fuz_release` | `sha512sum -c` |

Rules:

- **Wire hex is lowercase.** Check length and charset before any compare, and
  refuse rather than fold case. Third-party input whose format allows either
  case (a git `HEAD` file) is lowercased at that edge, once.
- **BLAKE3 is the native content hash.** Facts spell it `blake3:<hex>`;
  every other field is bare hex. A parser for an algorithm-tagged form
  refuses every other algorithm and spelling (uppercase, `sha256:`, SRI).
- **SHA-512 is the one digest a person checks in a shell.** Nothing carries a
  second digest beside BLAKE3 for convenience. SHA-256 appears where an
  external convention names it — CSP hashes, git object ids in a SHA-256
  repository, npm SRI tokens, LFS oids, upstream pins — and in local cache or
  staleness keys that nothing outside the package reads, mostly where the
  BLAKE3 WASM isn't a guaranteed dependency (fuz_css's extraction cache).
- **Unkeyed BLAKE3 hash-then-lookup is for random tokens of 256 bits or
  more.** Argon2id is for passwords only. Raw secrets compare in constant
  time. A stored verifier for a secret (fuz_forge's hook secret) is its
  BLAKE3; the plaintext lives only where it is presented.
- **Non-security hashes say so and state their width** — fuz_util's
  `hash_insecure` is a 32-bit DJB2 for cache keys and change detection, never
  a persisted id.
- **Test the refusals across backends.** Each strict parse gets
  cross-backend rows for its off-form inputs — uppercase, another
  algorithm, SRI, non-canonical padding, CRLF — so both sides answer the same
  status for the same string.

## Tool twins: molt

fuz_template's ejector ships as symmetric twins — `src/lib/molt.ts`
(`npm run molt`) and the `molt` crate (`cargo molt`) — at full behavior parity:
same flags, wizard, plan, byte-identical output trees. No reference/production
asymmetry: both ship, chosen by which toolchain the user has (TS so ejecting
never requires Rust; Rust to dogfood the CLI conventions). Its mechanics differ
instructively:

- **Parity is enforced against the tree, not across the twins.** Each side
  embeds its own exact-content anchors and self-verifies against the working
  tree (`cargo test` / `gro test`, both in CI) — an anchored template edit
  breaks both at the same commit, no cross-backend harness needed. Templates
  are single-sourced in `crates/molt/templates/` (`include_str!` in Rust, read
  at runtime by TS).
- **Mutual deletion bounds the burden.** Each twin's plan deletes both
  implementations (crate, TS module, tests, npm script) — zero post-eject
  parity surface.
- **Identifier parity end to end** (`build_plan`/`verify`/`apply`/`apply_gate`/
  `FEATURES`), TS sections mirroring the crate's module seams.
