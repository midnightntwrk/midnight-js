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
  readonly hash: string;            // hex-encoded block hash
  readonly height: number;
  readonly protocolVersion: number; // dates the block to a ledger era
};
```

Resolve `protocolVersion` with `versionOfRecord(block)` from `@midnight-ntwrk/midnight-js-protocol` — `BlockInfo` satisfies that function's `VersionedRecord` parameter. Prefer it over `protocolVersionToLedger`, which tags a failure as a transaction-construct error rather than a read.

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
  readonly payloadVersion: number;  // payload schema version, not a ledger era (renamed from `version` in #1508)
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

// Canonical key-location grammar, re-exported from @midnight-ntwrk/midnight-js-protocol/v9/compact-js
export type ContractKeyLocation = /* { contractAddress, circuitId, ... } */;
export const encodeContractKeyLocation: (loc: ContractKeyLocation) => string;
export const parseContractKeyLocation: (s: string) => ContractKeyLocation | undefined;
export const hashVerifierKey: (/* verifier key */) => string; // sha-256 hex
```

### Transaction handles at the provider methods (#1204, #1533)

```ts
// Method names — closed, so a caught error's `method` can be switched on.
export type TransactionMethod = 'proveTx' | 'balanceTx' | 'submitTx';
export type ReadMethod = 'watchForTxData' | 'watchForDeployTxData';
export type ProviderMethod = TransactionMethod | ReadMethod;

// One opaque handle per stage. The stage is in the type; the era is data on the handle, and in
// the type too when it is known (`E` defaults to any era).
export type TransactionStage = 'Unproven' | 'Unbound' | 'Finalized';
export type TransactionHandleMethod = TransactionMethod | ReadMethod | 'LedgerTransaction.seal' | 'LedgerTransaction.unwrap';
export class LedgerTransaction<S extends TransactionStage, E extends LedgerVersion = LedgerVersion> {
  readonly era: E;
  readonly stage: S;
  serialize(): Uint8Array;
  static seal<E extends LedgerVersion, S extends TransactionStage>(era: E, stage: S, tx: LedgerTransactionTypes[E][S], method?: TransactionHandleMethod): LedgerTransaction<S, E>;
  static unwrap<E extends LedgerVersion, S extends TransactionStage>(handle: LedgerTransaction<S>, era: E): LedgerTransactionTypes[E][S];
  static require<S extends TransactionStage>(value: unknown, stage: S, method: TransactionHandleMethod): LedgerTransaction<S>;
  static isLedgerTransaction(value: unknown): value is LedgerTransaction<TransactionStage>;
}
export type UnprovenTx = LedgerTransaction<'Unproven'>;
export type UnboundTx = LedgerTransaction<'Unbound'>;
export type FinalizedTx = LedgerTransaction<'Finalized'>;

interface ProofProvider    { readonly supportedEras: readonly LedgerVersion[]; proveTx(tx: UnprovenTx, config?: ProveTxConfig): Promise<UnboundTx>; }
interface WalletProvider   { readonly supportedEras: readonly LedgerVersion[]; balanceTx(tx: UnboundTx, ttl?: Date): Promise<FinalizedTx>; /* key readers */ }
interface MidnightProvider { readonly supportedEras: readonly LedgerVersion[]; submitTx(tx: FinalizedTx): Promise<TransactionId>; }

// Read surface: era-tagged records whose `tx` is a handle of the same era.
export interface FinalizedTxRecord { /* the 13 era-independent metadata fields */ }
export interface Ledger8FinalizedTxData extends FinalizedTxRecord { readonly era: 'v8'; readonly tx: LedgerTransaction<'Finalized', 'v8'>; }
export type FinalizedTxRead = Ledger8FinalizedTxData | Ledger9FinalizedTxData;

// Refusals.
export class ForeignLedgerTransactionError extends MidnightJsError { readonly era: LedgerVersion; readonly reason: 'foreign-instance' | 'ledger8-not-loaded'; readonly method: TransactionHandleMethod; }
export class InvalidTransactionHandleError extends MidnightJsError { readonly method: TransactionHandleMethod; readonly reason: 'not-a-handle' | 'wrong-stage' | 'invalid-stage' | 'not-a-transaction' | 'stage-mismatch'; readonly detail: string; }
export class TransactionEraMismatchError extends MidnightJsError { readonly expected: LedgerVersion; readonly actual: LedgerVersion; }

// Adapters: lift a v9-only implementation into the handle interfaces.
export interface Ledger9WalletProvider { /* balanceTx / getCoinPublicKey / getEncryptionPublicKey, on v9 ledger objects */ }
export const createWalletProvider: (impl: Ledger9WalletProvider) => WalletProvider;
export const createMidnightProvider: (submitTx: (tx: FinalizedTransaction) => Promise<TransactionId>) => MidnightProvider;

// Per-era factories: one handler per ledger era, `undefined` for an era not served.
export const createProofProviderFromHandlers: (handlers: ProofProviderHandlers) => ProofProvider;
export const createWalletProviderFromHandlers: (handlers: WalletProviderHandlers) => WalletProvider;
export const createMidnightProviderFromHandlers: (handlers: MidnightProviderHandlers) => MidnightProvider;
```

`Ledger9FinalizedTxData` gained a required `era: 'v9'`, and its `tx` is a
`LedgerTransaction<'Finalized', 'v9'>`, so narrowing a record on `era`
narrows `tx.era` with it. `ProofProvider.proveTx`, `WalletProvider.balanceTx` and
`MidnightProvider.submitTx` take and return handles; `submitTx` still resolves
a bare `TransactionId`. `PublicDataProvider.watchForTxData` /
`watchForDeployTxData` now resolve `FinalizedTxRead`; read its
transaction with `LedgerTransaction.unwrap(record.tx, record.era)`.

`@midnight-ntwrk/midnight-js-protocol/transaction` (new subpath) publishes
`deserializeTransactionAtStage(era, stage, bytes)`, which reads bytes into the
framework's own ledger copy, and the two checks `seal` runs:
`isFrameworkLedgerTransaction(era, value)` and `transactionStageOf(tx)`, which
reads a transaction's stage from its serialized tag.

`utils.deserializeLedgerTransaction(era, bytes, ctx)` and the indexer's
`parseHexTransaction(era, hex, details?)` take the era to read in and resolve a
`LedgerTransaction<'Finalized', E>`; both are now async, because a v8 read loads
the v8 runtime first.

### On-chain state as bytes (#1550)

```ts
export type LedgerStateKind = 'ContractState' | 'LedgerParameters' | 'ZswapChainState'; // also from protocol/version
export interface StateDecoder<T = unknown> { deserialize(bytes: Uint8Array): T; }
export type StateDecoders = Readonly<Partial<Record<LedgerVersion, StateDecoder>>>;
export class LedgerState<K extends LedgerStateKind = LedgerStateKind, E extends LedgerVersion = LedgerVersion> {
  readonly era: E;
  readonly kind: K;
  static fromBytes<E extends LedgerVersion, K extends LedgerStateKind>(era: E, kind: K, bytes: Uint8Array): LedgerState<K, E>;
  static isLedgerState(value: unknown): value is LedgerState;
  serialize(): Uint8Array;
  deserialize<D extends StateDecoders>(decoders: DecodersFor<D, E>): DecodedState<D, E>; // does not compile when D has no decoder for any era E can be
}

export interface ContractStateRead {
  readonly protocolVersion: number;
  readonly contractState: LedgerState<'ContractState'>;
}
export interface ContractStateAndParametersRead extends ContractStateRead {
  readonly ledgerParameters: LedgerState<'LedgerParameters'>;
}
export interface PublicStatesRead extends ContractStateAndParametersRead {
  readonly zswapChainState: LedgerState<'ZswapChainState'>;
}

interface PublicDataProvider {
  queryContractState(address: ContractAddress, config?: BlockHeightConfig | BlockHashConfig): Promise<ContractStateAndParametersRead | null>;
  queryDeployContractState(address: ContractAddress): Promise<ContractStateRead | null>;
  watchForContractState(address: ContractAddress): Promise<ContractStateRead>;
  queryZSwapAndContractState(address: ContractAddress, config?: BlockHeightConfig | BlockHashConfig): Promise<PublicStatesRead | null>;
  // queryRawContractState and rawContractStateObservable are removed.
}

export type InvalidLedgerStateReason = 'unknown-kind' | 'not-bytes' | 'tag-mismatch' | 'not-from-bytes';
export class InvalidLedgerStateError extends MidnightJsError { readonly kind: string | undefined; readonly era: LedgerVersion | undefined; readonly reason: InvalidLedgerStateReason; }
export class LedgerStateDecoderMissingError extends MidnightJsError { readonly kind: LedgerStateKind; readonly era: LedgerVersion; }
export class LedgerStateDecodeFailedError extends MidnightJsError { readonly kind: LedgerStateKind; readonly era: LedgerVersion; }
```

In `contracts`:

```ts
interface TransactionContext<C, PCK> {
  getCurrentStates(): PublicStatesRead | undefined; // the running contract state, as bytes
}
export class PublicStatesEraMismatchError extends MidnightJsError {
  readonly contractAddress: string;
  readonly field: 'ledgerParameters' | 'zswapChainState';
  readonly expected: LedgerVersion;
  readonly received: LedgerVersion | undefined;
}
```

Removed from `types`: `RawContractState`, `VersionedContractState`,
`VersionedPublicStates`, `Ledger8ContractStateBytes`, `Ledger9ContractState`,
`Ledger8PublicStates`, `Ledger9PublicStates`. Decode a state with the runtime
your contract was compiled against:
`read.contractState.deserialize({ v9: ContractState })`.

### Positioned stream records (#1399)

```ts
export type PositionedRecord<T> = {
  readonly value: T;
  readonly blockHeight: number;
  readonly blockHash: BlockHash;
};

interface PublicDataProvider {
  contractStateObservable(address: ContractAddress, config: ContractStateObservableConfig): Observable<PositionedRecord<ContractStateRead>>; // ContractStateRead since #1550
  unshieldedBalancesObservable(address: ContractAddress, config: ContractStateObservableConfig): Observable<PositionedRecord<UnshieldedBalances>>;
}
```

`BlockHashConfig.blockHash` is now typed `BlockHash` (an alias of `string`; no
change for callers).

---

### `MidnightConfig` and required `MidnightProviders.config` (#982)

```ts
export type NetworkId = string; // moved here from midnight-js-network-id

export interface MidnightConfig {
  readonly networkId: NetworkId;
  readonly ttlSeconds: number;
}

interface MidnightProviders {
  // ... existing providers ...
  readonly config: MidnightConfig; // required
}
```

## `@midnight-ntwrk/midnight-js-contracts`

### Transaction builders take `MidnightConfig` (#982)

| Symbol | Change |
|--------|--------|
| `CallOptionsProviderDataDependencies` | new required `config: MidnightConfig` (so `createUnprovenCallTxFromInitialStates` options carry it) |
| `createUnprovenDeployTxFromVerifierKeys` | new last parameter `config: MidnightConfig` |
| `UnprovenCallTxProvidersBase`, `UnprovenDeployTxProviders` | now include `config` |
| `submitTx` / `submitTxAsync` and every entry point that submits | read `providers.config` and pass its TTL to `walletProvider.balanceTx(tx, ttl)` |


### `Ledger9CallResultPublic.logEvents` + `ContractLog` re-export (#1083)

```ts
interface Ledger9CallResultPublic {
  // ...existing fields
  readonly logEvents: readonly LogEvent[]; // execution-wide, in emission order, tagged by emitting contract address; carried raw
}

// re-exported from compact-js through the barrel — reachable as contracts.ContractLog
export const ContractLog: {
  decodeAll(events: readonly LogEvent[]): DecodedLog[]; // lenient — never throws
};
```

The single `logEvents` list spans the whole call tree. Decode without a direct `compact-js` dependency via `contracts.ContractLog.decodeAll(result.public.logEvents)`.

### Era-invariant error (#1204)

```ts
// Thrown when a provider or the read surface answers in a ledger era the flow
// cannot accept. `expected` is the era it can accept -- for the current era's
// flows that is 'v9'; the retained era's finalizing path passes the network's
// current ledger version, because a retained-era call is recorded by whichever
// ledger the network is on. `received` is the era that actually came back. A
// value that is not a handle raises InvalidTransactionHandleError instead.
export class EraInvariantViolationError extends Error {
  readonly code: 'MIDNIGHT_JS_C_ERA_INVARIANT_VIOLATION';
  readonly method: ProviderMethod; // from midnight-js-types
  readonly circuitId?: string | readonly string[];
  readonly expected: LedgerVersion;
  readonly received?: LedgerVersion;
  readonly contractAddress?: string;
}
```

`submitTx` returns `FinalizedTxRead`, tagged with the era of the block that recorded the transaction (#1508).

### Found deploy record tagged by ledger era (#1408)

```ts
export interface Ledger8FoundDeployTxPublicData extends Ledger8FinalizedTxData {
  readonly contractAddress: ContractAddress; // no initialContractState
}
export type FoundDeployTxPublicData = Ledger8FoundDeployTxPublicData | Ledger9FinalizedDeployTxPublicData;
export interface FoundDeployTxData<C extends Contract.Any> {
  readonly era: CurrentLedgerVersion;
  readonly public: FoundDeployTxPublicData;
  readonly private: UnsubmittedDeployTxPrivateData<C>;
}
// FoundContract<C>['deployTxData'] is now FoundDeployTxData<C>
```

`findDeployedContract` accepts a contract deployed before the ledger fork and
reports its deploy record tagged `v8`. Narrow on `era` before reading `tx` or
`initialContractState`.

### Retained-era deploy data and signing key (#1514)

```ts
export interface Ledger8FoundDeployTxData<C extends Ledger8Contract> {
  readonly era: 'v8';
  readonly public: FinalizedTxRead & { readonly contractAddress: ContractAddress };
  readonly private: {
    readonly signingKey: SigningKey | undefined;
    readonly initialPrivateState: Ledger8PrivateState<C>;
  };
}
export interface Ledger8DeployTxData<C extends Ledger8Contract> extends Ledger8FoundDeployTxData<C> {
  readonly public: Ledger8FoundDeployTxData<C>['public'] & {
    readonly initialContractState: { serialize(): Uint8Array };
    readonly initialContractStateBytes: Uint8Array;
  };
  readonly private: {
    readonly signingKey: SigningKey;
    readonly initialPrivateState: Ledger8PrivateState<C>;
    readonly initialZswapState: ZswapLocalState;
  };
}
// Ledger8FoundContract<C>['deployTxData'] is Ledger8FoundDeployTxData<C>;
// Ledger8DeployedContract<C>['deployTxData'] is Ledger8DeployTxData<C>.
// The top-level signingKey / initial* members are removed.
```

Every retained-era signing key on the public surface is the structured `SigningKey`:
the `signingKey` deploy and find options, `deployTxData.private.signingKey`, and the
`signingKey` member of `TxFailedError`, `Ledger8UnconfirmedError`
and `Ledger8NotStoredError`. `Ledger8SigningKeyError.contractAddress`
is optional: a refused deploy key has no address yet.

### Contract maintenance in both eras (#1514)

```ts
export interface Ledger9FinalizedMaintenanceTxData {
  readonly era: 'v9';
  readonly public: Ledger9FinalizedTxData;
}
export type AnyEraMaintenanceTxData = Ledger9FinalizedMaintenanceTxData | Ledger8FinalizedMaintenanceTxData;

export function submitInsertVerifierKeyTx<C extends Ledger8Contract>(
  providers: Ledger8ContractProviders<C, Ledger8CircuitId<C>>,
  compiledContract: C,
  contractAddress: ContractAddress,
  circuitId: Ledger8CircuitId<C>,
  newVk: VerifierKey
): Promise<Ledger8FinalizedMaintenanceTxData>;
export function submitInsertVerifierKeyTx<C extends Contract.Any>(
  providers: ContractProviders,
  compiledContract: CompiledContract.CompiledContract<C, any>,
  contractAddress: ContractAddress,
  circuitId: Contract.ProvableCircuitId<C>,
  newVk: VerifierKey
): Promise<Ledger9FinalizedMaintenanceTxData>;
// submitRemoveVerifierKeyTx and submitReplaceAuthorityTx take the same two overloads;
// so do createCircuitMaintenanceTxInterface(s) and createContractMaintenanceTxInterface.

export interface Ledger8FinalizedMaintenanceTxData {
  readonly era: 'v8';
  readonly public: Ledger8FinalizedTxData;
}
export interface Ledger8CircuitMaintenanceTxInterface {
  removeVerifierKey(): Promise<Ledger8FinalizedMaintenanceTxData>;
  insertVerifierKey(newVk: VerifierKey): Promise<Ledger8FinalizedMaintenanceTxData>;
}
export type Ledger8CircuitMaintenanceTxInterfaces<C extends Ledger8Contract> = Record<
  Ledger8CircuitId<C>,
  Ledger8CircuitMaintenanceTxInterface
>;
export interface Ledger8ContractMaintenanceTxInterface {
  replaceAuthority(newAuthority: SigningKey): Promise<Ledger8FinalizedMaintenanceTxData>;
}
// Ledger8FoundContract<C> and Ledger8DeployedContract<C> gain
//   circuitMaintenanceTx: Ledger8CircuitMaintenanceTxInterfaces<C>
//   contractMaintenanceTx: Ledger8ContractMaintenanceTxInterface
// Its refusals are EraMismatchError (reason 'ledger8-maintenance-on-ledger9-network'),
//   Ledger8SigningKeyError ('unavailable'), Ledger8NotStoredError ('replace-authority'),
//   Ledger8UnconfirmedError ('replace-authority') and TxFailedError ('insert-verifier-key',
//   'remove-verifier-key', 'replace-authority').
```

`SubmittedOperationKind` gains `'maintenance'`. `@midnight-ntwrk/midnight-js-protocol` gains:

- `Ledger8Engine.composeMaintenanceTx(request: Ledger8MaintenanceRequest): Promise<Uint8Array>`, with
  the `Ledger8MaintenanceRequest` and `Ledger8MaintenanceUpdateRequest` types;
- `MaintenanceAuthorityMismatchError` with its `MaintenanceAuthorityMismatchReason`, and the code
  `PROTOCOL_ERROR_CODES.MAINTENANCE_AUTHORITY_MISMATCH`;
- `'maintenance-update'` on `ComposeStage` and `'newSigningKey'` on `ComposeOption`. Both unions are
  closed, so an exhaustive `switch` over either must handle the new member (see breaking-changes.md).

### Ledger 8 types are flat exports (#1561)

```ts
// Before: types only through the namespace
import { type Ledger8 } from '@midnight-ntwrk/midnight-js-contracts';
type T = Ledger8.FoundContract<C>;

// After: 37 flat Ledger8* types
import { type Ledger8FoundContract } from '@midnight-ntwrk/midnight-js-contracts';
type T = Ledger8FoundContract<C>;
```

### One error class per fault (#1557)

The `Ledger8` namespace is removed. These are the final classes; see
[breaking-changes.md](./breaking-changes.md#24-one-error-class-per-fault-1557) for the old name of each one.

```ts
// contracts
class TxFailedError extends MidnightJsError {
  constructor(operation: 'deploy' | 'replace-authority', record: FinalizedTxRead,
    details: { contractAddress: ContractAddress; signingKey: SigningKey });
  constructor(operation: 'insert-verifier-key' | 'remove-verifier-key', record: FinalizedTxRead,
    details: { contractAddress: ContractAddress; circuitId: string });
  constructor(operation: 'call', record: FinalizedTxRead,
    details: { circuitId: string | readonly string[]; contractAddress?: ContractAddress });
  readonly operation: TxFailedOperation; // 'call' | 'deploy' | 'insert-verifier-key' | 'remove-verifier-key' | 'replace-authority'
  readonly record: FinalizedTxRead;
  readonly contractAddress?: ContractAddress; // never set by a ledger 9 call
  readonly circuitId?: string | readonly string[];
  readonly signingKey?: SigningKey; // not enumerable; never in the message
}
class EraMismatchError extends MidnightJsError {
  constructor(reason: EraMismatchReason, options?: EraMismatchOptions); // options: { detail?, contractAddress?, circuitId?, cause? }
  readonly reason: EraMismatchReason;
  readonly detail?: string;
  readonly contractAddress?: ContractAddress;
  readonly circuitId?: string;
}
class Ledger8SigningKeyError {
  constructor(reason: 'unusable', contractAddress?: string);
  constructor(reason: 'unavailable', contractAddress: string, options?: ErrorOptions);
  readonly reason: 'unusable' | 'unavailable';
  readonly contractAddress?: string;
}
class Ledger8UnconfirmedError { readonly operation: Ledger8KeyedOperation; readonly contractAddress: string; readonly signingKey: SigningKey } // signingKey not enumerable
class Ledger8NotStoredError { readonly operation: Ledger8KeyedOperation; readonly stage: Ledger8NotStoredStage; readonly signingKey: SigningKey } // signingKey not enumerable
class Ledger8CallUnsupportedError { readonly reason: Ledger8CallUnsupportedReason; readonly circuitId: string; readonly recipientCoinPublicKey?: string }
class Ledger8AmbiguousEntryPointError {
  constructor(contractAddress: string, circuitId: string, matchCount: number);
  readonly contractAddress: string;
  readonly circuitId: string;
  readonly matchCount: number;
}
// Types exported with them: TxFailedOperation, TxFailedDetails, EraMismatchReason, EraMismatchOptions,
//   Ledger8SigningKeyReason, Ledger8KeyedOperation, Ledger8NotStoredStage, Ledger8CallUnsupportedReason.
```

`UnknownLedgerVersionError` (protocol) now also covers a value with no era, with a `requestedVersion` of
`undefined`. It is ENVIRONMENT. Its constructor takes the raw value (`unknown`), and `requestedVersion` is
`string | undefined`. Removed from `utils`: `UnrecognisedEraTagError`,
`Ledger8ValueUnsupportedError`, `requireLedger9`, and the codes `LEDGER8_VALUE_UNSUPPORTED` and
`UNRECOGNISED_ERA_TAG`. Removed from `contracts`: `AnyEraTxFailedError`, `CallTxFailedError`,
`DeployTxFailedError`, `InsertVerifierKeyTxFailedError`, `RemoveVerifierKeyTxFailedError`,
`ReplaceMaintenanceAuthorityTxFailedError`, `EraArtifactMismatchError`, `ScopedTransactionEraUnsupportedError`,
`MixedEraScopeError`, `UnknownResultEraError`, and the `Ledger8` namespace with every member.
`CONTRACTS_ERROR_CODES.ERA_ARTIFACT_MISMATCH` is `ERA_MISMATCH`.

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

Era resolution (#1204) — the `era` on a finalized record is derived from the
record's own `protocolVersion`, never asserted, and that answer also selects the
ledger runtime the record is decoded with. `watchForTxData` and
`watchForDeployTxData` therefore resolve `FinalizedTxRead` and really
do produce both variants; the pre-fork runtime is acquired lazily, so a session that
meets no v8-era record never instantiates it.

```ts
export class UnknownRecordEraError extends IndexerError {
  readonly code: 'MIDNIGHT_JS_PR_UNKNOWN_RECORD_ERA';
  // protocolVersion maps to no era at all. The originating
  // UnknownProtocolVersionError is preserved on `cause`.
}
export class DecoderEraUnsupportedError extends IndexerError {
  readonly code: 'MIDNIGHT_JS_PR_DECODER_ERA_UNSUPPORTED';
  readonly method: ReadMethod;
  readonly era: LedgerVersion;      // an era the decoder table has no entry for
  readonly protocolVersion: number; // the raw integer the indexer reported
  readonly recordRef?: string;      // the txId or contractAddress being read
  // A guard on the era-keyed decoder table, which is total over the eras this
  // client ships runtimes for. A TypeScript caller cannot raise it; it exists
  // so an era string threaded in from untyped JavaScript fails here instead of
  // resolving an inherited Object.prototype member.
}
```

On-chain state as bytes (#1550) — `parseHexContractState`,
`parseHexLedgerParameters` and `parseHexZswapState` are removed: the provider
decodes no state. `IndexerDataError` kinds `unsupported-decode-era` and
`unsupported-parameters-era` are removed, and `malformed-zswap-encoding`,
`malformed-zswap-state` and `parameters-era-disagreement` are new.
`queryContractState` now serves the block's ledger parameters too.

Internally the provider was split into 7 layered files (#960): `config.ts`, `transport.ts` (`ApolloHandle = { client, dispose }`), `provider.ts` (`class IndexerPublicDataProvider`), `observables.ts`, `events-filter.ts`, `events-mapping.ts`, and `index.ts`.

---

## `@midnight-ntwrk/midnight-js-utils`

### New exports

- `assertValidMidnightConfig(config, source?)` — checks a `MidnightConfig` and throws `TypeError` / `RangeError` naming the bad field; every framework entry point that builds a transaction calls it before reading chain state or running the circuit (#982).
- `intentTtl(config)` — the expiry `Date` for an intent built now: the current time plus `config.ttlSeconds` (#982).

```ts
// Coded-error registry and guard (#1204). Prefer hasErrorCode over instanceof
// across a package boundary.
export const CONTRACTS_ERROR_CODES: Readonly<{ ERA_INVARIANT_VIOLATION: string }>;
// Declared in `@midnight-ntwrk/midnight-js-types` and also readable from its
// `./errors` leaf subpath; re-exported here, so either import works.
// The era and transaction-handle codes; the other provider codes are omitted here.
export const PROVIDER_ERROR_CODES: Readonly<{
  DECODER_ERA_UNSUPPORTED: string; UNKNOWN_RECORD_ERA: string;
  PROVIDER_ERA_UNSUPPORTED: string; UNUSABLE_ERA_ENTRY: string;
  FOREIGN_LEDGER_TRANSACTION: string; INVALID_TRANSACTION_HANDLE: string;
  TRANSACTION_ERA_MISMATCH: string;
}>;
export type ContractsErrorCode = /* union of the above values */;
export type ProviderErrorCode = /* union of the above values */;
export type MidnightJsErrorCode = ProtocolErrorCode | ContractsErrorCode | ProviderErrorCode;
export const MIDNIGHT_JS_ERROR_CODES: readonly MidnightJsErrorCode[];
export function hasErrorCode(error: unknown): error is Error & { code: MidnightJsErrorCode };
// `code` must be one of this framework's own codes, so a typo is a compile
// error rather than a guard that silently never matches.
export function hasErrorCode<C extends MidnightJsErrorCode>(
  error: unknown, code: C
): error is Error & { code: C };

// The same comparison for a code this framework does NOT own (Node's
// ECONNREFUSED, a driver's own vocabulary). Refuses a member of
// MidnightJsErrorCode at compile time, and throws on any code carrying the
// MIDNIGHT_JS_ prefix — a misspelling of one of ours reaches this form and
// would otherwise answer false forever.
export function hasForeignErrorCode<C extends string>(
  error: unknown, code: C extends MidnightJsErrorCode ? never : C
): error is Error & { code: C };

// Exhaustiveness guard for the era-tagged unions (#1254). Closes the
// `default` case of a `switch` so a future era variant cannot fall through unhandled.
// Never renders `value` into its message; `context` is required and locates the throw.
export function assertNever(value: never, context: string): never;
export class UnhandledUnionMemberError extends Error {
  readonly code: 'MIDNIGHT_JS_U_UNHANDLED_UNION_MEMBER';
  readonly context: string;
}

// Structured signing-key validation (shared by both private-state providers)
export const isValidSigningKey: (value: unknown) => boolean;

// ZK artifact integrity manifest (#1015) — consumed by both ZK config providers
export type ZkArtifactIntegrityMode = 'require' | 'require-if-present' | 'warn' | 'off';
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

Subpath re-exports retargeted (see [breaking-changes.md](./breaking-changes.md)). The ledger-bound subpaths are now named after ledger 9, see the next section:

| Subpath | Now resolves to |
|---------|-----------------|
| `/v9` | `@midnightntwrk/ledger-v9@1.0.0-rc.3` |
| `/v9/onchain-runtime` | `@midnightntwrk/onchain-runtime-v4@4.0.0-rc.3` |
| `/v9/compact-runtime` | `@midnight-ntwrk/compact-runtime@0.18.0-rc.1` |
| `/v9/compact-js` | `@midnight-ntwrk/compact-js@2.5.5-rc.7` (provides the `ContractKeyLocation` grammar) |
| `/platform-js` | `@midnight-ntwrk/platform-js@3.0.0` |

### Era-named ledger 9 subpaths (#1536)

New subpaths name ledger 9 and keep that meaning at every later fork. The
unnamed subpaths they replace are removed (see
[breaking-changes.md](./breaking-changes.md#21-unnamed-protocol-subpaths-removed-1536)):

| New subpath | Replaces (removed) |
|---|---|
| `/v9` | `/ledger` |
| `/v9/compact-runtime` | `/compact-runtime` |
| `/v9/compact-js` | `/compact-js` |
| `/v9/compact-js/effect` | `/compact-js/effect` |
| `/v9/compact-js/effect/Contract` | `/compact-js/effect/Contract` |
| `/v9/onchain-runtime` | `/onchain-runtime` |

The root namespaces `ledger`, `compactRuntime`, `compactJs` and `onchainRuntime`
are removed too. Import the matching `/v9` subpath as a namespace instead
(`import * as ledger from '@midnight-ntwrk/midnight-js-protocol/v9'`).

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

## `@midnight-ntwrk/midnight-js-network-id` (deprecated, #982)

`setNetworkId`, `getNetworkId` and `NetworkId` are `@deprecated`. They still work,
but the framework no longer reads the value. Use `MidnightProviders.config.networkId`
and import `NetworkId` from `@midnight-ntwrk/midnight-js-types`. The package is
removed in 6.0.

## `@midnight-ntwrk/testkit-js`

### `NodeClient` takes the network id (#982)

`new NodeClient(url, logger, networkId)` — the third argument addresses contract
state in `contractState()`, replacing the global network id.

