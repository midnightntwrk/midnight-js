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

  /** Replay from a cursor, then live tail. Terminable via filter.toBlock. */
  contractEventsObservable(
    filter: ContractEventSubscriptionFilter,
    cursor?: ContractEventCursor,
  ): Observable<ContractEvent>;

  /** Added in #961 — optional, additive. Releases provider-held resources. */
  dispose?(): Promise<void>;
}
```

`queryContractEvents` and `contractEventsObservable` are **required** interface members. Custom `PublicDataProvider` implementations must add them. `dispose?` is optional.

### New event types

```ts
export type ContractEventType =
  | 'ShieldedSpend' | 'ShieldedReceive' | 'ShieldedMint' | 'ShieldedBurn'
  | 'Paused' | 'Unpaused' | 'Misc' /* ... transfer-style variants ... */;

export interface ContractEventAddress {
  readonly kind: 'user' | 'contract';
  readonly value: string;
}

export interface ContractEventBase { /* fields common to every variant */ }

export type ContractEvent =
  | (ContractEventBase & { readonly eventType: 'ShieldedSpend'; readonly nullifier: string })
  | (ContractEventBase & { readonly eventType: 'ShieldedBurn';  readonly nullifier: string; readonly amount?: string })
  | (ContractEventBase & { readonly sender: ContractEventAddress;    /* ... */ })
  | (ContractEventBase & { readonly recipient: ContractEventAddress; /* ... */ })
  | (ContractEventBase & { readonly eventType: 'Paused' })
  | (ContractEventBase & { readonly eventType: 'Unpaused' })
  | (ContractEventBase & { readonly eventType: 'Misc'; readonly name: string; readonly payload: string })
  /* 11 variants total */;

export interface ContractEventFilterBase { /* shared filter fields */ }

export interface ContractEventQueryFilter extends ContractEventFilterBase {
  readonly fromBlock?: number; // inclusive
  readonly toBlock?: number;   // inclusive
}

export interface ContractEventSubscriptionFilter extends ContractEventFilterBase {
  readonly toBlock?: number; // terminates the stream
}

export type ContractEventCursor =
  | { readonly fromId: string }     // xor
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

```ts
// Structured configuration (preferred)
export interface IndexerProviderConfig { /* indexer URLs, optional pollInterval */ }
export type ValidatedConfig = /* ... */;
export function validateConfig(config: IndexerProviderConfig): ValidatedConfig;
export const DEFAULT_POLL_INTERVAL: number;

// Factory now overloaded — object form preferred, positional form @deprecated
export function indexerPublicDataProvider(config: IndexerProviderConfig): DisposablePublicDataProvider;

// Disposable provider type
export type DisposablePublicDataProvider = PublicDataProvider & { dispose(): Promise<void> };

// Event iterator helper + default page size
export function getAllContractEvents(/* provider, filter */): AsyncIterable<ContractEvent>;
export const DEFAULT_CONTRACT_EVENTS_PAGE_SIZE: number;
```

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
| `/compact-runtime` | `@midnight-ntwrk/compact-runtime@0.17.102-dev` |
| `/platform-js` | `@midnight-ntwrk/platform-js@3.0.0` |
