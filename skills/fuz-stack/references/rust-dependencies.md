---
description: Approved external crate allowlist for Rust workspaces
---

# Approved Rust Dependencies

The allowlist of external crates for the canonical Rust workspaces — CLIs and
daemons, WASM/FFI/N-API bindings, web servers and spine crates
(different-paradigm repos like games and protocol research carry their own).
Prefer these; reach outside only with explicit approval (§Adding a
dependency). For an external project adopting fuz-stack the list is advisory;
the approval process applies inside the ecosystem.

Source of truth is each repo's root `[workspace.dependencies]`; this doc mirrors
their **union** (any one workspace carries a small subset as direct deps — zap
the fewest, the forge more — the rest transitive via the spine). Path-dep crates
(including cross-repo deps onto the spine) aren't dependencies in this sense. A
few approved crates are pinned at the member-crate level rather than the root:
`js-sys`, `wasm-bindgen`, `talc` (wasm32-only) in `tsv_wasm`; `similar`,
`tempfile` in `tsv_debug`; `libc` in `zzz_server`; `http-body-util` as a
`fuz_http` dev-dependency. Verify against the workspaces periodically.

## Serialization & encoding

| Crate        | Purpose                                                 |
| ------------ | ------------------------------------------------------- |
| `serde`      | Derive-based serialization framework                    |
| `serde_json` | JSON (tsv enables `preserve_order` + `float_roundtrip`) |
| `postcard`   | Compact binary serialization (the fuzd UDS wire)        |
| `toml`       | TOML parsing — parse-only features (`std`, `serde`, `parse`), for reading declarative registries |
| `hex`        | Hex encoding/decoding                                   |
| `base64`     | URL-safe base64 (tokens)                                |

## Errors & core utilities

| Crate                                                      | Purpose                                                                                                |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `thiserror`                                                | Derive typed error enums                                                                               |
| `futures` / `futures-util`                                 | Async combinators, `BoxFuture`                                                                         |
| `time`                                                     | Date/time                                                                                              |
| `uuid`                                                     | UUIDs                                                                                                  |
| `semver`                                                   | Semantic-version parsing                                                                               |
| `url`                                                      | URL parsing                                                                                            |
| `tempfile`                                                 | Temp files/dirs (`NamedTempFile`)                                                                      |
| `smallvec`                                                 | Stack-allocated small vectors                                                                          |
| `bytes`                                                    | Cheaply-cloneable byte buffers (Postgres wire params in `fuz_db`)                                      |
| `bumpalo`                                                  | Arena allocation (`collections` feature) — tsv's core AST strategy; see ./rust-perf.md §Arena allocation |
| `phf`                                                      | Compile-time perfect-hash maps/sets (keyword tables)                                                   |
| `unicode-ident` / `unicode-segmentation` / `unicode-width` | Unicode text handling                                                                                  |
| `similar`                                                  | Text diffing (tsv's debug/compare tooling)                                                             |

## Async runtime & networking

| Crate                  | Purpose                                                                                                                          |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `tokio`                | Async runtime                                                                                                                    |
| `tokio-util`           | `CancellationToken`, `TaskTracker`                                                                                               |
| `axum`                 | HTTP server (on hyper)                                                                                                           |
| `axum-extra`           | axum extras (typed headers, cookies)                                                                                             |
| `hyper` / `hyper-util` | HTTP/1 connection serving under axum — used directly where the server owns connection lifecycles (cutting stalled ones at shutdown) |
| `tower` / `tower-http` | Service middleware                                                                                                               |
| `tungstenite`          | WebSocket protocol types — `fuz_realtime` downcasts axum's `tungstenite::Error` (pinned to axum's version)                       |
| `reqwest`              | HTTP client                                                                                                                      |
| `rustls`               | TLS backend for `reqwest` — installs the `ring` crypto provider as the process default (`reqwest` is wired `rustls-no-provider`) |

## Concurrency

| Crate         | Purpose                                                                                                                                                     |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `parking_lot` | `Mutex`/`RwLock` for sync-only critical sections (no poisoning). See ./rust-perf.md §Async lock hygiene for when to use `tokio::sync` or `std::sync` instead. |
| `lru`         | Bounded LRU cache backing the `RateLimiter` — caps tracked keys so a key-enumeration attacker can't grow the map unboundedly (twin of fuz_app's `LruMap`).  |

## Database

| Crate               | Purpose                 |
| ------------------- | ----------------------- |
| `tokio-postgres`    | Async PostgreSQL client |
| `deadpool-postgres` | Connection pooling      |

## Crypto & auth

| Crate           | Purpose                                                                                                                                                            |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `blake3`        | Content-addressed hashing, token hashing                                                                                                                           |
| `ring`          | SHA-512 digests (zap's content detection) — already in the graph as the `rustls` crypto provider, so no new C or build deps; used through one wrapper module, so the backend swaps to `sha2` in one place |
| `argon2`        | Password hashing                                                                                                                                                   |
| `ed25519-dalek` | Ed25519 signing/verification (artifact + release signatures)                                                                                                       |
| `hmac` / `sha2` | HMAC-SHA256 (signed cookies, keyring)                                                                                                                              |
| `subtle`        | Constant-time comparison                                                                                                                                           |
| `zeroize`       | Secure memory clearing                                                                                                                                             |
| `getrandom`     | OS randomness — the spine standard for new randomness (`fuz_sys::rand`, `fuz_auth`, `fuz_storage`)                                                                 |
| `rand`          | RNG — pinned `0.8` in `[workspace.dependencies]`, consumed only by `fuz_sign` (the `ed25519-dalek` → `rand_core 0.6` constraint). Prefer `getrandom` for new code. |

## Filesystem & OS

| Crate    | Purpose                                                     |
| -------- | ----------------------------------------------------------- |
| `nix`    | POSIX syscalls (advisory `flock`, permissions)              |
| `libc`   | Raw libc FFI for syscalls/types beyond `nix` (PTY, signals) |
| `rustix` | Safe syscalls `nix` lacks, where `unsafe` is forbidden (zap's xattr reads for POSIX ACLs) |
| `notify` | Filesystem watching (inotify / FSEvents)                    |
| `landlock` | Linux Landlock sandboxing through a safe API (gro's confined eval: read-only roots, no write/exec, no TCP) |
| `seccompiler` | Linux seccomp-bpf filters (the no-exec / no-socket backstop in fuzi and gro's confined eval) |
| `tar`    | tar archives                                                |
| `flate2` | gzip / deflate                                              |

## CLI

| Crate  | Purpose                                                                                             |
| ------ | --------------------------------------------------------------------------------------------------- |
| `argh` | Derive arg parser, size-optimized. See ./rust-patterns.md §CLI Patterns for the parser-tier guidance. |

## Logging

| Crate                | Purpose                                                                            |
| -------------------- | ---------------------------------------------------------------------------------- |
| `tracing`            | Structured logging                                                                 |
| `tracing-subscriber` | Subscriber / formatting layers (consumed via `fuz_sys::logging`, not per-consumer) |
| `tracing-appender`   | Non-blocking file appender                                                         |

## WASM, N-API & host

| Crate                                 | Purpose                                                                                                                                                                                                                                                                                       |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `wasm-bindgen`                        | JS interop (wasm-pack)                                                                                                                                                                                                                                                                        |
| `js-sys`                              | engine-native `JSON.parse` for the wasm-bindgen parse exports (tsv)                                                                                                                                                                                                                           |
| `talc`                                | WASM global allocator (`tsv_wasm`, wasm32-only target dep) — pure-Rust `no_std` replacement for std's dlmalloc; use the `WasmGrowAndExtend` source (the default claim source fragments a long-lived instance's linear memory). Pulls `lock_api` + `allocator-api2` into the wasm32 graph only |
| `napi` / `napi-derive` / `napi-build` | N-API bindings — the native Node.js/Bun npm path (`tsv_napi`); `napi-build` is the matching build dep                                                                                                                                                                                         |
| `wit-bindgen`                         | Component-model bindings                                                                                                                                                                                                                                                                      |
| `wasmtime` / `wasmtime-wasi`          | WASM host (tests, benches)                                                                                                                                                                                                                                                                    |
| `deno_core` / `deno_web` / `deno_webidl` | V8 embedding plus the web-platform APIs for gro's `fgro` runtime (pulls `rusty_v8`) |
| `tsv_ts` | tsv's TypeScript parser, a git-pinned crate: `fgro` strips TypeScript in process |

See ./wasm-patterns.md for the binding-layer conventions these support.

## Image processing

**`libvips`** — Rust bindings to the system **libvips** image library (the
same engine `sharp` wraps) for decode/resize/encode (JPEG/PNG/WebP/AVIF),
EXIF-orientation baking, metadata stripping, and thumbnailing. For
spine-consumer servers with an image-upload pipeline (e.g. `visiones_server`).

- Dynamically links system libvips: `libvips42t64` (Debian 13) at runtime +
  `libvips-dev` at build time — not a static-musl crate; on a Debian host
  `zap` installs it via apt.
- The `unsafe` FFI lives inside the binding — consumer crates keep
  `unsafe_code = "forbid"`.
- Chosen over the pure-Rust `image`/`ravif`/`image-webp` stack because
  matching `sharp`'s formats there pulls in `libwebp` + `dav1d` C deps
  anyway, across more crates and with worse parity.

## Crate-vs-feature isolation (supply-chain)

When a capability must be kept **out of** a binary's dependency graph for
security or trust reasons, make it a **separate crate, not a cargo feature**.
Cargo unifies features across a `--workspace` build, so a feature-gated
"signing" or "test-hasher" path can be silently turned on by an unrelated
crate's feature selection. A separate crate can't be: it is either in the
dependency graph or it is not, and that is auditable.

- `fuz_sign` is a separate crate (not a `fuz_crypto` feature) so signing stays
  out of the `fuz` consumer graph — `fuz` links verification-only `fuz_crypto`.
- `fuz_testing` is a separate crate (not a `fuz_auth` feature) so the weakened
  test Argon2 params can't reach a production binary.
- Enforcement is the `cargo xtask check-release` dep-graph audit (`fuz_audit`),
  which fails if any non-`testing_`-prefixed binary transitively links a
  forbidden crate; workspaces add extra forbids via `AuditRules`. See
  ./rust-spine.md §xtask & check-release for the entry points and the
  built-in layering rules.

## Shared low-level leaves

**When a utility gets reimplemented a third time, extract it as a spine-free
leaf** — no tokio-server/HTTP/DB surface, so spine-free repos can link it too.
`fuz_eval` (the sandboxed config-eval harness, lifted out of zap) is the proven
case, now shared down to its JS wrapper ingredients. `fuz_sys::periodic` is the
second: the loop every spine server's sweeps run on, a default-off feature of
the existing leaf rather than a new crate (./rust-patterns.md §Async Runtime &
Graceful Shutdown).

Known-duplicated, not yet extracted: a minimal dotenv (`KEY=VALUE`) parser
(three copies), an env-isolating subprocess harness with a capped output drain
(one, awaiting a second consumer), the atomic-write/flock dance for consumers
that can't link `fuz_sys::fs::write_atomic` (./rust-patterns.md §Transactional
state files), and an exponential-backoff retry combinator (none generic today —
the only backoff is supervision-shaped, not request-retry).

Signal-crate convention: prefer `nix` for syscall wrappers; reserve `libc` for
types/constants `nix` doesn't expose (PTY). Avoid pulling both into one
workspace for the same job.

## Feature hygiene

- **`default-features = false` + explicit feature lists** for deps with heavy
  optional trees — `reqwest`, `nix`, `notify`, `futures-util` all do. Opt into
  exactly what the workspace uses; don't inherit a crate's default surface.
- **`multiple_crate_versions = "allow"`** (./rust-patterns.md §Lints) tolerates
  _forced_ duplicate majors from the dep graph — transitive constraints two
  upstream crates disagree on, unresolvable until one bumps. Not a license to
  ignore version drift you control.

## Adding a dependency

Prefer std, then this list. A new crate — third-party **or** a new first-party
workspace member — needs explicit approval: name, purpose, what it replaces or
enables, transitive footprint (a new `crates/<name>/` is a build-graph and
release-surface decision; a module inside an existing crate isn't). Add at
`[workspace.dependencies]` so members share one version, then record it here.
Removing an unused dep is pre-authorized: verify nothing references it
(features and build scripts included), drop it from the workspace and this
list in the same change.
