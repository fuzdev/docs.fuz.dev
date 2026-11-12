---
description: TS ↔ Rust twin implementations — naming parity, enforcement, wire shapes, digests
---

# Twin Implementations (TS ↔ Rust)

The same backend spine (auth, db, http, realtime, actions) ships as two
implementations, TypeScript in `fuz_app` and Rust in the spine crates
(see ./rust-spine.md), held observably equivalent on the wire. Each is a
_spine_: "both spines" means both implementations. A consumer picks either,
or runs both over one database.

**Convergence is bidirectional.** Whichever implementation lands the better
shape (security, correctness, abstraction, forensic detail) becomes canonical
and the other ports to it. Before settling a Rust shape for a subsystem TS
already has, read the TS implementation: it often encodes a deliberate choice
the nearest Rust precedent doesn't.

fuz_forge is the canonical twin consumer: its TS server and its Rust server
(`fuzfd`) are co-maintained at wire parity.

## Roles

- **Where a consumer co-maintains both, the reference server is run, not
  compiled.** fuz_forge's TS server never ships; it runs directly on Node as
  the parity twin for tests, benches, and local dev, and the Rust binary is
  the production deploy.
- **A CLI is not a twin.** It's a client of the server, and two CLIs prove
  nothing about the wire. A CLI is either shipping or deleted, with no
  run-directly reference kept in between.
- **A tool can ship as symmetric twins** when each serves a different
  toolchain. fuz_template's ejector is `molt.ts` and the `molt` crate at
  full behavior parity, so ejecting never requires the other toolchain.
  Templates are single-sourced, each side embeds exact-content anchors and
  verifies itself against the working tree, and each side's plan deletes
  both implementations, so no parity surface survives the eject.

## Naming parity

Shared spine concepts (types, fields, error-reason literals, the named steps
of a shared algorithm) carry **parallel identifiers** modulo case
(`post_commit_effects` ↔ `PostCommitEffects`). A mismatch for the same
concept is a convergence defect, closed like a bug; when one side renames,
the other follows. An agent learns a concept once and finds it in either
spine.

- **Distinct concepts keep distinct names on both sides.** If TS has an eager
  `pending_effects` and a deferred `post_commit_effects`, a Rust side with
  only the deferred one doesn't call it `PendingEffects`.
- **Parity is per identifier, not per file.** Module names may differ where
  scope differs, but module seams mirror where a byte-format contract lives
  (fuz_forge's `git/read.ts` + `git/parse.ts` split is its Rust server's
  split too), so format strings and framing are diffable module to module.
- **Wire- and schema-visible names must match; internal names converge on
  the cleaner idiom.**
- **Utilities are twins too**, sometimes under names each language's idiom
  picks: the `EnvStringbool` schema ↔ `parse_stringbool`, `start_periodic` ↔
  `spawn_periodic`, a `RateLimiter` on each side bounding its keys with an
  LRU (fuz_util's `LruMap` ↔ the `lru` crate). When porting one, find its
  twin first. Diverging semantics between twins is the same defect as a name
  mismatch; a difference the platform forces is documented (a dropped Rust
  task abandons its pass, where a promise can't be dropped and the TS
  `stop()` waits it out).
- **Migration identity is part of parity**: the same namespaces, migration
  names, and per-namespace partitioning, so the `schema_version` trackers
  match and one database serves either backend.

## Enforcement

The harness is `fuz_app`'s testing library. A consumer reuses it and adds
its own fixtures and cross tests.

- **The same suite bodies run against each backend** over real HTTP,
  WebSocket, and SSE. In-process is the fast path; cross-process is the
  source of truth for the wire.
- **Conformance cases are data**: a table pinning status, error reason, and
  fields per request, with shared _conformance principals_ (credential type ×
  context combinations) so a new upstream auth edge case tests every
  consumer.
- **The differential makes each implementation the other's oracle.** Both
  answer the same case, the responses are normalized (volatile values become
  positional placeholders, keys are sorted, header names are compared but
  not their values) and diffed leaf by leaf. It catches what a status-only
  case and a loose output schema both pass.
- **A declared difference is recorded, never hand-skipped.** A _capability
  flag_: each backend config carries a `BackendCapabilities`, and a suite
  gates a case on it (`test_if(capabilities.X, …)`) or picks how the case
  reads its result. Flags for what a server mounts have no default, so
  adding one fails compilation until every config states it; the rest are
  required on the family defaults and inherited by a config that spreads
  one. A _known-divergence ledger row_ or an `xfail_until`, each with a
  tracking id: both fail once the difference stops showing, so they clean
  themselves. A suite `exclude` carries a required reason.
- **Declaration parity**: the schema snapshot from DB introspection, the RPC
  method manifest, and the migration tracker are compared across backends.
- **Strict parsing of read bodies**: every populated read response is parsed
  with the strict TS schema, which catches missing, extra, and renamed
  fields wholesale.
- **Shared fixtures for hand-written logic**: a JSON case table in the
  consumer's repo, read by its TS tests and by its Rust tests through
  `include_str!` (grammars, validators, env handling, retired env names). A
  census test fails on a fixture no Rust test reads.
- **`testing_spine_stub`** is a domain-free server over the Rust spine, so
  spine parity is tested without any consumer's business logic.
- **Where the harness can't reach**, a Rust unit test pins serialization
  (`serde_json::to_value(dto) == json!(…)`).

**Twins diverge on paths tested on one backend only**, especially auth and
error negatives (anti-enumeration 401s, malformed input, browser-context
guards). Two hand-written stacks agree on the happy path and drift at the
edges, so a single-backend test of an edge is ported to a cross test. A live
difference is either converged or recorded.

**Keep the hand-written surface small.** Parity is self-policing where a
consumer bottoms out in shared upstream code. Its real parity surface is
what it writes twice: handlers, domain parsing, auth glue, env loading,
subprocess use.

## Wire shapes

Hand-written wire shapes that a Rust client and server both need (input
validators, typed output DTOs) live in a dedicated `*_wire` crate
(`fuz_forge_wire`): pure logic, no spine dependency.

- **Nullable emits `null`; optional is omitted.** A field TS declares
  `nullable` is an `Option` with no `skip_serializing_if`. Only a field TS
  declares `optional` skips. A type that also crosses a postcard wire never
  skips, since postcard can't carry an absent field.
- **Key order is not a contract.** JSON-RPC output passes through
  `serde_json::Value`, whose map sorts keys. No consumer may depend on order.
- **DTOs carry the full field set**, never a client's duck-typed subset.
  Keyword fields rename (`#[serde(rename = "type")]`), unions are tagged
  enums (see ./rust-patterns.md §Type modeling), booleans are `bool`.
- **A client's reader tolerates unknown fields and keeps variant sets
  closed**: no `deny_unknown_fields`, no `#[serde(other)]`.
- **Numeric width follows the side that emits.** A `u64` or `i64` the server
  holds serializes as is; any narrowing belongs to the reader.
- **Stack-wide constants stay spine-canonical**: JSON-RPC error codes are
  `fuz_http::JsonrpcErrorCode` variants (TS: `fuz_app`'s `jsonrpc_errors`),
  never copied numbers.

## Serde boundary conformance

When a Rust crate owns a serde boundary (`#[serde(deny_unknown_fields)]`)
that hand-written TypeScript authors against (a typed config builder whose
output the Rust engine parses), keep the TS types **hand-written** and guard
them with a round trip, not `schemars` or `ts-rs`. Codegen is a second
encoding of the boundary that can itself drift from serde's tagging and
renames; a round trip validates against the real parser.

Two layers (zap's config library):

1. **Round trip.** One typed kitchen-sink fixture exercising every type,
   field, and variant, written as pure literals since the evaluator refuses
   the clock and randomness. `gro typecheck` catches types that are too
   strict (a valid shape TS rejects); a Rust integration test evaluates the
   fixture and parses the emitted JSON with the real config type, catching
   types that are too loose.
2. **Coverage.** Iterate the Rust variant list (`ResourceType::ALL`) and
   assert the fixture exercises every variant, which catches a variant added
   in Rust and absent from TS. Pair it with a loud floor
   (`assert!(items.len() >= N)`) so a vanished fixture fails.

A test that needs the evaluator follows the gated-test rule
(see ./rust-patterns.md §Testing): it never passes by skipping.

## Digests

Hashes and secrets are the twin surface where a lenient side drifts
silently: both spines must refuse the same strings, not only accept the same
ones. Rust names are crates in the fuz repo.

| Concept | Algorithm | Encoding | TS home | Rust home | Compare rule |
| --- | --- | --- | --- | --- | --- |
| Fact address | BLAKE3 | `blake3:` + 64 lowercase hex | fuz_util `hash_schemas.ts` (`FACT_HASH_EXACT`, `is_fact_hash`); fuz_app `FactHashSchema` | `ContentHash::parse_fact_hash`, the `fuz_crypto::fact_hash` serde adapter, `fuz_auth::is_valid_fact_hash` | exact grammar at every ingress; an off-form value is absent, never normalized |
| Fact disk location | BLAKE3 | `file:<2 hex>/<62 hex>`, lowercase | fuz_app `db/file_fact_url.ts` (`parse_file_fact_url`, `file_fact_url_addresses`) | `fuz_fact::parse_fact_file_url`, `ParsedFactUrl::addresses` | the URL must address the row's own hash before any read; a mismatch is refused as not found |
| Other content digests | BLAKE3 | bare 64 lowercase hex | fuz_util `hash_blake3`; fuz_app `Blake3Hash` | the `fuz_crypto` `blake3_hex` adapters | the adapters refuse to write a non-BLAKE3 hash |
| Session token at rest | BLAKE3, unkeyed | 64 lowercase hex | fuz_app `auth/session_queries.ts` `hash_session_token` | `fuz_auth::hash_session_token` | hash, then look up |
| API token at rest | BLAKE3 of the whole `secret_fuz_token_…` | 64 lowercase hex | fuz_app `auth/api_token.ts` `hash_api_token` | `fuz_auth::hash_api_token` | hash, then look up |
| Password | Argon2id, m=19456 t=2 p=1 | PHC string | fuz_app `auth/password_argon2.ts` | `fuz_auth` `password_argon2.rs` | library verify; an unknown account verifies against the same precomputed dummy hash |
| Session cookie | HMAC-SHA256 | `<identity>:<expires_at>.<sig>`; `expires_at` ASCII digits within `u64`; `sig` standard padded base64 of the 32-byte MAC; keys of 32+ characters | fuz_app `auth/keyring.ts`, `auth/session_cookie.ts` | `fuz_auth` `keyring.rs`, `session_cookie.rs` | strict decode (one spelling per MAC), then the MAC verify |
| Daemon token | none (raw secret) | 43 base64url characters | fuz_app `auth/daemon_token.ts` | `fuz_auth` `daemon_token.rs` | constant time (TS checks the grammar first; an off-form value fails the compare on either side) |
| Bootstrap token | none (raw secret) | the file's bytes minus one optional trailing LF, 32 bytes or more | fuz_app `auth/bootstrap_account.ts` | `fuz_auth` `bootstrap.rs` | raw bytes in constant time; no other trimming |
| Shell-checked download | SHA-512 | sidecar line `<128 lowercase hex>  <name>\n` | build scripts (`gro.config.ts`) | `fuz_release` | `sha512sum -c`; the Rust reader is strict on case, separator, and newline where the shell tool is lenient |

Rules:

- **Wire hex is lowercase.** Check length and charset before any compare, and
  refuse rather than fold case. Third-party input whose format allows either
  case (a git `HEAD` file) is lowercased at that edge, once.
- **BLAKE3 is the native content hash.** Facts spell it `blake3:<hex>`;
  every other field is bare hex. A parser for an algorithm-tagged form
  refuses every other algorithm and spelling (uppercase, `sha256:`, SRI).
- **SHA-512 is the digest a person checks in a shell**, and the one an npm
  integrity field must carry. Nothing carries a second digest beside BLAKE3
  for convenience. SHA-256 appears where an external convention names it —
  CSP hashes, git object ids in a SHA-256 repository, LFS oids, upstream
  pins — and in local cache or
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
