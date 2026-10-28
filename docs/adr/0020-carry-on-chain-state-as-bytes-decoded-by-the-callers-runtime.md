# 0020. Carry on-chain state as bytes, decoded by the caller's runtime

- Status: Accepted
- Date: 2026-10-28
- Deciders: Szymon Paluchowski
- Related: amends [0006](./0006-version-tagged-payloads-at-provider-seams.md),
  [0010](./0010-publish-era-handles-alongside-their-plain-data.md) and
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

One class in `types`, generic in the kind of value and the ledger version:

```ts
type LedgerStateKind = 'ContractState' | 'LedgerParameters' | 'ZswapChainState';

class LedgerState<K extends LedgerStateKind, E extends LedgerVersion = LedgerVersion> {
  readonly kind: K;
  readonly version: E;
  static fromBytes<K, E>(kind: K, version: E, bytes: Uint8Array): LedgerState<K, E>;
  serialize(): Uint8Array;
  deserialize<D extends StateDecoders>(decoders: D): DecodedState<D, E>;
}
```

The rules:

1. **`deserialize` takes the decoders from the caller.** `decoders` is one object per ledger
   version, each with a `deserialize(bytes)` method, for example `{ v9: ContractState }` from the
   dApp's own `compact-runtime`. Only the decoder of the value's own version is called. A missing
   decoder is refused with `LedgerStateDecoderMissingError`
   (`MIDNIGHT_JS_PR_LEDGER_STATE_DECODER_MISSING`), whose message names the class and the package to
   import. There is no form without decoders, so the framework's copy of the runtime is never used
   by accident.
2. **`fromBytes` checks the tag against the version.** `LEDGER_STATE_TAGS` in
   `@midnight-ntwrk/midnight-js-protocol/version` holds, for each kind and each ledger version, the
   tag that ledger writes. `fromBytes` refuses bytes that do not start with that tag with
   `InvalidLedgerStateError` (`MIDNIGHT_JS_PR_INVALID_LEDGER_STATE`, reason `tag-mismatch`). The
   check asks "is this tag valid for this version", never "which version does this tag name": two
   versions share a tag when the later ledger kept the format (a zswap chain state in v8 and v9).
   A ledger that changes a format gets its own row, and the check tightens by itself.
   `LedgerVersion` gaining a version with no row is a build error.
3. **The bytes are copied in and out.** `fromBytes` and `serialize()` copy, so no caller can change
   a value it was handed.
4. **One read record per method.**
   - `ContractStateRead { protocolVersion, contractState, ledgerParameters? }` is returned by
     `queryContractState`, `watchForContractState`, `queryDeployContractState` and
     `contractStateObservable`. `protocolVersion` dates the block of the read;
     `contractState.version` is the ledger that wrote the bytes, which can be older.
   - `PublicStatesRead` adds `zswapChainState` and makes `ledgerParameters` required. It is
     returned by `queryZSwapAndContractState`. The zswap chain state takes the version of the
     ledger parameters of the same block.
   - `queryRawContractState` and `rawContractStateObservable` are removed: `queryContractState`
     serves the same bytes and the block's ledger parameters. Streams do not carry the ledger
     parameters.
5. **A read never decodes and never loads the ledger 8 runtime.** The indexer provider builds the
   records from bytes.
6. **The framework decodes only to build a transaction.** `contracts` decodes a read with its own
   copy, through `utils`, where it builds a transaction: the call path, cross-contract calls,
   `findDeployedContract` and the maintenance flows. `getAnyEraContractState` is removed.
7. **Out of scope.** `LedgerTransaction` stays a handle that holds a live object (ADR 0019). The
   state that crosses the transaction API — `DeployTxData.initialContractState`, the initial states
   a caller passes to build a call, and the states a scoped transaction caches
   (`Ledger9PublicStates`, now declared in `contracts`) — stays a decoded object. Moving it to the
   same model is a separate change, made together with `LedgerTransaction`.

A dApp reads its state like this:

```ts
import { ContractState } from '@midnight-ntwrk/compact-runtime';

const read = await publicDataProvider.queryContractState(address);
const state = ledger(read.contractState.deserialize({ v9: ContractState }).data);
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
  two are removed. A dApp passes a decoder on every read. A ledger 8 contract that reads its state
  after the fork needs the current runtime too. The indexer provider no longer exports
  `parseHexContractState`, `parseHexLedgerParameters` and `parseHexZswapState`.
- **Follow-ups:** move `LedgerTransaction` and the state on the transaction API to the same model.

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
