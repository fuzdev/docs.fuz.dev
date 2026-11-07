---
description: WASM/N-API build targets — wasm-bindgen, component model, JS interop
---

# WASM Patterns

**Applies to**: `blake3` (WASM hashing), `pglet` (the embedded engine's wasm
binding) and `tsv` (parser/formatter bindings — WASM, C-FFI, N-API). The fuz
workspace doesn't use WASM. **Publishing stance**: npm gets **both** native
(N-API) and WASM builds; the C-FFI `cdylib` also serves Deno FFI and Python.

## Two Build Targets

| Approach        | Tool              | Consumer           | Use case                         |
| --------------- | ----------------- | ------------------ | -------------------------------- |
| wasm-bindgen    | `wasm-pack`       | JS runtimes        | npm publishing                   |
| Component model | `cargo-component` | Wasmtime / plugins | Sandboxed execution, composition |

npm → wasm-bindgen; benchmarking across runtimes → both; plugin systems
(speculative) → component model.

## WIT Interface Design

Abridged from blake3's `wit/`:

```wit
package fuzdev:blake3@0.0.1;

interface hashing {
    enum hash-error { invalid-key-length }
    hash: func(data: list<u8>) -> list<u8>;
    keyed-hash: func(key: list<u8>, data: list<u8>) -> result<list<u8>, hash-error>;
    resource hasher {
        constructor();
        new-keyed: static func(key: list<u8>) -> result<hasher, hash-error>;
        update: func(data: list<u8>);
        finalize: func() -> list<u8>;
    }
}

world blake3 { export hashing; }
```

`fuzdev` namespace; WIT requires kebab-case (generators convert); one-shot
functions for stateless ops, **resources** for stateful streaming;
`result<T, E>` with minimal typed error enums (one variant per failure mode);
`world blake3` exports only, no imports = pure computation, no ambient access.

## Component Implementation (wit-bindgen)

```rust
use exports::fuzdev::blake3::hashing; // generated path: exports::<ns>::<pkg>::<iface>
wit_bindgen::generate!({ path: "../../wit", world: "blake3" });
struct Component;
export!(Component);

impl hashing::Guest for Component {
    type Hasher = HasherResource;
    fn keyed_hash(key: Vec<u8>, data: Vec<u8>) -> Result<Vec<u8>, hashing::HashError> {
        let key: [u8; 32] = key.try_into().map_err(|_: Vec<u8>| hashing::HashError::InvalidKeyLength)?;
        Ok(blake3::keyed_hash(&key, &data).as_bytes().to_vec())
    }
}

struct HasherResource { inner: RefCell<blake3::Hasher> } // resources receive &self → RefCell
impl hashing::GuestHasher for HasherResource {
    fn update(&self, data: Vec<u8>) { self.inner.borrow_mut().update(&data); }
    // constructor / static factories return hashing::Hasher::new(HasherResource { … })
}
```

Cargo: `crate-type = ["cdylib"]`;
`blake3 = { workspace = true, features = ["wasm32_simd"] }` (the core's SIMD
feature, in addition to `+simd128`); `[package.metadata.component]` with
`package = "fuzdev:blake3"` and `world`/`path` under the
`[package.metadata.component.target]` sub-table. wit-bindgen generates
`#[export_name]` and unsafe ABI stubs, so the crate can't use
`lints.workspace = true` — re-declare the **entire** workspace lint block with
`unsafe_code = "allow"` (./rust-patterns.md §Lints; `blake3_component` also
allows `same_length_and_capacity` + `use_self` for generated-code false
positives). Build with `cargo-component` and the `wasm32-wasip1` target, no
wasm-opt:

```bash
RUSTFLAGS='-C opt-level=3 -C target-feature=+simd128' cargo component build -p blake3_component --release
```

**Host-side embedding** (only blake3's bench/compare binaries;
`blake3_bench_wasmtime` is the working setup): pin `wasmtime`/`wasmtime-wasi`
at the same major with the `component-model` feature;
`wasmtime::component::bindgen!` mirrors the guest macro; host state holds
`WasiCtx` + `ResourceTable` and implements `WasiView`; enable
`wasm_component_model` on the engine `Config` and add WASI via
`wasmtime_wasi::p2::add_to_linker_sync`; **call `resource_drop` explicitly**
or the guest instance leaks (host owns the handle, guest owns the memory).

## wasm-bindgen Patterns

### Crate architecture (blake3)

Shared core + thin wrappers — the SIMD split is two crates (contrast tsv,
where it's a feature axis in one crate):

| Crate               | Type            | Purpose                                   |
| ------------------- | --------------- | ----------------------------------------- |
| `blake3_wasm_core`  | `rlib`          | Shared wasm-bindgen exports + TS types    |
| `blake3_wasm`       | `cdylib + rlib` | SIMD build (enables `blake3/wasm32_simd`) |
| `blake3_wasm_small` | `cdylib + rlib` | Size-optimized build (no SIMD)            |

Both wrappers are `pub use blake3_wasm_core::*;`.

```rust
#[wasm_bindgen]
pub fn keyed_hash(key: &[u8], data: &[u8]) -> Result<Vec<u8>, JsError> {
    let key: [u8; 32] = key.try_into().map_err(|_| JsError::new("key must be exactly 32 bytes"))?;
    Ok(blake3::keyed_hash(&key, data).as_bytes().to_vec())
}

#[wasm_bindgen]
pub struct Blake3Hasher { inner: blake3::Hasher }
#[wasm_bindgen]
impl Blake3Hasher {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self { Self { inner: blake3::Hasher::new() } }
    pub fn update(&mut self, data: &[u8]) { self.inner.update(data); }
    pub fn finalize(&self) -> Vec<u8> { self.inner.finalize().as_bytes().to_vec() }
}
```

Vs the component model: `&[u8]` and `&mut self` (no `RefCell`); `JsError`
strings, not typed enums; `free()` and `Symbol.dispose` generated.

### tsv wasm-bindgen patterns

ASTs cross the boundary as one JSON string parsed with the engine's native
`JSON.parse` via `js-sys` — building the object graph with
`serde-wasm-bindgen` was measurably slower and dropped. Parsers run inside the
`tsv_arena` per-thread arenas (`with_ast_arena` / `with_doc_arena`;
./rust-perf.md §Arena allocation) so per-call allocation amortizes to zero.

```rust
// lang_bindings! generates parse_<lang>, parse_<lang>_json, parse_internal_<lang>, format_<lang>
// The extern type names the matching interface in the bundled tsv_ast.d.ts (typed return).
#[wasm_bindgen]
pub fn parse_svelte(source: &str) -> Result<SvelteRoot, JsError> {
    let json = parse_svelte_json(source)?;
    let js_value = js_sys::JSON::parse(&json).map_err(|_| err("internal error: AST serialized to invalid JSON"))?;
    Ok(js_value.unchecked_into::<SvelteRoot>())
}

#[wasm_bindgen]
pub fn parse_svelte_json(source: &str) -> Result<String, JsError> {
    with_ast_arena(|arena| {
        let ast = tsv_svelte::parse(source, arena).map_err(err)?;
        Ok(tsv_svelte::convert_ast_json_string(&ast, source))
    })
}
```

`parse_*_json` returns the wire string for consumers that forward it;
`parse_internal_*` benchmarks skip serialization via `std::hint::black_box`;
goal-aware exports (`parse_typescript_json_with_goal`) sit outside the macro.

**wasm-opt needs every non-baseline feature enabled by name** or it rejects
the instructions: `--enable-bulk-memory` and
`--enable-nontrapping-float-to-int` for any Rust 2024 output, plus a matching
`--enable-*` for each `-Ctarget-feature` in `.cargo/config.toml` (`+simd128` →
`--enable-simd`, `+multivalue` → `--enable-multivalue`), set in
`[package.metadata.wasm-pack.profile.release] wasm-opt = [...]`.

### TypeScript entry points

A hand-written TS entry re-exports wasm-pack's `pkg/` and layers stream
helpers. Per-runtime entries differ in init: Node uses sync init
(`readFileSync` + `initSync`), browsers async `init()` with exports guarded
against uninitialized WASM. wasm-bindgen's camelCase is bridged to the
ecosystem convention (`initSync` re-exported as `init_sync`).

- Stream helpers batch at 16 KB to reduce boundary crossings
  (`await hash_stream(file.stream())`, built via
  `make_stream_functions(Blake3Hasher)`; the browser entry passes a `_check`
  guard against uninitialized WASM).
- `using hasher = new Blake3Hasher();` — `Symbol.dispose` runs `free()` at
  scope exit. `Blake3HasherInstance` / `Blake3HasherConstructor` type the class
  across entries.
- `@fuzdev/fuz_util/hash_blake3.ts` is the ecosystem consumer:
  `export const blake3_ready = init();` (eager; immediate under sync init,
  awaited in browsers) and
  `hash_blake3(data: Uint8Array | BufferSource | string): string` returning
  64-char hex (fuz_app's `Blake3Hash` schema validates this shape).
- **`deno compile`**: wasm-bindgen's deno target loads WASM via `fetch()`,
  which `deno compile` can't do. The build patches the generated JS to
  `Deno.readFileSync` and creates a `_bg.js` stub for module resolution.

## Multiple Binding Crates (tsv)

One binding crate per technology, all exporting identical macro-generated
signatures so consumers choose by runtime:

| Crate      | Technology   | Target                         | Error type           |
| ---------- | ------------ | ------------------------------ | -------------------- |
| `tsv_wasm` | wasm-bindgen | Deno, browsers, Node           | `Result<T, JsError>` |
| `tsv_napi` | N-API        | Node.js, Bun (native npm path) | N-API errors         |
| `tsv_ffi`  | C ABI        | Deno FFI, Python               | JSON error objects   |

All share `tsv_arena`. `tsv_ffi` and `tsv_napi` override `unsafe_code = "allow"`
with the full re-declared lint block. `tsv_ffi` uses raw pointers with
`tsv_free(ptr, len)` and wraps every entry in `panic::catch_unwind`, rendering
`{"error": "panic: …"}` — effective only under a `panic = "unwind"` profile
(`[profile.corpus]` for differential/fuzz runs, `[profile.napi]` for the shipped
N-API artifact; a plain release build aborts and the wrapper is inert —
./rust-patterns.md §Release Profile).

## Package naming: a `wasm` suffix, kebab on npm

WASM artifacts carry a `wasm` suffix wherever they could be confused with a
native build; native stays bare. The suffix is part of the published identity,
and each namespace spells it its own way: the **crate** is `<name>_wasm` (Rust
snake_case; the generated `*_wasm_bg.wasm` follows the crate), the **npm
package** is `@fuzdev/<name>-wasm` (kebab — how every Rust-tooling peer spells
its WASM edition: `@oxc-parser/binding-wasm32-wasi`, `@biomejs/wasm-*`,
`esbuild-wasm`), and N-API platform packages are `@fuzdev/<name>-<triple>`. A
feature subset sits between the name and the suffix (`@fuzdev/tsv-format-wasm`).
This is a deliberate exception to the `@fuzdev` scope's snake_case library names
(`@fuzdev/fuz_util`): a WASM or native package is a per-runtime delivery of a
tool that sits beside those peers, not a library in the fuz stack, so the whole
npm surface of such a tool spells one way.

| Project | WASM packages                                                                                                    | Native                                                                                                        |
| ------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| blake3  | `@fuzdev/blake3-wasm` (SIMD), `@fuzdev/blake3-wasm-small` (no SIMD) (crates `blake3_wasm`, `blake3_wasm_small`)  | none                                                                                                          |
| pglet   | `@fuzdev/pglet-wasm` (crate `pglet_wasm`)                                                                        | `pglet_server` daemon (PG wire)                                                                               |
| tsv     | `@fuzdev/tsv-wasm` (parse + format + `tsv` CLI), `@fuzdev/tsv-format-wasm`, `@fuzdev/tsv-parse-wasm`                                                | `@fuzdev/tsv` (N-API loader) over `@fuzdev/tsv-<triple>` platform packages, each shipping the `tsv` CLI binary; `tsv_ffi` `.so` as source |

- **The three tsv WASM packages come from one crate**: `tsv_wasm` has
  `format`/`parse` features (default both); subset packages are
  `--no-default-features --features format|parse` builds. `parse` pulls the
  language crates' `convert` feature (AST→JSON); both pull `js-sys` (one shared
  options-bag reader, ~0.2% on the format-only package). The umbrella is the
  flagship (ships the JS `tsv` CLI).
- **"tsv" is deliberately overloaded**: the native CLI (`tsv_cli` crate), the
  C-FFI lib, and the JS CLI in `@fuzdev/tsv-wasm` are all invoked as `tsv` —
  one tool, per-runtime delivery.
- Where artifacts are grouped by kind, don't repeat `(wasm)`/`(native)` in
  row names — the suffix carries it.

## Two Packages, Not Two Profiles (blake3)

When two builds differ only in codegen flags, **ship two packages from two
thin crates over one core, not two cargo profiles** — `wasm-pack` doesn't
support `--profile` (conflicts with `--release`), so per-build codegen rides on
`RUSTFLAGS` at the invocation, making the crate the natural unit. blake3's
SIMD and no-SIMD builds are both size-optimized (`opt-level=s` + wasm-opt
`-Os`), differing only in `+simd128` and the core's `simd` feature; a size
regression test pins byte counts.

Pick by measurement: SIMD is ~2.6x faster at large inputs on Deno/Node but
_slower_ on Bun (a WASM SIMD regression), so the small build is right for Bun
and bundle-size-sensitive contexts. The wasmtime component is the exception —
`opt-level=3`, since a host can absorb bytes for speed.

## Testing

blake3 keeps **zero Rust unit tests by design**: correctness is asserted in
TypeScript (WASM vs native test vectors) and via a Wasmtime compare binary;
`cargo test --workspace` is a compile gate. tsv's binding tests run per
runtime (Deno, N-API, npm) plus in-crate FFI/N-API round-trips
(./rust-patterns.md §Testing).

Specs: [WIT](https://github.com/WebAssembly/component-model/blob/main/design/mvp/WIT.md),
[component model explainer](https://github.com/WebAssembly/component-model/blob/main/design/mvp/Explainer.md).
