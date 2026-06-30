# API Changes v5.0.0

## `@midnight-ntwrk/midnight-js-types`

### `PublicDataProvider` — new methods (required)

```ts
interface PublicDataProvider {
  // ... existing methods ...

  /** Finite, paged, point-in-time read of contract events. */
  queryContractEvents(
    filter: ContractEventQueryFilter,
    page?: ContractEventsPage,
  ): Promise<ContractEvent[]>;

  /** Replay from a start cursor, then live tail. Terminable via filter.toBlock. */
  contractEventsObservable(
    filter: ContractEventSubscriptionFilter,
    opts?: { startAt?: ContractEventCursor },
  ): Observable<ContractEvent>;
}
```

`queryContractEvents` and `contractEventsObservable` are **required** interface members — custom `PublicDataProvider` implementations must add them. Note the start cursor is passed via `opts.startAt`, **not** positionally. There is **no** `dispose` member on the `PublicDataProvider` interface; `dispose()` lives only on the concrete `IndexerPublicDataProvider` (see below).

### New event types

```ts
export type ContractEventType =
  | 'ShieldedSpend' | 'ShieldedReceive' | 'ShieldedMint' | 'ShieldedBurn'
  | 'UnshieldedSpend' | 'UnshieldedReceive' | 'UnshieldedMint' | 'UnshieldedBurn'
  | 'Paused' | 'Unpaused' | 'Misc'; // 11 variants

export interface ContractEventAddress {
  readonly kind: 'user' | 'contract';
  readonly value: string;
}

export interface ContractEventBase {
  readonly id: number;              // monotonic indexer cursor; inclusive resumption point
  readonly maxId: number;           // highest event id known (events tip)
  readonly version: number;         // payload schema version
  readonly contractAddress: ContractAddress;
  readonly transactionId: number;   // indexer row id — NOT the chain tx hash
  readonly raw: string;             // opaque hex VersionedLogItem, verbatim
}

export type ContractEvent =
  | (ContractEventBase & { readonly eventType: 'ShieldedSpend'; readonly nullifier: string })
  | (ContractEventBase & { readonly eventType: 'ShieldedReceive'; readonly commitment: string; readonly ciphertext?: string; readonly receivingContractAddress?: string })
  | (ContractEventBase & { readonly eventType: 'ShieldedMint'; readonly commitment: string; readonly domainSep: string; readonly amount?: string })
  | (ContractEventBase & { readonly eventType: 'ShieldedBurn'; readonly nullifier: string; readonly amount?: string })
  | (ContractEventBase & { readonly eventType: 'UnshieldedSpend'; readonly sender: ContractEventAddress; readonly domainSep: string; readonly tokenType: string; readonly amount: string })
  | (ContractEventBase & { readonly eventType: 'UnshieldedReceive'; readonly recipient: ContractEventAddress; readonly domainSep: string; readonly tokenType: string; readonly amount: string })
  | (ContractEventBase & { readonly eventType: 'UnshieldedMint'; readonly domainSep: string; readonly tokenType: string; readonly amount: string })
  | (ContractEventBase & { readonly eventType: 'UnshieldedBurn'; readonly sender: ContractEventAddress; readonly tokenType: string; readonly amount: string })
  | (ContractEventBase & { readonly eventType: 'Paused' })
  | (ContractEventBase & { readonly eventType: 'Unpaused' })
  | (ContractEventBase & { readonly eventType: 'Misc'; readonly name: string; readonly payload: string });

export interface ContractEventFilterBase {
  readonly contractAddress: ContractAddress;
  readonly types?: ContractEventType[];               // omit = all; empty array is rejected
  readonly fieldPrefixes?: ContractEventFieldPrefix[]; // non-Misc variants only
  readonly transactionHash?: string;
}

export interface ContractEventQueryFilter extends ContractEventFilterBase {
  readonly fromBlock?: number; // inclusive
  readonly toBlock?: number;   // inclusive
}

export interface ContractEventSubscriptionFilter extends ContractEventFilterBase {
  readonly toBlock?: number; // terminates the stream
}

export type ContractEventCursor =
  | { readonly fromId: number }     // xor — inclusive event id
  | { readonly fromBlock: number };

export interface ContractEventsPage {
  readonly limit?: number;
  readonly offset?: number; // stable only within a fixed-upper-bound window
}
```

### `SigningKey` — shape change

```ts
// Before
type SigningKey = string; // hex

// After
type SigningKey = { tag: 'schnorr' | 'ecdsa'; value: string /* hex */ };
```

`ContractExecutableRuntimeOptions.signingKey` now uses the structured `SigningKey`.

---

## `@midnight-ntwrk/midnight-js-indexer-public-data-provider`

### New / changed exports

Package barrel (`index.ts`) exports:

```ts
// Structured configuration (preferred)
export type IndexerProviderConfig = {
  readonly queryURL: string;        // indexer HTTP/GraphQL endpoint
  readonly subscriptionURL: string; // indexer WebSocket endpoint
  readonly webSocket?: typeof ws.WebSocket;
  readonly pollInterval?: number;   // defaults to DEFAULT_POLL_INTERVAL
};
export const DEFAULT_POLL_INTERVAL: number;            // 1000 (ms)
export const DEFAULT_CONTRACT_EVENTS_PAGE_SIZE: number; // 100

// Concrete provider class + overloaded factory (both return IndexerPublicDataProvider)
export class IndexerPublicDataProvider implements PublicDataProvider { dispose(): Promise<void>; /* ... */ }
export function indexerPublicDataProvider(config: IndexerProviderConfig): IndexerPublicDataProvider;
/** @deprecated positional form retained for backward compatibility */
export function indexerPublicDataProvider(queryURL: string, subscriptionURL: string, webSocket?: typeof ws.WebSocket): IndexerPublicDataProvider;

// Event iterator helper + transaction guard
export function getAllContractEvents(/* provider, filter */): AsyncIterable<ContractEvent>;
export function isRegularTransaction(/* ... */): boolean;
```

`dispose()` is a method on the concrete `IndexerPublicDataProvider` returned by the factory — there is no separate `DisposablePublicDataProvider` type, and the `PublicDataProvider` interface itself has no `dispose` member. `validateConfig` / `ValidatedConfig` exist but live in the internal `config.ts` module and are **not** re-exported from the package barrel.

New typed error variants accompany the event surface (e.g. `IndexerDataError.unknownAddressKind` for an unrecognized address kind; unknown `__typename` / missing-field cases continue to fail fast).

Internally the provider was split into 7 layered files (#960): `config.ts`, `transport.ts` (`ApolloHandle = { client, dispose }`), `provider.ts` (`class IndexerPublicDataProvider`), `observables.ts`, `events-filter.ts`, `events-mapping.ts`, and `index.ts`.

---

## `@midnight-ntwrk/midnight-js-utils`

### New exports

```ts
// Structured signing-key validation (shared by both private-state providers)
export const isValidSigningKey: (value: unknown) => boolean;

// Deserialization / versioning errors (#955)
export class DeserializationError extends Error {
  readonly classification: 'version-mismatch' | 'generic-param-mismatch' | 'format-mismatch' | 'unknown';
  readonly mitigation: string;
  /* direction inference, structural-tag extraction */
}
export function isDeserializationError(value: unknown): value is DeserializationError;

// 6 typed wrappers (primary API)
export function deserializeContractState(/* ... */): /* ... */;
// ... decodeLedgerStateValue, etc.

// Escape hatch (sync-only)
export function withDeserializationContext<T>(/* ... */): T;
```

---

## `@midnight-ntwrk/midnight-js-protocol`

Subpath re-exports retargeted (see [breaking-changes.md](./breaking-changes.md)):

| Subpath | Now resolves to |
|---------|-----------------|
| `/ledger` | `@midnightntwrk/ledger-v9@1.0.0-rc.2` |
| `/onchain-runtime` | `@midnightntwrk/onchain-runtime-v4@4.0.0-rc.2` |
| `/compact-runtime` | `@midnight-ntwrk/compact-runtime@0.17.102-dev.82a6b7c83060d9566e57aa496a33ed80289a7257` |
| `/platform-js` | `@midnight-ntwrk/platform-js@3.0.0` |
