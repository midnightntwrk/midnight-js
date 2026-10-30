# 0020. Carry on-chain state as bytes, decoded by the caller's runtime

- Status: Accepted
- Date: 2026-10-28
- Deciders: Szymon Paluchowski
- Related: amends [0006](./0006-version-tagged-payloads-at-provider-seams.md),
  [0007](./0007-never-latch-the-network-head-version.md),
  [0008](./0008-report-decode-failures-without-attributing-an-era.md),
  [0010](./0010-publish-era-handles-alongside-their-plain-data.md),
  [0017](./0017-error-codes-are-the-contract.md) and
  [0019](./0019-carry-transactions-as-opaque-era-carrying-handles.md); issue #1550, supersedes #1525

## Context

Before this decision a contract state had three public shapes, and none of them worked well in
both eras:

| Type | Package | v9 | v8 |
|---|---|---|---|
| `VersionedContractState` (`queryContractState`, streams) | `types` | decoded `ContractState` | bytes |
| `RawContractState` (`queryRawContractState`) | `types` | bytes | bytes |
| `AnyEraContractState` (`getAnyEraContractState`) | `contracts` | plain data | plain data |

`VersionedPublicStates` (`queryZSwapAndContractState`) had the same split for the contract state
and the ledger parameters.

That had four costs:

- **The shape changed at every fork.** It followed the rule "the current era is a decoded object,
  an older era is bytes". ADR 0019 removed that rule for transactions. When ledger 10 becomes
  current, the v9 variant would have become bytes, and every dApp that reads `state.state` would
  break.
- **A state decoded by the framework fails in the dApp's own contract.** The compiled contract's
  `ledger()` checks `instanceof ChargedState` against its own `onchain-runtime`. A state decoded by
  another copy is refused with `expected instance of ChargedState`. It worked only when the package
  manager installed one copy of the runtime.
- **Three shapes for one concept.** A developer could not tell which read to use.
- **A v8 state was bytes with no way to decode it** (#1525).

Two facts measured for this decision:

- `ContractState.deserialize` of `onchain-runtime-v4` (the one `compact-runtime` 0.20 re-exports)
  reads the bytes `ledger-v9` writes (`contract-state[v8]`); the bytes are identical. The same holds
  for `onchain-runtime-v3` and `ledger-v8` (`contract-state[v6]`). Each runtime refuses the other
  era's bytes on the tag.
- A zswap chain state has the same format in v8 and v9: both write `zswap-ledger-state[v5]`, and
  the bytes are identical. A later ledger may change it.

## Decision

We will carry every value read from the network — a contract state, ledger parameters, a zswap
chain state — as bytes, and let the caller decode it with its own runtime.

One class in `types`, generic in the kind of value and the ledger era. It mirrors
`LedgerTransaction` (ADR 0019): the era is `era`, it comes first in the factory, and only the
factory makes one.

```ts
type LedgerStateKind = 'ContractState' | 'LedgerParameters' | 'ZswapChainState';

class LedgerState<K extends LedgerStateKind, E extends LedgerVersion = LedgerVersion> {
  readonly era: E;
  readonly kind: K;
  static fromBytes<E, K>(era: E, kind: K, bytes: Uint8Array): LedgerState<K, E>;
  static isLedgerState(value: unknown): value is LedgerState;
  serialize(): Uint8Array;
  deserialize<D extends StateDecoders>(decoders: DecodersFor<D, E>): DecodedState<D, E>;
}
```

The rules:

1. **`deserialize` takes the decoders from the caller.** `decoders` is one object per ledger
   era, each with a `deserialize(bytes)` method, for example `{ v9: ContractState }` from the
   dApp's own `compact-runtime`. Only the decoder of the value's own era is called. A missing
   decoder is refused with `LedgerStateDecoderMissingError`
   (`MIDNIGHT_JS_PR_LEDGER_STATE_DECODER_MISSING`), whose message names the class and the package to
   import. A decoder that throws an error that is not a `MidnightJsError` is reported as
   `LedgerStateDecodeFailedError` (`MIDNIGHT_JS_PR_LEDGER_STATE_DECODE_FAILED`, INTEGRITY) with
   its error as `cause`: the tag was checked when the value was made, so either the bytes after the
   tag are corrupt or the decoder is the wrong one, and the data and its decoder do not match. A
   `MidnightJsError` is rethrown unchanged, so a framework decoder's `DeserializationError` keeps
   its code. When the decoders hold none for any era the value can be, the call does not compile:
   a v8 value given only `{ v9: ContractState }` is a mistake the compiler can see. A value whose
   era is not known when compiling still compiles with one decoder, and is refused at run time with
   `LedgerStateDecoderMissingError` when its era has none. There is no form without decoders, so
   the framework's copy of the runtime is never used by accident.
2. **`fromBytes` checks the tag against the era.** `LEDGER_STATE_TAGS` in
   `@midnight-ntwrk/midnight-js-protocol/version` holds, for each kind and each ledger era, the
   tag that ledger writes. `fromBytes` refuses bytes that do not start with that tag with
   `InvalidLedgerStateError` (`MIDNIGHT_JS_PR_INVALID_LEDGER_STATE`, reason `tag-mismatch`). The
   check asks "is this tag valid for this era", never "which era does this tag name": two
   eras share a tag when the later ledger kept the format (a zswap chain state in v8 and v9).
   A ledger that changes a format gets its own row, and the check tightens by itself.
   `LedgerVersion` gaining an era with no row is a build error. A contract state and ledger
   parameters are dated from their tag alone (`ledgerVersionOf*` in `utils`), so a tag of either
   kind shared by two eras is a build error too.
3. **The bytes are copied in and out, and only `fromBytes` makes a value.** `fromBytes` and
   `serialize()` copy into a plain `Uint8Array` (a Node `Buffer` would share memory), so no
   caller can change a value it was handed. The constructor refuses a call that does not come
   from `fromBytes` (`not-from-bytes`), and `isLedgerState` tells a value of this copy of the
   package from a look-alike. A value made by a second installed copy of `types` gives `false`
   there, and a dApp can end up with two copies the same way it ends up with two runtimes. So
   `contracts` does not refuse it: it rebuilds every state a provider served from its `era`,
   `kind` and `serialize()` with `fromBytes`, which checks the tag again and refuses forged bytes
   (`tag-mismatch`); a state of another kind fails the same tag check. A value whose
   `serialize()` gives no bytes is refused as `not-bytes`. A value that names no known `era` is
   refused as the shape of a pre-5.0.0 provider (`UnrecognisedEraTagError`). When building a call,
   ledger parameters or a zswap chain state that are missing, or of another era than the call, are
   refused with `PublicStatesEraMismatchError` (`MIDNIGHT_JS_C_PUBLIC_STATES_ERA_MISMATCH`), on the
   v9 path and in the v8 pipeline alike. The bytes are a private field, so `structuredClone`,
   `postMessage` and JSON drop them: send `serialize()` and `era`.
4. **One read record per method.**
   - `ContractStateRead { protocolVersion, contractState }` is returned by
     `watchForContractState`, `queryDeployContractState` and `contractStateObservable`.
     `protocolVersion` dates the block of the read; `contractState.era` is the ledger that wrote
     the bytes.
   - `ContractStateAndParametersRead` adds the required `ledgerParameters` of the block that
     dates the read. It is returned by `queryContractState`, because building a call needs both.
     The parameters and `protocolVersion` come from the same block, so the indexer provider
     refuses parameters of another era than that block.
   - `PublicStatesRead` adds `zswapChainState`. It is returned by `queryZSwapAndContractState`,
     and its three states are of one era. The zswap chain state takes the era of the ledger
     parameters of the same block.
   - On a read with no block given, the block and the state are looked up separately, so near the
     fork they can sit on either side of it.
   - `queryRawContractState` and `rawContractStateObservable` are removed: `queryContractState`
     serves the same bytes and the block's ledger parameters. Streams do not carry the ledger
     parameters.
5. **A read never decodes and never loads the ledger 8 runtime.** The indexer provider builds the
   records from bytes.
6. **The framework decodes only to build a transaction.** `contracts` decodes a read with its own
   copy, through `utils`, where it builds a transaction: the call path, cross-contract calls,
   `findDeployedContract` and the maintenance flows. `getAnyEraContractState` is removed. The v8
   pipeline (keep-state and ledger 8 maintenance) refuses ledger parameters served in a shape
   that is not a `LedgerState` with `UnrecognisedEraTagError`, rather than taking them as absent;
   parameters not served at all still give `LedgerParametersUnservedError`.
7. **The scoped transaction hands out bytes too.** `TransactionContext.getCurrentStates()` returns a
   `PublicStatesRead` whose contract state is the running state of the scope. The decoded states
   the scope builds calls from stay inside `contracts`.
8. **Out of scope.** `LedgerTransaction` stays a handle that holds a live object (ADR 0019). The
   state that crosses the transaction API — `DeployTxData.initialContractState` and the initial
   states a caller passes to build a call — stays a decoded object. Moving it to the same model is
   a separate change, made together with `LedgerTransaction`.

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

- **Positive:** a value read from the network has one shape in every era, so the next fork changes
  no read type. The object a dApp gets is one its own `ledger()` accepts, whatever the package
  manager installed. There is one read per question, and one class to learn. Reading a v8 state
  no longer loads the ledger 8 runtime.
- **Negative:** `PublicDataProvider` changed before 5.0.0 final: five methods return new records,
  two are removed. The indexer provider refuses a `queryContractState` whose block carries no
  ledger parameters. A dApp passes a decoder on every read. A ledger 8 contract that reads its state
  after the fork needs the current runtime too. The indexer provider no longer exports
  `parseHexContractState`, `parseHexLedgerParameters` and `parseHexZswapState`.
- **Follow-ups:** move `LedgerTransaction` and the state on the transaction API to the same model.

## Notes

The finalized-transaction record follows the same names. `VersionedFinalizedTxData` is now
`FinalizedTxRead`, and its `version` is now `era`: `record.tx.era === record.era`, narrowed with
`switch (record.era)`. So every read result is a `*Read`, and every value — a record, a handle, a
state — names the era of the ledger that wrote it `era`. `requireLedger9` in `utils` narrows on
`era` too. The shape of the record does not change.

## Alternatives considered

**Keep a decoded object for the current era.** Rejected. The shape changes at every fork, and the
object is the framework's copy, which the dApp's `ledger()` may refuse.

**`deserialize()` with no argument, decoding with the framework's copy.** Rejected. It is the
convenient call, so it would be the common one, and it brings back the `ChargedState` failure in
every install that does not dedupe the runtime.

**Keep `getAnyEraContractState` as plain data.** Rejected. A third shape for the same value, and
plain data still has to be turned into a handle of the dApp's runtime before `ledger()` takes it.

**Check that the tag NAMES the version.** Rejected. The zswap chain state has one tag for two
versions, and a later ledger may share a tag for another kind too.

## Amendment — the class is renamed (2026-10-29)

Issue #1568. The ledger packages export a different `LedgerState`, the whole ledger state, so a
dApp that imports both saw two unrelated classes under one name. Before 5.0.0 final, `LedgerState`
is `SerializedState`, `LedgerState.isLedgerState` is `SerializedState.isSerializedState`, and
`LedgerStateKind` is `StateKind`. The errors are `InvalidSerializedStateError` (with
`InvalidSerializedStateReason`), `SerializedStateDecoderMissingError` and
`SerializedStateDecodeFailedError`; the shorter `StateDecodeFailedError` is already a `protocol`
error. The error codes are unchanged. `LEDGER_STATE_KINDS` and `LEDGER_STATE_TAGS` in `protocol`
keep their names: they describe what the ledger writes, not the class. The decision is unchanged.
The sections above, and ADRs 0006, 0007, 0008, 0010 and 0019, keep the names that were current
when they were written.

## Amendment — the error for a value with no era (2026-10-29)

`UnrecognisedEraTagError` is now `UnknownLedgerVersionError`, with a `requestedVersion` of `undefined`
when the value carried no era. `requireLedger9` is removed: narrow with `switch (value.era)`, closed by
`assertNever`. See the 2026-10-29 amendment of [ADR 0017](./0017-error-codes-are-the-contract.md).
