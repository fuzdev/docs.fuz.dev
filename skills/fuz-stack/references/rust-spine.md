---
description: Servers on the Rust spine — run_app shape, the server toolkit, env, actions, realtime, check-release
---

# Rust Spine and Consumer Servers

**Applies to**: the spine crates in the fuz workspace and the servers built
on them (`zzz_server`, `fuz_forge_server`, app servers). The spine is the Rust
twin of `fuz_app`'s TS backend (see ./twin-impl.md). Consumers take it as **path
deps to a sibling checkout of the fuz repo**; nothing is published.

Shape and idiom conventions are in ./rust-patterns.md. This reference is the
exception to conventions-not-inventory: a server author needs the names they
call in one place. Behavior, gate orders, and error cases are each crate's
rustdoc, the source to read before changing a call. A spine signature change
sweeps every consumer and its test targets (`cargo clippy --all-targets`,
not `cargo check`).

## What a server names

- `fuz_actions` — `ActionSpec`, dispatch, the RPC and WebSocket routers, and
  `server`, the toolkit `run_app` composes
- `fuz_http` — `compose_stack` (the one composition root), `BaseServerEnv`,
  the JSON-RPC envelope, the origin and host gates, shutdown
- `fuz_auth` — credentials, sessions, roles, rate limits, audit
- `fuz_db` — pool, migrations, query helpers, `status`
- `fuz_realtime` — WebSocket and SSE registries
- `fuz_cell` / `fuz_cell_actions`, `fuz_fact` / `fuz_fact_serving` — cells
  and content-addressed bytes, for servers that store them
- `fuz_sys` — logging init, `cli::report_failure`, the OS primitives
- `fuz_testing` (the `testing_*` binary and dev-deps only), `fuz_audit` (the
  xtask only)

## A server's shape

`main` is logging init, swap-point selection, and one call. `run_app` owns the
lifecycle. `build_router` owns composition. Every piece that isn't the
consumer's own domain comes from the toolkit. This is a deployed server
behind a reverse proxy, with `fuz_forge_server` the exemplar; a loopback
daemon differs at the edges (below).

```rust
// main.rs
let invocation = match server_invocation("appd", StartCommand::Implicit) {
    Ok(invocation) => invocation,
    Err(exit) => return exit, // --help → stdout, 0; anything unknown → usage, 2
};
let _log_guard = fuz_sys::logging::init_non_blocking_stdout("info");
if invocation == ServerInvocation::DbStatus {
    return fuz_db::status::run_db_status_cli(&app_migration_namespaces()).await;
}
match run_app(RunAppOptions {
    spine: SpineRunOptions::production(Arc::new(Argon2idHasher::new()), DEFAULT_ADDR),
    extra_action_specs_factory: None,
}).await {
    Ok(()) => ExitCode::SUCCESS,
    Err(e) => fuz_sys::cli::report_failure(&e, e.hint(), e.exit_code()),
}

// runtime.rs
pub async fn run_app(options: RunAppOptions) -> Result<(), StartupError> {
    let RunAppOptions { spine, extra_action_specs_factory } = options;
    let SpineRunOptions { backend, default_addr, drain_timeout } = spine;
    let env = BaseServerEnv::from_process(ENV_OPTIONS)?;
    let addr = env.bind_addr(default_addr)?;
    let shutdown = fuz_http::shutdown_token();
    let BuiltRouter { router, app } =
        build_router(&env, backend, extra_action_specs_factory).await?;
    serve_until_shutdown(router, ServeOptions {
        server_name: SERVER_NAME, addr, drain_timeout, shutdown,
        connection_closer: app.as_ref().map(|app| app.backend.connection_closer()),
        upkeep: app.as_ref().map(|app| upkeep_options(app.backend.auth_cleanup_options())),
    }).await
}

// router.rs, the body of build_router(env, backend_options, extra_action_specs_factory)
if env.database_url.is_none() {
    return Ok(BuiltRouter { router: boot_only(env, &APP_BACKEND_SPEC, SERVER_NAME)?, app: None });
}
let BootedAppBackend { backend, ready } = create_app_backend(env, &APP_BACKEND_SPEC, backend_options).await?;
let app = App::new(backend); // the consumer's domain state, holding the backend
let backend = &app.backend;
let gate = backend.auth_gate(); // one gate, cloned into every route state
let limits = ActionRateLimits::defaults(backend.rate_limiters); // one budget across RPC, WS, auth
let mut specs = PROTOCOL_ACTION_SPECS();
specs.extend(backend.auth_spec_set(authorize, role_registry));
specs.extend(app_action_specs(&app));
if let Some(factory) = extra_action_specs_factory { // the testing binary's seam
    specs.extend(factory(Arc::new(app.clone()), backend.extra_action_specs_runtime())?);
}
let registry = compile_action_registry(specs)?; // a failed compile refuses the boot
let dispatch = backend.action_dispatch(gate.clone(), registry, &limits);
let group = RouteGroup::new(
    "api",
    probe_router(SERVER_NAME) // `/health` and `/`
        .merge(ready.unwrap_or_default())
        .nest("/api/account", backend.auth_rest_routes(gate.clone()).into_router())
        .nest("/api", create_rpc_router(dispatch.clone())
            .merge(register_action_ws(backend.ws_route_state(dispatch, required_roles))))
        .merge(backend.audit_stream_router(gate)?),
    BodyCap::Bytes(DEFAULT_BODY_LIMIT_BYTES),
);
let router = compose_stack([group], fallback_group(), &backend.stack_options());
Ok(BuiltRouter { router, app: Some(app) })
```

**The consumer declares**:

- `AppBackendSpec`, a `const`: session cookie name, `migration_namespaces`,
  `expected_schema_json` (the committed fixture `/ready` compares against,
  regenerated and drift-guarded by a test over
  `fuz_testing::assert_expected_schema_fixture`), `audit_sse`,
  `browser_gates`
- `ServerEnvOptions`, a `const` naming its trusted-proxy var, and any env of
  its own beside `BaseServerEnv`
- one `const fn` returning its migration chain, shared by the boot,
  `db-status`, and the schema fixture test so they can't drift. Auth first:
  the other chains reference `actor`.
- `RunAppOptions`, embedding `SpineRunOptions` as `spine` and adding only its
  own seams
- its `App`, its action specs, its `BuiltRouter`, and an
  `upkeep_options(auth_cleanup, …) -> UpkeepOptions`

**The toolkit owns, and a consumer never re-implements**: the boot
(`create_app_backend`; its rustdoc has the order), every route state
(`AppBackend`'s builders), serving and shutdown (`serve_until_shutdown`:
bind, start upkeep, serve, close live connections, drain within the timeout,
join upkeep), the standard command line (`start`, `db-status`, `--help`; a
server with commands of its own extends it over `parse_server_invocation`),
and the error policy (`StartupError`, whose `exit_code()` is `2` for what the
operator must fix locally and `1` otherwise).

The workspace's release profile sets `panic = "unwind"`, so the stack can
answer a request panic with a 500 (see ./rust-patterns.md §Release profile).
`fuz_http::server_env`'s module doc lists the shared env vars and their
rules.

A per-route-state difference is struct-update syntax over a builder's result
(`AccountRouteState { login_fail_floor_ms: 0, ..backend.account_route_state(gate) }`).
A bound the core builds is a `SpineBackendOptions` field set before boot,
never patched onto the built core. A server with no signup passes
`signup: None` in its `AuthRestRoutes`.

**A loopback daemon launched with flags** (zzz) makes the same toolkit calls
and differs around them: it parses its own strict command line, builds its
`AppBackendSpec` and `BaseServerEnv` at runtime from that line (a per-port
cookie name), requires a database (no boot-only mode), and trusts no proxy.

### Two binaries over one `run_app`

The production binary and a `testing_<name>` sibling call the same `run_app`
and differ only in injected options. The sibling is what the TS cross-backend
suite launches.

- It boots on `fuz_testing::testing_backend_options` (a fast test hasher,
  limiters disabled, a daemon token, the startup reset hook) and passes an
  `extra_action_specs_factory` that mounts its `_testing_*` actions. In
  forge's shape those include `testing_reset_specs`, whose reset truncates
  with `truncate_reset_state` over the spine's exported table lists plus the
  server's own tables.
- `fuz_testing` never enters the production graph: the factory type is
  generic over the consumer's `App` and lives in `fuz_actions`, each consumer
  instantiating it with a one-line alias
  (`pub type ExtraActionSpecsFactory = fuz_actions::ExtraActionSpecsFactory<App>;`).
  The `testing_` prefix and `check-release` keep the binary unshippable.
- The factory returns `Result<Vec<ActionSpec>, StartupError>`, so a test seam
  can refuse the boot.
- In-process router tests use `fuz_testing::inert_app_backend` and
  `GatedRouter::into_router_for_testing` (`fuz_http`'s `test_router_access`
  feature, dev-deps only).

## Rules

**Env**

- Read the shared vars through `BaseServerEnv::from_vars(get, options)`
  (`from_process` in `run_app`), so tests inject a map. No stray
  `std::env::var` in router code. Test that retired var names are no longer
  read.
- **Fail loud, not just closed.** Misconfiguration with a security
  consequence refuses the boot instead of running degraded. Exit `2`: an
  empty origin allowlist, a wildcard origin without
  `FUZ_ALLOW_ORIGIN_WILDCARDS=true`, a malformed trusted-proxy list, missing
  or weak cookie keys, a database not at READ COMMITTED. Exit `1`, as a
  build defect: an action registry that doesn't compile (an empty one would
  answer `method_not_found` to everything).
- Secret-shaped names carry the `SECRET_` prefix on both spines. A
  consumer's booleans parse through `fuz_sys::env::parse_stringbool` (a
  closed set; unknown values error); the spine's wildcard opt-in takes
  exactly `true` or `false`.
- Through `from_vars`, trusted proxies default to the loopback hop under
  the consumer's own var, and `,` trusts none, the setting for a server with
  no reverse proxy.

**Browser gates**

- `SameSite=Strict` keeps other sites out but not other ports on the same
  host, so the spine's JSON handlers answer 415 to a `POST` with no
  `Content-Type` or a form or text one, the requests a browser sends
  cross-origin with no preflight.
- The host gate (DNS rebinding) is on by default: a server answers only to
  loopback names and the hosts its allowlist names, so a deploy lists the
  origin it's served from.
- A loopback daemon lists exact origins and sets
  `RouteGroup::refuse_simple_requests` on groups that take no form uploads.
  The origin allowlist is the only gate on a WebSocket upgrade, which is
  never preflighted, so `http://localhost:*` admits every local page.

**Rate limiters**

- Build every spine limiter through `RateLimiterMode`
  (`mode.limiter(fuz_auth::DEFAULT_LOGIN_IP_RATE_LIMIT)`), never
  `Some(Arc::new(RateLimiter::new(…)))` with a conditional null. Production
  passes `Enforced` and the testing binary `DisabledForTesting`, so a newly
  wired surface can't stay enforced while the rest are off, and a process
  that nulls a limiter says so at startup.
- A consumer-owned limiter that isn't a spine surface (an upload cap) stays
  live in both modes.

**Upkeep**

- Periodic work runs through `ServeOptions::upkeep`: the spine's auth cleanup
  plus each consumer task in `extra`, a boxed closure taking the shutdown
  token and calling `fuz_http::spawn_periodic` or a spine sweeper
  (`fuz_fact::spawn_orphan_temp_sweeper` for a server with a disk fact
  store). It starts after the bind, so migrations have run, and is joined
  before `serve_until_shutdown` returns. `build_router` spawns nothing.
- Pass the closer the app already holds (`backend.connection_closer()`), so
  a swept session's connections close.
- Consumer teardown (killing child processes) runs after
  `serve_until_shutdown` returns.

**Actions and the JSON-RPC envelope**

```rust
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct ThingGetParams { id: Uuid }

fn thing_get_spec() -> ActionSpec {
    let handler: ActionHandler = Arc::new(|params: Value, ctx: ActionContext<'_>| {
        Box::pin(async move {
            let ThingGetParams { id } = fuz_http::parse_strict_params(params)?;
            let thing = fuz_db::action_db_dispatch!(ctx.db, client => query_thing_get(client, &id).await)
                .map_err(|e| fuz_http::internal_error_with_source("thing_get", &e))?
                .ok_or_else(|| fuz_http::not_found("thing", None))?;
            serde_json::to_value(thing)
                .map_err(|e| fuz_http::internal_error_with_source("thing_get", &e))
        })
    });
    ActionSpec::read_only(
        "thing_get",
        AuthSpec::account_grain(CredentialGate::Any),
        InputShape::Object,
        handler,
    )
}
```

- Input is a typed `#[derive(Deserialize)]` struct with
  `#[serde(deny_unknown_fields)]`, read by `fuz_http::parse_strict_params`
  (an explicit `null` is refused as a strict schema refuses it;
  `parse_strict_params_allowing_null` names the keys that may be null). No
  `params.get(…).and_then(Value::as_str)` chains.
- Errors come from `fuz_http`'s constructors (`invalid_params`, `not_found`,
  `conflict`, `forbidden`, `validation_error`, `rate_limited`,
  `internal_error`), never a hand-built envelope. The cross-backend tests
  assert the envelope.
- `internal_error_with_source(context, &e)` and `db_unavailable_with_source`
  (and their flat-REST `*_response_with_source` forms) take the error and
  log its cause chain and SQLSTATE. Use them over the bare forms whenever there is a
  source.
- Codes are `JsonrpcErrorCode` variants, never magic numbers. A consumer's
  own code is one `const` declaring number and HTTP status together,
  `ConsumerErrorCode::new(-32020, StatusCode::BAD_GATEWAY)`, emitted with
  `consumer_error(code, message, data)`. `new` refuses a base-set number, a
  code outside `-32099..=-32000`, and a non-error status, at compile time.
- **The dispatcher owns the transaction.** A spec declared with side effects
  (`ActionSpec::with_side_effects`; `read_only` otherwise) runs in one,
  committed after the handler returns, and a handler never commits. A handler
  reaches the database through `ctx.db`, which is a pooled client or that
  transaction: `fuz_db::action_db_dispatch!(ctx.db, client => query_x(client, …).await)`.
  Effects that leave the database (closing a socket, a notification) queue
  on `post_commit_effects` and run after the commit.
- Code that opens its own transaction (a hand-written route, a task) commits
  with `fuz_db::commit_checked`, which refuses to commit a transaction a
  swallowed statement error already aborted.
- Gate reads by the action's `AuthSpec`, not by which transport it arrived
  on.

**Handler context**

- `ActionContext<'a>` is the borrowed per-request seam: `db`, `auth`,
  `audit`, `log`, `notify`, `signal` (the request's cancellation token, to
  thread into long work), `request_id`, `connection_id` (set on WebSocket,
  `None` on HTTP), `client_ip`, `credential_type`, `post_commit_effects`,
  among others.
- Handlers capture `Arc<App>`, so the compiled registry can't exist before
  the App. Where the App must hold its registry, the field is a
  `OnceLock<Arc<ActionRegistry>>` set after construction.
- Streaming past the request needs an owned sender, since the borrowed
  `notify` can't move into a `'static` closure: build a boxed
  `Fn(Value) + Send + Sync` that wraps chunks with `fuz_http::notification`
  and routes through `ConnectionRegistry::send_to`, only when the request
  carries a progress token and arrived over WebSocket. Over HTTP the action
  doesn't stream.

**Realtime**

- Admission, close-on-revoke, the per-account connection cap, outbound queue
  budgets, write deadlines, credential-expiry closes, and shutdown closes are
  spine-owned. A consumer mounts `register_action_ws` (or
  `register_action_ws_with_options` to set `ActionWsOptions`:
  `max_message_bytes`, `outbound_queue_bytes`, `receive_timeout`) and the
  audit stream, and writes none of it.
- `required_roles` on the WebSocket hold for the socket's life: revoking one
  closes the account's sockets on that endpoint.
- A consumer that mounts its own long-lived transport follows the spine's
  two-phase order (`register_pending` / `subscribe_pending`, re-read the
  credential, then `admit`) and owes its own outbound bound. It inherits the
  serve loop's connection deadlines.

| Code | Constant | Sent when |
| --- | --- | --- |
| 1001 | `WS_CLOSE_GOING_AWAY` | the server is shutting down |
| 1009 | `WS_CLOSE_MESSAGE_TOO_BIG` | an inbound message is over the cap |
| 1011 | `WS_CLOSE_INTERNAL_ERROR` | admission couldn't re-read the credential |
| 4001 | `WS_CLOSE_SESSION_REVOKED` | the credential was revoked or expired |
| 4003 | `WS_CLOSE_SERVER_HEARTBEAT_TIMEOUT` | the client was silent past `receive_timeout` |
| 4004 | `WS_CLOSE_CONNECTION_LIMIT` | a newer connection took the account's slot |
| 4005 | `WS_CLOSE_OUTBOUND_OVERFLOW` | the client fell behind its outbound budget |
| 4006 | `WS_CLOSE_PERMISSION_REVOKED` | a required role was revoked |

Codes and reason strings match `fuz_app`'s. Its client schedules no reconnect
after 4001, 4004, or 4006.

**Migrations and tables**

- Substrate DDL lives in the owning crate (`fuz_auth::AUTH_MIGRATIONS`,
  `fuz_cell::CELL_MIGRATIONS`, `fuz_fact::FACT_MIGRATIONS`). The consumer
  lists them with its own namespace in `AppBackendSpec`, and the boot runs
  them. Namespaces and migration names match the TS twin, so one database
  serves either backend.
- Migration names are descriptive (`full_<domain>_schema`, then named
  appends), never `_vN`.
- Query modules and column projections: ./db-patterns.md.

**Internal routes**

- A loopback-gated internal route checks that the `ConnectInfo<SocketAddr>`
  peer is loopback and a per-resource secret. `X-Forwarded-For` can't fake
  the peer.

## Daemon lifecycle on the client side

A CLI that starts, stops, and probes its daemon models liveness as **one
state enum and one resolver** (`Running(info)`, `Unresponsive(info)`,
`Stopped`, `Stale(info)`), not scattered `pid_alive` and `healthy` booleans.

- The lifecycle splits by transport. `fuzd`'s Unix-socket lifecycle is
  `fuz_daemon`; an HTTP daemon's (a port in `daemon.json`, a `/health` probe)
  stays local to its own CLI and reuses only `fuz_sys` primitives. Don't
  build a transport-generic lifecycle crate for one consumer.
- A pid alone doesn't identify a process. Record what distinguishes this
  boot (start ticks, a boot id) and compare it before signalling.
- An HTTP daemon's lifecycle code never enters the `fuz` / `fuzd` graph.

## check-release

`cargo xtask check-release` audits the dependency graph of every shipped
binary. Each workspace with path deps on fuz crates wraps the shared audit
and never hand-rolls it:

- `fuz_audit::xtask_main()` — a complete single-command xtask in one line
- `run_check_release_cli()` — for an xtask with commands of its own
- `run_check_release_cli_with_rules(&AuditRules)` — extra forbidden crates
  and per-binary forbids, for a workspace with its own trust boundaries (fuz
  forbids `fuz_sign` everywhere and the installer crates in `fuz` / `fuzd`)

It refuses a forbidden crate (`fuz_testing`, `fuz_audit`) on a normal or
build edge of any local package outside `testing_*` and `dev_only`, a
violation of the built-in library layering rules (which crates a storage or
OS leaf must never reach), a `test_*` feature enabled on a release edge, and
a crate whose re-declared `[lints]` tables have drifted from the workspace's
(a dropped lint, a changed level, `unsafe_code` below `deny`, or a
crate-root lift of it). Exit `0` clean, `65` a
policy violation, `69` / `70` a tooling failure. The output lists the
subjects it checked, so a renamed crate shows up instead of passing
silently.

- The xtask crate carries `[package.metadata.fuz_audit] dev_only = true`,
  the one setting that can't be inherited from the workspace.
- Grow the layering rules one per real invariant. A rule must account for
  what the subject's legitimate deps pull in, since the walk covers the
  whole runtime graph.
- Why a forbidden capability is a crate and not a feature:
  ./rust-dependencies.md §Isolate by crate.
