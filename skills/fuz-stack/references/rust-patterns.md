---
description: Rust workspace setup, the gate, lints, errors, type modeling, DI, testing, CLI, system safety
---

# Rust Patterns

**Applies to**: every Rust workspace in the ecosystem, and any workspace
adopting these conventions. All are edition 2024 on a pinned stable toolchain.

This reference owns conventions. Each repo's `CLAUDE.md` owns its inventory
(crates, commands, env vars), and each crate's rustdoc owns its invariants.
Where a `fuz` crate is named as a pattern's implementation, a workspace that
doesn't depend on it adopts the pattern's shape without adding the dep (zap's
engine is the worked precedent).

Companions: ./rust-spine.md (servers on the spine), ./rust-perf.md,
./rust-dependencies.md, ./twin-impl.md, ./db-patterns.md, ./wasm-patterns.md.

Values: no backwards compatibility (delete, don't shim); `unsafe` only inside
a dedicated boundary crate; every production panic point is explicit and
justified; slow is a bug, so measure; copious `// TODO:`; `///` for API, `//`
for implementation notes.

## Workspace setup

1. `[workspace.package]`: `edition = "2024"`, `license = "0BSD"`,
   `publish = false` until publishing is real. `resolver = "2"`.
2. `rust-toolchain.toml` pins an exact stable version with the `rustfmt` and
   `clippy` components. Nursery lints at warn plus a gate that denies warnings
   means a floating toolchain breaks the build on a new lint. CI installs from
   the file (`rustup toolchain install --no-self-update`) and names no second
   version.
3. The `[workspace.lints.*]` block (§Lints), `[lints] workspace = true` in
   every crate, and a root `clippy.toml` with
   `allow-{unwrap,expect,panic}-in-tests = true`.
4. `[profile.release]` (§Release profile).
5. rustfmt at its defaults: no `rustfmt.toml`.
6. Crates are `{project}_{crate}` under `crates/` (`zap_core`, `tsv_lang`).
   A binary typed often gets a short bare name (`fuz`, `fuzd`, `zap`); the
   crate may stay `{project}_cli` with a bare `[[bin]]`. A pure, IO-free
   types crate at the bottom of the graph (`zap_types`) is the cheapest place
   to enforce §Type modeling.
7. Errors from the first commit: `thiserror` enums, `fn main() -> ExitCode`,
   an exit-code dialect chosen and tested (§Errors, §CLI).
8. An `xtask` crate for dev automation, aliased in `.cargo/config.toml`
   (`xtask = "run --package xtask --"`): install, `check-release` (see
   ./rust-spine.md), publisher-only operations kept out of shipped binaries.
   A mixed TS and Rust repo puts its one local gate there (gro's
   `cargo xtask check`).
9. Dependencies from ./rust-dependencies.md, declared at
   `[workspace.dependencies]`.

## The gate

```bash
cargo fmt --all --check
cargo clippy --locked --workspace --all-targets -- -D warnings
cargo test --locked --workspace
RUSTDOCFLAGS="-D warnings" cargo doc --locked --workspace --no-deps --all-features --document-private-items
cargo xtask check-release   # where the workspace has the audit
```

- Lints are warn-level in the manifest and denied in the gate, so iteration
  isn't blocked and nothing lands with a warning.
- `--all-targets` matters: `cargo check` and a bare `clippy` skip test
  targets, so a signature change can leave tests uncompilable and unnoticed.
- A workspace with path deps on a sibling checkout formats by package
  (`cargo fmt -p a -p b --check`). `--all` follows path deps and reformats
  the sibling.
- rustdoc lints fire only under `cargo doc`, and rustdoc checks only the docs
  it renders, so `--document-private-items` is what covers a private or
  `pub(crate)` item's comment. The pass condition is the exit code, never a
  grep for warnings: under `deny` a broken link prints as an `error:`.
- Iterate with `check`, `clippy`, and `test`. A release build isn't part of
  the loop: fat LTO makes it slow and it proves nothing the gate doesn't.

## Lints

```toml
[workspace.lints.rust]
unsafe_code = "forbid"
missing_debug_implementations = "warn"
trivial_casts = "warn"
trivial_numeric_casts = "warn"
unused_lifetimes = "warn"
unused_qualifications = "warn"

[workspace.lints.rustdoc]
# a doc link is the only machine-checkable claim a doc comment makes
broken_intra_doc_links = "deny"
invalid_html_tags = "deny"
bare_urls = "deny"
redundant_explicit_links = "deny"

[workspace.lints.clippy]
# groups at priority -1 so single lints can override
all = { level = "warn", priority = -1 }
pedantic = { level = "warn", priority = -1 }
nursery = { level = "warn", priority = -1 }
cargo = { level = "warn", priority = -1 }

# pedantic
assert_is_empty = "allow" # fires on test asserts; its rewrite reads worse
module_name_repetitions = "allow"
must_use_candidate = "allow"
similar_names = "allow"
too_many_lines = "allow"
# nursery
significant_drop_tightening = "allow"
# cargo
cargo_common_metadata = "allow"
multiple_crate_versions = "allow"
# restriction: a panic point needs an explicit, justified suppression
clone_on_ref_ptr = "warn"
dbg_macro = "warn"
expect_used = "warn"
panic = "warn"
todo = "warn"
unwrap_used = "warn"
```

- **Suppress with `#[expect(lint, reason = "…")]`, not `#[allow]`.** `expect`
  warns once the lint stops firing, so a suppression can't outlive its cause.
  `#[allow]` is for a lint that fires only under some `cfg` or inside macro
  output. tsv and gro are on `expect` throughout; other workspaces still
  carry `#[allow]`, and new suppressions there use `expect`.
- **A workspace may diverge on purpose** (tsv's parser-shaped block, the
  cast-lint allows of numeric code). Compare a crate against its own
  workspace's block, not this one.
- **A crate-level `[lints]` table replaces the workspace's whole**; Cargo
  can't override one lint. A crate that must differ re-declares every lint
  and changes only what it must. A hand-kept copy silently drops lints, so a
  check holds it to the workspace's: `cargo xtask check-release` does in
  every workspace on the shared audit (see ./rust-spine.md §check-release),
  and gro and tsv each carry a test.
- **`unsafe` lives in a boundary crate that wraps it in a safe API**
  (`gro_sys`, `gro_v8`, `fuz_pty`, `tsv_ffi`), never in one function of a
  general crate. That crate sets `unsafe_code = "deny"`, lifts it per item
  with `#[expect(unsafe_code, reason = "…")]` and never at the crate root,
  adds `clippy::undocumented_unsafe_blocks = "warn"`, and writes `// SAFETY:`
  on every block. The comment states the invariant that makes this block
  sound (who owns the descriptor, why the pointer is valid and aligned, why
  nothing aliases it), not that a caller upholds a contract; an `unsafe fn`
  states its full contract under `# Safety`. Crate-wide `"allow"` is left
  only for a crate whose `unsafe` is emitted by a macro that can't carry the
  attribute (a wit-bindgen component), and the audit refuses it.
- `Arc::clone(&x)`, not `x.clone()` (`clone_on_ref_ptr`), so the site reads
  as a refcount bump.
- Nursery's `doc_link_code` rejects ``[`Arc`]`<`[`T`]`>``. Wrap the whole
  expression in `<code>`.

## Release profile

```toml
[profile.release]
lto = true
codegen-units = 1
panic = "abort"
strip = true
```

Carried unchanged across workspaces, with three deliberate departures:

- **A workspace that builds an HTTP server sets `panic = "unwind"`.** The
  spine's stack catches a request panic and answers a generic 500; under
  abort one bad request kills the server. The same holds wherever
  `catch_unwind` must work: an N-API addon (a panic would kill the host
  process), a corpus run that records panics as data.
- **A WASM-first workspace sets `opt-level = "s"` or `"z"`**, and raises it
  per build through `RUSTFLAGS`.
- **A derived profile needs a driving need and a comment saying what it's
  for.** Each inherits `release`: `profiling` (`debug` on, `strip = false`),
  and a non-LTO, parallel-codegen profile where rebuild time matters more
  than the last few percent (a test stub rebuilt before every suite run, a
  corpus audit).

## Errors

Libraries export `thiserror` enums. A binary wraps them with `#[from]` and
owns the exit:

```rust
#[derive(Debug, Error)]
pub enum CliError {
    #[error(transparent)]
    Release(#[from] ReleaseError),
    #[error("failed to write {}", .path.display())]
    Write { path: PathBuf, #[source] source: io::Error },
}

fn main() -> ExitCode {
    let Err(e) = run() else { return ExitCode::SUCCESS };
    eprintln!("error: {}", format_error_chain(&e)); // fuz_sys::cli
    if let Some(hint) = e.hint() {
        eprintln!("hint: {hint}"); // the print site owns the label
    }
    ExitCode::from(e.exit_code())
}
```

- **A variant keeps its cause in `#[source]`, not in its message**, and the
  print site prints the whole chain. `{e}` alone drops the reason (the errno,
  the refused connection). `fuz_sys::cli::format_error_chain` joins the
  causes with `: `, skips one the text already shows, and bounds and escapes
  each; `report_failure(&e, hint, code)` prints both lines and returns the
  `ExitCode`. A workspace without `fuz_sys` writes the same walk once.
- **Log the chain too.** In `tracing`, record the error as a value
  (`let error: &(dyn Error + 'static) = &e; warn!(error, "…")`) or as
  `error = %format_error_chain(&e)`. `error = %e` logs the top message alone,
  and `?e` prints a `Debug` dump. Many existing sites use those two; new
  ones don't.
- **A cause that must not be printed stays out of `source()`**: a URL that
  can carry a credential, text the error's own message already shows bounded.
- **Untrusted text is escaped in the `Display` of the type that holds it**
  (`fuz_sys::text::{escape_untrusted, quoted, truncate}`): a remote stderr, a
  response body, a field read before its signature was checked. The struct
  keeps the value as given. Unescaped, bytes from outside reach the terminal
  raw, control sequences included.
- **`.hint()` is advice for fixing the error, defined once beside the
  variant** and forwarded by every wrapper, so one wording appears on every
  path. A leaf whose hints are all constants returns `Option<&'static str>`;
  once one interpolates, `Option<Cow<'static, str>>`, with an aggregator
  lifting its leaves by `.map(Cow::Borrowed)`. A print site passes
  `e.hint().as_deref()`. No `""` for "no hint". Add `.hint()` only where some
  binary renders it.
- **`.exit_code()` belongs to the binary's top-level error**, since the
  codes are part of the binary's interface (§CLI). A library with exactly one
  binary consumer may carry it beside the variants (`zap_core::Error`).
- **Classifiers** are `&self -> bool`, named for the decision a caller makes,
  not for the variant: `is_security_violation` (never retry, never trust the
  bytes), `is_unconfirmed` (couldn't confirm; retrying may succeed). They
  live on library errors, and every wrapper forwards them complete, even one
  nothing calls yet, so a future caller never inherits a fail-closed
  classification with a hole in it.
- **A parser error carries its location and stays small.** tsv's `Error` is a
  pointer-sized newtype over a boxed private payload with accessors
  (`kind()` to branch on, `span()`, `to_report()` for a caret frame), so no
  hot `Result` pays for the error's size (see ./rust-perf.md).

## Shutdown and background work

tokio, with one `CancellationToken` owned at the top and cloned into every
task that must react. The signal → token helper is single-sourced
(`fuz_sys::signal::shutdown_token()`, re-exported by `fuz_http`); a workspace
without it hand-rolls one task selecting ctrl-c and SIGTERM.

- **A spine server calls `serve_until_shutdown`** and writes none of this
  (see ./rust-spine.md). The rest applies to daemons and tools that own their
  loop.
- **Every long-running task selects on `shutdown.cancelled()`**, and that arm
  flushes what the task holds.
- **Every drain is bounded by a timeout.** A hung handler otherwise keeps the
  process alive forever.
- **A periodic sweep runs on `spawn_periodic(name, interval, shutdown, pass)`**
  (`fuz_sys::periodic`, re-exported by `fuz_http`), not a hand-rolled
  `interval` loop. It fixes what each sweep would otherwise re-decide: a pass
  at startup and then one per interval, passes never overlap and a slow one
  delays the schedule instead of bursting to catch up, a failed pass is
  logged with its chain and retried next interval, and cancelling drops the
  pass in progress. So a pass
  must be safe to drop mid-flight: transactional work rolls back and the next
  start's pass picks it up. The owner awaits the handle after the drain.
- **A batching flusher is `Notify`-driven with a debounce and a throttle**:
  wait for activity to settle, but force a flush after a maximum wait, since
  steady traffic would otherwise hold the flush off indefinitely. An idle
  daemon doesn't tick. Its `select!` carries the shutdown arm with a final
  flush.
- Add `TaskTracker` when shutdown must prove every worker exited.

**Don't**: `std::process::exit` in async code (it skips `Drop`); a bare
`tokio::spawn` with no shutdown awareness for anything holding resources;
`tokio::sync::broadcast` as a cancellation token; a sync lock held across
`.await` (see ./rust-perf.md §Locks).

## Naming

Ordinary Rust naming for free functions: `fn parse`, `fn create_artifact`,
not the TS `domain_action` form. The exception is a name that mirrors a twin
or wire identifier, which matches the other side exactly:
`query_<table>_<verb>` (see ./db-patterns.md), a handler named for its wire
method (`diskfile_create`).

## Type modeling

- **A closed set is an enum**, not a `bool` or a sentinel string. An
  exhaustive `match` is a contract that fires when the set changes. At a
  deserialization boundary this is validation: a `String` accepts a typo that
  fails at a late guard or misbehaves silently, where a
  `#[serde(rename_all = "snake_case")]` enum rejects it at parse. A
  single-variant enum still earns its place. Keep a `String` only for a value
  passed verbatim to an external system with an open set, that you never
  dispatch on.
- **Input structs take `#[serde(deny_unknown_fields)]`**: the closed set of
  fields beside the closed set of variants. The exception is a client's
  reader of server output, which tolerates unknown fields so an added field
  doesn't break an older client; its variant sets stay closed.
- **Make impossible states unrepresentable.** Mutually exclusive → enum;
  co-present → struct. A field that means something only for some variants
  goes inside those variants, not beside them as an `Option` the rest
  ignore. Two bools whose `{true, true}` is meaningless are one enum.
- **A validated scalar is a transparent newtype** checked at the serde
  boundary (zap's `AccountName`, `Mode`, `EnvVarName`, `ContentHash`), with a
  validating constructor for parsed input and an infallible one for computed
  values (`ContentHash::new` and `of_bytes`).
- **A newtype reaches the wire and persistence shapes**, not only the compute
  helper. When the wire format is fixed, a per-field serde adapter writes the
  legacy primitive (`#[serde(with = "fuz_crypto::blake3_hex")]`). A closed
  set whose wire form is a primitive gets a hand-written `Serialize`
  (`fuz_http::JsonrpcErrorCode` writes its bare `i32`).
- **A fixed wire shape doesn't excuse a loose type.** Model the enum and
  serialize through a flat wire struct
  (`#[serde(try_from = "Wire", into = "Wire")]`) or a hand-written
  `Serialize`. Two shapes to refuse:
  `struct { available: bool, error: Option<String> }` with a comment saying
  it matches a TS union (the comment is the smell), and response bodies built
  with `json!({"kind": …})` across `match` arms, a tagged union evading the
  enum (`#[serde(tag = "kind", rename_all = "snake_case")]` gives identical
  output).
- **Type state for a phase that must not be skipped.** The shape in use is
  the consuming transition, not `PhantomData<S>`: gro's
  `Prepared::confine(self, …) -> Result<Confined, _>`, with the engine
  constructor requiring a `Confined` or an explicitly named
  `Confinement::Unconfined`, so the unconfined choice is written down at the
  call site; zap's `SecretRegistry::freeze(self) -> Result<SecretMasker>`.
  In both, the fallible transition doubles as validation. Skip it when the states are data-driven
  or the API serves casual callers.
- **A failure is an enum, never parsed from a message**: the step that failed
  builds the kind a caller branches on.

`zap_types` is the reference crate for all of the above.

## Dependency injection

The TS `*Deps` discipline doesn't carry over: the crate graph, trait bounds,
test crates, and tokio's mock clock already solve what it exists for. Treat
DI as a ladder and climb only on a concrete need.

The goal is **effects at the edges**: a thin edge reads, a pure function
decides on the parsed value, and the binary renders the result (human,
`--json`, `--quiet`). `println!` in library code is an effect. Inject the
result, not the source.

1. **Import and call.** Pure helpers (parsers, validators, canonical JSON)
   aren't injected.
2. **A concrete `*Options` struct**, the default. App-owned state passes per
   call site as a struct of `Arc<T>` fields, capabilities and parameters
   together (`SignupOptions`: the pool, the hasher, the audit emitter, the
   limiters, the timing floor). Route-group state is `*RouteState`. **No
   `*Deps` suffix in Rust.**
3. **A boxed closure** for a one-shot injection point (a factory or hook
   supplied once at startup): a `Box<dyn FnOnce(…) + Send>` alias, generic
   over the consumer's type where a lower crate declares it
   (`ExtraActionSpecsFactory<App>`). No trait until there are several methods
   or long-lived state.
4. **A capability trait**, named as a pure noun (`PasswordHasher`, `Storage`,
   `ConnectionCloser`), when polymorphism is real: a test swap, several
   production impls, or a lower crate declaring a need a higher one fills.

Rules along the way:

- **Enum dispatch before trait objects.** A set of impls closed at compile
  time is an enum whose methods match on `self`: static dispatch, exhaustive,
  async without boxing (`fuz_storage::StorageBackend`, `zap_core::Connection`
  with local and SSH arms). A wrapper enum over a trait must forward
  every provided-method override, or it silently regresses each backend to
  the default. A trait earns its place when the set is open or crosses a
  crate boundary the lower crate can't name.
- **A single-impl `Arc<dyn Trait>` is a deferred enum.** Stay concrete until
  a second impl or a test double exists. A hot service that never swaps
  stays concrete (`Keyring`).
- **Hot paths dispatch statically** (`Arc<T>`, `<T: Trait>`, an enum); cold
  paths may use `Arc<dyn Trait>` where the operation dwarfs the vtable (a
  password hash). `Arc<dyn>` also buys type erasure, one field and no
  generic plumbing, which is a separate reason.
- **Async traits**: return-position `impl Future + Send` for a trait used as
  a bound or concretely. A trait used as `dyn` returns `BoxFuture` by hand,
  not `#[async_trait]`; `BoxFuture<'static, _>` with owned arguments when
  the body moves to `spawn_blocking`. A trait needed both ways pairs the
  `impl Future` trait with an object-safe `*Dyn` companion.
- **A `pub` trait in a shared crate states its object safety**: an
  "Object-safe" or "Not object-safe" line in its doc, so the next editor
  knows whether a generic method is allowed.
- **Per-request context borrows; the app owns.** `ActionContext<'a>` holds
  `&dyn Fn` notify and `&` token references, and the App holds the `Arc<T>`s.
  A hot seam stays `&dyn Fn`, not `Arc<dyn Fn>`.
- **Time**: tokio time is controlled with
  `#[tokio::test(start_paused = true)]`, so no `Clock` trait. Wall-clock time
  is injected as a value or a function (`now: SystemTime`,
  `now: fn() -> SystemTime`).
- **What stays concrete**: tokio, tracing, `std::fs`, `std::env`. For the
  filesystem, a domain-scoped trait (`BootstrapTokenStore` with `read_token`
  and `delete_token`) beats a general `Fs`: narrow seams compose, wide ones
  accumulate.

### Test injection

- **A weakened impl of anything security-relevant lives in a test-only
  crate** (`fuz_testing`: the fast password hasher, disabled limiters, the
  daemon-token minter), never behind a cargo feature and never a runtime
  "if testing" branch. The audit proves it can't reach a shipped binary (see
  ./rust-dependencies.md §Isolate by crate). For a server, the shape is two
  binaries over one `run_app` (see ./rust-spine.md).
- **A seam inside the production path itself is a `test_*` feature enabled
  only from `[dev-dependencies]`** (`fuz_home/test_home_override`,
  `fuz_http/test_router_access`). The audit refuses one on a release edge.
- **A double with nothing to weaken** can be an arm of a closed enum that
  only tests construct (`zap_core::Connection`'s mock), or a `#[cfg(test)]`
  variant or impl beside its own crate's unit tests (zap's
  `EventHandler::Capture`). What's ruled out is the `cfg(test)` shadow: a
  production item given a different body under test, so the tests exercise
  code that never ships.
- `std::env::set_var` is `unsafe` in edition 2024, so `unsafe_code = "forbid"`
  rules it out. Read through an injected getter (`from_vars(get, …)`), or overlay a process-wide
  `OnceLock<HashMap>` consulted before `std::env` (zap's `--env-file`).

## Testing

Unit tests in `#[cfg(test)] mod tests`, integration tests in `tests/`.

- **Parsers and formatters**: snapshot fixtures (input plus a generated
  `expected.json`, never hand-edited) and a differential oracle, with the
  corpus run under an unwind profile so a panic is recorded as data.
- **Binding crates**: correctness is asserted from the consumer language
  against shared vectors. `cargo test` may be only a compile gate
  (see ./wasm-patterns.md).
- **Servers on the spine**: the TS cross-backend suite (see ./twin-impl.md)
  drives the server's `testing_*` sibling binary (see ./rust-spine.md).
- **Real-Postgres suites are `#[ignore]`**, each reading a `*_TEST_URL`, run
  with `--ignored --test-threads=1` (a suite shares one
  database it resets per test). Write and run them locally. A crate that
  gains one joins the CI job's `-p` list by hand; nothing checks that list,
  and a missing entry leaves the job green with the suite never run.
- **A gated suite never passes by skipping.** A test that needs an external
  program returns early where it's absent, and one sentinel test fails
  naming every missing program unless an explicit `*_ALLOW_NO_<NAME>=1`
  accepts it (zap's `required_programs.rs`). Where a stand-in binary can replace the program,
  build one (`testing_fake_fgro`).
- **Assert each exit-code category and each file mode.** A mode assertion is
  only as strict as the umask the tree was born under, so CI runs the suite
  twice, at the runner's umask and at `000`.
- **A test of a path guard runs where a broken guard is harmless**: the real
  binary under a scratch `HOME` and cwd, a decoy seeded where the wrong
  resolution would land, any network call aimed at a dead port. A regression
  shows as the decoy being read, never as a write into the operator's home.
  A test that spawns a daemon gives it an isolated home the same way.
- **A test that restricts its own process** (a seccomp filter, closed
  descriptors, a cleared environment) runs in a child process with the
  harness off, since libtest's threads would be caught by it.
- **Deliver a signal at a program phase, not at a time.** To interrupt a
  child mid-phase, duty-cycle it under `SIGSTOP` and `SIGCONT` and send the
  signal only on a state observed while every thread is stopped. A run that
  misses the phase reads as a retry, never a pass. Continue the child on
  every exit path, and spawn it from the harness: a non-interactive shell's
  `&` job starts with `SIGINT` ignored.

## CLI

**argh** (`#[derive(FromArgs)]`) for every shipped binary with flags or
subcommands; it's a small fraction of clap's size, and clap isn't used.
Hand-parsing is for a test stub, a one-flag binary, or an xtask with a few
subcommands. Where a CLI exists in TS and Rust, flag names
and aliases match.

- **Never `argh::from_env()`**: it exits `1` on a parse error, the code that
  means a real outcome. Parse through
  `fuz_sys::cli::parse_env_args::<T>(usage_exit)` (`argh` feature): help goes
  to stdout with exit `0`, a parse error to stderr with `usage_exit`
  (`EXIT_USAGE`, `2`, in the default dialect; `64` in the sysexits one). A
  workspace without `fuz_sys` writes the same `from_args` + `EarlyExit`
  mapping once.
- **`fn main() -> ExitCode`**, returning through `run() -> Result`. The two
  honest uses of `std::process::exit` are a sync CLI leaving on EPIPE and a
  signal thread exiting `128 + signum` after its cleanup.
- **Dry-run posture is per command, and stated.** A command whose effect is
  hard to undo is a dry run by default and executes on `--wetrun`, the flag
  the TS tools use too (zap's convergence, the prune and release-log
  commands). An installer or builder executes by default and takes
  `--dry-run` (`fuzi`, `fuz artifact build`). A new destructive command takes
  the first form.
- **`--json`** is the machine surface: results on stdout, a stable
  snake_case `error.kind` on failure. Library code prints nothing.

### Exit codes

A small, stable contract: settle it early, document the table in the crate
doc, assert each category in a test. **Key codes to what the caller must do
next, not to the error's type.**

- **Default dialect**: `0` success; `2` the caller must change something
  local before running again (arguments, config, credentials); `1`
  everything else. Don't mint a code nothing branches on. A tool whose
  outcome has grades returns them (zap: `0` converged, `2` drift found by a
  dry run, `1` failed or couldn't establish).
- **Agent tier**, for a CLI automation drives: `sysexits.h` codes plus the
  `error.kind` in `--json`. `fuzi` is the reference, and `fuz` uses the same
  codes for failures an operator handles differently: `75` retry later (a
  lock held, a check that couldn't confirm), `73` no disk space, `65` bytes
  not to trust (a failed integrity check, any `is_security_violation()`),
  never retried.
- **Checker dialect**, for a formatter or linter run as a check (tsv): `0`
  clean, `1` would change, `2` error, the convention of the tools it stands
  beside.
- A new tool takes one of these three and doesn't invent a fourth.
- **Extend with a structured `kind`, not new integers.** The exception is a
  status signal, a reserved code for a non-failure the caller branches on
  (`fuz`'s `10`, an update is available).

## System safety

Look in `fuz_sys` (`fs`, `secure_file`, `file_lock`, `capture`, `limits`,
`text`) before writing a file or process primitive. Most of these exist
there, hardened and tested, because hand-rolled copies kept getting one step
wrong.

- **One `$HOME` lookup**: `fuz_sys::home_dir`, never `std::env::var("HOME")`
  or `std::env::home_dir`. An empty or relative home is an error, not a path;
  joined onto, it names a directory under the cwd. A `~` path the process
  will read or create goes through `expand_tilde_checked`; `collapse_tilde`
  is the display inverse. Guard it with a `clippy.toml` `disallowed-methods`
  entry for `std::env::home_dir` (it doesn't catch a direct `HOME` read). A
  crate-level `clippy.toml` replaces the root one, so it repeats the root's
  settings.
- **State files are written atomically**: `fuz_sys::fs::write_atomic` (temp
  file, `sync_all`, rename, fsync of the parent directory), and
  `secure_file::write_secure_file` for a key or credential. Calibrate
  durability by authority: the parent fsync is required for authoritative
  state that can't be regenerated, and may be waived for a content-addressed
  body (a torn write is caught by re-hashing) or a regenerable cache. Say so
  where you waive it.
- **State several processes mutate takes an advisory lock before the
  read-modify-write** (`fuz_sys::file_lock::FileLock`). `flock` locks the
  inode, not the path. Either lock a stable path that is never unlinked or
  replaced, or, when the locked file is itself replaced by rename, re-check
  after locking that the path still names the locked inode and take the lock
  again if it doesn't (zap's `LockGuard`).
- **Don't follow links you didn't make.** Open with no-follow and check
  permissions on the descriptor (`open_nofollow_regular`); probe a directory
  that must be real (`probe_real_dir`) so a store entry that turns out to be
  a link is refused, not read through.
- **Modes are deliberate**: `0o600` files and `0o700` directories for
  anything secret (`SECURE_FILE_MODE`, `SECURE_DIR_MODE`), and a stated
  choice where non-secret state is wider so tooling can read it.
- **Never read an input of untrusted size unbounded.** Files: read with
  `take(MAX + 1)` and treat `len > MAX` as an error, so a file that grew
  after its `stat` is refused, not truncated. Streams: `Content-Length` is a
  hint; count bytes mid-stream, abort on overrun, unlink the partial output.
  Subprocess pipes: `capture::read_capped`. One private ceiling behind named
  public aliases (`fuz_sys::limits`).
- **A writer into a removable tree creates directories only below its
  root.** `create_dir_all` re-creates every missing ancestor, so a writer
  racing a removal (an interrupt, a cleanup sweep) puts the root back and
  the tree outlives whoever removed it. `fuz_archive::create_dir_all_below`
  never creates the base; a removed root then fails the next write.
- **Naming a store never creates it.** A command that reads storage refuses
  a missing local root; only the first publish creates one.
- **A child that runs code you don't control** gets a cleared environment
  built from an allowlist (a language runtime acts on its environment before
  any permission check of its own, so a denylist is incomplete by
  construction), a
  wall-clock timeout that kills its process group, and capped output.
- **Secrets**: compare in constant time (`subtle::ConstantTimeEq`); prefer
  OS-level peer auth over a token where the transport allows (`fuzd`
  authenticates its socket by `SO_PEERCRED`). Mask at the consumption
  boundary, not at emission: execution stays masking-unaware, a report is
  masked once at render, and a live event stream by a decorator around its
  sink. Register each secret with its encoded forms (URL-encoded,
  JSON-escaped, shell-quoted) and replace longest first.
- **A checked-in `.cargo/config.toml` `[env]` holds only non-secret dev
  overrides**; every `cargo run` inherits it.

### Evaluating config code

Executable config (a TS module that yields JSON) is evaluated by a separate,
pinned, sandboxed runtime, one fresh process per call. `fuz_eval` is the
client and `fgro eval` the runtime; don't re-roll either half.

- **The walls belong to the runtime**: no write, network, exec, or
  environment; reads only under the project; the clock, randomness, and
  dynamic import refused. So the result is a pure function of declared
  inputs, which is what lets it be cached and reviewed by hash.
- **The client decides which binary runs, as whom, and how far its output is
  believed**: the binary is pinned by hash and executed through the
  descriptor that was hashed; it never runs as root (a root caller drops to
  the project's owner, and a root-owned project is refused); the config's
  directory chain must not be writable by others; stdout is capped and read as one strict envelope; a timeout kills
  the process group.
- Anything the evaluated code needs from the world is a **declared, inert
  input** the trusted parent resolves and records. An injected live
  capability is an input no cache key can capture.

### Kernel box

A process whose job is to run untrusted code confines itself on Linux before
that code runs. gro's `confine` module is the reference, and its rustdoc
carries the rules.

- **Install while the process has one thread**, checking the count and
  refusing otherwise, so every later thread inherits the box.
- **Order**: `no_new_privs`, then Landlock (read-only roots named by handles
  opened when found, not by paths; no write, no execute, no TCP), then
  seccomp.
- **seccomp is two filters**: a tripwire that kills the process on calls
  only escaped code would make (`execve`, `ptrace`, `io_uring_*`), then an
  allowlist where every other call fails with `ENOSYS`. `ENOSYS` is what a
  missing syscall returns, so libc falls back where it can (`clone3` to
  `clone`, whose flags a filter can inspect).
- **Fail closed**: a kernel without the required Landlock ABI refuses the
  confined mode, naming what's missing. There is no opt-out flag.
- **Gate it in the types** (§Type modeling): no engine starts before the
  process is `Confined` or explicitly named unconfined.
- The allowlist comes from a census of what the runtime calls on a real
  kernel, and a change to it reruns the census.

The policy stays the primary control. The box turns "true if the code is
correct" into "true even if it has a bug".

## Logging

Servers and daemons use `tracing`, with subscriber setup single-sourced in
`fuz_sys::logging::init_non_blocking_stdout` (`logging` feature; hold the
returned guard for the life of the process). Consumers depend on `tracing`
alone. CLIs write diagnostics to stderr and results to stdout.
