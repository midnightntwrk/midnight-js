# 0007. Cross the era boundary with plain data only

- Status: Accepted
- Date: 2026-09-04
- Deciders: Szymon Paluchowski

## Context

`@midnight-ntwrk/midnight-js-protocol` co-installs two ledger WASM toolchains —
`@midnightntwrk/ledger-v9` for the current era and `@midnightntwrk/ledger-v8`
for the retained pre-fork one — alongside the retained pre-fork execution
toolchain (`compact-runtime@0.16` and `@midnight-ntwrk/onchain-runtime-v3`).
The package exists to let a caller work with a record from either era without
knowing which era it holds.

A WASM handle is not a value. It is a pointer into one module instance's linear
memory, valid only there. Three properties follow, and all three shape this
decision:

- A handle from one module is meaningless in another. Where a vendor checks
  (`wasm-bindgen`'s `_assertClass` in an argument position) it throws; where it
  does not check — the receiver position — nothing is validated and a plausible
  wrong value comes back. ADR-0004 already commits this package to exactly one
  runtime path per era so a second copy cannot appear through it; a handle
  passed across a seam would reintroduce the same failure mode between the two
  *eras*, which are two distinct modules by construction rather than by
  accident.
- A handle outlives nothing. A caller holding one also holds the module that
  produced it, and cannot put the value in a `structuredClone`, send it to a
  worker, or persist it.
- Handles from different eras are not comparable. Two results describing the
  same contract state are two unrelated objects if each is a handle from its
  own module.

Against that, handles are the natural currency *inside* one era: the retained
pre-fork execution pipeline down-converts a state, runs a circuit against it,
and binds the transcript, and encoding between each of those steps would be
pure cost.

## Decision

We will let no live WASM handle pass between two ledger eras. At every
era-crossing point the value is encoded to plain data — a `Uint8Array`, or a
plain object or tagged union over `Uint8Array`, `Map`, array and primitive —
and the receiving side deserializes it into its own era.

Two consequences of that rule are worth stating explicitly, because they look
inconsistent until the rule is in view:

- **`LedgerEra` trades only plain data, in both directions.** Its caller may
  hold either era, so every value on that surface is era-crossing by
  construction: `extractState` returns an `EncodedStateValue`,
  `decodeContractState` a `ContractStatePojo`, `composeCallTx` a `Uint8Array`,
  `composeDeployTx` a `DeployResultPojo` of bytes and a string. Inward too —
  `composeEraV8DeployTx` (`src/lib/v8/adapt.ts`) hands the contract state to
  the v8-native deploy leg as BYTES, which that leg deserializes into its own
  era rather than accepting a handle.
- **`Ledger8Engine` may hand back pre-fork handles, because it is bound to the
  pre-fork era and says so.** `DownConvertedState.data` is an
  `onchain-runtime-v3` `ChargedState`; `TranscriptPojo` carries two of them;
  `ConstructorResultPojo.contractState` is a pre-fork state handle. These
  circulate within the retained pipeline and never leave it. The one method on
  that surface which does cross, `wrapKeepStateCall`, encodes first —
  `transcript.preContractState.data.state.encode()` (`src/lib/v9/wrap.ts`) —
  so the pre-fork handle never reaches the ledger-v9 module, only the plain
  value it encoded to.

The `LedgerEra` half is mechanised rather than left to convention:
`era-parity.test.ts` (`packages/protocol/src/test/`) calls `structuredClone`
over the result of all four methods, on both eras. A live WASM handle in any of
them makes that clone throw, so the gate fails instead of the handle shipping.

This is a transport rule, not an immutability rule. `readonly` on a result's
members freezes each reference, not the bytes behind it, so a value that
survives a `structuredClone` is not thereby protected from a caller writing
through the arrays it carries. Immutability, where this package needs it, is
bought separately by freezing the object.

## Consequences

- **Positive:** a result outlives the module that produced it and can be
  cloned, transferred to a worker or persisted; results from the two eras are
  structurally comparable, which is what makes the era-agnostic facade
  worth having; no object is ever passed between two WASM copies, so the
  dual-instantiation failure mode cannot be reached through a result even if a
  duplicate install exists; the rule is stated once, mechanised on the surface
  where it matters most, and checkable on the other by reading its return
  types.
- **Negative:** every era crossing pays an encode plus a decode, including the
  `wrapKeepStateCall` encode on a path that is otherwise handle-to-handle; the
  seam cannot hand back a rich vendor object even when caller and seam
  demonstrably share one module copy; a caller that wants to operate on a
  result has to deserialize it again; and the two surfaces genuinely differ,
  so `readonly` and "Pojo" in a type name are not on their own evidence that a
  value is plain — `TranscriptPojo` is `readonly` throughout and still carries
  handles.
- **Follow-ups:** none. A new operation on `LedgerEra` must return plain data;
  a new one on `Ledger8Engine` may return a pre-fork handle only if it stays
  inside the retained pipeline, and must encode at the point it does not.

## Alternatives considered

- **Pass live handles across the era boundary** — rejected: it ties a result's
  lifetime to its module, makes the two eras' results incomparable, and
  reintroduces the cross-copy failure ADR-0004's single-path rule exists to
  prevent, this time between modules that are distinct by design.
- **Plain data everywhere, including inside `Ledger8Engine`** — rejected: the
  retained pipeline is three steps in one era, and encoding between each would
  buy nothing. The cost is real (`downConvertForExecution` already re-encodes
  once for its integrity check) and there is no boundary there to protect.
- **Deep-freeze every result instead** — rejected: it answers a different
  question. Freezing stops a caller mutating a value; it does nothing about
  module lifetime, cloneability or cross-era comparability, which are what this
  rule is for.
