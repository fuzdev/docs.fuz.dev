---
description: Rust performance — measuring and gating changes, stores and arenas, hot-path idioms, locks
---

# Rust Performance

**Applies to**: every Rust workspace in the ecosystem. ./rust-patterns.md
covers shape; this covers speed. Generic hygiene (`with_capacity`, iterator
fusion, bounds-check elision) is assumed. This is the layer specific to the
stack, and most of it is method: how a perf claim gets made.

Constraints: stable Rust, no `#![feature]`; `unsafe_code = "forbid"` outside
boundary crates; tokio.

## Measure

**A perf claim comes from a harness, not from reasoning.** State what was
measured, on what, against what.

- **Gate a change against its base** where the repo has the harness: build
  the base revision and the candidate, run them in fresh processes, and
  compare. gro's `cargo xtask bench <suite.json> --counters --base <rev>`
  interleaves the two and reports instruction, cycle, and wall medians;
  tsv's `deno task perf:ab <base>` grades paired wall deltas with an
  instruction-count check. A move past the repo's threshold needs a written
  reason in review. pglet records timings on a quiet box
  (`cargo xtask measure`) with no base comparison.
- **Prefer instruction counts where the harness has them**
  (`instructions:u` under `perf stat`): they're stable where wall-clock is
  bound to load and CPU frequency. Report wall and cycles beside them,
  because an instruction count is blind to code size, to cache and store
  stalls, and to code layout. A change that removes instructions can still
  lose wall time.
- **Every comparison states its noise floor**: the same build measured
  against itself (gro's A/A row, a same-ref run in tsv), a fresh process per
  sample, medians. A difference inside that spread isn't a result.
- **A wall-clock reference run needs a quiet machine.** Say so when a number
  came from a loaded one, and ask before recording a baseline on a shared
  workstation.
- **Measure what ships.** A binding is benched from its consumer language
  across the real boundary. Native rows load the build users get, including
  profile-guided optimization where the shipped artifact has it (tsv's
  `build:pgo`: trained on corpora held out from the measured set, gated on a
  fully applied profile and output byte-identical to a plain build). A
  regression instrument uses plain builds on both sides.
- **Corpora are pinned.** Benches and audits read real code from the
  `corpora` checkout at a recorded tree, so two runs measure the same bytes.
- **Profile with Linux `perf`** on a `profiling` profile (`inherits =
  "release"`, `debug` on, `strip = false`; codegen is identical to release):
  `perf record --call-graph=dwarf`, then `perf report` and `perf annotate`.
  `heaptrack` for allocation sites.
- **Sizes are gated like speed**: a WASM artifact has a committed size band
  or ceiling checked by script, and a type whose size matters is pinned with
  `const _: () = assert!(size_of::<T>() == N);`.
- There are no `[[bench]]` targets and no bench framework. A repo with enough
  to measure has a harness crate or scripts that own sampling and statistics
  (`gro_bench`, `pglet_bench`, tsv's `benches/`).

## Stores and arenas

tsv's allocation strategy: a parse writes its tree into per-document
**stores**, one `Vec` of plain rows per row type, where an edge is a typed
`u32` id and a list is a run over a store (`tsv_lang::store`). Formatting
builds into a separate doc arena, flat vectors named by ids too. Neither
allocates per node, and both are rewound between documents instead of freed.

- **Per-thread parked state for a binding's hot loop** (each language
  crate's `with_stores`, `tsv_arena`'s `with_doc_arena`): one value per
  thread in a `Cell<Option<T>>`, boxed where it is large so a take moves a
  pointer. Each call takes it out and parks it back rewound, so the capacity
  the largest input grew is kept and per-call allocation amortizes to zero.
  A caller that owns its loop holds the same slot itself (a `Formatter`).
- **Take and park, not a `RefCell` guard.** A nested call finds the slot
  empty and pays one fresh allocation instead of panicking, and the slot
  recovers after a `catch_unwind` or a WASM trap, where a held guard would
  leave the instance unusable.
- The callback must turn store-borrowed work into an owned return before the
  park. An id, a run, or a pool text is meaningful only to the stores that
  minted it, until their next rewind: a stale one reads some other row, in
  bounds. An internal feature for tests and audits stamps stores and handles
  to catch that (`_internal_store_check`).
- **Parked capacity is kept, never trimmed.** It is released by dropping its
  holder: the `Formatter`, the thread, or the WASM instance.
- A row is plain `Copy` data (ids, runs, spans, pool-text handles), so a
  rewind drops nothing and a list is copied into its store as a block. A
  by-value copy of a row has its own address: a memo keyed by a row's
  address takes a reference into the store, never a copy.
- `bumpalo` is for the bump arenas that remain (dev tooling), safe API only.
  Its collections don't run `Drop` for their contents, so an arena holds
  only plain data. Never move a global-heap `String` or `Vec` into one; it
  leaks.

## Hot-path idioms

- **Allocate on purpose.** An allocation that ends a pipeline, decouples
  lifetimes, or batches repeated work is often the right design. The smell is
  the reflexive one.
- **Keep `Result` small.** `Result<T, E>` is as large as its larger arm, so a
  fat error taxes every hot `Ok` path. tsv's `Error` is a pointer-sized
  newtype over a boxed private payload, pinned by a `const` size assert;
  callers read accessors and no signature mentions a `Box`. Don't box at the
  call site instead (`Result<T, Box<Error>>`): that's a second indirection
  for nothing.
- **Inlining across crates is already on in a workspace release build**
  (`lto = true`, `codegen-units = 1`), so `#[inline]` isn't needed there for
  visibility. A crate published as a library can't count on its consumer's
  profile, so its small hot accessors carry it. Beyond that, a new or changed
  `#[inline]`, `#[inline(always)]`, or `#[inline(never)]` on a hot path is a
  measured decision: reshaping an inlined probe can un-inline it, and an
  out-of-line leaf's real cost is paid by its caller. `#[cold]` goes on
  error constructors and formatters.
- **Compact index types**: tsv's `Span { start: u32, end: u32 }` halves span
  memory against `usize` pairs. The 4 GiB cap that buys is enforced by an
  explicit too-large error at the entry point.
- **`SmallVec` where a histogram says most instances fit inline** (tsv's
  printer buffers), sized from measured lengths.
- **Don't round-trip a closed set through serde on a hot path.** Match the
  literals in a `parse(&str)` and single-source `as_str`, `Display`, and the
  serde rename from the same table.

## Locks

- **Never hold a sync lock across `.await`.** Drop the guard first, or use
  `tokio::sync` for a section that itself awaits.
- **`parking_lot`** for short sync sections in a crate that already depends
  on it: no poisoning, so no `Result` at every lock under `unwrap_used`.
- **`std::sync`** elsewhere; don't add the dep for one lock. New code
  recovers a poisoned guard with `unwrap_or_else(PoisonError::into_inner)`
  when the protected state stays valid after a panic, in place of a
  suppressed `.lock().unwrap()`.
- A contended shared map is a profiling result before it's a redesign.

## Unsafe for speed

No workspace has a performance-justified `unsafe` crate. The bar for the
first one: the unsafe kernel sits in its own boundary crate
(see ./rust-patterns.md §Lints), a committed bench shows it wins by a margin
worth the audit cost, and a safe fallback stays beside it. "The compiler
should be able to prove this" and dodging a `clone()` don't clear it.

## Not adopted

None of these is in any workspace. Each needs a measurement that calls for
it and dependency approval (see ./rust-dependencies.md) before it is:

- a Rust bench framework (Criterion, Divan)
- a sharded or lock-free map, or a hand-rolled lock-free structure
- a zero-copy archive format (`rkyv`); wire surfaces stay on `serde_json`
- a global allocator swap for native binaries (`talc` under WASM is the one
  allocator in use, ./wasm-patterns.md)
- a thread-per-core runtime in place of tokio
- runtime CPU-feature dispatch; builds target one feature set, and SIMD comes
  from `target-feature` flags and crate features. `std::simd` is nightly.
