# New Features v5.0.0

## MIP-0002 contract events on `PublicDataProvider` (#988)

The `PublicDataProvider` can now read and stream decoded on-chain **contract events**, sourced from the indexer's server-side-decoded scalar fields (per the MIP-0002 indexer-events spec, rev 2).

### Querying (point-in-time, paged)

```ts
import type { ContractEvent, ContractEventQueryFilter } from '@midnight-ntwrk/midnight-js-types';

const filter: ContractEventQueryFilter = {
  contractAddress,
  fromBlock: 100,   // inclusive
  toBlock: 200,     // inclusive — pin for stable multi-page offsets
};

const events: ContractEvent[] = await publicDataProvider.queryContractEvents(
  filter,
  { limit: 50, offset: 0 },
);
```

`offset` is only stable within a window with a fixed upper bound, so pin `toBlock` for multi-page reads — or prefer the iterator helper.

### Iterating every matching event

```ts
import { getAllContractEvents } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';

for await (const event of getAllContractEvents(publicDataProvider, filter)) {
  handle(event);
}
```

### Streaming (replay-from-cursor, then live tail)

```ts
import type { ContractEventCursor, ContractEventSubscriptionFilter } from '@midnight-ntwrk/midnight-js-types';

const cursor: ContractEventCursor = { fromBlock: 100 }; // or { fromId: '...' } — fromId xor fromBlock
const subscription: ContractEventSubscriptionFilter = { contractAddress /*, toBlock */ };

publicDataProvider
  .contractEventsObservable(subscription, cursor)
  .subscribe((event) => handle(event));
```

### The `ContractEvent` union

`ContractEvent` is an 11-variant discriminated union keyed on `eventType`. A `ContractEventBase` carries the fields common to every variant; each variant adds its own:

```ts
type ContractEvent =
  | (ContractEventBase & { eventType: 'ShieldedSpend';   nullifier: string })
  | (ContractEventBase & { eventType: 'ShieldedBurn';    nullifier: string; amount?: string })
  | (ContractEventBase & { eventType: 'ShieldedMint';    /* ... */ })
  | (ContractEventBase & { eventType: 'ShieldedReceive'; /* ... */ })
  | (ContractEventBase & { sender: ContractEventAddress;    /* ... */ })
  | (ContractEventBase & { recipient: ContractEventAddress; /* ... */ })
  | (ContractEventBase & { eventType: 'Paused' })
  | (ContractEventBase & { eventType: 'Unpaused' })
  | (ContractEventBase & { eventType: 'Misc'; name: string; payload: string })
  /* ... */;
```

Notable schema-driven decisions:

- `sender` / `recipient` map to `ContractEventAddress = { kind: 'user' | 'contract'; value }` (the schema's `AddressOrContract` is an object, not a scalar).
- `Misc` carries an opaque `{ name, payload }`.
- The node→`ContractEvent` mapper **fails fast** on an unknown `__typename` or a missing required field (it never silently produces `undefined`), and carries a compile-time exhaustiveness guard so a schema change becomes a type error rather than runtime drift.

> The query / streaming surface covers all 11 variants. Contract-side **emission** of MIP-0002 events requires `compactc 0.32.102` + `compact-runtime 0.17.x` (#996); see the project notes for the current emission scope (standard events; `Misc` emission not yet available).

---

## Disposable `IndexerPublicDataProvider` with structured config (#961)

Phase 2 of #808 (closes #820). The indexer provider gains a structured configuration object, becomes a class, and exposes explicit resource cleanup.

```ts
import {
  indexerPublicDataProvider,
  type DisposablePublicDataProvider,
} from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';

// Preferred: object-config form
const provider: DisposablePublicDataProvider = indexerPublicDataProvider({
  indexerHttpUrl,
  indexerWsUrl,
  pollInterval: 1_000, // optional; defaults to DEFAULT_POLL_INTERVAL
});

// ... use the provider ...

await provider.dispose(); // releases the underlying graphql-ws WebSocket
```

- `validateConfig(config)` fails fast on an invalid `pollInterval` (`0`, negative, `NaN`, `Infinity`, fractional).
- `dispose()` stops the Apollo client then awaits the `graphql-ws` teardown; concurrent dispose calls share one in-flight promise (no double teardown under `Promise.all`).
- The positional factory form is retained but `@deprecated` — migrate to the object form.
- `PublicDataProvider.dispose?(): Promise<void>` was added as an **optional** interface member.

---

## Classified deserialization / versioning errors (#955)

Foundation for issue #816. A new `deserialization` module in `@midnight-ntwrk/midnight-js-utils` converts cryptic ledger/runtime deserialization failures into structured, classified errors.

```ts
import {
  deserializeContractState,
  isDeserializationError,
} from '@midnight-ntwrk/midnight-js-utils';

try {
  const state = deserializeContractState(bytes);
} catch (error) {
  if (isDeserializationError(error)) {
    error.classification; // 'version-mismatch' | 'generic-param-mismatch' | 'format-mismatch' | 'unknown'
    error.mitigation;     // actionable, per-source hint
  }
  throw error;
}
```

- `DeserializationError` with classification, direction inference, per-source mitigation hints, and structural-tag extraction.
- `isDeserializationError` type guard with a cross-realm brand-check fallback (Web Worker boundaries, npm hoist mismatches).
- 6 typed wrappers (`deserializeContractState`, …, `decodeLedgerStateValue`) as the primary API; `withDeserializationContext` HOF as an escape hatch (sync-only — it guards against thenable returns).

---

## Contract-event GraphQL schema enhancements (#971, #975)

The generated contract-event GraphQL schema was enhanced with transaction references and beta markers, richer contract-event types, and **dust generation** support — underpinning the `PublicDataProvider` event surface above.
