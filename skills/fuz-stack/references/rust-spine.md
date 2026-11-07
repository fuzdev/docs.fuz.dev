---
description: Spine crate map, consumer servers, env, daemon lifecycle
---

# Rust Spine & Consumer Servers

**Applies to**: the fuz workspace's spine crates and the servers consuming
them — `zzz_server`, `fuz_forge_server`, the other consumer servers, and the
test-only `testing_spine_stub`.
The spine is the Rust twin of `fuz_app`'s TS backend (./twin-impl.md).
Consumers take the spine as **path deps to a sibling checkout of the fuz
repo** — not git URLs, not vendoring. Shape/idiom conventions:
./rust-patterns.md; this covers the spine surface and consumer contracts.
This doc is the deliberate exception to the conventions-not-inventory rule:
consumer authors need the spine's names in one place, so it carries them.

## Spine layers

The crates a consumer server names (the full crate inventory is the fuz
repo's concern):

- **System leaves** — `fuz_sys` (fs, file_lock, secure_file, pid, env,
  limits, cli, `home_dir` + tilde expansion;
  `logging`/`signal`/`periodic`/`capture`/`argh`/`tls` features), `fuz_home`
  (the `~/.fuz` layer), `fuz_crypto` (Ed25519 verify, `ContentHash`, canonical
  JSON), `fuz_eval` (sandboxed one-shot Deno eval). HTTP/DB-free by enforced
  rule.
- **HTTP spine** — `fuz_http` (JSON-RPC envelope, IP/origin/host, the CORS
  simple-request gate, lifecycle),
  `fuz_db` (pool + migrations, `status`), `fuz_auth` (keyring, sessions,
  `PasswordHasher`, bootstrap, audit, `spawn_auth_cleanup`), `fuz_actions`
  (dispatch + `consumer_lifecycle`, `admit_upgrade`), `fuz_realtime` (WS/SSE
  registries, two-phase registration), `fuz_cell` / `fuz_cell_actions`
  (storage / verbs), `fuz_fact` / `fuz_fact_serving` (content-addressed
  bytes + `spawn_orphan_temp_sweeper` / authz'd reads), `fuz_storage`
  (File/Forge/Ssh/Https).
- **Tooling** — `fuz_audit` (dep-graph audit), `fuz_testing` (test-only
  impls, e.g. `TestingArgon2idHasher` — never shippable).

Consumers also name `fuz_db_admin`, `fuz_release`, `fuz_sign` (the forge) and
`fuz_pty` (zzz). The storage-vs-serving splits and the `fuz_sys`/`fuz_home`
leaf split are enforced by layering rules (§xtask & check-release).

## Server lifecycle — `run_app`

Each consumer exposes `pub async fn run_app(options: RunAppOptions)` — one
entry point that both the production `main.rs` and the sibling
`testing_*_server` binary (`testing_zzzd`, `testing_fuzfd`) call, differing
only in injected options. The test binary takes its backend options from
`fuz_testing::testing_backend_options` (`TestingArgon2idHasher` among them)
and registers `_testing_*` actions; it's what the TS cross-backend suite launches,
and the `testing_` prefix + `check-release` keep it unshippable.

Swap points — on `SpineBackendOptions` (in `SpineRunOptions`):
`password_hasher`, `rate_limiters`, `login_ip_rate_limit`,
`pre_migration_hook` (test-only DB setup), `daemon_token_state` (production
`None`; the producer is confined to `fuz_testing` by the dep graph),
`audit_inflight_tracking`; on the consumer's `RunAppOptions`:
`extra_action_specs_factory` (`_testing_*` actions without `fuz_testing`
entering the production graph).

**`run_app` composes the shared toolkit, `fuz_actions::server`** — the Rust
twin of fuz_app's `create_app_backend` / `create_app_server`. A consumer
declares an `AppBackendSpec` const (session cookie name, migration namespaces,
`expected_schema_json: Option<&'static str>` for `/ready`, and
`audit_sse: Option<AuditSseSpec>` for the audit stream and its keep-alive
interval), reads its env through `fuz_http::server_env::BaseServerEnv` (the bind
pair, `DATABASE_URL`, cookie keys, `FUZ_ALLOWED_ORIGINS`,
`FUZ_BOOTSTRAP_TOKEN_PATH`, and trusted proxies — loopback when unset, under a
var the consumer names), and calls `create_app_backend`, which
boots in one fixed order: READ COMMITTED guard → pre-migration hook →
migrations → keeper → bootstrap availability → audit listeners (fan-out,
then revocation) → `/ready`. The returned `AppBackend` builds every route
state (`account_route_state`, `action_dispatch`, `ws_route_state`, …) and the
pieces every server mounts: `auth_rest_routes` (an `AuthRestRoutes` of the
account, bootstrap, and signup states, `signup: None` on a server with no
signup, mounted by `into_router` under `/api/account`) and
`audit_stream_router`. A server started without `DATABASE_URL` serves
`boot_only` instead: the wildcard-origin check, the boot-only warning, and
the probes alone. A bound the
core builds is a `SpineBackendOptions` field (`login_ip_rate_limit`, set before
boot, never patched onto the built core); a per-route-state difference is
struct-update syntax over a builder's result
(`AccountRouteState { login_fail_floor_ms: 0, ..backend.account_route_state(gate) }`). The consumer
still owns its domain App, its action specs, and the final `Router`, then
hands it to `serve_until_shutdown` with its upkeep handles. Startup failures
are `StartupError` (`exit_code()`: configuration → 2, else 1; `hint()`),
rendered by `fuz_sys::cli::report_failure`. A server whose command line is
the standard `start` / `db-status` / `--help` reads it with
`server_invocation(binary, start) -> Result<ServerInvocation, ExitCode>`,
which prints help to stdout (exit 0) and `error: …` plus the usage to stderr
(`EXIT_USAGE`, 2). One with commands of its own extends the line over
`parse_server_invocation`, equally strict (an unknown argument exits 2 before
the env is read). Don't
re-implement the boot, the route states, serving, or the error policy per
consumer.

The boxed-closure shapes —
`ExtraActionSpecsFactory<App>` (returning `Result<Vec<ActionSpec>,
StartupError>`, so a test seam can refuse the boot), `PreMigrationHook<E>`,
the `ExtraActionSpecsRuntime` POD (`password_hasher` / `keyring` /
`daemon_token_state` / `session_cookie_name` / `audit_emitter`, all
`fuz_auth` types) — live in
`fuz_actions::consumer_lifecycle`, generic over `App` and `E` so `fuz_testing`
never enters the spine. (Not in `fuz_http::lifecycle`: `fuz_http` deps no spine
crate, so it can't name `fuz_auth` types.) Each consumer instantiates with a
one-line concrete alias
(`pub type ExtraActionSpecsFactory = fuz_actions::ExtraActionSpecsFactory<handlers::App>;`)
— its own definition, not a re-export shim.

`RunAppOptions` embeds the toolkit's `SpineRunOptions` (backend options,
`default_addr: SocketAddr`, `drain_timeout` — `fuz_http::DEFAULT_DRAIN_TIMEOUT`)
and adds only what is the consumer's own (zzz's `force_test_actions`). Its
`testing_*` sibling mints the daemon token (`require_daemon_token_from_env`;
zzz's `init_daemon_token` against its own dir), boots on
`fuz_testing::testing_backend_options` (the test hasher, `DisabledForTesting`,
the daemon token, `startup_reset_hook`, in-flight audit tracking; a suite
that drives the limiters sets `rate_limiters` by struct update), and mounts
`testing_reset_specs` (`_testing_reset` + `_testing_drain_effects`, over the
runtime's daemon-token state). Its reset truncates with
`truncate_reset_state` over the spine's `fuz_cell::CELL_DROP_TABLES` /
`fuz_fact::FACT_DROP_TABLES` and its own tables. Each spine const, and
`fuz_auth::AUTH_INTEGRATION_TRUNCATE_TABLES` (the auth tables the reset
deletes from), is held to its migration chain's DDL by
`fuz_testing::migration_created_tables`. The
`schema_ready` drift test is `assert_expected_schema_fixture`.

**Every spine rate limiter is built through `RateLimiterMode`** —
`mode.limiter(fuz_auth::DEFAULT_LOGIN_IP_RATE_LIMIT)`, never
`Some(Arc::new(RateLimiter::new(…)))` + a conditional null. Production passes
`Enforced`; the `testing_*` binary gets `DisabledForTesting` from
`testing_backend_options` — the twin of
`fuz_app`'s testing wiring (a cross-process suite's failed-login cases would
otherwise exhaust the per-IP budget). Building through the mode keeps a newly
wired surface from staying enforced while the rest is disabled, and any process
that nulls a limiter prints a startup banner (same fail-loud shape as
`TestingArgon2idHasher`). Consumer-owned limiters that aren't spine surfaces
(an image-upload cap, say) stay live in both modes.

**Upkeep runs beside the server, owned by `run_app`.** The toolkit's
`spawn_upkeep(UpkeepOptions { auth_cleanup, extra }, &shutdown)` schedules the
spine's auth cleanup (expired sessions deleted and their connections closed,
expired role-grant offers audited once — `AppBackend::auth_cleanup_options`)
plus each consumer task in `extra`: a disk-CAS consumer's
`fuz_fact::spawn_orphan_temp_sweeper`, an invite-expiry sweep
(`fuz_http::spawn_periodic`). `run_app` passes them as
`ServeOptions::upkeep` (`None` in boot-only mode), and
`serve_until_shutdown` starts them after the bind (migrations have run, so
each startup pass can read the schema), serves, and joins them before
returning. Where a consumer splits out a `build_router`, it spawns nothing and
returns a `BuiltRouter { router, app: Option<App> }` (`None` in boot-only
mode) for `run_app` to schedule from. The closer the cleanup closes through is
the one the app's revocation handlers already hold
(`AppBackend::connection_closer` — a `RealtimeCloser` where an SSE stream sits
beside the WebSocket): a sweep with nothing to close through strands the swept
sessions' connections. `testing_spine_stub` schedules none.

The daemon-token keeper wiring (`BootstrapKeeperResolved` + boot-time
`query_keeper_account_id`) is spine-owned in `fuz_auth` — don't re-implement.

## JSON-RPC envelope — `fuz_http` owns it

`fuz_http` owns the error constructors (`invalid_params(detail, reason)`,
`internal_error`, `internal_error_with_source`, `not_found`, `conflict`,
`forbidden`, `validation_error`, `rate_limited`) and
`parse_strict_params<T: DeserializeOwned>` (an explicit `null` refused, as a
strict fuz_schema `object` refuses it, then the serde decode). Consumers import, never
re-declare — the envelope is what parity tests assert byte-for-byte. Prefer
typed `#[derive(Deserialize)]` input structs + `parse_strict_params` over
`params.get().and_then(Value::as_str)` chains (the chains are migration debt).

`internal_error_with_source` / `db_unavailable_with_source` and their flat-REST
twins `internal_error_response_with_source` /
`db_unavailable_response_with_source` take `&dyn Error` and log its cause chain
(a `tokio_postgres::Error`'s `Display` is only its kind), plus a `sqlstate`
field (`fuz_db::sqlstate_in_chain`) when a driver error in the chain carries
one; a direct log of a DB error uses `error = ?e`.

`JsonrpcErrorCode` is an enum with a hand-written `Serialize` emitting the
bare `i32` (`as_i32()`) — not scattered `pub const … : i32`. Because
`JsonrpcError.code` is the enum, `error_code_to_http_status` is exhaustive: a
new base code is a compile error, not a silent 500. TS twin: `fuz_app`'s
`jsonrpc_errors`; consumers compare against `JsonrpcErrorCode::NotFound` (or
its `as_i32()`), never a magic number.

A consumer's own code — the twin of a TS consumer spreading
`JSONRPC_ERROR_CODES` and calling `register_jsonrpc_error_code(code, status)`
— is one `const` declaring the number and its status together,
`ConsumerErrorCode::new(-32020, StatusCode::BAD_GATEWAY)` (zzz's
`ai_provider_error`), emitted with `consumer_error(code, message, data)`. `new`
refuses a base-set number, a code outside `-32099..=-32000`, and a non-error
status; in a `const` that's a compile error.

## Env loading

- **Shared reader, injectable seam**: the spine's common vars come from
  `fuz_http::server_env::BaseServerEnv::from_vars(get, ServerEnvOptions)` —
  the Rust twin of fuz_app's `BaseServerEnv` — so tests inject a map; a
  consumer reads only its own vars beside it, through the same `from_vars`
  shape (fuz_forge's env struct is the exemplar, including a test that
  _rejects retired var names_). No stray `std::env::var` in router code;
  `$HOME` goes through `fuz_sys::home_dir` / `expand_tilde`.
- **Fail loud, not just closed**: security-consequential misconfig refuses to
  boot — an empty `FUZ_ALLOWED_ORIGINS` (empty allowlist = allow-all;
  `fuz_http::require_non_empty_origins`), a _malformed_ trusted-proxy list
  (unset → loopback is fine), missing/weak cookie keys, a failed
  `ActionRegistry::compile()` (an empty-registry fallback would answer
  `method_not_found` to everything).
- **Browser gates**: `SameSite=Strict` keeps other sites out but not other
  ports on the same host, so the spine's JSON handlers refuse a `POST` with no
  `Content-Type` or a form / text one (415 — a request a browser sends
  cross-origin with no preflight). The host gate (`StackOptions::host_gate`,
  DNS rebinding) is on by default: a server answers only to loopback names and
  the hosts its allowlist names, so a deploy lists the origin it is served
  from. A loopback daemon (zzz is the exemplar) also sets, on groups that take
  no form uploads, `RouteGroup::refuse_simple_requests`, and lists exact
  origins — the origin allowlist is the only gate on the never-preflighted
  WebSocket upgrade, so `http://localhost:*` admits every local page.
- **Booleans** via `fuz_sys::env::parse_stringbool` (the closed set fuz_app's
  `EnvStringbool` reads; unknown values error).
- **Secret-shaped names** carry the `SECRET_*` prefix — one contract across TS
  (`fuz_app` `BaseServerEnv`) and Rust.

## Consumer wiring idioms

- **`OnceLock` breaks the App ↔ registry cycle**: action-spec builders capture
  `Arc<App>` into handler closures, so the compiled registry can't exist until
  the App does — `App.action_registry: OnceLock<Arc<ActionRegistry>>`, `set()`
  after construction.
- **`ActionContext<'a>` is the borrowed per-request seam**:
  `notify: &dyn Fn(&str, &Value)`, `connection_id: Option<…>` (set on WS, `None`
  on HTTP), `signal: &fuz_realtime::SignalToken` (alias of `CancellationToken`,
  threaded into providers), `request_id`, plus `db`, `auth`, `audit`, `log`,
  `client_ip`, `credential_type`, `post_commit_effects`.
- **Streaming needs an owned sender**: the borrowed `notify` can't be captured
  into a `'static` closure, so zzz builds a per-request
  `ProgressSender = Box<dyn Fn(Value) + Send + Sync>` — only when the request
  carries a progress token _and_ arrived over WS — wrapping chunks with
  `fuz_http::notification(…)` and routing through
  `Arc<fuz_realtime::ConnectionRegistry>::send_to`. HTTP → `None` →
  non-streaming.
- **WS and SSE admission is two-phase, and spine-owned**: `register_action_ws`
  gates origin → 401 → token scope → acting actor (`?acting=`, on every
  endpoint) → role (the resolved actor's global grants), then `admit_upgrade`
  registers the connection pending with the endpoint's `required_roles`,
  re-reads the credential, the acting actor, and its global roles
  (`fuz_auth::recheck_admission`, which the audit SSE stream shares), and
  admits — the per-account cap evicts only there. A
  credential revoked mid-upgrade closes with 4001, a required role revoked
  mid-upgrade with 4006 (`WS_CLOSE_PERMISSION_REVOKED`), a failed re-read with
  1011, a superseded socket with 4004, and an upgrade the shutdown closed or
  refused with 1001 (§Daemon lifecycle). The roles hold for the socket's
  lifetime: revoking a global grant of one closes the account's sockets on
  that endpoint with 4006, nothing more is written, and the client stays
  closed rather than reconnecting into the gate. A consumer
  mounting its own long-lived transport follows the same order
  (`register_pending` / `subscribe_pending` → re-read → `admit`); a pending
  entry is closeable but receives nothing and counts toward nothing.
- **What a slow or silent client can hold is bounded, and spine-owned too**:
  - _Outbound queues._ A send to a WebSocket never waits: it queues onto that
    connection's byte budget (`DEFAULT_WS_OUTBOUND_QUEUE_BYTES`, or the
    consumer's via `register_action_ws_with_options`), and one that does not
    fit discards the queue and closes the connection with 4005
    (`WS_CLOSE_OUTBOUND_OVERFLOW`). An SSE stream's queue has the same kind of
    budget (`SSE_OUTBOUND_QUEUE_BYTES`); a frame that does not fit ends the
    stream.
  - _WS write deadline._ Every write the connection loop makes is bounded —
    a frame by `WS_WRITE_STALL_TIMEOUT` — and one that misses its deadline
    drops the socket with no close frame, so a client that stops reading
    holds its loop and in-flight handlers for one deadline. It is per write,
    not a throughput floor.
  - _Accept-loop deadlines._ `fuz_http::serve_with_shutdown` keeps two on
    every connection it accepts. A write that has waited
    `WRITE_PROGRESS_TIMEOUT` with no byte accepted fails and the connection
    is dropped, body and all — what ends an SSE stream or a download whose
    client stopped reading, since hyper stops polling a body the socket won't
    take. It runs only while a write is waiting, so an idle connection is
    never cut by it. And a connection with no request in progress is closed
    after `HEADER_READ_TIMEOUT` without a complete request head: a client
    that never sends a request, or never finishes its headers, is dropped,
    and the same deadline is the keep-alive idle time. A running handler, a
    streaming response, and an upgraded socket are not timed by it; a request
    body is not timed at all.
  - _Credential deadline._ A WS closes 4001 "Credential expired"
    (`WS_CLOSE_CREDENTIAL_EXPIRED_REASON`) and an SSE stream ends at
    `ResolvedAuth::credential_deadline`, waited in hour-capped sleeps that also
    check the wall clock.
  - _Receive timeout._ `ActionWsOptions::receive_timeout`
    (`DEFAULT_WS_RECEIVE_TIMEOUT`, 60 s) closes a silent socket with 4003.

  A consumer mounting its own long-lived transport inherits the accept-loop
  deadlines and owes its own queue bound. These limits have no TS twin where
  the runtime owns the socket.
- **Migration namespaces compose**: substrate DDL lives in the owning crate
  (`fuz_auth::AUTH_MIGRATIONS`, `fuz_cell::CELL_MIGRATIONS`,
  `fuz_fact::FACT_MIGRATIONS`); the consumer composes them with its own via
  `fuz_db::run_migrations`, ordered for FKs (auth first). A consumer's own
  namespace stays small (the forge's is one token-policy table).
- **Loopback-gated internal routes**: `/internal/*` checks the
  `ConnectInfo<SocketAddr>` peer is loopback _and_ a per-resource secret —
  X-Forwarded-For can't fake the peer.
- **Boot errors carry the CLI exit-code policy**: a `StartupError` with
  `exit_code()` mapping `Config → 2`, else `1` (./rust-patterns.md §CLI Patterns).
- **Subprocess harness**: `spawn_collect`/`spawn_streaming` (with their `Spawn*Options`)
  (env-isolating spawn, capped output drain) lives in `fuz_forge_server` —
  local until a second consumer needs it; the promotion target is a spine-free
  leaf crate.

## Daemon lifecycle — two layers

1. **Server-side graceful shutdown is shared.** Signal → `CancellationToken` is
   `fuz_sys::signal::shutdown_token()` (`signal` feature); `fuz_http::lifecycle`
   re-exports it — with `spawn_periodic` and the `CancellationToken` type, so
   a consumer names neither `fuz_sys` nor `tokio-util` — and adds
   `serve_with_shutdown(listener, router, token, closer: &dyn ShutdownCloser,
   drain_timeout)` for axum consumers; `fuzd` (UDS, no axum) calls
   `fuz_sys::signal` directly. This split is why `fuz_sys` (home-agnostic OS
   leaf) and `fuz_home` (`~/.fuz`) are separate. `serve_with_shutdown` runs
   its own accept loop over hyper, not `axum::serve`, whose drain waits on
   every connection with no way to let one go.
   - **Live connections close with the token.** A drain alone handles neither
     long-lived transport: an SSE body never ends, so the drain waits it out,
     and an upgraded WebSocket is a detached task the process exits under (the
     client reads a reset, a browser's 1006). So `closer` is required.
     `ShutdownCloser` is `close_all_connections() -> usize` (close every
     connection, pending or admitted, and refuse every later one; sync,
     idempotent) plus `wait_closed()` (resolve once the closed connections'
     own tasks have written their close). `fuz_auth::ConnectionCloser:
     ShutdownCloser`, so a consumer passes the closer its revocation handlers
     already hold — `app.connection_closer().as_ref()`, the `Arc<dyn
     ConnectionCloser>` upcast to `&dyn ShutdownCloser` (`RealtimeCloser` fans to
     the WS and SSE registries) — and `NoopShutdownCloser` only in a mode that
     mounts nothing live (boot-only).
   - **Order on fire**: the listener closes, every connection is asked to
     finish (the request in flight completes, keep-alive ends), and the
     close-all runs (every WebSocket gets `WS_CLOSE_GOING_AWAY` 1001 with
     `WS_CLOSE_GOING_AWAY_REASON`, `"Server shutting down"`; every SSE stream
     ends once its body has written what was queued); then the drain — wait
     for every connection — then `wait_closed`, which follows the drain so it
     covers an upgrade still in flight. One `drain_timeout` from the fire
     bounds it all (`DEFAULT_DRAIN_TIMEOUT`); reaching it is still `Ok`.
     `serve_with_shutdown` returns only once the token has fired, so upkeep
     on the same token has stopped, and consumer teardown (zzz's PTY
     `kill_all`) runs after it returns.
   - **Born closed.** The close-all sets each registry closing under the lock
     it drains with, so a later registration is born closed: an upgrade is
     refused 1001 before any database work, an SSE `admit` refuses (the route
     answers the connect comment alone), and no admission landing mid-close
     reads as revoked. The TS twin (`fuz_app`'s `AppServer.close` →
     `close_all_connections`) carries the same closing flag on its `ConnectionRegistry`
     and `SseRegistry`.
   - **One write budget per WS loop.** Once the close-all fires, a loop's
     remaining writes — one already in progress and the close frame; the
     close-all discards what was queued — share one fixed deadline
     (`fuz_http::SHUTDOWN_CLOSE_TIMEOUT`), so a client that stopped reading
     can't hold every restart to the drain timeout; a write cut off there
     ends the loop with no close frame.
   - **A stalled HTTP response is cut by the serve loop.** A body whose
     client stopped reading is never polled again, so an SSE stream in that
     state never sees its own end. A connection still open one
     `SHUTDOWN_CLOSE_TIMEOUT` after the close-all is dropped — socket and
     body — at the first window of that length with no handler running on it
     and no byte written to it. One whose handler is still running, or whose
     response is still reaching its client, is checked again a window later,
     the drain timeout bounding them all.
2. **Client-side CLI lifecycle splits by transport.**
   - `fuzd`'s UDS lifecycle lives in `fuz_daemon`: v2 `daemon.json`
     (`socket_path`, no port), `Hello`-based health over `fuz_client`, a
     `DaemonState` enum (`Running(info)` / `Unresponsive(info)` / `Stopped` /
     `Stale(info)`) with one `get_daemon_state()` resolver.
   - zzz's HTTP lifecycle is deliberately **local to zzz's CLI**: a port-based
     `DaemonInfo` (`version`, `pid`, `port`, `started`, `app_version`; schema
     shared with `fuz_app` TS), a reqwest `/health` probe, a `Wedged(info)` arm
     for "pid alive, `/health` silent". It reuses `fuz_sys` primitives
     (`is_pid_alive`, `send_signal`, `rfc3339_now`, `fs::write_atomic`) but
     **not** `fuz_home`, whose daemon helpers model the UDS schema. Its
     `daemon.json` is `0o644` on purpose (no secrets).
   - Model liveness as one `DaemonState` enum + one resolver, not scattered
     `pid_alive`/`healthy` booleans. Don't build a transport-generic lifecycle
     crate for a single HTTP consumer.
   - The HTTP lifecycle (and `reqwest`) must never enter the `fuz`/`fuzd`
     graph — a convention, not a `check-release` rule, since `fuz` legitimately
     links `fuz_client` for UDS (and `fuzd` links `fuz_daemon`).

## xtask & check-release

Every spine-consuming workspace's `xtask` wraps the shared audit — don't
hand-roll it: `fuz_audit::xtask_main()` (complete single-subcommand xtask; the
forge's 3-line `main`), `run_check_release_cli()` (workspaces with their own
router — zzz, zap), `run_check_release_cli_with_rules(&AuditRules)` where
`AuditRules` is one POD: `extra_forbidden: &[&str]` (fuz adds `fuz_sign` so its
`fuz` binary can never sign) + `per_binary: &[PerBinaryForbid]` (`fuz`/`fuzd`
must not link `fuzi_*`). Only the fuz workspace passes rules; the no-arg
consumers stay insulated. Exit codes: clean 0, policy violation 65, tooling
failure 69/70.

`BUILTIN_CRATE_LAYERING` — per-crate _library_ layering applied
unconditionally in every workspace (absent subjects skipped; the OK output
lists subjects actually checked so a renamed crate is visible). Each rule: a
library must not transitively runtime-depend on a forbidden set.

| Subject    | Must not reach                                            | Invariant                                                |
| ---------- | --------------------------------------------------------- | -------------------------------------------------------- |
| `fuz_fact` | `axum`, `fuz_http`, `fuz_cell`, `fuz_auth`, `fuz_actions` | bytes escape only through the authz'd `fuz_fact_serving` |
| `fuz_cell` | `fuz_actions`                                             | storage/authz half can't reach the verb layer            |
| `fuz_sys`  | `axum`, `fuz_http`                                        | the OS leaf stays HTTP-free                              |
| `fuz_home` | `axum`, `fuz_db`, `fuz_http`                              | the `~/.fuz` layer stays HTTP/DB-free                    |

`fuz_cell`'s rule is narrower than `fuz_fact`'s because it legitimately
reaches `axum`/`fuz_http` via `fuz_auth` — the BFS runs over the runtime graph,
so a rule must account for what a subject's legitimate deps pull. Grow the
table one rule per real invariant; no speculative rules. The
`[package.metadata.fuz_audit] dev_only = true` stanza on each xtask crate is
the one config that can't be workspace-inherited. Why forbidden capabilities
are crates, not features: ./rust-dependencies.md §Crate-vs-feature isolation.
