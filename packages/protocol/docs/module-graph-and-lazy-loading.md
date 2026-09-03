---
title: ModuleGraphAndLazyLoading
---

# The module graph and lazy loading

`@midnight-ntwrk/midnight-js-protocol` co-installs two ledger runtimes and a
retained pre-fork toolchain, each carrying its own WASM artifact. Which of
them a consumer actually pays for is decided by the shape of the module graph:
which modules are build entries, which direction the imports run, and which
dependencies are reachable only through a dynamic import. This document
records those decisions, the tests that hold them in place, and the rule that
follows from them for how a seam names a vendor's classes without importing
them.

The mechanism that exposes the v8 era — the `./v8` subpath, the relative
dynamic import, and the three ways the single sanctioned path is enforced — is
decided in `docs/adr/0004-lazy-v8-era-access-via-protocol-subpath.md`. This
document does not restate it; it records the parts of the graph that grew
around it.

## Every module directly under `src/` is a build entry

Every module directly under `src/` is a build entry paired with an `exports`
subpath. `export-surface.test.ts` is the gate: it reads the `exports` map out
of `package.json` and requires one subpath per top-level module under `src/`.

That is why the accessors do not sit at the top of `src/`. `loadLedger8` lives
in `lib/v8/load.ts` and `loadLedger8Engine` in `lib/v8/load-engine.ts`: both
are published through the root barrel instead of through a subpath of their
own, so neither may be a top-level module. It is also why the dynamic
specifiers read `../../v8.js` and `../../engine.js` rather than `./v8.js` and
`./engine.js`.

The same split applies to the engine. The implementation lives in
`lib/v8/engine.ts`, so it is not an entry of its own; `src/engine.ts`
re-exports it and is what rollup emits as `dist/engine.js`, the chunk
`loadLedger8Engine` reaches by dynamic import. Keeping it a separate entry is
what holds the retained `compact-runtime@0.16` glue and the
`@midnight-ntwrk/onchain-runtime-v3` WASM out of the package root.

## Where `LEDGER_VERSIONS` lives, and the cycle it avoids

`LEDGER_VERSIONS` is declared in `lib/shared/ledger-version.ts`, a leaf module
that imports nothing, and is re-exported unchanged by `version.ts`, so the
public surface is the one it always was. Consumers keep importing both
`LEDGER_VERSIONS` and `LedgerVersion` from `version.ts` — and from the root
barrel — exactly as before.

Two modules need that set, and the dependency between them runs one way:
`version.ts` imports `errors.ts` for the error it throws, while `errors.ts`
imports nothing but this file. `errors.ts` needs `LedgerVersion` to type the
era its composition failures name. Declaring the constant in `version.ts`
would therefore close a cycle.

Declaring it in `errors.ts` would not close a cycle, but it would put the era
vocabulary in the error module and make every reader of that vocabulary an
importer of errors. A leaf both modules can reach keeps the direction and the
ownership straight.

## `./v8` and `./engine` are separate chunks

Two heavy dependency sets are reachable only through a dynamic import, and
each has its own entry chunk, because each pulls a different set of
retained-era dependencies:

- `./v8` — the multi-megabyte v8 ledger WASM (`@midnightntwrk/ledger-v8`,
  re-exported by `src/v8.ts`). The relative specifier in `lib/v8/load.ts`
  names this build entry, which rollup emits as its own chunk and links only
  through that dynamic import, so the v8 WASM loads on the first call to
  `loadLedger8` and not before.
- `./engine` — the retained `compact-runtime@0.16` glue (installed under the
  `compact-runtime-ledger8` alias) and the
  `@midnight-ntwrk/onchain-runtime-v3` WASM. The relative specifier in
  `lib/v8/load-engine.ts` names the `./engine` build entry the same way, so
  those two load only on the first call to `loadLedger8Engine` — never as a
  side effect of importing the package root. Evaluating `lib/v8/engine.ts` is
  what pulls them in, and that happens only on that import.

A consumer that only executes circuits and binds them onto v9 therefore never
instantiates the v8 ledger WASM at all: `createLedger8Engine` deliberately
does not acquire the v8 ledger module, so such a consumer never hard-depends
on ledger-v8 resolving either. The reason that surface does not need it is
recorded in `docs/era-seam.md`.

## The only sanctioned runtime access

`loadLedger8()` is the only sanctioned runtime path to the v8 ledger era, and
`loadLedger8Engine()` is the only sanctioned runtime path to the engine's
public surface. Every other module in the package reaches the retained era
through one of those two accessors, which is what keeps the number of physical
WASM copies at one and keeps the laziness a property of a single call site
rather than of a convention spread across files.

`lib/v8/load-engine.ts` re-exports the engine's option and result types
type-only — `DownConvertedState`, `EncodedStateValue`, `ExecuteCircuitOptions`,
`Ledger8Engine`, `TranscriptPojo` and `WrapKeepStateCallOptions` — so the root
barrel can name every type a caller needs without linking the engine chunk.
Without them a consumer holding a `Ledger8Engine` cannot annotate a variable
or write a helper without a second, subpath-gated import.

## The tests that enforce each property

Each property above is pinned by a named suite rather than by convention:

- `export-surface.test.ts` — every top-level module under `src/` has an
  `exports` subpath, which is what makes "not an entry" the reason the
  accessors live under `lib/`.
- `v8-surface.test.ts` — no module under `src/` other than `lib/v8/load.ts`
  may import the v8 module at runtime. It reads past comments and type-only
  imports and re-exports, and resolves each relative specifier against the
  file naming it, so the `./engine` build entry is never confused with the
  `lib/v8/engine.ts` sibling that shares its name.
- `dist-laziness.test.ts` — the index bundle must never link the v8 entry
  statically, and must never link the `./engine` subpath,
  `@midnight-ntwrk/onchain-runtime-v3`, or the `compact-runtime-ledger8` glue
  alias statically either. It inspects the built rollup output, so it is the
  suite that proves erasure and chunking rather than assuming them, and the
  eager closure it scans is the set of modules a consumer pays for on
  `import`.
- `v8-load-engine-laziness.test.ts` — constructing the engine, and calling any
  of its methods, never acquires the v8 ledger module.

## Vendor types are imported with `import type`

Where a module names a vendor's types but must not link the vendor's module,
the import is type-only. `import type * as` is erased with the rest of the
type layer and links nothing; that is the same idiom `ProtocolV8` uses in
`lib/v8/load.ts`.

The rule is about values, not names. A value import of either era's module
would statically link that era's WASM into whatever bundle reaches the
importing module — which for ledger-v8 is exactly what
`dist-laziness.test.ts` forbids, and which for the other era would make a
consumer pay for a runtime it never calls. Naming a type does not: type-only
imports are erased. This is why the seams that need a vendor's classes at
runtime take them by injection instead of importing them, and why a seam that
cannot name a single vendor type — `lib/shared/unshielded.ts`, which runs on
both eras — declares a structural slice rather than reaching for a value
import.

`lib/v8/down-convert.ts` reads the three pre-fork instance types it names off
one type-only namespace import rather than adding a second named import of the
same module. Those aliases are not mirrors: they are the vendor's types.

## Naming a type versus importing a value at the envelope seam

`Ledger8ContractState` in `lib/era/envelope.ts` is the clearest case of the
distinction, because the module it names is one the package must not link
eagerly. Injection is still what gets the runtime into that seam — that is
about not importing a value. The `import type * as` the declaration reads
through is erased and links nothing, which leaves the lazy acquisition path
the caller owns untouched. `lib/era/envelope.ts` sits inside the eager closure
`dist-laziness.test.ts` scans, and that suite is what proves the erasure.

The same distinction is stated again where the seam is used: whether
`ledger8ContractState` is required for every era is a statement about the call
graph, not about bundling, and the reason the pre-fork types are imported with
`import type` is unaffected either way.

## Injected runtime slices are derived from the vendor, not restated

A seam that takes a vendor class by injection still has to name the shape it
expects. Where exactly one era can satisfy that shape, the type is DERIVED
from the vendor's own class rather than restated, so a vendor signature change
fails this build instead of quietly leaving a hand-written mirror describing a
shape the runtime no longer has:

- `Ledger8ContractState` (`lib/era/envelope.ts`) is derived from the pre-fork
  `ContractState` statics, so a signature change in onchain-runtime-v3 fails
  the build here.
- `Ledger8CompactRuntimeStateValue` (`lib/v8/down-convert.ts`) is derived the
  same way from the pre-fork `StateValue` statics: a `decode` whose signature
  moves fails this build instead of leaving a hand-written mirror describing a
  static the runtime no longer has.

Derivation is orthogonal to the import rule above. The `import type * as` each
declaration reads through is erased and links nothing — injection is about not
importing a value — so deriving the type leaves the lazy acquisition path the
caller owns untouched.

Each derived slice is also narrowed to the members the seam actually calls.
`Ledger8ContractState` is narrowed to `deserialize` because that is the only
member its seam calls. `Ledger8CompactRuntimeStateValue` is narrowed to
`decode` because that is the only static its seam calls, and because the
narrowing is what lets `v8-down-convert.test.ts` drive the decode safety net
with a one-member double instead of a whole WASM class.

The narrowing on `Ledger8ContractState` carries one further consequence — it
pins the slice to the pre-fork era, which is what `Ledger8CompactRuntime`
depends on. That consequence is recorded in
`docs/retained-era-execution.md`.

## Structural where a seam serves both eras

The counterpart to derivation is a structural declaration, and the contrast is
the point: derived where there is one era, structural where there are two.

`ContractStateDecoder` (`lib/shared/contract-state.ts`) is declared
structurally rather than derived from one era's class, because that decoder
genuinely serves BOTH axes — the v9 arm passes ledger-v9, the v8 leg passes
the module `loadLedger8` handed it — and naming either era's type there would
pick a side. `Ledger8ContractState` is the single-era counterpart, and IS
derived from the vendor for that reason.

Injection remains required in both cases, and for the reason already given:
naming a type links nothing, but importing either era's module as a value
would statically link its WASM into whatever bundle reaches the importing
module.
