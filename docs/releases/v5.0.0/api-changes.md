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

  /** "As-of" block lookup. No argument → latest block. Returns null if none matches. */
  queryBlock(config?: BlockHeightConfig | BlockHashConfig): Promise<BlockInfo | null>;
}

export type BlockInfo = {
  readonly hash: string;   // hex-encoded block hash
  readonly height: number;
};
```

`queryContractEvents`, `contractEventsObservable`, and `queryBlock` are **required** interface members — custom `PublicDataProvider` implementations must add them. Note the start cursor is passed via `opts.startAt`, **not** positionally. There is **no** `dispose` member on the `PublicDataProvider` interface; `dispose()` lives only on the concrete `IndexerPublicDataProvider` (see below).

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

### Cross-contract call — new exports (#967)

```ts
// Resolves ZK artifacts across a set of compiled-contract sources, keyed by verifier-key hash.
export class ZKConfigRegistry {
  constructor(sources: Iterable<ZKConfigProvider<string>>);
  get(location: ContractKeyLocation): Promise<ZKConfig<string>>;
  resolveKeyLocation(keyLocation: string): Promise<ZKConfig<string> | undefined>;
}
export class ZKArtifactNotFoundError extends Error { readonly keyLocation: ContractKeyLocation; }

// Canonical key-location grammar, re-exported from @midnight-ntwrk/midnight-js-protocol/compact-js
export type ContractKeyLocation = /* { contractAddress, circuitId, ... } */;
export const encodeContractKeyLocation: (loc: ContractKeyLocation) => string;
export const parseContractKeyLocation: (s: string) => ContractKeyLocation | undefined;
export const hashVerifierKey: (/* verifier key */) => string; // sha-256 hex
```

---

## `@midnight-ntwrk/midnight-js-contracts`

### `CallResultPublic.events` + `ContractLog` re-export (#1083)

```ts
interface CallResultPublic {
  // ...existing fields
  readonly events: LogEvent[]; // execution-wide, in emission order, tagged by emitting contract address; carried raw
}

// re-exported from compact-js through the barrel — reachable as contracts.ContractLog
export const ContractLog: {
  decodeAll(events: readonly LogEvent[]): DecodedLog[]; // lenient — never throws
};
```

The single `events` list spans the whole call tree. Decode without a direct `compact-js` dependency via `contracts.ContractLog.decodeAll(result.public.events)`.

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

// ZK artifact integrity manifest (#1015) — consumed by both ZK config providers
export type ZkArtifactIntegrityMode = 'require' | 'warn' | 'off';
export interface ZkConfigIntegrityOptions {
  readonly verify?: ZkArtifactIntegrityMode;   // default 'require' (fail-closed)
  readonly expectedManifestHash?: string;      // SHA-256 hex of the manifest bytes, pinned at build time
  readonly onWarn?: (message: string) => void; // default console.warn
}
export interface ZkArtifactManifest {
  readonly version: string;
  readonly compilerVersion?: string;
  readonly languageVersion?: string;
  readonly runtimeVersion?: string;
  readonly files: ReadonlyMap<string, ZkArtifactManifestFile>;
}
export interface ZkArtifactManifestFile { readonly size: number; readonly hash: string; }
export class ZkArtifactIntegrityError extends Error {}
export const ZK_MANIFEST_DIR: string;        // 'compiler'
export const ZK_MANIFEST_FILE_NAME: string;  // 'contract-manifest.json'

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
| `/ledger` | `@midnightntwrk/ledger-v9@1.0.0-rc.3` |
| `/onchain-runtime` | `@midnightntwrk/onchain-runtime-v4@4.0.0-rc.3` |
| `/compact-runtime` | `@midnight-ntwrk/compact-runtime@0.18.0-rc.1` |
| `/compact-js` | `@midnight-ntwrk/compact-js@2.5.5-rc.7` (provides the `ContractKeyLocation` grammar) |
| `/platform-js` | `@midnight-ntwrk/platform-js@3.0.0` |

## `@midnight-ntwrk/midnight-js-http-client-proof-provider`

### `httpClientProofProvider` — object-options form (#1078)

```ts
// new — preferred object-options form (flattened config)
export function httpClientProofProvider(options: {
  readonly url: string;
  readonly zkConfigProvider: ZKConfigProvider<string>;
  readonly timeout?: number;
  readonly headers?: Record<string, string>;
}): ProofProvider<string>;

/** @deprecated positional form retained for one release cycle */
export function httpClientProofProvider(url: string, zkConfigProvider: ZKConfigProvider<string>): ProofProvider<string>;
```

Additive and backward-compatible — the positional overload keeps working. Low-level `httpClientProvingProvider` remains positional (tracked as a follow-up).

## `@midnight-ntwrk/midnight-js-fetch-zk-config-provider` / `-node-zk-config-provider`

Both provider constructors now accept an optional `ZkConfigIntegrityOptions` bag (see `midnight-js-utils` above) and verify artifacts against `compiler/contract-manifest.json`, defaulting to `verify: 'require'` (fail-closed). See [breaking-changes.md](./breaking-changes.md).

### `provider(options)` factory functions (#1078)

Thin factory functions are added alongside the existing classes (the classes stay exported for subclassing/composition):

```ts
export function nodeZkConfigProvider(options: /* ... */): NodeZkConfigProvider<string>;
export function fetchZkConfigProvider(options: /* ... */): FetchZkConfigProvider<string>;
```
