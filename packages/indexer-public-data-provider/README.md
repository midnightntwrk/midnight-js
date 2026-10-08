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
queryLatestProtocolVersion(): Promise<number>
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
runtime only. Each reads the ledger era off the state's own envelope and decodes
only if that era is v9. Otherwise the call fails with an `IndexerDataError` that
names the era it got and points at `queryRawContractState`, instead of a
header-tag error from deep inside a decoder.

#### Which contracts this affects, and for how long

Every contract deployed before the fork, until something writes to it. The
ledger does not rewrite stored contract state at the fork, and the indexer
serves the last contract action at or before the block you ask about — so a
contract that has not been called since the boundary keeps its v8 envelope
under a v9 head, indefinitely. The five methods above refuse it for as long as
that lasts. The first post-fork call re-versions the envelope, and from then on
they read it normally.

For `contractStateObservable` the refusal is not a returned error but a
**terminated stream**: the decode runs inside an `Rx.map`, so a refusal reaches
the subscriber's `error` callback and the subscription ends. No RxJS `retry` or
`catchError` operator is installed on any branch, so nothing reconciles it —
recovery means subscribing again. (The Apollo `RetryLink` in `transport.ts`
retries *transport* failures on HTTP queries; subscriptions are routed past it,
and it sits below the decode in any case, so it cannot see a refusal.)

`rawContractStateObservable` is the way out of this for a stream, as
`queryRawContractState` is for a query: it never deserializes, so no era of
contract state terminates it. See
[Which state stream to use](#which-state-stream-to-use).

On the `latest` branch the stream does not fail at subscribe time — it fails on
the first matching contract action that flows through it.

The `all` branch is the harsher case: it replays every contract action from the
deploy onward, so for a contract deployed before the fork the replay always
reaches its pre-fork deploy state. No later write can change what an earlier
block already contains, so that branch does not recover — on the decoded stream
it is unusable for such a contract for good, and `rawContractStateObservable` is
the only way to read it.

#### Reading a contract that may predate the fork

Use `getAnyEraContractState` from
`@midnight-ntwrk/midnight-js-contracts`. It reads the era off the envelope,
decodes with that era's runtime, and hands back plain data:

```typescript
import { getAnyEraContractState } from '@midnight-ntwrk/midnight-js-contracts';
// From YOUR OWN generated contract module, not from the framework — which is why
// `read.state` is plain data rather than a handle.
import { Counter, StateValue } from './managed/counter/contract/index.cjs';

const read = await getAnyEraContractState(provider, contractAddress);

if (read !== null) {
  // `read.state` is an EncodedStateValue — plain data. Decode it with the
  // runtime your own contract code brings, which is the only one that can
  // accept it.
  const ledgerState = Counter.ledger(StateValue.decode(read.state));
}
```

Two things that look interchangeable and are not:

- `read.envelopeVersion` is the era that **wrote the bytes**.
  `queryRawContractState(...).version` is derived from `protocolVersion` and is
  a statement about the **block**. They disagree for exactly the dormant
  contracts described above, which is when it matters.
- `read.state` is encoded, not a live handle. A handle minted inside the
  framework belongs to the framework's copy of the WASM module and is rejected
  by a dApp's own `ledger()`; encoded state crosses that boundary, and also
  survives a worker `postMessage` and a write to storage. Note that
  `structuredClone` does *not* tell the two apart — it copies a handle's
  internal pointer without complaint and yields an object that is useless in the
  receiving context.

If you would rather decode the bytes yourself, `queryRawContractState` still
serves them untouched — pair it with `contractStateEnvelopeVersion` from
`@midnight-ntwrk/midnight-js-utils` to read the envelope's era, never with the
record's own `version`. `rawContractStateObservable` serves the same record
type as a stream (without `ledgerParameters`), and the same caution applies to
it.

A state older than the block that dates the read is normal, not a fault: the
indexer serves the latest contract action at or before that block, so any
contract dormant across a fork is exactly that. The protocol version the
indexer reports is therefore an upper bound — only a state whose envelope is
*newer* than its dating block is reported as an inconsistency, and only where
the two are known to describe the same block.

On an unpinned read they need not. `block` and `contract` are Query-root
siblings the indexer resolves concurrently, from independent reads, and with no
offset both follow the chain tip — so a block indexed between the two leaves
them on either side of a fork, giving a newer envelope under an older block
with nothing wrong anywhere. The bound is withheld for that case instead of
being reported as a fault; the envelope still decides decodability, which is
what keeps a wrong-era payload away from the decoder either way.

Contract events carry the same dating: every `ContractEvent` has a
`protocolVersion`, so a consumer decoding the opaque `raw` payload can tell
which runtime wrote it. Resolve it with `versionOfRecord` from
`@midnight-ntwrk/midnight-js-protocol`:

```typescript
import { versionOfRecord } from '@midnight-ntwrk/midnight-js-protocol';

const era = versionOfRecord(event); // 'v8' | 'v9'
```

`queryLatestProtocolVersion` reports the head block's protocol version. This
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
  contractAddress: ContractAddress,
  options?: WatchOptions
): Promise<ContractState>

// Wait for unshielded balances
watchForUnshieldedBalances(
  contractAddress: ContractAddress,
  options?: WatchOptions
): Promise<UnshieldedBalances>

// Wait for deploy transaction data
watchForDeployTxData(
  contractAddress: ContractAddress,
  options?: WatchOptions
): Promise<VersionedFinalizedTxData>

// Wait for any transaction data
watchForTxData(
  txId: TransactionId,
  options?: WatchOptions
): Promise<VersionedFinalizedTxData>
```

Each method waits indefinitely unless you pass `maxWaitMs`. With it, the call
rejects with `WatchTimeoutError` (code `MIDNIGHT_JS_PR_WATCH_TIMED_OUT`,
category `UNCERTAIN`) once that many milliseconds pass without the data, and
polling stops:

```typescript
const record = await provider.watchForTxData(txId, { maxWaitMs: 120_000 });
```

A timeout does not mean the transaction failed: it may still land. Check the
chain before submitting it again.

### Observable Methods

Real-time subscriptions via RxJS:

```typescript
// Subscribe to contract state changes
contractStateObservable(
  contractAddress: ContractAddress,
  config?: ContractStateObservableConfig
): Observable<PositionedRecord<ContractState>>

// Subscribe to contract state changes as raw bytes, not deserialized
rawContractStateObservable(
  contractAddress: ContractAddress,
  config?: ContractStateObservableConfig
): Observable<PositionedRecord<RawContractState>>

// Subscribe to unshielded balance changes
unshieldedBalancesObservable(
  contractAddress: ContractAddress,
  config?: ContractStateObservableConfig
): Observable<PositionedRecord<UnshieldedBalances>>
```

All three emit a `PositionedRecord`: `{ value, blockHeight, blockHash }`, where
`value` is what the stream serves and `blockHeight` / `blockHash` identify the
block that carried it.

#### Resuming a stream

`blockHeight` and `blockHash` have the types of `BlockHeightConfig` and
`BlockHashConfig`, so the last record you received is all you need to resume
after an error:

```typescript
import { IndexerError, IndexerQueryError } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import type { ContractState } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { PROTOCOL_ERROR_CODES } from '@midnight-ntwrk/midnight-js-protocol/errors';
import type { ContractStateObservableConfig, PositionedRecord } from '@midnight-ntwrk/midnight-js-types';
import { hasErrorCode, isDeserializationError, UTILS_ERROR_CODES } from '@midnight-ntwrk/midnight-js-utils';

const recursOnResume = (error: unknown): boolean =>
  (error instanceof IndexerError && !(error instanceof IndexerQueryError)) ||
  isDeserializationError(error) ||
  hasErrorCode(error, UTILS_ERROR_CODES.TAG_PARSE_FAILED) ||
  hasErrorCode(error, PROTOCOL_ERROR_CODES.LEDGER8_RUNTIME_MISSING);

const MAX_RESUMES = 5;
let last: PositionedRecord<ContractState> | undefined;
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
and the `DeserializationError`, `TagParseError` and `Ledger8RuntimeMissingError`
that escape the `IndexerError` hierarchy. A resumed stream fails on that data
again. A retained-era state is the common case; read such a contract with
`rawContractStateObservable`.

Resuming includes the block you resume from, so values from that block can
arrive again; nothing after it is skipped. Leave `inclusive` unset when you
resume: `inclusive: false` skips the whole block, including any values in it
that came after the record you resumed from.

A resumed stream is a `blockHeight` stream, and reads the same per-contract
subscription as every other branch (see [Subscription shapes](./docs/subscription-shapes.md)).
A transport reconnect inside one stream repeats nothing: every branch, and the
balance stream, suppresses the values the indexer replays.

#### Which state stream to use

The two contract-state streams run the identical pipeline — same branches and
replay suppression — and differ only in what one served
contract action becomes.

| | `contractStateObservable` | `rawContractStateObservable` |
|---|---|---|
| `value` | `ContractState`, deserialized | `RawContractState`: the bytes, plus the era the record is dated to |
| A state from a retained era | **ends the stream** (see [Reading State Across the Ledger Fork](#reading-state-across-the-ledger-fork)) | flows through; the caller narrows on `version` |
| `ledgerParameters` | n/a | absent on the stream; read `queryRawContractState` with the record's `blockHash` — see below |
| Reach for it when | the contract is known to be current-era | the contract may predate the fork, or you cannot rule it out |

`rawContractStateObservable` is the streaming twin of `queryRawContractState`
and narrows the same way, so one `switch (record.version)` serves both:

```typescript
import { assertNever } from '@midnight-ntwrk/midnight-js-utils';

provider.rawContractStateObservable(contractAddress).subscribe(({ value: record }) => {
  switch (record.version) {
    case 'v9':
      // hand record.raw to the v9 deserializer
      break;
    case 'v8':
      // hand record.raw to the v8 deserializer
      break;
    default:
      assertNever(record, 'rawContractStateObservable subscriber');
  }
});
```

`ledgerParameters` is **always absent on this stream**, although
`queryRawContractState` serves it. The subscription does not ask for it, which
would cost one blob per contract action.

If you need the parameters for a streamed state, read them at the block the
record names:

```typescript
import { concatMap, from } from 'rxjs';

provider
  .rawContractStateObservable(contractAddress)
  .pipe(
    concatMap(({ blockHash }) =>
      from(provider.queryRawContractState(contractAddress, { type: 'blockHash', blockHash }))
    )
  )
  .subscribe({
    next: (atBlock) => {
      // atBlock?.ledgerParameters
    },
    error: (error: unknown) => console.error('Contract state stream ended', error)
  });
```

Withholding the deserialization does not withhold the fail-fast, but be precise
about what is withheld: the deserialization, and the envelope-versus-block era
cross-check that `queryContractState` runs. The envelope **tag** is still read,
so a payload carrying no supported contract-state envelope still errors the
stream. Two things can still end the stream on era grounds — an envelope from an
era this client's tag table does not list, and a `protocolVersion` integer it
cannot place on the era timeline. The second is the one asymmetry with
`contractStateObservable`, which tolerates such an integer and decodes on the
envelope alone; on the raw reads `version` is a required field with nothing to
fall back to, so the read is refused rather than guessed. Both surface as an
`IndexerDataError` (`kind: 'unresolvable-era'` for the second), so one
`instanceof IndexerError` still catches every failure from this provider.

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
`Promise<VersionedFinalizedTxData>` — the closed union of `FinalizedTxData`
(v9) and `FinalizedTxDataV8` — exactly as the `PublicDataProvider` interface
they satisfy does. Narrow on `version` before reading `tx`: the two arms carry
transaction objects from different ledger runtimes, and neither runtime's
object can be handed to the other.

Each record is decoded with the runtime of the era the record itself reports.
A v8-era record is read with the pre-fork runtime, which is acquired lazily on
first use — a session that meets no v8 record never instantiates that WASM.

The discriminant is resolved from the record's own `protocolVersion`, never
asserted, so it cannot disagree with the `protocolVersion` beside it. Era
resolution itself can refuse the read one way: `EraUnresolvableError`, an
`IndexerError` naming the raw `protocolVersion` and the record, when that
integer maps to no known ledger era. A `raw` that is not a whole hex byte
string is refused as `IndexerDataError` before any decoder runs.

Bytes that will not decode on the era selected for them surface as the
`DeserializationError` the runtime produced, carrying the era, the
`protocolVersion`, the seam and the record on `context.details`. This provider
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
