---
description: Rust lints, errors, DI ladder, idioms, CLI patterns
---

# Rust Patterns for the Fuz Ecosystem

**Applies to**: any Rust workspace adopting fuz-stack conventions — the
ecosystem's own (`fuz`/`fuzd` + spine crates, the spine consumers
`zzz`/`fuz_forge`, the `zap` CLI, `tsv`, `blake3`) and new or external
workspaces. All use **edition 2024**, resolver 2.

**Boundary**: this reference owns _conventions and patterns_, with ecosystem
repos as exemplars. Each repo's `CLAUDE.md` owns its _inventory_ (crates,
commands, env vars). Where a spine crate is named as the canonical
implementation, a spine-free workspace adopts the pattern's shape (zap is the
worked precedent throughout).

Companions: ./rust-spine.md (spine surface + consumer contracts),
./rust-perf.md, ./rust-dependencies.md, ./twin-impl.md, ./wasm-patterns.md.

Values: no backwards compatibility (delete, don't shim);
`unsafe_code = "forbid"` + pedantic lints; if it's slow, it's a bug; copious
`// TODO:` (`todo!()` warns workspace-wide — `#[allow(clippy::todo)]` with
justification); `///` for public API, `//` for implementation notes.

## New Workspace Checklist

1. `[workspace.package]`: `edition = "2024"`, `version = "0.1.0"`,
   `license = "0BSD"`, `publish = false` (until publishing is real);
   `resolver = "2"`.
2. Copy the canonical `[workspace.lints.*]` block (§Lints); every crate takes
   `[lints] workspace = true`. Root `clippy.toml` with
   `allow-{unwrap,expect,panic}-in-tests = true`. A workspace that resolves
   home-relative paths through `fuz_sys::home_dir` adds a `disallowed-methods`
   entry for `std::env::home_dir` (§Security).
3. Copy the canonical `[profile.release]` (§Release Profile); derived profiles
   only with a driving need.
4. Crate naming `{project}_{crate}`; short bare names only for
   frequently-typed binaries (§Project Structure).
5. Errors from day one: `thiserror` library enums, a binary wrapper error,
   `fn main() -> ExitCode`; pick and test the exit-code dialect early (§CLI
   Patterns).
6. Dev automation: spine-consuming workspaces add an `xtask` crate wrapping
   `check-release` (./rust-spine.md); mixed TS + Rust repos put the one
   local check for both halves in `xtask` (gro's `cargo xtask check`). tsv and
   blake3 still drive builds through Deno tasks; new repos don't add Deno.
7. Deps from ./rust-dependencies.md, shared via `[workspace.dependencies]`.

## Lints

```toml
[workspace.lints.rust]
unsafe_code = "forbid"
missing_debug_implementations = "warn"
trivial_casts = "warn"
trivial_numeric_casts = "warn"
unused_lifetimes = "warn"
unused_qualifications = "warn"

[workspace.lints.clippy]
# Enable lint groups (priority -1 so individual lints can override)
all = { level = "warn", priority = -1 }
pedantic = { level = "warn", priority = -1 }
nursery = { level = "warn", priority = -1 }
cargo = { level = "warn", priority = -1 }

# Pedantic overrides
module_name_repetitions = "allow"
must_use_candidate = "allow"
similar_names = "allow"
too_many_lines = "allow"

# Nursery overrides
significant_drop_tightening = "allow"

# Cargo overrides (private repos)
cargo_common_metadata = "allow"
multiple_crate_versions = "allow"

# Restriction lints (panic points need explicit #[allow] with justification)
clone_on_ref_ptr = "warn"
dbg_macro = "warn"
expect_used = "warn"
panic = "warn"
todo = "warn"
unwrap_used = "warn"
```

Workspaces diverge deliberately — tsv carries a parser-shaped superset (many
extra allows plus `unreachable = "warn"`); blake3 omits
`missing_debug_implementations`. Superset-by-design isn't drift; the repo's
`CLAUDE.md` documents it, so diff an override against that repo's block, not
this one. Two extras worth adopting: a `[workspace.lints.rustdoc]` block
denying `broken_intra_doc_links` (plus `invalid_html_tags`/`bare_urls`/
`redundant_explicit_links`) — a doc link is the only machine-checkable claim
a doc comment makes, and re-declared crate-level blocks must re-carry it —
and a `rust-toolchain.toml` pin, since floating stable breaks on new nursery
lints. CI installs from that file (`rustup toolchain install --no-self-update`)
rather than naming a second version — rustup silently lets the file override
a `dtolnay/rust-toolchain` input. `private_intra_doc_links` stays at default warn where module headers
deliberately link private members.

**The doc-link gate** is
`cargo doc --no-deps --workspace --document-private-items`, and three things
about it have bitten: rustdoc lints fire only under `cargo doc` (never
build/test/clippy); the pass condition is the **exit code**, not a warning grep
(under `deny` a broken link is an `error:`, so
`grep -c '^warning: unresolved link'` returns 0 on broken and clean alike); and
`--document-private-items` is part of the gate — without it rustdoc resolves
links only inside documented items, so every comment on a private or
`pub(crate)` item goes unchecked — a ``[`crate::a::b`]`` whose `b` is a private
module is never even checked, and becomes a hard `error:` (not a
`private_intra_doc_links` warning) once the flag is on. A related nursery trap:
`doc_link_code` rejects `` [`Arc`]`<`[`T`]`>` `` — wrap the whole thing in
`<code>` as clippy suggests.

### Crate-level overrides — re-declare the whole block

A crate needing `unsafe_code` (C-FFI/N-API ABI layers, wit-bindgen
components, PTY wrappers) can't partially override: Cargo replaces the entire
`[lints]` table, so re-paste the full workspace block and change only what
must change. Exemplars: `tsv_ffi`, `tsv_napi`, `blake3_component`. The trap
is real — `fuz_pty`'s re-declared block silently dropped `clone_on_ref_ptr`.
Diff the override against the workspace block when touching one. A binding
crate that doesn't emit unsafe keeps `[lints] workspace = true`.

## Release Profile

```toml
[profile.release]
lto = true
codegen-units = 1
panic = "abort"
strip = true
```

~2x slower builds, no symbols in backtraces — worth it for size and performance;
carried byte-identically across workspaces. Deliberate exceptions: WASM-first
repos set `opt-level = "s"` as the base (blake3), overridden per-build via
`RUSTFLAGS`; tsv's `[profile.corpus]` (`inherits = "release"`,
`panic = "unwind"`, `lto = false`, `codegen-units = 16`) exists because
`catch_unwind` is dead under abort and it powers the Prettier differential run;
its `[profile.napi]` (`panic = "unwind"`) because `#[napi(catch_unwind)]` is
inert under abort and a panic would kill the _host_ (dev server, editor);
`[profile.profiling]` keeps `debug = true`, `strip = false`. Spine-server
workspaces (the consumers serving `fuz_http::compose_stack`) set
`panic = "unwind"`: the stack catches a request panic and answers the generic
500, which abort would turn into a dead server.

## Error Handling

Libraries export `thiserror` enums; binaries wrap them via `#[from]` and own
exit:

```rust
#[derive(Debug, Error)]
pub enum CliError {
    #[error(transparent)]
    Client(#[from] ClientError),
    #[error(transparent)]
    Artifact(#[from] ArtifactError),
}

fn main() -> ExitCode { // never std::process::exit
    let Err(e) = run() else { return ExitCode::SUCCESS };
    eprintln!("error: {e}");
    if let Some(hint) = e.hint() {
        eprintln!("hint: {hint}"); // print site owns the `hint:` label
    }
    ExitCode::from(e.exit_code())
}
```

`#[source]` chains causes — `Display` shows only the variant's message, the
chain surfaces via `e.source()` for structured logging. Parser errors carry
their location so a renderer can draw a caret — tsv's `Error` keeps its
variants private and exposes accessors instead: `kind()` (a small public
`ErrorKind` to branch on), `span()` (the byte range, `None` when there is no
position), and `to_report()` (summary, caret frame, and line/column points
for a binding to return). WASM boundary errors: ./wasm-patterns.md.

**`.hint()` / `.exit_code()`** live on the binary's top-level error; library
errors stay thin (a library with exactly one binary consumer may carry them
itself — `zap_core::Error` co-locates exit-code policy with the variants).
Classifiers are exempt and land wherever a consumer branches:

- **`.hint()`** — user-facing fix suggestion: `Option<HintMessage>` when most
  variants lack one, or `&'static str` (`""` = absent) when all have one.
  `HintMessage` (`Static(&'static str) | Owned(String)`) is the shared
  primitive in `fuz_sys::cli` — import, don't re-declare. Advice only; the print site owns
  the label. **Single-source the hint table; wrappers delegate** to the
  source's hint so one wording appears on every path. A static-only leaf that
  doesn't dep the primitive stays `Option<&'static str>`; the first aggregator
  lifts it with `.map(HintMessage::Static)` — don't push a dep onto a pure leaf
  to unify the type.
- **`.exit_code()`** — `u8` for `ExitCode::from`; policy in §CLI Patterns.
- **Classifiers** — `&self -> bool` named for the decision, not the variant:
  `is_transient` (retry might succeed — use this verb everywhere),
  `is_recoverable` (restart), `needs_daemon_start`, `is_security_violation`.
  A wrapper forwards its inner classifier, never re-decides. Library errors
  carry them too (`fuz_archive`/`fuz_release` expose
  `is_security_violation()`, consumed downstream to split exit codes).

## Async Runtime & Graceful Shutdown

**tokio** + `tokio-util`'s `CancellationToken`: one token owned at the top,
cloned into every task that must react. The signal → token helper is
single-sourced — `fuz_sys::signal::shutdown_token()` (a spine-free workspace
hand-rolls it once: a task selecting `ctrl_c()`/SIGTERM that cancels the token):

```rust
let shutdown = fuz_sys::signal::shutdown_token();
tokio::select! {
    res = server.serve() => res,
    () = shutdown.cancelled() => Ok(()),
}
```

axum's `with_graceful_shutdown(shutdown.cancelled())` drains in-flight requests;
**always bound the drain with a timeout `select!`** — a hung handler otherwise
keeps the process alive forever (the spine ships
`fuz_http::serve_with_shutdown` + `DEFAULT_DRAIN_TIMEOUT` — its own accept
loop, which also closes live WebSockets and SSE streams and cuts a connection
whose client stopped reading — ./rust-spine.md §Daemon lifecycle). Long-running tasks check the token via `select!` and
every shutdown branch flushes pending work — the reference shape is a
`Notify`-driven flusher debounced behind the most recent event (so an idle
daemon doesn't tick), its `select!` carrying a `shutdown.cancelled()` arm that
does a final `flush()`. Add `TaskTracker` when shutdown must verify all workers
exited; skip it for short-lived tasks.

**Periodic upkeep goes on one loop, not a hand-rolled `interval`.**
`fuz_sys::periodic::spawn_periodic(name, interval, shutdown, pass)` (`periodic`
feature; `fuz_http` re-exports it) fixes the rules every sweep otherwise
re-decides: a startup pass, then one per interval; passes never overlap and a
slow one delays the schedule instead of bursting; a failed pass is logged at
`warn` with its source chain and retried next interval; cancelling the token
drops the pass in progress, so the handle joins at once — a pass must be safe
to drop mid-flight (transactional work rolls back, the next start's pass
picks it up). A sweep is its pass plus one call; the owner awaits the handle
after the drain.

**Don't**: `std::process::exit()` in async code (bypasses Drop); bare
`tokio::spawn` with no shutdown awareness for anything holding resources;
`tokio::sync::broadcast` as a poor-man's cancellation token; a bare
`tokio::time::interval` loop for a sweep (`spawn_periodic`).

## Naming

Natural Rust naming for free functions — `fn parse`, `fn create_artifact`,
**not** the TS `domain_action` style (`fn artifact_create`).

## Idioms

### Prefer enums for closed sets

Fixed variant set → enum, not `bool` or sentinel string; exhaustive `match` is
a contract that fires when variants change. **At a deserialization boundary
this is validation**: a `String` for a closed set accepts typos that fail at a
late guard or silently misbehave; a `#[serde(rename_all = "snake_case")]` enum
rejects them at parse (`unknown variant 'denyy', expected one of …`). Valid
values deserialize identically, so existing configs keep working. Even a
single-variant enum earns its keep. Keep a `String` (or catch-all variant)
_only_ when the value passes verbatim to an external system with a genuinely
open set and you don't dispatch on it.

### Make impossible states unrepresentable

Mutually-exclusive → enum; co-present → struct. A field meaningful only for
some variants belongs **inside** those variants, not as a sibling `Option`
ignored elsewhere; carry the payload on the variant so "this combination can't
happen" is a compile fact.

Worked reference — `zap_types`: `TargetLocation` (local+host unrepresentable,
serialized through a flat wire struct via `#[serde(try_from/into)]`);
payload-on-variant (`strip_components` inside each tar variant of
`ExtractMode`, the sudo list inside `UserSudo::Restricted`); single-variant
tagged enums kept on purpose (`BuildSource::Remote`, `SourceVerify::Minisign`);
transparent scalar newtypes validated at the serde boundary (`AccountName`,
`Mode`, `ContentHash` 64-lowercase-hex, `EnvVarName` POSIX-identifier);
typed-enum-replaces-bools (`TriggerKind` replacing a `trigger_restart` +
`trigger_reload` pair whose `{true, true}` was representable but meaningless).
`fuzi_core` is a second exemplar (`Os`/`Cpu`/`Libc` + negation-aware `PlatformToken`,
`LockfileVersion::from_raw`, an `Integrity` newtype over `ContentHash`).

Two anti-patterns reviewers hit:

- **The flattened discriminated union** —
  `struct { available: bool, error: Option<String> }` with a doc-comment saying
  "matches a TS discriminated union". The comment _is_ the smell; lift to an
  enum with payload-on-variant and a hand-written `Serialize` for the flat wire
  shape (zzz's `ProviderStatus`: `Available{…} | Unavailable{…, error}`).
- **The `json!({"kind": …})` closed set** — response bodies built with bare
  `json!` across `match` arms are a discriminated union evading the enum rule;
  model as `#[serde(tag = "kind", rename_all = "snake_case")]` with identical
  wire output (`fuz_forge_wire`'s `BlobBody`: `Text{text} | Binary | Truncated{size}`).

### Push a unifying newtype through the wire

A newtype introduced to retire primitive drift must reach the wire/persistence
shapes, not just the compute helper. When the wire format is fixed (a signed
manifest), a per-field serde adapter serializes the newtype to the legacy
primitive: `fuz_crypto::ContentHash` ships via
`#[serde(with = "fuz_crypto::blake3_hex")]`. zap threads `scalar::ContentHash`
end-to-end (schema → lock → resolved content) with two provenance constructors —
validating `new` for parsed input, infallible `of_bytes` for computed hashes.
Same shape serializes closed sets to primitive wire values
(`fuz_http::JsonrpcErrorCode`, ./rust-spine.md).

### Low-cost abstractions and clone smells

Function pointers over trait objects for statically-known dispatch
(`build_command: fn(&Path, Option<&Path>) -> Command`, not `Box<dyn Fn>`);
`Cow`-shaped wrappers when some returns are constants and others interpolate
(`HintMessage`). `clone_on_ref_ptr` warns on `arc.clone()` — write
`Arc::clone(&arc)` so the site signals a refcount bump. `Cow<'_, str>` only
when callers genuinely have mixed ownership and the borrowed case is common.

## Dependency Injection

The TS `*Deps` discipline doesn't translate 1:1 — runtime agnosticism, module
mocking, and deterministic clocks are solved natively by the crate graph, trait
bounds, monomorphization, test crates, and tokio's mock clock. Treat DI as an
**escalation ladder**: start at the floor, climb only on a concrete need.

**Effects at the edges** is the goal — a pure-ish core testable without IO or
mocks: split IO from logic and inject the _result_, not the source (a thin
edge does the read; a pure function decides on the parsed value); presentation
is a returned value the binary renders (human / `--json` / `--quiet`) —
`println!` in library code is an effect; contain async to the IO seam (one
async phase behind a trait, the core sync under `block_on`/`spawn_blocking`),
though a CLI doing real network/subprocess IO throughout (zap) legitimately
runs `#[tokio::main]`.

### Rungs

**Floor — import and call.** Pure utilities (fs helpers, canonical JSON,
parsers, validators) don't enter the pattern.

**Default — concrete `*Options` struct + direct refs.** App-owned state
(pool, keyring, audit emitter) passes via a per-call-site `*Options` (or
`*RouteState` for route-group-shared state) holding `Arc<T>` fields;
capabilities and parameters collapse into one struct. **No `*Deps` suffix in
Rust.**

```rust
pub struct SignupOptions {
    pub pool: Pool,                                    // capabilities (swappable)
    pub password_hasher: Arc<dyn PasswordHasher>,
    pub audit: Arc<AuditEmitter>,
    pub signup_ip_rate_limiter: Option<Arc<RateLimiter>>,
    pub signup_fail_floor_ms: u64,                     // parameters (fixed)
    pub signup_fail_jitter_ms: u64,
}
```

**Boxed closure factories** — between "just a closure" and "capability
trait": a one-shot injection point generic over the consumer's type gets a
boxed-`FnOnce` alias, not a trait (`ExtraActionSpecsFactory<App>` /
`PreMigrationHook<E>` in `fuz_actions::consumer_lifecycle`): supplied once at
startup, test binaries hook through it, no trait ceremony. A trait earns the
slot only with multiple methods or long-lived polymorphic state.

**Capability traits** — `PasswordHasher`, `Storage`, `BootstrapTokenStore`,
`FactStore`: pure noun, no suffix. Climb here when polymorphism is real —
testability swap (Argon2id ↔ fast test hasher), multi-impl plug-in, or
inversion of definition (the lower crate declares the need). A hot-path
service that never needs a swap stays concrete (`Keyring` has no trait).

Two further rungs were anticipated — composite traits per handler tier,
granular `*Provider` accessor traits — and never built: boxed closures plus
borrowed capability-bundle structs (`fuz_auth`'s `AuthenticatedActionContext`,
`AccountActionContext`) covered the needs. If one ever lands, name it
descriptively (`*Actions`, `*Runtime`), never `*Deps`.

### Enum dispatch before trait objects

If the impl set is closed and known at compile time, an **enum with methods
matching on `self`** dispatches statically, needs no vtable, and stays
exhaustively checked. A trait earns its place only when the set is genuinely
open or crosses a crate boundary the lower crate can't name.

- `fuz_storage::StorageBackend { File, Forge, Ssh, Https }` — the `Storage`
  trait is RPITIT and never consumed as `dyn`; the enum is the dispatch. The
  wrapper must forward each backend's provided-method overrides (streaming
  `download_to_file`/`upload_file`, bounded `download_capped`) or it silently
  regresses every backend to the default.
- `zzz_server::Provider`, `zap_core::Connection` (local/ssh/mock) — async
  methods matching on `self`, no `#[async_trait]`.
- `zap_core::EventHandler` (`Null` / `Stdout` / `Masking` decorator /
  test-only `Capture`) — sync `emit`.
- `zap_types::ResourceKind` — the enum lives in the pure types crate; dispatch
  is parallel exhaustive matches in free functions (detect pass, execute), so a
  new kind is a compile error in both.

**A single-impl `Arc<dyn Trait>` is a deferred enum** — prefer concrete or
enum until a second impl or test mock exists. Promotion is real when the swap
case arrives: `FactStore` began as a single-impl `dyn` in a consumer and was
lifted into the spine as a capability trait (PG-only / PG+disk / mock).

### Hot/cold dispatch

| Path     | Dispatch                                 | Why                                                                      |
| -------- | ---------------------------------------- | ------------------------------------------------------------------------ |
| **Hot**  | concrete `Arc<T>`, `<T: Trait>`, or enum | per-request HMAC, rate-limit checks — vtable cost measurable vs the op   |
| **Cold** | `Arc<dyn Trait>`                         | `Arc<dyn PasswordHasher>`, `Arc<dyn FactStore>` — op cost dwarfs vtable  |

`Arc<dyn>` also buys _type erasure_ (one field, no generic plumbing), a
separate axis that sometimes justifies it on a hot path.

### Async traits — RPITIT, with one carve-out

Return-position `impl Future` for anything consumed as a generic bound or
concrete type (monomorphizes, no boxed future):

```rust
pub trait Storage: Send + Sync {
    fn upload(&self, path: &str, data: &[u8]) -> impl Future<Output = Result<(), StorageError>> + Send;
}
```

Traits consumed as `Arc<dyn Trait>` can't use RPITIT — return `BoxFuture<'_, T>`
manually rather than `#[async_trait]` (`PasswordHasher`, `BootstrapTokenStore`);
migrate uniformly when RPITIT gains `dyn` support. Every `pub` trait in a shared
crate states its object-safety on an item-level `///` line: **Object-safe**
(dispatched dynamically; no generic methods, no RPITIT) or **Not object-safe**
(generic-bound/concrete use; RPITIT allowed) — so contributors know why they
can't add a generic method. Private one-off helper traits need no marker.

### Test injection — concrete impls in a separate crate

Test-only crates ship alternate impls of the production traits — no
`cfg(test)` shadows, no runtime branches. The concrete shape is **two binaries
over one `run_app`** (production + `testing_*` sibling; ./rust-spine.md), and
a release-time dep-graph audit proves the test impls can't reach a shipped
binary (./rust-dependencies.md §Crate-vs-feature isolation).

### Borrowed context, owned providers

Per-request contexts borrow (`ActionContext<'a>` with `&dyn Fn(&str, &Value)`
notify, `&CancellationToken`, request id); the App owns the `Arc<T>`s. The
notify seam stays `&dyn Fn`, not `Arc<dyn Fn>`, on hot paths — zero alloc.
When a handler needs a `'static` sender (streaming past the request):
./rust-spine.md §Consumer wiring idioms.

### What stays concrete

tokio, tracing, `std::fs`, `std::env`, `std::time`. Clock:
`#[tokio::test(start_paused = true)]` + `tokio::time::advance` already gives
deterministic control — skip a `Clock` trait. Filesystem: prefer a domain-scoped
trait (`BootstrapTokenStore` with `read_token`/`delete_token`) over a general
`Fs` — narrow seams compose, wide ones accumulate. Logger/env: abstract only
when production noise blocks log-shape assertions or a subsystem needs per-call
env override.

## Project Structure

`Cargo.toml` workspace (shared deps, lints, profile); `crates/{proj}_*/`
feature crates (`{proj}_core`, `{proj}_types`); `crates/{proj}_cli/` (or a
bare binary name); `crates/{proj}_{wasm,ffi,napi}/` bindings; `crates/xtask/`
where present; `tests/`; `docs/`.

Crate naming `{project}_{crate}` (`fuz_sys`, `tsv_lang`, `blake3_wasm_core`);
frequently-typed binaries get short bare names (fuz's CLI is `fuz`, its
daemon `fuzd`; a crate may stay `{proj}_cli` while its `[[bin]]` is bare, as
tsv does). A pure IO-free types crate at the bottom of the graph (`zap_types`,
`fuzi_core`'s type layer) is the cheapest place to enforce the §Idioms
modeling rules.

## Build Configuration

- **build.rs** for git-version embedding (`cargo::rustc-env=…_GIT_INFO`),
  compile-time validation of embedded data (public keys), target-triple
  embedding.
- **xtask** owns dev automation: an `install`-style command (build → install
  to app home → restart daemon), `check-release` (spine workspaces), and
  publisher-only operations (signing, publishing) kept out of shipped binaries.
  `[alias] xtask = "run --package xtask --"` in `.cargo/config.toml`.
- **Config vs secrets, by source**: a checked-in `.cargo/config.toml` `[env]`
  holds only non-secret dev overrides (anything checked in is silently
  inherited by every `cargo run`); generated gitignored files (mode 0600) for
  dev env; systemd/secrets infra for prod. Prefer OS-level peer auth over
  tokens where the transport allows — `fuzd` authenticates its UDS via
  `SO_PEERCRED` (same-uid), so there is no daemon token to manage.

## Testing

`cargo test --workspace`; unit tests in `#[cfg(test)] mod tests`, integration
tests in `tests/`. Three recurring shapes:

- **Parsers/formatters** (tsv): snapshot fixtures (`tests/fixtures/…`, input
  + generated `expected.json`, never hand-edited) plus a **differential
  oracle** — corpus comparison against Prettier under the unwind profile so
  panics surface as data — plus per-runtime binding tests.
- **Binding crates** (blake3): correctness asserted from the _consumer language_
  against shared vectors; zero Rust unit tests by design, `cargo test` as a
  compile gate — the boundary is where the bugs are.
- **Twin servers** (zzz, fuz_forge): the TS cross-backend suite launching the
  `testing_*` binary (./twin-impl.md).

**A test of a path guard runs where a broken guard is harmless.**
A mutant or regression case for a `$HOME` / `~` / store-root guard runs the
real binary under a scratch `HOME` and cwd, seeds a decoy where the wrong
resolution would land, and aims any network call at a dead port — so a
regression shows as the decoy being read, never as a write into the operator's
real home.

**Deliver a signal at a program phase, not a time.** A test that interrupts a
child mid-phase (a staging tree being written) duty-cycles it under `SIGSTOP` /
`SIGCONT` and sends the signal only on a state seen while every thread is
stopped (`T` in `/proc/<pid>/task/*/stat`) — fuzi's gate `check-sigint.mjs`.
The signal lands within one run quantum of the phase however fast the machine,
and a run that still misses reads as a retry, never a pass. Continue the child
on every exit path, and spawn it from the test harness, not as a
non-interactive shell's `&` job, which starts with `SIGINT` ignored.

## CLI Patterns

Arg parsing tracks binary size:

| Use case                                                 | Parser                  | +bytes vs `println!("hello")` |
| -------------------------------------------------------- | ----------------------- | ----------------------------- |
| Backend daemons, a few flags                             | manual `std::env::args` | +5 KB                         |
| User-facing CLIs with subcommands                        | **argh**                | +16 KB                        |
| Needs env-var binding, shell completions, or `wrap_help` | clap (`derive`)         | +340 KB                       |

argh is schema-driven (`#[derive(FromArgs)]`), the same mental model as
fuz_util's `args_parse` over a fuz_schema object schema. Where a CLI exists in
both TS and Rust, align flag names and aliases. Manual daemons `match` on the
first arg and return `Result` to the `main() -> ExitCode` wrapper — no
`std::process::exit` in the async body, no `args[1]` panic. Shared input
modes: file path, `--content <string>`, `--stdin`.

### Exit codes

A small, **stable** contract — settle it pre-1.0, assert each category → code
in a test, document the table in the crate doc. **Key codes to the caller's
remediation, not to error type.**

- **Default dialect** (zap is canonical): `0` success; `2` = the caller must
  change something local before re-running (bad args, config, credentials —
  "don't retry as-is"); `1` = everything else (server error, transient, local
  IO). Don't mint codes nothing branches on. A tool whose _success_ has grades
  returns them (zap: `0` converged, `2` dry-run drift, `1` wetrun failure).
- **Agent tier** (automation-primary CLIs): `sysexits.h` codes **plus** a
  stable snake_case `error.kind` in `--json`. `fuzi` is the reference; `fuz`
  uses the same taxonomy for operationally-distinct artifact failures (lock
  held `75`, disk full `73`, `65` for bytes not to trust — a failed integrity
  check or an `is_security_violation()` refusal, never retried). Two dialects
  max.
- **Extend via a structured `kind`, not new integers.** Status signals are the
  carve-out: a reserved code for a non-failure the caller branches on (fuz's
  `10` = update available) is a distinct category, minted deliberately.
- **argh gotcha**: `argh::from_env()` hard-exits `1` on a parse error,
  violating "usage = 2". Parse through `fuz_sys::cli::parse_env_args::<T>(usage_exit)`
  (`argh` feature): help → stdout, exit 0; usage error → stderr, `usage_exit`
  (`EXIT_USAGE` = 2; fuzi's sysexits dialect passes 64). Spine-free CLIs (zap)
  hand-roll the same `T::from_args` + `EarlyExit` mapping.

### Flags

Dry-run posture is per tool: convergence/deploy tools default to dry-run with
opt-in execute (`zap --wetrun`); build/prune tools default to execute with
`--dry-run` (fuz). The env-file flag is hyphenated `--env-file` (argh's default
rendering). **Env overlay without `set_var`**: zap parses `--env-file` into a
process-wide `OnceLock<HashMap>` consulted before `std::env` — `set_var` is
unsafe in edition 2024, so this works under `unsafe_code = "forbid"`.

## Patterns

### Sandboxed one-shot eval

Executable config (a TS builder run under `deno`) evaluates through
`fuz_eval::eval_module(&EvalRequest)`, a fresh spawn per call with the wrapper
piped over stdin, a wall-clock timeout + kill, and byte-capped output. Don't
re-roll the spawn — its walls are three things together:

- **Permissions.** `deno run --no-prompt` with a read grant — the caller's
  `ReadScope` (`Scoped(dir)` or `Unrestricted`) — and **no** net, env, or
  write grant.
- **Module loading**, which Deno does outside the permission system:
  `--no-remote --cached-only --node-modules-dir=manual --no-lock`. No remote
  specifier loads, an `npm:` specifier resolves only to a package installed in
  `node_modules`, and no lockfile is read or written — the module graph is
  files on disk.
- **The environment.** The child does not inherit the caller's: it is cleared
  down to an allowlist (`PATH`, `HOME`, `DENO_DIR`, `XDG_CACHE_HOME`,
  `TMPDIR`), with `TZ`, `LC_ALL`, and `NO_COLOR` pinned. The runtime acts on
  its environment before any permission check — a variable can hand every
  permission decision to a socket, export console output to a collector, or
  preload a module — so a denylist would be incomplete by construction. The
  pins make the time zone and locale evaluated code observes the same on
  every machine.

`fuz_eval::deno_info` (the dependency graph, for a watch set or cache
revalidation) is a second spawn under the same environment and the same module-loading
flags less `--cached-only`, which `deno info` does not take.

Policy belongs to the caller. The read scope is a trust decision: a caller
that trusts the config author to run code passes `Unrestricted` (configs
resolve imports from anywhere up the tree), a caller that does not passes
`Scoped`; the other walls hold either way. A caller whose output must be a
pure function of declared inputs also enforces **determinism by
construction** in its wrapper: the clock and randomness entry points throw
instead of answering, and the stdout-writing `console` methods reroute to
stderr so stdout stays pure JSON — the result must be a content-addressed
fact. `fuz_eval` ships optional ingredients for that (`DETERMINISM_STUBS_JS`,
`CONSOLE_TO_STDERR_JS`, `build_extract_export_wrapper(name, stubs)` —
injection-safe, export name JSON-encoded into bracket notation) for a simple
consumer to compose; the wrapper is the consumer's either way, and a rich one
(zap's builder) is written whole by its consumer, with the stubs its own
contract needs. Principle: anything the evaluated code needs from the world
is a **declared, inert input** the trusted parent resolves and records; an
injected live capability is an undeclared input no cache key can capture.

### Sidecar controller

For a long-running subprocess multiplexing many concurrent requests: a spawn
config of function pointers, JSON-lines framing over stdin/stdout, an mpsc
command channel into a serializer task that owns stdin, per-request `oneshot`
responses parked in a map by request id, the script embedded via
`include_str!`. Skip it for one-shot invocations (`tokio::process::Command`) or
in-process work. The pool + dispatch ship in `fuzd` (`fuz_sidecar` is a
non-optional dep; the `sidecar.*` actions are live); the runtime factories
(`fuz_deno`/`fuz_python`) sit behind a default-off `sidecar` feature, so the
default build runs an empty pool — a live example of optional-dep-crate
isolation.

### Security

Constant-time token comparison (`subtle::ConstantTimeEq`); TOCTOU-safe file
ops (open with `O_NOFOLLOW`, check permissions on the fd); `0o600` files,
`0o700` directories — and deliberately _not_ for non-secret state (a
daemon-info file readable by tooling is `0o644` on purpose; state the choice).
Supply-chain isolation is a crate-graph property (./rust-dependencies.md).

**Kernel backstop, Linux-only, under the policy.** A process whose job is
to run untrusted bytes without spawning or reaching the network (fuzi's
install, gro's confined eval) installs a seccomp-bpf denylist first thing in
`main()`, before any thread exists, so every later thread inherits it:
`KillProcess` on `execve`/`execveat`/`ptrace`/`fork`/`vfork`, `socket` by
address family and `connect` refused where no net is granted, `io_uring_*`
denied outright (its operations bypass seccomp), `clone`/`clone3` **allowed**
(glibc creates threads with `clone3`; a fork-shaped child inherits the filter
and still cannot `execve`). Where a read scope exists, Landlock sits beside
it (read-only roots, no write, no execute, TCP denied) with the same
before-threads rule, and the process warms the `/proc` reads the runtime
needs (`available_parallelism`, `pthread_getattr_np`) ahead of restricting.
A denylist first, a full syscall allowlist as the hardened endpoint. The
policy (no-scripts, the grant set) stays the primary control; the filter
turns "true if the code is correct" into "true even if it has a bug". Fail
loud: a kernel without the wall refuses the confined mode unless an explicit
flag opts out, naming the missing wall. `seccompiler` and `landlock` are the
approved crates (./rust-dependencies.md).

**One `$HOME` lookup.** A home-relative path resolves through
`fuz_sys::home_dir` — `$HOME`, else the password database, and only ever
non-empty and absolute — never `std::env::var("HOME")` or
`std::env::home_dir` (which reads an empty `HOME` as unset and substitutes
another home). An empty or relative home is an error, not a path: joined
onto, it names a directory under the process cwd. A `~` path the process will
read or create takes `expand_tilde_checked`; the infallible `expand_tilde`
(literal when there is no usable home) is kept for a twin that shares that
rule, and `collapse_tilde` is the display-side inverse. The fuz and forge
workspaces enforce it with a `clippy.toml` `disallowed-methods` entry on
`std::env::home_dir` — only those two carry the guard, and it does not catch a
direct `HOME` read. A workspace that does not link `fuz_sys` has to apply the
same refusals by hand. A directory that must be real is probed, not assumed
(`fuz_sys::fs::probe_real_dir` → absent / real directory / something else,
without following a link at the path), so a store entry that turns out to be a
link is refused rather than read through.

**Naming a store never creates it.** A consumer command that reads storage
parses it with `parse_existing_storage`, which refuses a missing local root
(exit 1 + hint, nothing created); only a publish creates a store, on its
first upload. Every backend, local included, holds keys to one validator
(`validate_forge_key`), and a write never follows a redirect.

### Transactional state files

State several invocations mutate (a lock ledger, an intent file) needs
**advisory file locking** (`nix::fcntl::Flock`, acquired before
read-modify-write) and **atomic temp + rename**. The ecosystem implementation is
`fuz_sys::fs::write_atomic` (write `.<name>.tmp.<pid>` → `sync_all` → rename →
**fsync the parent dir**); it replaced several hand-rolled copies — use it,
don't re-roll. **Calibrate durability by authority**: the parent-dir fsync is
required for authoritative, non-regenerable state (lock ledgers, credentials)
and waived for content-addressed bodies (a torn write is caught by re-hashing)
and ephemeral run-state; state the choice when you skip it. zap — spine-free —
hand-rolls both correctly: flock + full fsync for its authoritative lock file,
temp + rename only for its regenerable eval cache and last-run report
(`home::write_atomic`). For the lock itself: `flock` locks the _inode_, so lock
a stable sidecar path and **never unlink on release** (truncate but keep the
dirent) — else two acquirers hold different inodes (zap's lock currently locks
the pre-rename inode with a `TODO`; known wart).

### Content-addressed storage with size-based routing

The shape of a blob store keyed by content hash (`fuz_fact`; serving is the
separately-authz'd `fuz_fact_serving`): blobs below an embed threshold (1 MiB)
live inline in the row — one round trip, transactional with metadata; larger
blobs go to sharded disk paths (`<2-hex>/<62-hex>`) via atomic temp + rename,
the row storing a `file:<shard>/<rest>` pointer. Verify-on-read applies to the
buffered `get` (mismatch → absent); the streaming serve path deliberately
trusts write-time `sync_all` on hash-named files. Writes are idempotent via
`INSERT … ON CONFLICT (hash) DO NOTHING`.

### Bounded reads / size guards

Never read an untrusted-size input unbounded. **Files**: preflight the size,
then read with `take(MAX + 1)` and treat `len > MAX` as an error so a file
that grew between `stat` and read is rejected, not truncated. **Streams**:
`Content-Length` is a hint, not a bound — enforce a byte counter mid-stream,
abort on overrun, unlink partial output (fuz_forge's upload pipeline layers
preflight + counter + statvfs free-space check `507 storage_full` + a
concurrency semaphore, with `fuz_fact`'s orphan-temp sweeper as the crash
backstop). **Centralize the ceilings**: one private constant behind named
public aliases (`fuz_sys::limits`: `ARTIFACT_CEILING_BYTES` feeding
`MAX_TRANSFER_SIZE`, `MAX_FILE_SIZE`, …).

### Floor writer mkdirs below a root you own

`create_dir_all` re-creates every missing ancestor, so a writer racing a
removal of its tree (an interrupt drain, a cleanup sweep) puts the root back
and the tree outlives whoever removed it. Writers into a removable tree create
directories only strictly below its root (`fuz_archive::create_dir_all_below`:
never creates the base, refuses a path not below it through `Normal`
components); a removed root then fails the next write with `NotFound`.
Creating the root itself is one critical section with whatever removes it.

### Type state

Encode phase in the type so calling a method in the wrong phase is a compile
error — a correctness pattern. The in-codebase shape is the **consuming
transition**, not `PhantomData<S>`: zap's
`SecretRegistry::freeze(mut self) -> Result<SecretMasker>` makes "mask before
frozen" unrepresentable by moving into the next type, and the fallible
transition doubles as validation. Reach for `PhantomData<S>` only when one value
threads several states through a generic API. Skip type state when states are
data-driven, only one transition exists, or the API must stay casual-caller
ergonomic.

### Secret masking

Mask at the **consumption** boundary, not emission: execution stays
masking-unaware; the batch report is masked once at render; the live event
stream is masked by a decorator wrapping the sink (`EventHandler::Masking`).
The registry registers each secret's literal, URL-encoded, and JSON-escaped
variants and replaces longest-first; `freeze` is the type-state gate above.

### Logging

Servers: `tracing`, subscriber setup single-sourced in
`fuz_sys::logging::init_non_blocking_stdout` (behind the `logging` feature) —
consumers dep `tracing` only. CLIs/daemons: `eprintln!`; batched request
logging; `--json` for machine output.
