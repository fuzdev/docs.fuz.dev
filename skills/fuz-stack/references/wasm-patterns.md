---
description: Rust binding crates — WASM (wasm-bindgen, component model), N-API, C FFI, npm packaging
---

# WASM and Native Bindings

**Applies to**: the Rust crates that deliver a library to another runtime:
`blake3` (hashing), `tsv` (parser and formatter: WASM, N-API, C FFI),
`pglet` (the embedded database), `fuz_schema` (JSON validation). Spine
servers and the native CLIs link no WASM. **Publishing stance**: a tool with
both a native and a WASM build ships both to npm and consumers choose by
runtime (tsv); a library whose native side isn't an npm addon ships WASM
alone (blake3).

Each repo's `CLAUDE.md` owns its package list, build commands, and bench
numbers. This reference owns what the binding crates have in common.

## Targets

| Target | Tool | Reaches | Use for |
| --- | --- | --- | --- |
| WASM for JS | `wasm-pack` (wasm-bindgen) | browsers, Node, Deno, Bun | the portable npm package |
| N-API addon | the napi-rs crates, built with cargo | Node, Bun | the fast native npm package |
| C ABI `cdylib` | hand-written `extern "C"` | Deno FFI, Python | runtimes with a C FFI |
| WASM component | `cargo-component` (wit-bindgen) | Wasmtime and other hosts | sandboxed embedding, cross-host benches |

## Rules for any binding crate

- **A binding crate is a thin wrapper over a core crate**, one crate per
  technology. Where several bindings export the same operations, the export
  bodies are defined once in a shared crate and each binding only adapts
  types (tsv's `tsv_arena` macros behind `tsv_wasm`, `tsv_napi`, and
  `tsv_ffi`), so the bindings can't disagree about what an export does.
- **A failure the input causes is returned as a value; only misuse throws.**
  tsv's exports return `{ok: false, error}` for a parse failure or refusal
  and throw only for a bad argument, the size cap, or an internal failure.
  A component export returns `result<T, E>` with a small typed error enum. A
  bare wasm-bindgen `Result<T, JsError>` is fine for a library whose only
  failure is misuse (blake3's wrong key length).
- **Cross the boundary few times, with flat data.** An AST crosses as one
  JSON string that the engine's own `JSON.parse` materializes (`js_sys`),
  with a `*_json` export for a consumer that forwards the string; building
  the object graph node by node through `serde-wasm-bindgen` measured
  slower. Bytes cross as views. A hot validator lends a buffer in module
  memory that the caller writes into (`fuz_schema_wasm`'s `input_ptr`), so
  nothing is copied. Stream helpers batch chunks before crossing.
- **Reuse allocations across calls** with per-thread parked arenas
  (see ./rust-perf.md §Arenas). Under WASM the thread-local is a module static.
- **An instance must stay callable after a failed call.** Take-and-park
  state instead of holding a guard, so a trap or a caught panic leaves no
  poisoned slot. Where the host can't recover (a stack overflow), give it a
  way to reinstantiate.
- **Panic strategy is part of the binding's contract.** `catch_unwind` at a
  C entry point and `#[napi(catch_unwind)]` do nothing under
  `panic = "abort"`. An N-API addon ships on a profile with
  `panic = "unwind"`, since an abort would kill its host (see
  ./rust-patterns.md §Release profile). tsv's WASM and C FFI artifacts ship
  with abort; the FFI's catch is live only in the unwind corpus build.
- **A C ABI passes buffers as pointer plus length**, and the caller frees
  each exactly once through an exported free (`tsv_free(ptr, len)`). Errors
  come back as JSON objects. State the contract in full: an input is
  readable for its length and not mutated during the call (validate UTF-8
  and report it, don't demand it), and out-params are valid for writes,
  aligned, and don't overlap the input.
- **`unsafe` follows the boundary-crate rule** (see ./rust-patterns.md
  §Lints): the full workspace lint table re-declared, `unsafe_code = "deny"`
  with per-item lifts and `// SAFETY:` comments (tsv's `tsv_ffi` and
  `tsv_napi`, held to the workspace table by a test).
  `"allow"` stays right where a macro emits the unsafe (wit-bindgen). A
  binding that emits none keeps `[lints] workspace = true`.
- **The generated module is not the public API.** A hand-written entry wraps
  it: it owns the options bag and its errors, bridges wasm-bindgen's
  camelCase to snake_case (`initSync` exported as `init_sync`), and is shared
  between a tool's WASM and native packages so they present one surface. The
  generated declarations type only the raw module.
- Classes that own WASM memory get `free()` and `Symbol.dispose` from
  wasm-bindgen, so consumers write `using hasher = new Blake3Hasher();`.

## wasm-bindgen builds

- **Build once with `wasm-pack --target web`**, the one JS target for npm
  and every runtime, then generate the published entries beside it. They
  differ only in init: the Node entry initializes at import (`readFileSync`
  plus `initSync`), the browser entry needs `await init()` and guards every
  export against use before it.
- **wasm-opt must be told every feature the module uses**, or it rejects the
  instructions. Set them in `[package.metadata.wasm-pack.profile.release]`:
  `--enable-bulk-memory` and `--enable-nontrapping-float-to-int` for what
  the current toolchain emits by default, the target baseline's `--enable-sign-ext` and
  `--enable-mutable-globals` where wasm-opt asks for them, and one
  `--enable-*` per `-Ctarget-feature` the build sets (`+simd128` →
  `--enable-simd`).
- **Two packages, not two profiles.** Builds that differ by a target
  feature and the cargo feature it needs are two thin `cdylib` crates over
  one core, each with its own `RUSTFLAGS` and package (blake3's SIMD and
  no-SIMD builds). A feature subset of one crate is a
  `--no-default-features --features …` build published under its own name
  (tsv's format-only and parse-only packages).
- **Pick the variant by measurement, per runtime.** WASM SIMD is about twice
  as fast on large inputs in Deno and Node and slower in Bun, so the small
  build is right there and wherever bundle size matters.
- **Gate the artifact's size** with a committed band or ceiling checked by
  script. An unexplained jump means the build reached code it didn't before;
  `twiggy diff` names it. Raise a ceiling only for growth that is meant.
- **Pin `wasm-bindgen` exactly** where the wasm-pack CLI must match the
  crate version.
- `talc` replaces the default allocator in a long-lived instance
  (see ./rust-dependencies.md).
- Browser-only machinery (OPFS bindings and the async glue they need) sits
  behind a default-off feature, outside the artifact the package ships and
  the size gate measures.

## Component model

Used for blake3's Wasmtime component, which exists for cross-host benches.
Its `wit/`, `blake3_component` crate, and the `blake3_bench_wasmtime` host
are the working setup.

- Package under the `fuzdev` namespace (`fuzdev:blake3`). WIT names are
  kebab-case; generators convert.
- One-shot functions for stateless operations, a **resource** for stateful
  streaming. A resource's methods receive `&self`, so its state sits in a
  `RefCell`.
- A world that only exports is pure computation with no ambient access. Keep
  it that way.
- Build with `cargo component build` for `wasm32-wasip1`, speed-optimized
  (`opt-level=3`), since a host can spend bytes for speed where a browser
  bundle can't.
- On the host, the owner of a resource handle must call `resource_drop`, or
  the guest instance leaks.

## Package naming

A WASM artifact carries a `wasm` suffix wherever it could be mistaken for a
native build; native stays bare. Each namespace spells it its own way:

- crate: `<name>_wasm` (snake_case; the generated `*_bg.wasm` follows it)
- npm: `@fuzdev/<name>-wasm` (kebab), with a feature subset between name and
  suffix (`@fuzdev/tsv-format-wasm`) and a codegen variant after it
  (`@fuzdev/blake3-wasm-small`)
- N-API: a bare loader package (`@fuzdev/tsv`) over per-platform packages
  `@fuzdev/<name>-<triple>`

The kebab spelling is a deliberate exception to the scope's snake_case
library names (`@fuzdev/fuz_util`). A WASM or native package is a per-runtime
delivery of a tool, named the way its peers in the wider ecosystem name
theirs, and one tool's whole npm surface spells one way. Every delivery of a
CLI is invoked by the same bare name.

## Testing

A binding is tested where its bugs are, at the boundary: from the consumer
language, per runtime, against shared vectors, with the native and WASM
builds held to the same expectations. A crate that is all boundary may keep
no Rust unit tests at all (blake3), with `cargo test` as a compile gate.
