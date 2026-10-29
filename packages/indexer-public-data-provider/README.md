# Indexer Public Data Provider

Public data provider implementation based on the Midnight Pub-sub Indexer. Provides blockchain data queries and real-time subscriptions via GraphQL.

## Requirements

Indexer `4.4.0-rc.6` or later. This provider selects `stateAt` on every
contract-state read, and older indexers do not serve that field. The framework's
own test environments pin the build tag `4.4.0-rc.6-68702121`.

## Installation

```bash
yarn add @midnight-ntwrk/midnight-js-indexer-public-data-provider
```

## Quick Start

```typescript
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';

const provider = indexerPublicDataProvider(
  'https://indexer.example.com/graphql',     // Query URL (HTTP/HTTPS)
  'wss://indexer.example.com/graphql'        // Subscription URL (WS/WSS)
);

// Query contract state as bytes; decode it with your own runtime
const read = await provider.queryContractState(contractAddress);
// read?.contractState.era is the ledger that wrote the bytes ('v8' | 'v9')
// read?.contractState.deserialize({ v9: ContractState }) decodes it

// Watch for transaction data
const txData = await provider.watchForTxData(transactionId);

// Subscribe to contract state changes
provider.contractStateObservable(contractAddress).subscribe(({ value, blockHeight }) => {
  console.log(`State at block ${blockHeight}:`, value);
});
```

## Configuration

| Parameter          | Required | Description                           |
| ------------------ | -------- | ------------------------------------- |
| `queryURL`         | ✓        | GraphQL query endpoint (http/https)   |
| `subscriptionURL`  | ✓        | GraphQL subscription endpoint (ws/wss)|
| `webSocketImpl`    |          | Custom WebSocket implementation       |

## API

### Query Methods

```typescript
// Query current contract state as bytes, with the block's ledger parameters
queryContractState(
  contractAddress: ContractAddress,
  config?: BlockHeightConfig | BlockHashConfig
): Promise<ContractStateAndParametersRead | null>

// Query contract state at deployment, as bytes
queryDeployContractState(
  contractAddress: ContractAddress
): Promise<ContractStateRead | null>

// Query contract state, ZSwap state and ledger parameters from one block, all as bytes
queryZSwapAndContractState(
  contractAddress: ContractAddress,
  config?: BlockHeightConfig | BlockHashConfig
): Promise<PublicStatesRead | null>

// Query unshielded token balances
queryUnshieldedBalances(
  contractAddress: ContractAddress,
  config?: BlockHeightConfig | BlockHashConfig
): Promise<UnshieldedBalances | null>

// Query the protocol version of the network's latest block
queryLatestProtocolVersion(): Promise<number>
```

### Reading State Across the Ledger Fork

Every state read returns bytes, never a decoded object. A contract state,
ledger parameters and a zswap chain state are each a `LedgerState` from
`@midnight-ntwrk/midnight-js-types`: the bytes exactly as the network sent them,
plus `kind` and `era`, the ledger that wrote them. Decode one with the
runtime your own contract was compiled against, so the object is one its
`ledger()` accepts:

```typescript
import { ContractState } from '@midnight-ntwrk/compact-runtime';
import { ledger } from './managed/counter/contract/index.js';

const read = await provider.queryContractState(contractAddress);

if (read !== null) {
  // Throws LedgerStateDecoderMissingError if the state was written by the v8 ledger.
  const state = ledger(read.contractState.deserialize({ v9: ContractState }).data);
}
```

`deserialize` calls only the decoder for `read.contractState.era`. A state
decoded by any other copy of the runtime — the framework's included — is
refused by your `ledger()` with `expected instance of ChargedState`, which is
why the framework never decodes for you.

`read.contractState.era` is read from the version tag at the front of the
bytes. `read.protocolVersion` dates the block, which can be newer: a pre-fork
record read under a post-fork block has era `'v8'`. A state whose version
tag is newer than a pinned dating block is refused as an `IndexerDataError` of
kind `era-disagreement`.

`queryDeployContractState`, `watchForContractState` and
`contractStateObservable` return a `ContractStateRead`. `queryContractState`
returns a `ContractStateAndParametersRead`, which also carries the ledger
parameters of the block that dates the read (`read.ledgerParameters`). A block
without parameters, or parameters of another era than their block, is refused
as an `IndexerDataError` (`malformed-parameters-encoding`,
`parameters-era-disagreement`). Reading a v8 state never loads the ledger 8
runtime.

`queryZSwapAndContractState` returns a `PublicStatesRead`: the contract state,
the zswap chain state and the ledger parameters, from one block when the read
is pinned, all as bytes. The zswap chain state has the same format in v8 and
v9, so it takes the era of the ledger parameters; one that is not hex or not a zswap chain state is
refused as an `IndexerDataError` (`malformed-zswap-encoding`,
`malformed-zswap-state`). If the contract state and the ledger
parameters come from different eras, the call fails with an `IndexerDataError`
of kind `mixed-era-public-states`. On indexer 4.4.0-rc.6 and later that happens
only on an unpinned read that straddles the fork block; an older indexer also
serves a contract untouched since the fork with its pre-fork version tag
(midnight-indexer #1605).

```typescript
import { LedgerParameters, ZswapChainState } from '@midnightntwrk/ledger-v9';

const states = await provider.queryZSwapAndContractState(contractAddress);
if (states !== null) {
  const zswapChainState = states.zswapChainState.deserialize({ v9: ZswapChainState });
  const ledgerParameters = states.ledgerParameters.deserialize({ v9: LedgerParameters });
}
```

#### Which reads still meet a v8 state

The node translates every contract's state to the v9 encoding in the fork
block. An unpinned read serves that translated state, so a contract deployed
before the fork and not called since reads normally. A v8 state is still
served in two cases:

- a read pinned to a block before the fork;
- a record of one contract action's own state, such as the deploy's — a
  record keeps the encoding it was written in, forever.

On the `latest` branch the stream starts at the block the contract's current
state is dated by (`stateAt`). For a contract not called since the fork, that is
the fork block, and the first item is the translated state.

The `all` branch replays every contract action from the deploy onward, so for a
contract deployed before the fork the replay always reaches its pre-fork deploy
state. A `blockHeight` or `blockHash` start before the fork does the same.
Those pre-fork records keep their v8 encoding, so `contractStateObservable`
emits them with `contractState.era === 'v8'` and keeps going; the records after
the fork arrive with `contractState.era === 'v9'` in the same stream.

#### Reading a contract that may predate the fork

Pass one decoder per era. For a contract compiled with the current
toolchain, a v8 state is one written before the fork; decode it with the
ledger 8 runtime if you need it. A contract compiled with the ledger 8
toolchain (`compact-runtime` 0.16) reads a v8 state with its own runtime. After
the fork its state is v9, which that runtime cannot read: decode the bytes with
the current `compact-runtime` and pass the state value to the old runtime as
plain data:

```typescript
import { ContractState } from '@midnight-ntwrk/compact-runtime'; // the current runtime
// The runtime your contract was compiled against, installed under an alias:
// "compact-runtime-ledger8": "npm:@midnight-ntwrk/compact-runtime@0.16.0"
import * as oldRuntime from 'compact-runtime-ledger8';
import { ledger } from './managed/counter/contract/index.js';

const read = await provider.queryContractState(contractAddress);
if (read !== null) {
  const stateValue = read.contractState.deserialize({
    v8: { deserialize: (bytes) => oldRuntime.ContractState.deserialize(bytes).data.state },
    v9: {
      deserialize: (bytes) => oldRuntime.StateValue.decode(ContractState.deserialize(bytes).data.state.encode())
    }
  });
  const state = ledger(stateValue);
}
```

`read.contractState.era` is the era that **wrote the bytes**, the same
answer `ledgerVersionOfContractState` from `@midnight-ntwrk/midnight-js-utils`
gives for them. `protocolVersion` is a statement about the **block**, and can
be newer.

A state older than the block that dates the read is normal, not a fault: a
record of a pre-fork contract action keeps its v8 encoding when it is read
under a post-fork block. The protocol version the
indexer reports is therefore an upper bound — only a state whose version tag is
*newer* than its dating block is reported as an inconsistency, and only where
the two are known to describe the same block.

On an unpinned read they need not. `block` and `contract` are Query-root
siblings the indexer resolves concurrently, from independent reads, and with no
offset both follow the chain tip — so a block indexed between the two leaves
them on either side of a fork, giving a newer state under an older block
with nothing wrong anywhere. The bound is skipped for that case instead of
being reported as a fault; the version tag still decides decodability, which is
what keeps a wrong-era payload away from the decoder either way.

Contract events carry the same dating: every `ContractEvent` has a
`protocolVersion`, so a consumer decoding the opaque `raw` payload can tell
which runtime wrote it. Resolve it with `versionOfRecord` from
`@midnight-ntwrk/midnight-js-protocol`:

```typescript
import { versionOfRecord } from '@midnight-ntwrk/midnight-js-protocol';

const era = versionOfRecord(event); // 'v8' | 'v9'
```

`queryLatestProtocolVersion` reports the latest block's protocol version. This
provider reads the network on every call and caches nothing. The interface
allows an implementation to cache the answer as long as it expires by itself,
on a bound short relative to block time; what it forbids is a reading held
indefinitely, because the point of asking is to learn which era a transaction
being built now will land in, and a stale answer is wrong exactly at the fork
boundary, where that question matters. For the era of data already read, use the
`protocolVersion` the read itself carries — it is dated to the same block as the
bytes and costs no extra request. The decision and the deploy-path consequences
are recorded in ADR 0007.

### Watch Methods

Wait for data to appear on-chain (polling with automatic retry):

```typescript
// Wait for contract to be deployed
watchForContractState(
  contractAddress: ContractAddress
): Promise<ContractStateRead>

// Wait for unshielded balances
watchForUnshieldedBalances(
  contractAddress: ContractAddress
): Promise<UnshieldedBalances>

// Wait for deploy transaction data
watchForDeployTxData(
  contractAddress: ContractAddress
): Promise<FinalizedTxData>

// Wait for any transaction data
watchForTxData(
  txId: TransactionId
): Promise<FinalizedTxData>
```

### Observable Methods

Real-time subscriptions via RxJS:

```typescript
// Subscribe to contract state changes, as bytes
contractStateObservable(
  contractAddress: ContractAddress,
  config?: ContractStateObservableConfig
): Observable<PositionedRecord<ContractStateRead>>

// Subscribe to unshielded balance changes
unshieldedBalancesObservable(
  contractAddress: ContractAddress,
  config?: ContractStateObservableConfig
): Observable<PositionedRecord<UnshieldedBalances>>
```

Both emit a `PositionedRecord`: `{ value, blockHeight, blockHash }`, where
`value` is what the stream serves and `blockHeight` / `blockHash` identify the
block it is dated by. On the contract-state stream that is the state's
`stateAt` block: the action's own block, or the fork block when the indexer
re-emits an untouched contract's latest action with its state translated at a
ledger fork. The balance stream drops that re-emission and uses the action's
own block.

#### Resuming a stream

`blockHeight` and `blockHash` have the types of `BlockHeightConfig` and
`BlockHashConfig`, so the last record you received is all you need to resume
after an error:

```typescript
import { IndexerError, IndexerQueryError } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import type {
  ContractStateObservableConfig,
  ContractStateRead,
  PositionedRecord
} from '@midnight-ntwrk/midnight-js-types';
import { hasErrorCode, UTILS_ERROR_CODES } from '@midnight-ntwrk/midnight-js-utils';

const recursOnResume = (error: unknown): boolean =>
  (error instanceof IndexerError && !(error instanceof IndexerQueryError)) ||
  hasErrorCode(error, UTILS_ERROR_CODES.TAG_PARSE_FAILED);

const MAX_RESUMES = 5;
let last: PositionedRecord<ContractStateRead> | undefined;
let resumes = 0;

const follow = (config: ContractStateObservableConfig) =>
  provider.contractStateObservable(contractAddress, config).subscribe({
    next: (record) => {
      last = record;
    },
    error: (error: unknown) => {
      if (recursOnResume(error) || last === undefined || resumes >= MAX_RESUMES) {
        console.error('Contract state stream ended', error);
        return;
      }
      resumes += 1;
      follow({ type: 'blockHeight', blockHeight: last.blockHeight });
    }
  });

follow({ type: 'latest' });
```

Resume only after a transport failure. `recursOnResume` lists the failures
caused by data still on chain: an `IndexerError` other than `IndexerQueryError`,
and the `TagParseError` that escapes the `IndexerError` hierarchy. The stream
decodes nothing, so no decoder error can end it. A resumed stream fails on that
data again.

Resuming includes the block you resume from, so values from that block can
arrive again; nothing after it is skipped. Leave `inclusive` unset when you
resume: `inclusive: false` skips the whole block, including any values in it
that came after the record you resumed from.

A resumed stream is a `blockHeight` stream, and reads the same per-contract
subscription as every other branch (see [Subscription shapes](./docs/subscription-shapes.md)).
A transport reconnect inside one stream repeats nothing: every branch, and the
balance stream, suppresses the values the indexer replays.

#### Ledger parameters on the stream

A `contractStateObservable` record carries **no ledger parameters**. The
subscription does not ask for them, which would cost one blob per contract
action. If you need the parameters for a streamed state, read them at the block
the record names:

```typescript
import { concatMap, from } from 'rxjs';

provider
  .contractStateObservable(contractAddress)
  .pipe(
    concatMap(({ blockHash }) =>
      from(provider.queryContractState(contractAddress, { type: 'blockHash', blockHash }))
    )
  )
  .subscribe({
    next: (atBlock) => {
      // atBlock?.ledgerParameters
    },
    error: (error: unknown) => console.error('Contract state stream ended', error)
  });
```

The stream decodes nothing, but it still fails fast. The version **tag** is
read, so a payload with no supported contract-state version tag errors the
stream as a `TagParseError` (`midnight-js-utils`), and a state newer than its
dating block as an `IndexerDataError`.

### Observable Configuration

```typescript
type ContractStateObservableConfig =
  | { type: 'latest' }                                              // From latest state
  | { type: 'all' }                                                 // From contract deployment
  | { type: 'txId'; txId: TransactionId; inclusive?: boolean }      // From specific transaction
  | { type: 'blockHeight'; blockHeight: number; inclusive?: boolean }
  | { type: 'blockHash'; blockHash: string; inclusive?: boolean }
```

## Contract events `@beta`

Query and stream MIP-0002 public contract log events for a contract address. The
indexer decodes each standard event into typed scalar fields server-side; this
provider maps those into the discriminated `ContractEvent` union. Custom-event
(`Misc`) payload decoding is not done here — the `name`/`payload` are carried as
opaque hex, and every event carries the raw `VersionedLogItem` bytes (`raw`) for
a future decoder.

```typescript
// Query: finite, paginated, point-in-time read (ascending id order).
queryContractEvents(
  filter: ContractEventQueryFilter,
  page?: ContractEventsPage
): Promise<ContractEvent[]>

// Subscription: replay from a cursor, then live, in one stream.
contractEventsObservable(
  filter: ContractEventSubscriptionFilter,
  opts?: { startAt?: ContractEventCursor }
): Observable<ContractEvent>
```

### Recommended path (DX)

- **Tail a contract's events (most common):** use `contractEventsObservable`. It
  unifies replay + live in one stream — no hand-rolled paging.
- **Read all historical events:** use the `getAllContractEvents` helper, not
  manual `limit`/`offset` loops. It pins a stable upper bound once and pages
  safely to exhaustion.
- **Manual `queryContractEvents` paging:** only when you need explicit page
  control. `offset` is stable only within a fixed `toBlock` window; detect the
  end via `result.length < limit`. When `limit` is omitted,
  `DEFAULT_CONTRACT_EVENTS_PAGE_SIZE` is applied.

`{ fromId }` is an **inclusive** resumption cursor — to resume after the last
seen event, pass `{ fromId: lastSeenId + 1 }`. `toBlock` completes the
subscription; delivery is at-least-once across transport reconnects, so
persisting consumers should dedup by `id`.

### Standard vs `Misc`

Standard events expose decoded fields today (e.g. `nullifier`, `commitment`,
`amount`). `sender`/`recipient` are `{ kind: 'user' | 'contract'; value }`.
`amount` is always a `string` (up to a 16-byte integer) — never coerce it
through `Number()`. `Misc` exposes `name` + opaque `payload`; decoding the
custom payload arrives with the future compact-js decoder.

### Example — watch my contract's events with resumption

```typescript
import { getAllContractEvents } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';

// Tail live events, resuming after the last event the app persisted.
const sub = provider
  .contractEventsObservable(
    { contractAddress, types: ['ShieldedSpend', 'ShieldedReceive'] },
    lastSeenId === undefined ? undefined : { startAt: { fromId: lastSeenId + 1 } }
  )
  .subscribe((event) => {
    persistCursor(event.id);
    if (event.eventType === 'ShieldedReceive') handleReceive(event.commitment);
  });

// One-off: everything my just-submitted transaction emitted.
const mine = await provider.queryContractEvents({ contractAddress, transactionHash });

// Full historical scan, safely paged.
for await (const event of getAllContractEvents(provider, { contractAddress })) {
  index(event);
}
```

## Transaction Data

`IndexerPublicDataProvider.watchForTxData` and `watchForDeployTxData` resolve
`Promise<FinalizedTxRead>` — the closed union of `FinalizedTxData`
(v9) and `Ledger8FinalizedTxData` — exactly as the `PublicDataProvider` interface
they satisfy does. Narrow on `era` before reading `tx`: the two variants carry
transaction objects from different ledger runtimes, and neither runtime's
object can be handed to the other.

Each record is decoded with the runtime of the era the record itself reports.
A v8-era record is read with the pre-fork runtime, which is acquired lazily on
first use — a session that meets no v8 record never instantiates that WASM.

The discriminant is resolved from the record's own `protocolVersion`, never
asserted, so it cannot disagree with the `protocolVersion` beside it. Era
resolution itself can refuse the read one way: `UnknownRecordEraError`, an
`IndexerError` naming the raw `protocolVersion` and the record, when that
integer maps to no known ledger era. A `raw` that is not a whole hex byte
string is refused as `IndexerDataError` before any decoder runs.

Bytes that will not decode on the era selected for them surface as the
`DeserializationError` the runtime produced, carrying the era, the
`protocolVersion`, the method and the record on `context.details`. This provider
does not re-attribute that failure: a self-contradicting record and a
`@midnightntwrk/ledger`-vN in your dApp of a different vintage than the
network's are indistinguishable from here, and the error's own mitigation
covers both.

Two failures a read can raise are deliberately outside the `IndexerError`
hierarchy, because neither is an indexer fault: `DeserializationError`
(`midnight-js-utils`), which already was, and `Ledger8RuntimeMissingError`
(`midnight-js-protocol`), raised when the pre-fork runtime cannot be acquired
for a v8-era record — an installation or bundling problem in your own
dependency tree.

The v9 record includes:

```typescript
type FinalizedTxData = {
  era: 'v9';                          // Ledger-era discriminant, derived
                                      // from protocolVersion
  tx: FinalizedTx;                    // Transaction handle of the same era
  txId: TransactionId;                // Transaction identifier
  txHash: string;                     // Transaction hash
  status: TxStatus;                   // SucceedEntirely | FailFallible | FailEntirely
  identifiers: readonly TransactionId[];  // All transaction identifiers
  blockHeight: number;                // Block height
  blockHash: string;                  // Block hash
  blockTimestamp: number;             // Block timestamp (Unix)
  blockAuthor: string | null;         // Block author
  segmentStatusMap?: Map<number, SegmentStatus>;  // Per-segment status for partial success
  unshielded: UnshieldedUtxos;        // Created and spent UTXOs
  indexerId: number;                  // Indexer internal ID
  protocolVersion: number;            // Protocol version
  fees: { estimatedFees: string; paidFees: string };
}
```

## Exports

```typescript
import {
  indexerPublicDataProvider,
  getAllContractEvents,
  DEFAULT_CONTRACT_EVENTS_PAGE_SIZE,
  IndexerFormattedError,
  toUnshieldedUtxos,
  toUnshieldedBalances,
  type IndexerUtxo
} from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
```

## Architecture Documents

The reasoning behind this package's shape lives in `docs/`, not in the source
docstrings. Each file is registered with TypeDoc through `projectDocuments`, so
it is a page in the generated API reference and `@see {@link Title}` in a
docstring resolves to it.

| Document | What it explains |
|---|---|
| [Subscription shapes](./docs/subscription-shapes.md) | How every contract-state and balance branch starts on the one per-contract subscription, and how a reconnect is kept from repeating values |
| [Error boundaries](./docs/error-boundaries.md) | Why `IndexerError` is not exhaustive over a read, and what the two escaping failure classes actually report |

Docstrings in `src/` carry the API contract: what a symbol does, its
parameters, what it returns and what it throws. Anything that answers "why is
it built this way" belongs in a document above, stated once.

## Resources

- [Midnight Network](https://midnight.network)
- [Developer Hub](https://midnight.network/developer-hub)

## Terms & License

By using this package, you agree to [Midnight's Terms and Conditions](https://midnight.network/static/terms.pdf) and [Privacy Policy](https://midnight.network/static/privacy-policy.pdf).

Licensed under [Apache License 2.0](http://www.apache.org/licenses/LICENSE-2.0).
