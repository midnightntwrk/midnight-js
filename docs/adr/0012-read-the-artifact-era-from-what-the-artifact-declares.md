# 0012. Read an artifact's ledger era from what the artifact declares

- Status: Accepted
- Date: 2026-09-11
- Related: [ADR 0011](./0011-tag-every-result-with-the-pipeline-that-produced-it.md)

## Context

Across the ledger fork the contract entry points accept artifacts from two Compact toolchains
through one API, and each operation must decide which pipeline runs. The era is a consensus-level
fact. A wrong answer sends a call to the wrong ledger.

The shape of the caller's contract object is not a stable source for that fact. The current
toolchain emits `async initialState`; a consumer build that targets below ES2017 rewrites it into a
plain function, and `initialState.constructor.name` then reads `'Function'`, exactly like a
retained-era contract. A decision based on that detail fails open, silently, on a build setting
this framework never sees. A `class` used as `initialState` has the same problem.

Build-stable facts exist:

- `compactc` records `runtime-version` on disk: in the integrity manifest
  (`compiler/contract-manifest.json`) for toolchains that write one, and in
  `compiler/contract-info.json` for every toolchain, including the retained one, which writes no
  manifest.
- A current-era contract arrives in a `CompiledContract` container with an own string `tag` and no
  circuit collections. No other shape looks like that, and an own property survives bundlers and
  the object spread the container's combinators perform. The tag's value is chosen by the caller
  and says nothing about the era.

## Decision

We will establish every artifact's era from the `runtime-version` its bundle declares, never from
the shape of generated code.

- `resolveArtifactEra` (`packages/contracts/src/internal/era.ts`) reads the declaration through
  `ZKConfigProvider.getArtifactRuntimeVersion()` for every contract, and maps its `major.minor`
  through one frozen table, `RUNTIME_VERSION_TO_ERA`. A compile-time gate requires every
  `LedgerEra` to be reachable from some declared version.
- The shape only refuses; it never routes. A container must declare ledger 9, or it is refused as
  `ledger8-artifacts-in-ledger9-container`. A retained-era candidate (own `impureCircuits`, plain
  `initialState`) must declare ledger 8; if it declares ledger 9 it is a ledger 9 contract passed
  raw and is refused as `unwrapped-ledger9-contract`. An `AsyncFunction` `initialState` is refused
  as `unwrapped-ledger9-contract` without reading the bundle. Any other shape is
  `unrecognised-contract-shape`.
- The shipped providers read the version from the integrity manifest first, because
  `expectedManifestHash` pins the manifest to a digest the application controls. The value decides
  which ledger runs the call, so whoever serves the artifacts must not decide it.
  `contract-info.json` is the fallback, and goes through the same integrity gate as every key and
  ZKIR.
- Nothing resolves to a default. A bundle that declares nothing is `artifact-era-undeclared`; a
  provider that cannot report a version is `provider-cannot-declare-era`; a toolchain this
  framework cannot place is `unknown-artifact-runtime-version`. All are `EraMismatchError` reasons.
  Any other provider failure propagates unchanged.
- Because the declaration is read for both shapes, the answer does not depend on which era is
  current. When a next ledger keeps the container shape, ledger 9 containers still resolve to
  ledger 9.

## Consequences

- A transpiled current-era contract is refused by the same declaration that places a real
  retained one. The `class`-as-`initialState` hole closes with it.
- The era comes from the bundle the proof is built from, not from an object handed in beside it.
- Every contract operation reads the declaration. The shipped providers cache it per instance (a
  failed read is not cached), so it costs one read per provider.
- Every bundle must serve its manifest `runtime-version` or `compiler/contract-info.json` from the
  same location as `keys/` and `zkir/`.
- A retained-era bundle has no manifest, so under the default `verify: 'require'` its description
  is refused. Such callers construct the provider with `verify: 'require-if-present'`, which their
  key and ZKIR reads need anyway.
- `getArtifactRuntimeVersion()` is a concrete member whose default throws
  `ArtifactRuntimeVersionUnavailableError`. A provider written outside this framework keeps
  compiling but must implement it to be used for contract operations. A provider mocked as an
  object literal must add it.

## Alternatives considered

- **Keep inspecting the code, and detect transpiled `async` better** (`Symbol.toStringTag`,
  `__awaiter` in the source text). Rejected: it chases each transpiler and stays a guess about
  generated code.
- **A framework-owned container for the retained era.** Rejected: it puts the declaration on the
  caller instead of the artifact, and makes the retained era look different to use.
- **Separate era-specific entry points only.** Rejected as the routing mechanism: it breaks the
  single API across the fork.
- **Let the container place itself as the current era without reading the bundle.** Rejected: the
  answer would follow the "current era" constant, so every ledger 9 container would silently move
  to the next ledger's pipeline the day that constant changes.
