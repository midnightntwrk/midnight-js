# Indexer Public Data Provider

Public data provider implementation based on the Midnight Pub-sub Indexer. Provides blockchain data queries and real-time subscriptions via GraphQL.

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

// Query contract state
const state = await provider.queryContractState(contractAddress);

// Watch for transaction data
const txData = await provider.watchForTxData(transactionId);

// Subscribe to contract state changes
provider.contractStateObservable(contractAddress).subscribe(state => {
  console.log('New state:', state);
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
// Query current contract state
queryContractState(
  contractAddress: ContractAddress,
  config?: BlockHeightConfig | BlockHashConfig
): Promise<ContractState | null>

// Query contract state at deployment
queryDeployContractState(
  contractAddress: ContractAddress
): Promise<ContractState | null>

// Query contract and ZSwap state together (returns LedgerParameters as third element)
queryZSwapAndContractState(
  contractAddress: ContractAddress,
  config?: BlockHeightConfig | BlockHashConfig
): Promise<[ZswapChainState, ContractState, LedgerParameters] | null>

// Query unshielded token balances
queryUnshieldedBalances(
  contractAddress: ContractAddress,
  config?: BlockHeightConfig | BlockHashConfig
): Promise<UnshieldedBalances | null>

// Query contract state as raw bytes, not deserialized
queryRawContractState(
  contractAddress: ContractAddress,
  config?: BlockHeightConfig | BlockHashConfig
): Promise<RawContractState | null>

// Query the protocol version of the network's current head block
queryLatestProtocolVersion(
  options?: { readonly fresh?: boolean }
): Promise<number>
```

### Reading State Across the Ledger Fork

`queryRawContractState` returns the serialized bytes exactly as the network
sent them, still in their envelope, alongside the era the record is dated to.
Use it when the deserializer you need depends on that era:

```typescript
const state = await provider.queryRawContractState(contractAddress);

if (state !== null) {
  switch (state.version) {
    case 'v9':
      // hand state.raw to the v9 deserializer
      break;
    case 'v8':
      // hand state.raw to the v8 deserializer
      break;
  }
}
```

`state.version` is derived from `state.protocolVersion`; this provider does not
check it against the envelope inside `state.raw`.

The methods that *do* deserialize for you — `queryContractState`,
`queryDeployContractState`, `queryZSwapAndContractState`,
`watchForContractState` and `contractStateObservable` — decode with the v9
runtime only. Each asks the indexer for the protocol version of the block that
dates the state and cross-checks it against the era written into the state's own
envelope. If the two disagree, or if they agree on an era this client cannot
decode, the call fails with an `IndexerDataError` rather than returning a
mis-decoded state. Reach for `queryRawContractState` when you need to read the
other era.

Contract events carry the same dating: every `ContractEvent` has a
`protocolVersion`, so a consumer decoding the opaque `raw` payload can tell
which runtime wrote it. Resolve it with `versionOfRecord` from
`@midnight-ntwrk/midnight-js-protocol`:

```typescript
import { versionOfRecord } from '@midnight-ntwrk/midnight-js-protocol';

const era = versionOfRecord(event); // 'v8' | 'v9'
```

`queryLatestProtocolVersion` reports the head block's protocol version. The
answer may be served from a cache once the provider has corroborating evidence
that the network has moved on; pass `{ fresh: true }` to force a real request.

### Watch Methods

Wait for data to appear on-chain (polling with automatic retry):

```typescript
// Wait for contract to be deployed
watchForContractState(
  contractAddress: ContractAddress
): Promise<ContractState>

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
// Subscribe to contract state changes
contractStateObservable(
  contractAddress: ContractAddress,
  config?: ContractStateObservableConfig
): Observable<ContractState>

// Subscribe to unshielded balance changes
unshieldedBalancesObservable(
  contractAddress: ContractAddress,
  config?: ContractStateObservableConfig
): Observable<UnshieldedBalances>
```

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

`IndexerPublicDataProvider.watchForTxData` and `watchForDeployTxData` declare
`Promise<FinalizedTxData>` — the v9 arm only, narrower than the
`PublicDataProvider` interface they satisfy. Holding this concrete class, you
need no narrowing. Holding the interface, you get `VersionedFinalizedTxData`
(the closed union of this record and `FinalizedTxDataV8`) and must narrow on
`version` before reading `tx`.

Either way the discriminant is resolved from the record's own
`protocolVersion`, never asserted: a record this provider cannot decode is
reported as `EraUnsupportedError` — or `EraUnresolvableError` when the
`protocolVersion` maps to no known era — rather than mislabelled as v9. Both
are `IndexerError` subclasses and both name the raw `protocolVersion` and the
record being read.

The v9 record includes:

```typescript
type FinalizedTxData = {
  version: 'v9';                      // Ledger-runtime discriminant, derived
                                      // from protocolVersion
  tx: Transaction;                    // Deserialized ledger transaction
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

## Resources

- [Midnight Network](https://midnight.network)
- [Developer Hub](https://midnight.network/developer-hub)

## Terms & License

By using this package, you agree to [Midnight's Terms and Conditions](https://midnight.network/static/terms.pdf) and [Privacy Policy](https://midnight.network/static/privacy-policy.pdf).

Licensed under [Apache License 2.0](http://www.apache.org/licenses/LICENSE-2.0).
