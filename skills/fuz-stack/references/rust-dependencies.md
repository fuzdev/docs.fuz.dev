---
description: Approved external crate allowlist, manifest conventions, isolate-by-crate
---

# Approved Rust Dependencies

The external crates the ecosystem's Rust workspaces may use. Prefer std, then
this list; anything else needs approval (§Adding a dependency). Inside the
ecosystem the list is a gate; for an external adopter it's advice.

It mirrors the union of the workspaces' manifests, and each workspace takes a
small subset. When this list and a manifest disagree, the manifest is the fact
and this list gets fixed. Path deps on a sibling checkout aren't dependencies
in this sense. Workspaces of another paradigm (a game, a native window host)
keep their own lists.

## The list

A crate with no note does the obvious thing. A note is a rule for using it.

**Serialization** — `serde`, `serde_json`, `hex`, `base64`

- `serde_json` takes `float_roundtrip` wherever a float crosses a TS ↔ Rust
  wire, so a decimal parses to the same double `JSON.parse` gives. Features
  that change its behavior (`preserve_order`, `arbitrary_precision`) never go
  in a crate published as a library: features unify, so they would change
  every consumer's `serde_json`.
- `postcard` — compact binary records (fuzd's socket wire, pglet's storage)
- `toml` — parse-only features (`std`, `serde`, `parse`), for reading a
  declarative registry
- `zmij` — shortest round-trip `f64` formatting, called directly so a shipped
  crate needn't link `serde_json` for it (tsv)

**Core** — `thiserror`, `time`, `uuid`, `semver`, `url`, `tempfile`,
`futures` / `futures-util` (`BoxFuture`, sinks and streams), `bytes`,
`smallvec`, `similar` (text diffs in debug tooling), `unicode-ident` /
`unicode-segmentation` / `unicode-width`

- `bumpalo` (`collections`) — arena allocation, safe API only
  (see ./rust-perf.md §Arenas)
- `phf` — compile-time perfect-hash keyword tables
- `crc32fast` — storage page checksums (pglet)
- `lru` — bounds a map an attacker can grow by enumerating keys (the
  `RateLimiter`) or a cache

**Async and network** — `tokio`, `tokio-util` (`CancellationToken`,
`TaskTracker`), `axum`, `tower` / `tower-http`, `reqwest`

- `hyper` / `hyper-util` — named directly only where a server owns its accept
  loop (`fuz_http::serve_with_shutdown`); kept on the versions axum links
- `tungstenite` — named directly only to downcast axum's WebSocket read
  errors, so it must track the version axum links
- `rustls` — `reqwest` is wired `rustls-no-provider` and the process installs
  the `ring` provider (`fuz_sys::tls`, or a module of its own in a workspace
  without it). No `aws-lc-sys`, so binaries cross-compile to static musl.
- `socket2` — sockets of a family std can't make, in tests
- `http-body-util` — reading response bodies in a server's tests

**Concurrency** — `parking_lot` (see ./rust-perf.md §Locks)

**Database** — `tokio-postgres`, `deadpool-postgres`

**Crypto** — `blake3`, `argon2`, `ed25519-dalek`, `hmac` / `sha2`, `subtle`
(constant-time compare), `zeroize`

- `getrandom` — the source for new randomness
- `rand` — pinned to the line `ed25519-dalek` requires, for key generation
  only; new code uses `getrandom`
- `ring` — SHA-512 where it's already in the graph as the TLS provider (zap),
  behind one wrapper module so the backend swaps in one place

**Filesystem and OS** — `tar`, `flate2`, `notify`

- `nix` — the default for syscall wrappers (`flock`, permissions, signals)
- `rustix` — safe syscalls `nix` lacks (xattr reads, `tcflush`)
- `libc` — raw types and constants neither wraps (PTY, syscall numbers for a
  filter). Don't use two of the three for one job.
- `landlock`, `seccompiler` — the kernel box (see ./rust-patterns.md
  §Kernel box)
- `flate2` takes the `zlib-rs` backend, set at the workspace so one backend
  compiles

**CLI** — `argh` (see ./rust-patterns.md §CLI)

**Logging** — `tracing`; `tracing-subscriber` and `tracing-appender` are
consumed through `fuz_sys::logging`, not per consumer (a test may take
`tracing-subscriber` as a dev-dep to capture logs)

**WASM, N-API, and JS hosts** (see ./wasm-patterns.md)

- `wasm-bindgen`, `js-sys` — pin `wasm-bindgen` exactly where wasm-pack's CLI
  must match it
- `wasm-bindgen-futures`, `web-sys` — a browser binding's default-off OPFS
  feature (pglet), outside the shipped artifact
- `console_error_panic_hook` — panic messages to the console, an optional
  dep of a browser binding
- `talc` — WASM global allocator, a wasm32-only target dep. Use the
  `WasmGrowAndExtend` source; the default one fragments a long-lived
  instance's linear memory.
- `napi` / `napi-derive` / `napi-build` — the native Node and Bun path
- `wit-bindgen`; `wasmtime` / `wasmtime-wasi` (host side, tests and benches)
- `deno_core` / `deno_web` / `deno_webidl`, `v8` — gro's runtime. `v8` is
  pinned to the exact version `deno_core` re-exports, so V8 builds once.
- `tsv_ts` — tsv's TypeScript parser as a published crate, for an in-process
  type strip

**Images** — `libvips`, bindings to the system library (the engine `sharp`
wraps), for a server's upload pipeline; approved, and in no public workspace
yet. It links dynamically (`libvips-dev`
to build, the runtime package on the host), so it's not for a static-musl
binary. Its `unsafe` stays inside the binding. Chosen over the pure-Rust
`image` stack, which needs the same C codecs for WebP and AVIF across more
crates.

**Bench and fuzz only** — `rusqlite` (`bundled`) as a pinned comparison
baseline, confined to a bench crate; `libfuzzer-sys` in a standalone
`cargo fuzz` workspace

## Manifest conventions

- **Declare at `[workspace.dependencies]`** so members share one version. A
  member-level declaration is for a dep only one crate takes: a
  target-specific or dev-only dep, or one of a single binding, bench, or
  test-harness crate.
- **A non-obvious dep carries a comment** saying why it's there and what
  holds its version (`tungstenite` tracking axum; `v8` tracking `deno_core`).
  "Already in the graph" is the strongest argument for a direct dep, so say
  it when it's true.
- **`default-features = false` plus an explicit list** for a dep with a heavy
  optional tree (`reqwest`, `nix`, `notify`, `rustls`, `hyper`).
- **`multiple_crate_versions = "allow"`** tolerates duplicate majors the
  graph forces. It's not a license for drift you control. tsv keeps the lint
  on and holds its graph to one version of each crate.

## Isolate by crate, not by feature

A capability that must stay **out of** a binary for security or trust reasons
is a separate crate, never a cargo feature. Features unify across a
`--workspace` build, so an unrelated crate can turn a feature-gated signing
or test-hasher path on. A crate is in the graph or it isn't, and that's
auditable.

- `fuz_sign` is a crate, not a `fuz_crypto` feature: `fuz` links
  verification only and can never sign.
- `fuz_testing` is a crate, not a `fuz_auth` feature: the weakened test
  Argon2 parameters can't reach a production binary.
- `cargo xtask check-release` (`fuz_audit`) enforces it: no shipped binary
  links a forbidden crate (see ./rust-spine.md §check-release).

The one sanctioned feature seam is a `test_*` feature enabled only from
`[dev-dependencies]`, for a seam inside the production path itself
(see ./rust-patterns.md §Test injection). The audit refuses one on a normal or
build edge.

## Extract a shared leaf on the third copy

A utility reimplemented a third time becomes a spine-free leaf (no HTTP, DB,
or server surface), so spine-free workspaces can link it too. Prefer a
default-off feature of an existing leaf (`fuz_sys`'s `periodic`, `capture`,
`signal`) over a new crate, which needs approval. When reuse is known up
front, extract on first use.

## Adding a dependency

A new crate needs explicit approval, whether third-party or a new first-party
workspace member: name, purpose, what it replaces or enables, transitive
footprint. "New" means new to the workspace: wiring up a crate already in
`[workspace.dependencies]` or present in the lockfile is ordinary work.
Record an approved crate here. Removing an unused dep is pre-authorized:
check that nothing references it (features and build scripts included), then
drop it from the manifest and this list in one change. Version bumps are the
maintainer's.
