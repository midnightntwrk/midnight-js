# 0010. Publish era handles alongside their plain data

- Status: Accepted
- Date: 2026-09-09
- Related: [ADR 0004](./0004-lazy-v8-era-access-via-protocol-subpath.md),
  [ADR 0009](./0009-share-era-neutral-result-bases-from-the-types-package.md),
  [ADR 0020](./0020-carry-on-chain-state-as-bytes-decoded-by-the-callers-runtime.md),
  [ADR 0024](./0024-hold-transactions-as-bytes-decoded-by-the-callers-ledger.md)

## Context

`@midnightntwrk/midnight-js-protocol` installs two ledger WASM toolchains side by side:
`@midnightntwrk/ledger-v9` for the current era and `@midnightntwrk/ledger-v8` for the retained
pre-fork one, plus the retained execution toolchain (`compact-runtime` 0.16, installed as
`compact-runtime-ledger8`, and `@midnight-ntwrk/onchain-runtime-v3`).

A live WASM handle has three properties that make it risky to pass around:

- It is a pointer into one module instance's memory. Passed to another instance it throws where
  `wasm-bindgen` checks (argument position) and silently misbehaves where it does not (receiver
  position).
- It does not survive `structuredClone`, a `postMessage` to a worker, or storage. Anything that
  walks it sees `__wbg_ptr`, an integer that means nothing outside its module.
- Two eras describe the same concept with two unrelated objects, so a caller cannot compare them.

But hiding every handle also has a cost. If the framework held a decoded post-call state and threw
it away, the caller had to fetch and decode the same state again.

## Decision

### Era-specific results carry handles and plain data side by side

On the framework's era-specific result types we publish the handle **alongside** a plain-data
member for the same value. The caller chooses.

- `Ledger9CallResultPublic.nextContractState` (`StateValue`) and
  `Ledger8CallResultPublic.nextContractState` are live handles. Both results also carry
  `nextContractStateEncoded`, an `EncodedStateValue` that survives cloning and storage.
  Era-agnostic code reads the encoded member.
- Each `Ledger8ContractCall` entry carries `public.contractState` (the state the call ended on,
  as in the current era) and `public.preContractState` (the state the call bound to), each with an
  `...Encoded` twin.
- A handle is named as one: its doc comment says which runtime made it and that it is live, so a
  reader learns the lifetime rule from the type.

Transactions and full ledger states are not handles on the `contracts` surface. The composed
transaction is `unprovenTx`, a `LedgerTransaction` handle that holds bytes (ADR 0024). The
deploy-time state is a `SerializedContractState` (ADR 0020): `Ledger8FoundDeployTxData` and
`Ledger8FinalizedDeployTxData` carry it as `deployTxData.public.initialContractState`.

### The deployer's data sits under `deployTxData` in both eras

Every found or deployed handle, in both eras, has `deployTxData: { era, public, private }`. The
deploy record and `initialContractState` are under `public`; `signingKey` and
`initialPrivateState` are under `private` (a deployed handle adds `initialZswapState`). A caller
reads `deployTxData.public.txId` and `deployTxData.private.signingKey` without branching on the
era. A found retained handle has `signingKey` and `initialPrivateState` present but possibly
`undefined`. The retained key uses the current era's `SigningKey` type, in its
`{ tag: 'schnorr', value }` form; the bare hex string the retained runtime signs with stays off the
`contracts` surface.

### `LedgerEraFacade` trades only plain data, in both directions

`LedgerEraFacade` (`packages/protocol/src/lib/era/era.ts`) exists so a caller can work with a
record without knowing its era. A handle there would be a value the caller cannot type, compare or
pass on. So every value crossing it is encoded: `extractState` returns an `EncodedStateValue`,
`decodeContractState` a `ContractStatePojo`, `composeCallTx` a `ComposeCallResultPojo`,
`composeDeployTx` a `DeployResultPojo`. Inputs are bytes too: the v8 legs in
`src/lib/v8/adapt.ts` deserialize `contractStateBytes` into their own era rather than accept a
handle. `protocol-type-acl.test.ts` pins the member sets of `DeployResultPojo` and
`ComposeCallResultPojo`.

`Ledger8Engine` may return retained-era handles, because it is bound to the retained era and says
so: `TranscriptPojo` and `ConstructorResultPojo` carry compact-js ledger-8 state handles. They stay
inside the retained pipeline. Where a value leaves it, the engine encodes first:
`wrapKeepStateCall` (`src/lib/v9/wrap.ts`) passes `transcript.preContractState.encode()` to
ledger-v9, never the handle.

The rule is enforced by `expectStructuredCloneable` (`packages/protocol/src/test/clone-assertions.ts`),
used in `era-parity.test.ts` and `shared-contract-state.test.ts`. It walks a value for any object
with an own `__wbg_ptr` and fails naming the path. A plain "`structuredClone` did not throw" check
is not enough, because a handle clones without throwing. The walk reads own enumerable properties,
array elements and `Map`/`Set` members. A handle behind a non-enumerable property or a prototype
getter is not seen; that gap rests on review.

### A member holding serialized bytes ends in `Bytes`

A name like `contractState` can mean a handle, a plain object or bytes. So on the compose surface a
member that holds serialized bytes ends in `Bytes`: `txBytes`, `contractStateBytes`,
`ledgerParametersBytes`, `guaranteedZswapOfferBytes`, `initialContractStateBytes`,
`guaranteedBytes` / `fallibleBytes`. `ComposeOptionError.option` (`ComposeOption`) uses the same
names. `Encoded` is reserved for `EncodedStateValue`, the structured value `StateValue.encode()`
returns. On the `contracts` surface serialized state is a `SerializedContractState` class, whose
type already says it is bytes.

### The decoded state carries the contract balance

`ContractStatePojo` has a required `balance`, and `Ledger8CircuitOptions.contractState` is that
pojo, so state and balance travel as one value. The balance is a `ReadonlyMap` with no handle in it,
so it is plain data. It is required, not defaulted: an empty map is a real value (a contract holding
nothing), and a default would make a missing balance look like zero. The chain then refuses the
transcript because it re-runs the read against the real balance. For the same reason
`decodeContractStateWith` refuses a state that resolves no usable balance. `maintenanceAuthority`
stays off `DecodableContractState`: nothing reads it from a decoded state.

`readonly` and "Pojo" in a name are not proof that a value is plain or immutable. `readonly`
freezes references, not bytes, and `TranscriptPojo` is `readonly` throughout yet carries handles.

## Consequences

- A caller reads what the pipeline computed instead of fetching and decoding it again.
- The encoded twin exists in both eras, so era-agnostic code reads it without branching. It costs
  one encode per call, paid whether or not the caller reads it.
- A whole result object is not cloneable. `structuredClone`, `postMessage` or a serializer on it
  throws or stores a meaningless `__wbg_ptr`. Callers that persist results must pick the
  plain-data members.
- A published handle ties the result to the module instance that made it. A consumer that installs
  a second copy of the retained runtime can hit the dual-instantiation failure through a result
  object (see ADR 0004).
- A new operation on `LedgerEraFacade` must return plain data. A new one on `Ledger8Engine` may
  return a retained handle only if it stays inside the retained pipeline.

## Alternatives considered

- **Plain data only, everywhere.** Rejected: on era-specific results it denied callers values the
  framework already had. The transport risks can be documented instead.
- **Handles instead of plain data.** Rejected: it breaks every caller that clones, persists or
  sends a result to a worker.
- **Handles on `LedgerEraFacade` too.** Rejected: the caller there does not know the era, so no
  type could name the handle for both eras.
- **Plain data inside `Ledger8Engine` as well.** Rejected: the retained pipeline runs in one era
  and there is no boundary to protect between its steps.
- **Deep-freeze results instead of publishing the encoded twin.** Rejected: freezing stops
  mutation; it does nothing for module lifetime, cloneability or cross-era comparison.
