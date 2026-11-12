# 0020. Carry on-chain state as bytes, decoded by the caller's runtime

- Status: Accepted
- Date: 2026-10-28
- Related: [ADR 0007](./0007-never-latch-the-network-head-version.md),
  [ADR 0017](./0017-error-codes-are-the-contract.md),
  [ADR 0024](./0024-hold-transactions-as-bytes-decoded-by-the-callers-ledger.md)

## Context

The framework reads three kinds of ledger state from the network: a contract state, ledger
parameters and a zswap chain state. Four forces shape how it hands them to a dApp:

- **The shape must not change at a fork.** If the current era is a decoded object and an older era is
  bytes, the previous era's shape changes at every fork and every dApp that reads it breaks.
- **A state decoded by the framework can fail in the dApp's contract.** The compiled contract's
  `ledger()` checks `instanceof ChargedState` against its own `onchain-runtime`. A state decoded by
  another copy is refused with `expected instance of ChargedState`. It works only when the package
  manager installs one copy of the runtime.
- **One concept needs one shape.** Several read shapes for the same state leave a developer unable to
  tell which to use.
- **Each ledger writes a tag in front of its bytes.** The runtime of an era reads the bytes its
  ledger writes and refuses the other era's bytes on the tag. Two eras can share a tag when the later
  ledger kept the format: v8 and v9 both write `midnight:zswap-ledger-state[v5]`.

## Decision

Every ledger state the framework reads from the network, and every full ledger state on the
`contracts` API, is bytes plus the era of the ledger that wrote them. The caller decodes it with its
own runtime.

There is one class per kind, in `packages/types/src/serialized-state.ts`:
`SerializedContractState`, `SerializedLedgerParameters` and `SerializedZswapChainState`. Each has
`era`, `fromBytes(era, bytes)`, `serialize()`, `deserialize(decoders)` and a static guard
(`isSerializedContractState`, `isSerializedLedgerParameters`, `isSerializedZswapChainState`).

1. **`fromBytes` checks the tag against the era.** `LEDGER_STATE_TAGS` in
   `@midnight-ntwrk/midnight-js-protocol/version` holds the tag each ledger era writes for each kind
   (`StateKind`). Bytes that do not start with that tag are refused with
   `InvalidSerializedStateError` (`MIDNIGHT_JS_PR_INVALID_LEDGER_STATE`, reason `tag-mismatch`); a
   value that is not a `Uint8Array` with reason `not-bytes`; an unknown era with
   `UnknownLedgerEraError`. The check asks "is this tag valid for this era", never "which era does
   this tag name", so a shared tag works. An era with no row is a build error, and a build check also
   fails if two eras share a contract-state or ledger-parameters tag, because those two are dated from
   the tag alone (`ledgerVersionOfContractState`, `ledgerVersionOfLedgerParameters` in `utils`).
2. **Only `fromBytes` makes a value, and the bytes are copied in and out.** The constructor refuses a
   call without `fromBytes`'s private token (`not-from-bytes`). No caller can change a value it was
   handed. The bytes are a private field, so `structuredClone`, `postMessage` and JSON drop them: send
   `serialize()` and `era`, and rebuild with `fromBytes`.
3. **`deserialize` takes the decoders from the caller**, one per era, each with
   `deserialize(bytes)`: for example `{ v9: ContractState }` from the dApp's own `compact-runtime`.
   Only the decoder of the value's era is called. Decoders with none for any era the value's type
   allows do not compile. A missing decoder at run time is `SerializedStateDecoderMissingError`
   (`MIDNIGHT_JS_PR_LEDGER_STATE_DECODER_MISSING`), whose message names the class to import. A
   decoder that throws a non-`MidnightJsError` is `SerializedStateDecodeFailedError`
   (`MIDNIGHT_JS_PR_LEDGER_STATE_DECODE_FAILED`, INTEGRITY) with the cause: the tag was already
   checked, so the body is corrupt or the decoder is the wrong one. A `MidnightJsError` is rethrown
   unchanged. There is no form without decoders.
4. **`contracts` rebuilds every state it is handed.** A value made by a second installed copy of
   `types` fails the guard, so `contracts` does not refuse it: it rebuilds the state from its `era`
   and `serialize()` with this copy's `fromBytes`, which checks the tag again. A state of another kind
   fails the same tag check. A value whose `serialize()` gives no bytes is refused as `not-bytes`. A
   value that names no known era (for example a pre-5.0.0 provider's shape) is refused with
   `UnknownLedgerEraError`. When a call is built, ledger parameters or a zswap chain state that are
   missing or of another era than the call are refused with `PublicStatesEraMismatchError`
   (`MIDNIGHT_JS_C_PUBLIC_STATES_ERA_MISMATCH`).
5. **One read record per question** (`packages/types/src/contract-state-read.ts`):
   - `ContractStateRead { protocolVersion, contractState }` from `watchForContractState`,
     `queryDeployContractState` and `contractStateObservable`. `protocolVersion` dates the block of
     the read; `contractState.era` is the ledger that wrote the bytes.
   - `ContractStateAndParametersRead` adds `ledgerParameters` of the same block, from
     `queryContractState`, because building a call needs both. The indexer provider refuses
     parameters of another era than that block.
   - `PublicStatesRead` adds `zswapChainState`, from `queryZSwapAndContractState`. Its three states
     are of one era; the zswap chain state takes the era of the ledger parameters.
   - On a read with no block given, the block and the state are looked up separately, so near the
     fork they can sit on either side of it.
6. **A read never decodes and never loads the ledger 8 runtime.** The indexer provider builds the
   records from bytes.
7. **The framework decodes only to build a transaction.** `contracts` decodes with its own copy, through
   `utils`, only where it builds one: the call path, cross-contract calls, `findDeployedContract` and
   the maintenance flows. Everywhere else on the `contracts` API a full ledger state is one of these
   classes, in both eras: call inputs (pass `read.contractState` as it is), deploy and found
   `initialContractState`, `verifyContractState`, and `ContractTypeError.contractState`.
   `Ledger9TransactionContext.getCurrentStates()` returns a `PublicStatesRead` whose contract state is
   the running state of the scope, or `undefined` before the scope has read any state. The one exception is
   `Ledger9ContractConstructorResult.nextContractState`, a decoded ledger 9 `ContractState`.

A dApp reads its state like this:

```ts
import { ContractState } from '@midnight-ntwrk/compact-runtime';

const read = await publicDataProvider.queryContractState(address);
if (read !== null) {
  const state = ledger(read.contractState.deserialize({ v9: ContractState }).data);
}
```

A contract compiled with the ledger 8 toolchain reads a v8 state with its own `ContractState`. After
the fork its state is v9, which its runtime cannot read: it decodes the bytes with the current
`compact-runtime` and passes the state value to its own runtime as plain data
(`OldRuntime.StateValue.decode(state.data.state.encode())`).

## Consequences

- **Positive:** a state read from the network has one shape in every era, so a fork changes no read
  type. The object a dApp gets is one its own `ledger()` accepts, whatever the package manager
  installed. There is one read per question. Reading a v8 state does not load the ledger 8 runtime.
  On-chain state and transactions follow one model (ADR 0024).
- **Negative:** a dApp passes a decoder on every read. A ledger 8 contract that reads its state after
  the fork needs the current runtime too. The indexer provider refuses a `queryContractState` whose
  block carries no ledger parameters. Streams do not carry ledger parameters.

## Alternatives considered

- **A decoded object for the current era.** Rejected. The shape changes at every fork, and the object
  is the framework's copy, which the dApp's `ledger()` may refuse.
- **One generic class with a `kind` parameter.** Rejected. One name had three meanings, the kind was
  a string a developer had to know, and it was checked from a field at run time. With one class per
  kind the class is the kind, and the three are not assignable to each other.
- **`deserialize()` with no argument, decoding with the framework's copy.** Rejected. It would be the
  common call, and it brings back the `ChargedState` failure in every install that does not dedupe
  the runtime.
- **A plain-data view of the state.** Rejected. It is a third shape for the same value, and plain data
  still has to become an object of the dApp's runtime before `ledger()` takes it.
- **Check that the tag names the era.** Rejected. The zswap chain state has one tag for two eras, and
  a later ledger may share a tag for another kind too.
