# API Changes v5.0.0

This page lists every change to the public API between **v4.1.1** and **v5.0.0**, package by
package. Each package has three parts:

- **Added**: new exports.
- **Changed**: exports that exist in both versions but have a new shape. The old (v4.1.1) form
  comes first, then the new one.
- **Removed**: exports that are gone, with what to use instead.

Signatures are copied from the source. Comments and default values are left out where they do not
change the meaning. For the reasons behind each change and the steps to upgrade, see
[breaking-changes.md](./breaking-changes.md) and [migration-guide.md](./migration-guide.md). For an
overview of the new features, see [new-features.md](./new-features.md).

Two words appear often:

- **Era**: the ledger version a value belongs to, `'v8'` (before the hard fork) or `'v9'` (after).
  The type is `LedgerEra` from `@midnight-ntwrk/midnight-js-protocol/version`.
- **Handle**: an object that holds a transaction or a state as bytes, plus its era. You decode it
  with your own copy of the ledger.

All packages are now ESM only and need Node.js >= 22.12. This applies everywhere and is not
repeated per package.

## Contents

- [`@midnight-ntwrk/midnight-js-types`](#midnight-ntwrkmidnight-js-types)
- [`@midnight-ntwrk/midnight-js-contracts`](#midnight-ntwrkmidnight-js-contracts)
- [`@midnight-ntwrk/midnight-js-protocol`](#midnight-ntwrkmidnight-js-protocol)
- [`@midnight-ntwrk/midnight-js-utils`](#midnight-ntwrkmidnight-js-utils)
- [`@midnight-ntwrk/midnight-js-indexer-public-data-provider`](#midnight-ntwrkmidnight-js-indexer-public-data-provider)
- [`@midnight-ntwrk/midnight-js-level-private-state-provider`](#midnight-ntwrkmidnight-js-level-private-state-provider)
- [`@midnight-ntwrk/midnight-js-http-client-proof-provider`](#midnight-ntwrkmidnight-js-http-client-proof-provider)
- [`@midnight-ntwrk/midnight-js-fetch-zk-config-provider`](#midnight-ntwrkmidnight-js-fetch-zk-config-provider)
- [`@midnight-ntwrk/midnight-js-node-zk-config-provider`](#midnight-ntwrkmidnight-js-node-zk-config-provider)
- [`@midnight-ntwrk/midnight-js-dapp-connector-proof-provider`](#midnight-ntwrkmidnight-js-dapp-connector-proof-provider)
- [`@midnight-ntwrk/midnight-js-bundled-contract-module-provider` (new)](#midnight-ntwrkmidnight-js-bundled-contract-module-provider-new)
- [`@midnight-ntwrk/midnight-js` (barrel)](#midnight-ntwrkmidnight-js-barrel)
- [`@midnight-ntwrk/midnight-js-network-id` (removed)](#midnight-ntwrkmidnight-js-network-id-removed)
- [`@midnight-ntwrk/testkit-js`](#midnight-ntwrktestkit-js)

No exports changed in `@midnight-ntwrk/midnight-js-logger-provider`.

---

## `@midnight-ntwrk/midnight-js-types`

New subpath: `@midnight-ntwrk/midnight-js-types/errors`. It holds the error classes and error codes
of this package, without the rest of the package. The one exception is `ZKArtifactNotFoundError`:
import it from the package root.

### Changed: `MidnightProviders`

Two new members. `config` is required.

```ts
// v5.0.0 (packages/types/src/providers.ts)
export interface MidnightProviders<
  PCK extends AnyProvableCircuitId = AnyProvableCircuitId,
  PSI extends PrivateStateId = PrivateStateId,
  PS = any
> {
  readonly privateStateProvider: PrivateStateProvider<PSI, PS>;
  readonly publicDataProvider: PublicDataProvider;
  readonly zkConfigProvider: ZKConfigProvider<PCK>;
  readonly proofProvider: ProofProvider;
  readonly walletProvider: WalletProvider;
  readonly midnightProvider: MidnightProvider;
  readonly config: MidnightConfig;                           // new, required
  readonly contractModuleProvider?: ContractModuleProvider;  // new, optional
  readonly loggerProvider?: LoggerProvider;
}
```

`ContractModuleProvider` is the Compact runtime type, from
`@midnight-ntwrk/midnight-js-protocol/v9/compact-runtime`. You need it only for dynamic
cross-contract calls (see the bundled contract module provider below).

### Added: `MidnightConfig` and `NetworkId`

```ts
export type NetworkId = string; // moved here from @midnight-ntwrk/midnight-js-network-id
export interface MidnightConfig {
  readonly networkId: NetworkId;
  readonly ttlSeconds: number;  // lifetime of every intent the framework builds
}
```

### Changed: transactions at the provider methods are handles

The three transaction providers take and return `LedgerTransaction` handles. Each one also needs
`supportedEras`: the eras it can handle. The framework reads it before an operation starts.

| Member | v4.1.1 | v5.0.0 |
|---|---|---|
| `ProofProvider.proveTx` | `proveTx(unprovenTx: UnprovenTransaction, proveTxConfig?: ProveTxConfig): Promise<UnboundTransaction>` | `proveTx(unprovenTx: UnprovenTx, proveTxConfig?: ProveTxConfig): Promise<UnboundTx>` |
| `WalletProvider.balanceTx` | `balanceTx(tx: UnboundTransaction, ttl?: Date): Promise<FinalizedTransaction>` | `balanceTx(tx: UnboundTx, ttl?: Date): Promise<FinalizedTx>` |
| `MidnightProvider.submitTx` | `submitTx(tx: FinalizedTransaction): Promise<TransactionId>` | `submitTx(tx: FinalizedTx): Promise<TransactionId>` |
| `supportedEras` (all three) | — | `readonly supportedEras: readonly LedgerEra[]` (required) |

`ProveTxConfig` is unchanged (`{ readonly timeout?: number }`), but providers built from a
`ProvingProvider` and the DApp Connector proof provider now refuse `timeout` with
`InvalidArgumentError`.

### Added: `LedgerTransaction`

```ts
// packages/types/src/ledger-transaction.ts
export class LedgerTransaction<S extends TransactionStage, out E extends LedgerEra = LedgerEra> {
  readonly era: E;
  readonly stage: S;
  static fromBytes<E extends LedgerEra, S extends TransactionStage>(
    era: E, stage: S, bytes: Uint8Array, method?: TransactionHandleMethod
  ): LedgerTransaction<S, E>;
  static seal<E extends LedgerEra, S extends TransactionStage>(
    era: E, stage: S, tx: { serialize(): Uint8Array }, method?: TransactionHandleMethod
  ): LedgerTransaction<S, E>;
  serialize(): Uint8Array;
  deserialize<D extends TransactionDecoders>(decoders: TransactionDecodersFor<D, E>): DecodedTransaction<D, E, S>;
  static require<S extends TransactionStage>(value: unknown, stage: S, method: TransactionHandleMethod): LedgerTransaction<S>;
  static isLedgerTransaction(value: unknown): value is LedgerTransaction<TransactionStage>;
}
export type UnprovenTx = LedgerTransaction<'Unproven'>;
export type UnboundTx = LedgerTransaction<'Unbound'>;
export type FinalizedTx = LedgerTransaction<'Finalized'>;
export type TransactionAnswer = { serialize(): Uint8Array } | Uint8Array;
export type TransactionDecoders = Readonly<Partial<Record<LedgerEra, TransactionDecoder>>>;
```

- `fromBytes` checks that the bytes start with the header that era writes for that stage.
- `seal` accepts a transaction object of any ledger copy. It serializes it and calls `fromBytes`.
- `deserialize({ v9: Transaction })` decodes with **your** `Transaction` class.

Also added: `TransactionStage`, `TransactionDecoder`, `TransactionDecodersFor`,
`DecodedTransaction`, `LedgerTransactionTypes`, `TransactionMethod`, `ReadMethod`,
`StateReadMethod`, `ProviderMethod`, `TransactionHandleMethod`.

### Added: provider factories

| Export | Signature |
|---|---|
| `createLedger9ProofProvider` | `(provingProvider: ProvingProvider, costModel?: CostModel) => ProofProvider` |
| `createLedger9WalletProvider` | `(impl: Ledger9WalletProvider) => WalletProvider` |
| `createLedger9MidnightProvider` | `(submitTx: (tx: LedgerTransaction<'Finalized', 'v9'>) => Promise<TransactionId>) => MidnightProvider` |
| `createProofProviderFromHandlers` | `(handlers: ProofProviderHandlers) => ProofProvider` |
| `createWalletProviderFromHandlers` | `(handlers: WalletProviderHandlers) => WalletProvider` |
| `createMidnightProviderFromHandlers` | `(handlers: MidnightProviderHandlers) => MidnightProvider` |
| `createProofProviderFromProvingProviders` | `(provingProviders: ProvingProvidersByEra) => ProofProvider` |
| `assertProvidersSupportEra` | `(era: LedgerEra, providers: TransactionProviders) => void` |

The `createLedger9*` adapters declare `supportedEras: ['v9']`. The `*FromHandlers` factories take
one handler per era and derive `supportedEras` from the handlers you pass:

```ts
export type ProofProviderHandlers = {
  readonly [E in LedgerEra]:
    | ((tx: LedgerTransaction<'Unproven', E>, config?: ProveTxConfig) => Promise<TransactionAnswer>)
    | undefined;
};
export type WalletProviderHandlers = {
  readonly [E in LedgerEra]:
    | ((tx: LedgerTransaction<'Unbound', E>, ttl?: Date) => Promise<TransactionAnswer>)
    | undefined;
} & {
  readonly getCoinPublicKey: () => CoinPublicKey;
  readonly getEncryptionPublicKey: () => EncPublicKey;
};
export type MidnightProviderHandlers = {
  readonly [E in LedgerEra]: ((tx: LedgerTransaction<'Finalized', E>) => Promise<TransactionId>) | undefined;
};
export interface ProvingProvidersByEra {
  readonly v8: Ledger8ProvingProvider | undefined;
  readonly v9: ProvingProvider | undefined;
  readonly costModel?: CostModel;
}
export interface Ledger9WalletProvider {
  balanceTx(tx: LedgerTransaction<'Unbound', 'v9'>, ttl?: Date): Promise<TransactionAnswer>;
  getCoinPublicKey(): CoinPublicKey;
  getEncryptionPublicKey(): EncPublicKey;
}
```

Also added: `EraDeclaringProvider`, `TransactionProviders`.

### Changed: `PublicDataProvider`

New required members:

```ts
queryBlock(config?: BlockHeightConfig | BlockHashConfig): Promise<BlockInfo | null>;
queryLatestProtocolVersion(): Promise<number>;
queryContractEvents(filter: ContractEventQueryFilter, page?: ContractEventsPage): Promise<ContractEvent[]>;
contractEventsObservable(
  filter: ContractEventSubscriptionFilter,
  opts?: { startAt?: ContractEventCursor }
): Observable<ContractEvent>;
```

`queryLatestProtocolVersion()` reports the protocol version of the network's latest block. An
implementation must not cache it forever, because it changes at the hard fork.

Changed members (state is now returned as bytes; see the next section):

| Member | v4.1.1 | v5.0.0 |
|---|---|---|
| `queryContractState` | `(contractAddress, config?) => Promise<ContractState \| null>` | `(contractAddress, config?) => Promise<ContractStateAndParametersRead \| null>` |
| `queryZSwapAndContractState` | `(contractAddress, config?) => Promise<[ZswapChainState, ContractState, LedgerParameters] \| null>` | `(contractAddress, config?) => Promise<PublicStatesRead \| null>` (an object, not a tuple) |
| `queryDeployContractState` | `(contractAddress) => Promise<ContractState \| null>` | `(contractAddress) => Promise<ContractStateRead \| null>` |
| `watchForContractState` | `(contractAddress) => Promise<ContractState>` | `(contractAddress, options?: WatchOptions) => Promise<ContractStateRead>` |
| `watchForUnshieldedBalances` | `(contractAddress) => Promise<UnshieldedBalances>` | `(contractAddress, options?: WatchOptions) => Promise<UnshieldedBalances>` |
| `watchForDeployTxData` | `(contractAddress) => Promise<FinalizedTxData>` | `(contractAddress, options?: WatchOptions) => Promise<FinalizedTxRead>` |
| `watchForTxData` | `(txId) => Promise<FinalizedTxData>` | `(txId, options?: WatchOptions) => Promise<FinalizedTxRead>` |
| `contractStateObservable` | `(address, config) => Observable<ContractState>` | `(address, config) => Observable<PositionedRecord<ContractStateRead>>` |
| `unshieldedBalancesObservable` | `(address, config) => Observable<UnshieldedBalances>` | `(address, config) => Observable<PositionedRecord<UnshieldedBalances>>` |

`queryUnshieldedBalances` is unchanged.

New types:

```ts
export type BlockInfo = {
  readonly hash: string;
  readonly height: number;
  readonly protocolVersion: number; // the era of THIS block, not of the latest block
};
export type PositionedRecord<T> = {
  readonly value: T;
  readonly blockHeight: number;
  readonly blockHash: BlockHash;
};
export interface WatchOptions {
  readonly maxWaitMs?: number;
}
```

`BlockHashConfig.blockHash` is now typed `BlockHash`, an alias of `string`. Callers do not change.

### Added: contract event types

```ts
export type ContractEventType =
  | 'ShieldedSpend' | 'ShieldedReceive' | 'ShieldedMint' | 'ShieldedBurn'
  | 'UnshieldedSpend' | 'UnshieldedReceive' | 'UnshieldedMint' | 'UnshieldedBurn'
  | 'Paused' | 'Unpaused' | 'Misc';

export interface ContractEventAddress {
  readonly kind: 'user' | 'contract';
  readonly value: string;
}

export interface ContractEventBase {
  readonly id: number;              // indexer cursor; resume after it with { fromId: id + 1 }
  readonly maxId: number;           // highest event id the indexer knows
  readonly payloadVersion: number;  // payload schema version, not a ledger era
  readonly protocolVersion: number; // protocol version of the block that carried the event
  readonly contractAddress: ContractAddress;
  readonly transactionId: number;   // indexer row id, not the transaction hash
  readonly raw: string;             // the raw log item, hex
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

export interface ContractEventFieldPrefix { readonly fieldName: string; readonly prefix: string }
export interface ContractEventFilterBase {
  readonly contractAddress: ContractAddress;
  readonly types?: ContractEventType[];
  readonly fieldPrefixes?: ContractEventFieldPrefix[];
  readonly transactionHash?: string;
}
export interface ContractEventQueryFilter extends ContractEventFilterBase {
  readonly fromBlock?: number; // inclusive
  readonly toBlock?: number;   // inclusive
}
export interface ContractEventSubscriptionFilter extends ContractEventFilterBase {
  readonly toBlock?: number;   // the stream ends after this block
}
export type ContractEventCursor = { readonly fromId: number } | { readonly fromBlock: number };
export interface ContractEventsPage { readonly limit?: number; readonly offset?: number }
```

### Added: on-chain state as bytes

Every on-chain state is now one of three classes. Each holds the bytes and the era that wrote them.
You make one only with its own `fromBytes(era, bytes)`. You decode it with your own runtime.

```ts
// packages/types/src/serialized-state.ts
export class SerializedContractState<out E extends LedgerEra = LedgerEra> {
  readonly era: E;
  static fromBytes<E extends LedgerEra>(era: E, bytes: Uint8Array): SerializedContractState<E>;
  static isSerializedContractState(value: unknown): value is SerializedContractState;
  serialize(): Uint8Array;
  deserialize<D extends StateDecoders>(decoders: DecodersFor<D, E>): DecodedState<D, E>;
}
// SerializedLedgerParameters and SerializedZswapChainState have the same shape, with
// isSerializedLedgerParameters and isSerializedZswapChainState.

export interface StateDecoder<T = unknown> { deserialize(bytes: Uint8Array): T }
export type StateDecoders = Readonly<Partial<Record<LedgerEra, StateDecoder>>>;

// packages/types/src/contract-state-read.ts
export interface ContractStateRead {
  readonly protocolVersion: number;
  readonly contractState: SerializedContractState;
}
export interface ContractStateAndParametersRead extends ContractStateRead {
  readonly ledgerParameters: SerializedLedgerParameters;
}
export interface PublicStatesRead extends ContractStateAndParametersRead {
  readonly zswapChainState: SerializedZswapChainState;
}
```

Also added: `StateKind`, `DecodersFor`, `DecodedState`.

### Changed: finalized transaction records carry an era

| v4.1.1 | v5.0.0 |
|---|---|
| `interface FinalizedTxData { …; readonly tx: Transaction<SignatureEnabled, Proof, Binding> }` | `interface Ledger9FinalizedTxData extends FinalizedTxRecord { readonly era: 'v9'; readonly tx: LedgerTransaction<'Finalized', 'v9'> }` |
| — | `interface Ledger8FinalizedTxData extends FinalizedTxRecord { readonly era: 'v8'; readonly tx: LedgerTransaction<'Finalized', 'v8'> }` |
| — | `type FinalizedTxRead = Ledger8FinalizedTxData \| Ledger9FinalizedTxData` |

`FinalizedTxRecord` holds the fields that do not depend on the era: `status`, `txId`,
`identifiers`, `txHash`, `blockHash`, `blockHeight`, `blockTimestamp`, `blockAuthor`, `indexerId`,
`protocolVersion`, `fees`, `segmentStatusMap`, `unshielded`.

Also added, as shared bases of both eras' results: `CallResultPublicBase`, `CallResultPrivateBase`,
`ContractCallPrivateBase`, `SubmittedCallTxBase`, `UnsubmittedTxDataBase`.

### Changed: `PrivateStateProvider` uses a per-contract view

| v4.1.1 member | v5.0.0 |
|---|---|
| `setContractAddress(address)` | removed. Call `forContract(address)` |
| `get`, `set`, `remove`, `clear`, `exportPrivateStates`, `importPrivateStates` | moved to `ContractPrivateStates`, returned by `forContract` |
| — | `forContract(contractAddress: ContractAddress): ContractPrivateStates<PSI, PS>` |
| — | `clearAll(): Promise<void>` (every contract of the account) |
| signing-key methods | unchanged |

```ts
export interface ContractPrivateStates<PSI extends PrivateStateId = PrivateStateId, PS = any> {
  readonly contractAddress: ContractAddress;
  set(privateStateId: PSI, state: PS): Promise<void>;
  get(privateStateId: PSI): Promise<PS | null>;
  remove(privateStateId: PSI): Promise<void>;
  clear(): Promise<void>;
  exportPrivateStates(options?: ExportPrivateStatesOptions): Promise<PrivateStateExport>;
  importPrivateStates(exportData: PrivateStateExport, options?: ImportPrivateStatesOptions): Promise<ImportPrivateStatesResult>;
}
```

### Changed: `ZKConfigProvider.getArtifactRuntimeVersion()`

New method on the abstract class: `getArtifactRuntimeVersion(): Promise<string>`. Every contract
operation calls it to find the contract's era. The base class throws
`ArtifactRuntimeVersionUnavailableError`. A custom provider must override it. Both shipped ZK
config providers implement it.

### Changed: `SigningKey`

| v4.1.1 | v5.0.0 |
|---|---|
| `string` (hex) | `{ tag: 'schnorr' \| 'ecdsa'; value: string }` (from compact-runtime 0.20) |

This package does not export `SigningKey`. Import it from
`@midnight-ntwrk/midnight-js-protocol/v9/compact-runtime`.

### Added: cross-contract call artifacts

```ts
export class ZKConfigRegistry {
  constructor(sources: Iterable<ZKConfigProvider<string>>);
  get(location: ContractKeyLocation): Promise<ZKConfig<string>>;
  resolveKeyLocation(keyLocation: string): Promise<ZKConfig<string> | undefined>;
  asKeyMaterialProvider(): KeyMaterialProvider;
}
export class ZKArtifactNotFoundError extends MidnightJsError { /* … */ }
// Re-exported from @midnight-ntwrk/midnight-js-protocol/v9/compact-js:
export { type ContractKeyLocation, encodeContractKeyLocation, hashVerifierKey, parseContractKeyLocation };
```

### Renamed and removed

| v4.1.1 | v5.0.0 |
|---|---|
| `Transaction` (re-export of the ledger class) | removed. Import `Transaction` from `@midnight-ntwrk/midnight-js-protocol/v9` |
| `FinalizedTxData` | `Ledger9FinalizedTxData`; the union of both eras is `FinalizedTxRead` |
| `UnboundTransaction` | `Ledger9UnboundTransaction` (`Transaction<SignatureEnabled, Proof, PreBinding>`) |
| `createProofProvider(provingProvider, costModel?)` | `createLedger9ProofProvider(provingProvider, costModel?)` |
| `makeContractExecutableRuntime` | `makeLedger9ContractExecutableRuntime` |
| `ContractExecutableRuntimeOptions` | `Ledger9ContractExecutableRuntimeOptions` (`signingKey` is the new `SigningKey`) |

### Added: error classes

All are `MidnightJsError` subclasses with a `code` and a `category`. All are also exported from
`@midnight-ntwrk/midnight-js-types/errors`.

| Class | When |
|---|---|
| `ProviderEraUnsupportedError` | the provider set cannot carry a transaction of this era. Raised before proving |
| `UnusableEraEntryError` | a `*FromHandlers` factory got a handler that is not a function |
| `InvalidTransactionHandleError` | a value is not a handle, is at another stage, or has the wrong header |
| `TransactionEraMismatchError` | a handle has another era than expected |
| `TransactionDecoderMissingError`, `TransactionDecodeFailedError` | `handle.deserialize(...)` has no decoder for the era, or the decoder threw |
| `InvalidSerializedStateError`, `SerializedStateDecoderMissingError`, `SerializedStateDecodeFailedError` | the same, for `Serialized*` states |
| `WatchTimeoutError` | a `watchFor*` call passed `maxWaitMs`. Fields: `operation`, `target`, `maxWaitMs`. Code `MIDNIGHT_JS_PR_WATCH_TIMED_OUT` |
| `PrivateStateSerializationError` | private state that does not survive a round trip. Fields: `path`, `reason`, `privateStateId?`. Code `MIDNIGHT_JS_PR_PRIVATE_STATE_NOT_SERIALIZABLE` |
| `PrivateStateDecryptionError`, `PrivateStateStorageError`, `PrivateStateLimitExceededError` | private-state storage failures (decryption, storage, size limit) |
| `ProofServerError` | the proof server answered with an error |
| `ZkArtifactFetchError` | fetching a ZK artifact failed |
| `ArtifactRuntimeVersionUnavailableError` | a `ZKConfigProvider` does not declare its runtime version |

Also added: `PROVIDER_ERROR_CODES`, `PROVIDER_ERROR_CATEGORIES`, `ProviderErrorCode`,
`InvalidTransactionHandleReason`, `InvalidSerializedStateReason`, `PrivateStateDecryptionReason`,
`PrivateStateSerializationFailure`, `WatchOperation`, `EraEntryShape`, `PRIVATE_STATE_ROOT_PATH`.

### Changed: existing error classes

`InvalidProtocolSchemeError`, `PrivateStateExportError`, `SigningKeyExportError` and
`PrivateStateImportError` now extend `MidnightJsError` (was `Error`). So do
`ExportDecryptionError`, `InvalidExportFormatError` and `ImportConflictError`, through
`PrivateStateImportError`. Each now has a `code` and a `category`.

---

## `@midnight-ntwrk/midnight-js-contracts`

### Changed: entry points accept contracts of both eras

`deployContract`, `findDeployedContract`, `submitCallTx`, `submitCallTxAsync`,
`createCircuitCallTxInterface`, `createCallTxOptions`, `submitInsertVerifierKeyTx`,
`submitRemoveVerifierKeyTx`, `submitReplaceAuthorityTx` and the maintenance interfaces each gained
a **ledger 8 overload** first. A ledger 8 contract is the generated contract instance
(`new Contract(witnesses)`), typed `Ledger8Contract`. A ledger 9 contract is a `CompiledContract`
container, as in 4.x.

```ts
// deployContract, v5.0.0 (packages/contracts/src/deploy-contract.ts)
export async function deployContract<C extends Ledger8Contract>(
  providers: Ledger8ContractProviders<C, Ledger8CircuitId<C>>,
  options: Ledger8DeployContractOptions<C>
): Promise<Ledger8DeployedContract<C>>;
export async function deployContract<C extends Contract<undefined>>(
  providers: Ledger9ContractProviders<C, Contract.ProvableCircuitId<C>, unknown>,
  options: Ledger9DeployContractOptionsBase<C>
): Promise<Ledger9DeployedContract<C>>;
export async function deployContract<C extends Contract.Any>(
  providers: Ledger9ContractProviders<C>,
  options: Ledger9DeployContractOptionsWithPrivateState<C>
): Promise<Ledger9DeployedContract<C>>;
```

```ts
// createCallTxOptions, v5.0.0: the ledger 8 overload is new
export function createCallTxOptions<C extends Ledger8Contract, PCK extends Ledger8CircuitId<C>>(
  compiledContract: C,
  circuitId: PCK,
  contractAddress: ContractAddress,
  privateStateId: PrivateStateId | undefined,
  additionalCoinEncPublicKeyMappings: ReadonlyMap<CoinPublicKey, EncPublicKey> | undefined,
  args: Ledger8CircuitParameters<C, PCK>
): Ledger8CallTxOptions<C, PCK>;
export function createCallTxOptions<C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>>(
  compiledContract: CompiledContract.CompiledContract<C, any>,
  circuitId: PCK,
  contractAddress: ContractAddress,
  privateStateId: PrivateStateId | undefined,
  additionalCoinEncPublicKeyMappings: ReadonlyMap<CoinPublicKey, EncPublicKey> | undefined,
  args: Contract.CircuitParameters<C, PCK>
): Ledger9CallTxOptions<C, PCK>;
```

Every result has an `era` field (`'v8' | 'v9'`). Narrow with `isLedger8Result`:

```ts
export const isLedger8Result: <T extends { readonly era: LedgerEra }>(result: T) => result is NarrowedToLedger8<T>;
```

### Changed: kept names now pick the era from the contract type

These names exist in both versions. In v5.0.0 each is a conditional type: it becomes the
`Ledger8*` or the `Ledger9*` type, depending on the contract type `C`:

`FoundContract`, `DeployedContract`, `FinalizedCallTxData`, `SubmittedCallTx`,
`UnsubmittedCallTxData`, `FinalizedDeployTxData`, `CallResultPrivate`,
`CallTxOptions`, `CallTxOptionsBase`, `CallTxOptionsWithPrivateStateId`, `DeployContractOptions`,
`DeployContractOptionsBase`, `DeployContractOptionsWithPrivateState`,
`FindDeployedContractOptions`, `CircuitCallTxInterface`, `CircuitMaintenanceTxInterfaces`,
`ContractProviders`, `SubmitTxProviders`.

```ts
// v4.1.1
type ContractProviders<C extends Contract.Any = Contract.Any, PCK extends Contract.ProvableCircuitId<C> = Contract.ProvableCircuitId<C>, PS = Contract.PrivateState<C>> = …;
// v5.0.0 (packages/contracts/src/era-aliases.ts): C is required, PS is gone
type ContractProviders<C extends AnyContract, PCK extends CircuitIdOf<C> = CircuitIdOf<C>> =
  C extends Ledger8Contract ? Ledger8ContractProviders<C, PCK & Ledger8CircuitId<C>>
  : C extends Ledger9Contract ? Ledger9ContractProviders<C, PCK & Contract.ProvableCircuitId<C>>
  : never;
```

To pass a private state type, use `Ledger9ContractProviders<C, PCK, PS>`.

New helper types: `AnyContract` (`Ledger8Contract | Ledger9Contract`), `Ledger9Contract`
(`Contract.Any`), `CircuitIdOf<C>`, `Ledger9CircuitId<C>`, `AnyFinalizedCallTxData`,
`AnySubmittedCallTx`, `FinalizedMaintenanceTxData`. `FoundDeployTxData<C>` is new too; it picks
the era from `C` like the kept names above.

### Renamed: ledger-9-only types get the `Ledger9` prefix

| v4.1.1 | v5.0.0 |
|---|---|
| `CallOptions` | `Ledger9CallOptions` |
| `CallOptionsBase` | `Ledger9CallOptionsBase` |
| `CallOptionsProviderDataDependencies` | `Ledger9CallOptionsProviderDataDependencies` (adds required `config: MidnightConfig`; states are `Serialized*`) |
| `CallOptionsWithArguments` | `Ledger9CallOptionsWithArguments` |
| `CallOptionsWithPrivateState` | `Ledger9CallOptionsWithPrivateState` |
| `CallOptionsWithProviderDataDependencies` | `Ledger9CallOptionsWithProviderDataDependencies` |
| `CallResult` | `Ledger9CallResult` |
| `CallResultPublic` | `Ledger9CallResultPublic` (adds `nextContractStateEncoded` and `logEvents`) |
| `CircuitMaintenanceTxInterface` | `Ledger9CircuitMaintenanceTxInterface` |
| `ContractConstructorOptions` | `Ledger9ContractConstructorOptions` |
| `ContractConstructorOptionsBase` | `Ledger9ContractConstructorOptionsBase` |
| `ContractConstructorOptionsWithArguments` | `Ledger9ContractConstructorOptionsWithArguments` |
| `ContractConstructorOptionsWithPrivateState` | `Ledger9ContractConstructorOptionsWithPrivateState` |
| `ContractConstructorOptionsWithProviderDataDependencies` | `Ledger9ContractConstructorOptionsWithProviderDataDependencies` |
| `ContractConstructorResult` | `Ledger9ContractConstructorResult` |
| `ContractMaintenanceTxInterface` | `Ledger9ContractMaintenanceTxInterface` |
| `DeployTxOptions` | `Ledger9DeployTxOptions` |
| `DeployTxOptionsBase` | `Ledger9DeployTxOptionsBase` |
| `DeployTxOptionsWithPrivateState` | `Ledger9DeployTxOptionsWithPrivateState` |
| `DeployTxOptionsWithPrivateStateId` | `Ledger9DeployTxOptionsWithPrivateStateId` |
| `FinalizedDeployTxDataBase` | `Ledger9FinalizedDeployTxDataBase` |
| `FindDeployedContractOptionsBase` | `Ledger9FindDeployedContractOptionsBase` |
| `FindDeployedContractOptionsExistingPrivateState` | `Ledger9FindDeployedContractOptionsExistingPrivateState` |
| `FindDeployedContractOptionsStorePrivateState` | `Ledger9FindDeployedContractOptionsStorePrivateState` |
| `TransactionContext` | `Ledger9TransactionContext` |
| `UnprovenCallTxProvidersWithPrivateState` | `Ledger9UnprovenCallTxProvidersWithPrivateState` |
| `UnprovenDeployTxOptions` | `Ledger9UnprovenDeployTxOptions` |
| `UnprovenDeployTxProviders` | `Ledger9UnprovenDeployTxProviders` (includes `config`) |
| `UnsubmittedDeployTxData` | `Ledger9UnsubmittedDeployTxData` |
| `UnsubmittedDeployTxDataBase` | `Ledger9UnsubmittedDeployTxDataBase` |
| `UnsubmittedDeployTxPrivateData` | `Ledger9UnsubmittedDeployTxPrivateData` |
| `UnsubmittedDeployTxPublicData` | `Ledger9UnsubmittedDeployTxPublicData` |
| `UnsubmittedTxData` | `Ledger9UnsubmittedTxData` |
| `PublicContractStates` | `PublicStatesRead` (now in `@midnight-ntwrk/midnight-js-types`) |

New `Ledger9*` names with no 4.1.1 counterpart are listed under "Added" below.

### Changed: low-level functions route on the era

The six low-level functions keep their 4.1.1 names and route on the contract's era. Each has a
named twin per era:

| Kept name (routes) | Ledger 9 twin | Ledger 8 twin |
|---|---|---|
| `createUnprovenCallTx` | `createLedger9UnprovenCallTx` | `createLedger8UnprovenCallTx` |
| `createUnprovenCallTxFromInitialStates` | `createLedger9UnprovenCallTxFromInitialStates` | `createLedger8UnprovenCallTxFromInitialStates` |
| `createUnprovenDeployTx` | `createLedger9UnprovenDeployTx` | `createLedger8UnprovenDeployTx` |
| `createUnprovenDeployTxFromVerifierKeys` | `createLedger9UnprovenDeployTxFromVerifierKeys` | `createLedger8UnprovenDeployTxFromVerifierKeys` |
| `submitDeployTx` | `submitLedger9DeployTx` | `submitLedger8DeployTx` |
| `withContractScopedTransaction` | `withLedger9ContractScopedTransaction` | — |

`createUnprovenDeployTxFromVerifierKeys` takes `config` as a new last argument:

```ts
// v4.1.1
createUnprovenDeployTxFromVerifierKeys(zkConfigProvider, coinPublicKey, options, encryptionPublicKey): Promise<UnsubmittedDeployTxData<C>>;
// v5.0.0 (ledger 9 twin shown)
export async function createLedger9UnprovenDeployTxFromVerifierKeys<C extends Contract.Any>(
  zkConfigProvider: ZKConfigProvider<string>,
  coinPublicKey: CoinPublicKey,
  options: Ledger9UnprovenDeployTxOptions<C>,
  encryptionPublicKey: EncPublicKey,
  config: MidnightConfig
): Promise<Ledger9UnsubmittedDeployTxData<C>>;
```

`createUnprovenCallTxFromInitialStates` reads `options.config` (a required member of
`Ledger9CallOptionsProviderDataDependencies`). Its ledger 9 overloads, and
`createLedger9UnprovenCallTxFromInitialStates`, take an optional fourth argument
`crossContract?: Ledger9CrossContractConfig` for cross-contract calls. The ledger 8 version takes states as bytes:

```ts
export function createLedger8UnprovenCallTxFromInitialStates<C extends Ledger8Contract, PCK extends Ledger8CircuitId<C>>(
  zkConfigProvider: ZKConfigProvider<string>,
  options: Ledger8CallOptionsWithInitialStates<C, PCK>,
  walletEncryptionPublicKey: EncPublicKey
): Promise<Ledger8UnsubmittedCallTxData<C, PCK>>;

export type Ledger8CallOptionsWithInitialStates<C extends Ledger8Contract, PCK extends Ledger8CircuitId<C>> =
  Ledger8CallTxOptionsBase<C, PCK> & {
    readonly head: LedgerEra;
    readonly initialContractState: SerializedContractState;
    readonly ledgerParameters: SerializedLedgerParameters;
    readonly coinPublicKey: CoinPublicKey;
    readonly config: MidnightConfig;
    readonly initialPrivateState?: Ledger8PrivateState<C>;
  };
```

`withContractScopedTransaction` now refuses to run while the network is still on ledger 8
(`EraMismatchError`, reason `'scope-on-ledger8-network'`).

### Changed: `submitTx`, `submitTxAsync`

```ts
// v4.1.1
submitTx<C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>>(
  providers: SubmitTxProviders<C, PCK>, options: SubmitTxOptions<PCK>
): Promise<FinalizedTxData>;
// v5.0.0: one type parameter
export async function submitTx<PCK extends AnyProvableCircuitId>(
  providers: Omit<MidnightProviders<PCK>, 'privateStateProvider'>,
  options: SubmitTxOptions<PCK>
): Promise<FinalizedTxRead>;
export async function submitTxAsync<PCK extends AnyProvableCircuitId>(
  providers: Omit<MidnightProviders<PCK>, 'privateStateProvider'>,
  options: SubmitTxOptions<PCK>
): Promise<string>;
```

`SubmitTxOptions.unprovenTx` is now `UnprovenTx` (a handle). Make one with
`LedgerTransaction.seal('v9', 'Unproven', tx)`. Every function that submits reads
`providers.config` and passes its TTL to `walletProvider.balanceTx(tx, ttl)`.

### Changed: state values are `Serialized*`

| Export | v4.1.1 | v5.0.0 |
|---|---|---|
| `getPublicStates` | `(publicDataProvider, contractAddress) => Promise<PublicContractStates>` | `(publicDataProvider, contractAddress, blockHash?: string) => Promise<PublicStatesRead>` |
| `getStates` | returns `ContractStates<PS>` with decoded states | `(publicDataProvider, privateStateProvider, contractAddress, privateStateId, blockHash?) => Promise<ContractStates<PS>>`, where `ContractStates<PS> = PublicStatesRead & { readonly privateState: PS }` |
| `verifyContractState` | `(verifierKeys, contractState: ContractState) => void` | `(verifierKeys, contractState: SerializedContractState, contractAddress?) => Promise<void>` (now async) |
| deploy result `public.initialContractState` | `ContractState` | `SerializedContractState<'v9'>` (`Ledger9UnsubmittedDeployTxPublicData`) |
| `Ledger9CallOptionsProviderDataDependencies` states | `ContractState`, `ZswapChainState`, `LedgerParameters` | `SerializedContractState`, `SerializedZswapChainState`, `SerializedLedgerParameters` |
| `ContractTypeError.contractState` | `ContractState` | `SerializedContractState` |
| `Ledger9TransactionContext.getCurrentStates()` | — | `PublicStatesRead \| undefined` |

`Ledger9ContractConstructorResult.nextContractState` stays a decoded object.

### Changed: transaction data in results

| Field | v4.1.1 | v5.0.0 |
|---|---|---|
| `private.unprovenTx` of a ledger 9 deploy or call | `UnprovenTransaction` | `LedgerTransaction<'Unproven', 'v9'>` |
| `private.unprovenTx` of a ledger 8 call | — | `UnprovenTx`: `'v8'` before the fork, `'v9'` after (read `.era`) |
| `public` of a finalized ledger 9 result | extends `FinalizedTxData` | extends `Ledger9FinalizedTxData` |

### Changed: `findDeployedContract` deploy record

```ts
// v4.1.1: FoundContract.deployTxData was FinalizedDeployTxDataBase<C>
// v5.0.0, ledger 9 contract (packages/contracts/src/tx-model.ts)
export interface Ledger9FoundDeployTxData<C extends Contract.Any> {
  readonly era: 'v9';
  readonly public: FoundDeployTxPublicData;
  readonly private: Ledger9UnsubmittedDeployTxPrivateData<C>;
}
export type FoundDeployTxPublicData = Ledger8FoundDeployTxPublicData | Ledger9FinalizedDeployTxPublicData;
export interface Ledger8FoundDeployTxPublicData extends Ledger8FinalizedTxData {
  readonly contractAddress: ContractAddress;
  readonly initialContractState: SerializedContractState;
}
```

A contract deployed before the fork has a `public` record with `era: 'v8'`. Both variants have
`contractAddress` and `initialContractState`. Narrow on `public.era` before you read `tx`.

### Changed: maintenance functions resolve `{ era, public }`

```ts
// v4.1.1
submitRemoveVerifierKeyTx<C>(providers: ContractProviders, compiledContract, contractAddress, circuitId): Promise<FinalizedTxData>;
// v5.0.0
export async function submitRemoveVerifierKeyTx<C extends Ledger8Contract>(
  providers: Ledger8ContractProviders<C, Ledger8CircuitId<C>>,
  compiledContract: C,
  contractAddress: ContractAddress,
  circuitId: Ledger8CircuitId<C>
): Promise<Ledger8FinalizedMaintenanceTxData>;
export async function submitRemoveVerifierKeyTx<C extends Contract.Any>(
  providers: Ledger9ContractProviders,
  compiledContract: CompiledContract.CompiledContract<C, any>,
  contractAddress: ContractAddress,
  circuitId: Contract.ProvableCircuitId<C>
): Promise<Ledger9FinalizedMaintenanceTxData>;

export interface Ledger9FinalizedMaintenanceTxData { readonly era: 'v9'; readonly public: Ledger9FinalizedTxData }
export interface Ledger8FinalizedMaintenanceTxData { readonly era: 'v8'; readonly public: Ledger8FinalizedTxData }
export type FinalizedMaintenanceTxData = Ledger9FinalizedMaintenanceTxData | Ledger8FinalizedMaintenanceTxData;
```

`submitInsertVerifierKeyTx` and `submitReplaceAuthorityTx` change the same way. Read
`result.public.status` instead of `result.status`.

### Changed: deploy options refuse half a private-state pair

`Ledger9DeployContractOptionsBase` declares `privateStateId?: never` and
`initialPrivateState?: never`. Passing only one of the two no longer compiles. At run time it
throws `IncompleteDeployContractPrivateStateConfig`.

### Added: call result log events and encoded state

```ts
interface Ledger9CallResultPublic {
  // …existing fields
  readonly nextContractStateEncoded: EncodedStateValue;
  readonly logEvents: readonly Ledger9LogEvent[];
}
export { ContractLog as Ledger9ContractLog } from '@midnight-ntwrk/midnight-js-protocol/v9/compact-js';
export type { LogEvent as Ledger9LogEvent } from '@midnight-ntwrk/midnight-js-protocol/v9/compact-runtime';
```

`Ledger8CallResultPublic` has `nextContractStateEncoded: EncodedStateValue` too, but no
`logEvents`. `nextContractStateEncoded` is a plain encoded value, safe to store, clone or post to
a worker.

### Added: ledger 8 types

`Ledger8Contract`, `Ledger8ContractProviders`, `Ledger8CircuitId`, `Ledger8CircuitParameters`,
`Ledger8CircuitReturnType`, `Ledger8ConstructorParameters`, `Ledger8PrivateState`,
`Ledger8Witness`, `Ledger8Circuit`, `Ledger8CircuitContext`, `Ledger8CircuitResult`,
`Ledger8InitialStateResult`, `Ledger8CallTxTarget`, `Ledger8CallTxOptions`,
`Ledger8CallTxOptionsBase`, `Ledger8CallTxOptionsWithPrivateStateId`,
`Ledger8CallOptionsWithInitialStates`, `Ledger8CallResultPublic`, `Ledger8CallResultPrivate`,
`Ledger8ContractCall`, `Ledger8ContractCallPublic`, `Ledger8FinalizedCallTxData`,
`Ledger8FinalizedCallTxPublicData`, `Ledger8SubmittedCallTx`, `Ledger8UnsubmittedCallTxData`,
`Ledger8CircuitCallTxInterface`, `Ledger8DeployContractOptions`,
`Ledger8DeployContractOptionsBase`, `Ledger8DeployContractOptionsWithPrivateState`,
`Ledger8UnprovenDeployTxOptions`, `Ledger8UnprovenDeployTxOptionsBase`,
`Ledger8UnsubmittedDeployTxData`, `Ledger8FinalizedDeployTxData`, `Ledger8FoundDeployTxData`,
`Ledger8FoundDeployTxPublicData`, `Ledger8FindDeployedContractOptions`, `Ledger8FoundContract`,
`Ledger8DeployedContract`, `Ledger8FinalizedMaintenanceTxData`,
`Ledger8CircuitMaintenanceTxInterface`, `Ledger8CircuitMaintenanceTxInterfaces`,
`Ledger8ContractMaintenanceTxInterface`.

Two shapes worth knowing:

```ts
export interface Ledger8CallTxTarget<C extends Ledger8Contract, PCK extends Ledger8CircuitId<C>> {
  readonly compiledContract: C;
  readonly contractAddress: ContractAddress;
  readonly circuitId: PCK;
  readonly additionalCoinEncPublicKeyMappings?: ReadonlyMap<CoinPublicKey, EncPublicKey>;
}
export interface Ledger8FinalizedDeployTxData<C extends Ledger8Contract> extends Ledger8FoundDeployTxData<C> {
  readonly public: Omit<Ledger8FoundDeployTxPublicData, 'initialContractState'> & {
    readonly initialContractState: SerializedContractState<'v8'>;
  };
  readonly private: {
    readonly signingKey: SigningKey;
    readonly initialPrivateState: Ledger8PrivateState<C>;
    readonly initialZswapState: ZswapLocalState;
  };
}
```

### Added: other ledger 9 names

`Ledger9CallResultPrivate`, `Ledger9CallTxOptions`, `Ledger9CallTxOptionsBase`,
`Ledger9CallTxOptionsWithPrivateStateId`, `Ledger9CircuitCallTxInterface`,
`Ledger9CircuitMaintenanceTxInterfaces`, `Ledger9ContractProviders`, `Ledger9CrossContractConfig`,
`Ledger9DeployContractOptions`, `Ledger9DeployContractOptionsBase`,
`Ledger9DeployContractOptionsShared`, `Ledger9DeployContractOptionsWithPrivateState`,
`Ledger9DeployedContract`, `Ledger9FinalizedCallTxData`, `Ledger9FinalizedCallTxPublicData`,
`Ledger9FinalizedDeployTxData`, `Ledger9FinalizedDeployTxPublicData`,
`Ledger9FindDeployedContractOptions`, `Ledger9FoundContract`, `Ledger9FoundDeployTxData`,
`Ledger9SubmitCallTxProviders`, `Ledger9SubmitTxProviders`, `Ledger9SubmittedCallTx`,
`Ledger9UnsubmittedCallTxData`, `Ledger9UnsubmittedCallTxPrivateData`,
`Ledger9UnsubmittedDeployTxPrivateDataFull`, `isLedger9TransactionContext`.

### Changed: error classes

All contracts errors now extend `MidnightJsError` (from `@midnight-ntwrk/midnight-js-protocol`) and
carry a `code` and a `category`.

**One class for a failed transaction.** The five 4.1.1 classes are removed:

| v4.1.1 | v5.0.0 |
|---|---|
| `DeployTxFailedError` | `TxFailedError`, `operation: 'deploy'` |
| `CallTxFailedError` | `TxFailedError`, `operation: 'call'` |
| `InsertVerifierKeyTxFailedError` | `TxFailedError`, `operation: 'insert-verifier-key'` |
| `RemoveVerifierKeyTxFailedError` | `TxFailedError`, `operation: 'remove-verifier-key'` |
| `ReplaceMaintenanceAuthorityTxFailedError` | `TxFailedError`, `operation: 'replace-authority'` |
| `TxFailedError.finalizedTxData` | `TxFailedError.record: FinalizedTxRead` |

```ts
export type TxFailedOperation = 'call' | 'deploy' | 'insert-verifier-key' | 'remove-verifier-key' | 'replace-authority';
export class TxFailedError extends MidnightJsError {
  constructor(operation: 'deploy' | 'replace-authority', record: FinalizedTxRead,
    details: { readonly contractAddress: ContractAddress; readonly signingKey: SigningKey });
  constructor(operation: 'insert-verifier-key' | 'remove-verifier-key', record: FinalizedTxRead,
    details: { readonly contractAddress: ContractAddress; readonly circuitId: string });
  constructor(operation: 'call', record: FinalizedTxRead,
    details: { readonly circuitId: string | readonly string[]; readonly contractAddress?: ContractAddress });
  readonly operation: TxFailedOperation;
  readonly record: FinalizedTxRead;
  readonly contractAddress?: ContractAddress;
  readonly circuitId?: string | readonly string[];
  readonly signingKey?: SigningKey; // not enumerable, never in the message
}
```

Code: `MIDNIGHT_JS_C_TX_FAILED`. Also added: `TxFailedDetails`.

**`ContractTypeError`** now extends `MidnightJsError`, not `TypeError`:

```ts
export class ContractTypeError extends MidnightJsError {
  constructor(readonly contractState: SerializedContractState, mismatch: ContractTypeMismatch, readonly contractAddress?: ContractAddress);
  readonly missingCircuitIds: AnyProvableCircuitId[];
  readonly keylessCircuitIds: AnyProvableCircuitId[];
  readonly mismatchedCircuitIds: AnyProvableCircuitId[];
  readonly circuitIds: AnyProvableCircuitId[];
}
```

Also added: `ContractTypeMismatch`.

**New classes:**

| Class | When |
|---|---|
| `ProviderFailedError(method: ProviderMethod, circuitId: string \| readonly string[] \| undefined, cause: Error)` | `proveTx`, `balanceTx` or `submitTx` rejected. `cause` is a plain `Error` with the original class name and a redacted message. Code `MIDNIGHT_JS_C_PROVIDER_FAILED` |
| `EraMismatchError(reason: EraMismatchReason, options?: EraMismatchOptions)` | a contract, its artifacts and the network are on eras that do not fit together. Fields `reason`, `detail?`, `contractAddress?`, `circuitId?` |
| `ForkCrossedDuringOperationError` | the network moved to a new era during an operation. Fields `kind` (`'call' \| 'deploy' \| 'maintenance' \| 'transaction'`), `startEra`, `freshEra`, `circuitId: string \| undefined`, `contractAddress: string \| undefined` |
| `SubmitRejectionUndiagnosedError` | the node refused a submission and the framework could not re-read the network era, or the fresh reading showed an earlier era |
| `Ledger8SigningKeyError` | reason `'unusable'` (ledger 8 signs with `schnorr` only) or `'unavailable'` |
| `Ledger8UnconfirmedError`, `Ledger8NotStoredError` | a ledger 8 deploy or authority change could not be confirmed, or its key or state was not stored |
| `Ledger8CallUnsupportedError` | reason `'shielded-spend'` or `'unmappable-recipient'` |
| `Ledger8AmbiguousEntryPointError` | a ledger 8 circuit name matches more than one entry point |
| `ContractNotFoundError`, `PrivateStateNotFoundError` | were plain `Error`s |
| `IncompleteDeployContractPrivateStateConfig` | only one of `privateStateId` / `initialPrivateState` given |
| `BlankVerifierKeySlotError`, `VerifierKeyMismatchError` | a verifier-key insert or remove meets a slot with no key, or a key that does not match |
| `ScopedTransactionIdentityMismatchError` | a scoped transaction is reused for another contract address or private state id |
| `EraInvariantViolationError`, `PublicStatesEraMismatchError`, `NetworkVersionStateMismatchError`, `NetworkVersionReadFailedError`, `IndexerInconsistencyError`, `LedgerParametersUnservedError`, `ZswapOutputResolutionError` | consistency checks on what a provider or the indexer answered |

`EraMismatchReason`:

```ts
export type EraMismatchReason =
  | 'unwrapped-ledger9-contract'
  | 'unrecognised-contract-shape'
  | 'ledger9-artifact-on-ledger8-network'
  | 'ledger9-transaction-on-ledger8-network'
  | 'ledger8-transaction-on-ledger9-network'
  | 'artifact-era-undeclared'
  | 'provider-cannot-declare-era'
  | 'unknown-artifact-runtime-version'
  | 'ledger8-artifacts-in-ledger9-container'
  | 'ledger8-deploy-on-ledger9-network'
  | 'ledger8-maintenance-on-ledger9-network'
  | 'ledger8-artifact-on-ledger9-contract'
  | 'ledger8-contract-state-unsupported'
  | 'scope-on-ledger8-network'
  | 'ledger8-call-in-scope'
  | 'contract-era-unsupported'
  | 'unrecognised-result-era';
```

Also added: `EraMismatchOptions`, `SubmittedOperation`, `SubmittedContractOperation`,
`SubmittedTransaction`, `SubmittedOperationKind`, `SubmitRejectionUndiagnosedCause`,
`Ledger8SigningKeyReason`, `Ledger8KeyedOperation`, `Ledger8NotStoredStage`,
`Ledger8CallUnsupportedReason`, `DISPATCH_BREADCRUMB_MESSAGE`.

---

## `@midnight-ntwrk/midnight-js-protocol`

### Changed: era-named subpaths

Ledger 9 is the current ledger. The subpaths that named "the" ledger are removed. New subpaths name
the era.

| v4.1.1 subpath (removed) | v5.0.0 subpath | Package behind it |
|---|---|---|
| `/ledger` (`@midnight-ntwrk/ledger-v8`) | `/v9` | `@midnightntwrk/ledger-v9` 1.0.0-rc.5 |
| `/compact-runtime` | `/v9/compact-runtime` | `@midnight-ntwrk/compact-runtime` 0.20.0 |
| `/compact-js` | `/v9/compact-js` | `@midnight-ntwrk/compact-js` 3.0.0-rc.3 |
| `/compact-js/effect` | `/v9/compact-js/effect` | same |
| `/compact-js/effect/Contract` | `/v9/compact-js/effect/Contract` | same |
| `/onchain-runtime` (`onchain-runtime-v3`) | `/v9/onchain-runtime` | `@midnightntwrk/onchain-runtime-v4` |

`/platform-js`, `/platform-js/effect/Configuration` and `/platform-js/effect/ContractAddress` keep
the same subpaths. They are now backed by `@midnight-ntwrk/platform-js` 3.0.0 (was 2.2.4, a major
bump).

New subpaths:

| Subpath | Exports |
|---|---|
| `/errors` | the error base, categories, codes and the protocol error classes |
| `/version` | era constants and resolvers (see below) |
| `/transaction` | `deserializeTransactionAtStage`, `isFrameworkLedgerTransaction`, `transactionStageOf`, `LedgerTransactionTypes`, `TransactionStage`, `FrameworkInstanceCheck` |
| `/prove` | `proveLedger8Transaction` |
| `/v8` | the ledger 8 runtime (`@midnightntwrk/ledger-v8`), loaded on demand |
| `/v8/engine` | `createLedger8Engine` and its types |
| `/compact-js/v8/effect` | the ledger 8 `compact-js` effect module |

### Removed: root namespaces

| v4.1.1 | v5.0.0 |
|---|---|
| `ledger` | `import * as ledger from '@midnight-ntwrk/midnight-js-protocol/v9'` |
| `compactRuntime` | `import * as compactRuntime from '@midnight-ntwrk/midnight-js-protocol/v9/compact-runtime'` |
| `compactJs` | `import * as compactJs from '@midnight-ntwrk/midnight-js-protocol/v9/compact-js'` |
| `onchainRuntime` | `import * as onchainRuntime from '@midnight-ntwrk/midnight-js-protocol/v9/onchain-runtime'` |

The root keeps the `platform` namespace.

### Added: era vocabulary (`/version`, also on the root)

```ts
export type LedgerEra = 'v8' | 'v9';
export const LEDGER_ERAS: readonly ['v8', 'v9'];          // frozen
export const CURRENT_LEDGER_ERA: CurrentLedgerEra;   // 'v9'
export const RETAINED_LEDGER_ERAS: readonly ['v8'];       // frozen
export interface VersionedRecord { readonly protocolVersion: number }
export interface ProtocolVersionSource { queryLatestProtocolVersion(): Promise<number> }
export const protocolVersionToLedger: (protocolVersion: number, path?: VersionResolutionPath) => LedgerEra;
export const versionOfRecord: (record: VersionedRecord) => LedgerEra;
export const latestNetworkLedgerVersion: (source: ProtocolVersionSource) => Promise<LedgerEra>;
```

Protocol version to era: node major version 1 is `'v8'`, node major version 2 is `'v9'`. Any other
value throws `UnknownProtocolVersionError`. A `PublicDataProvider` is a `ProtocolVersionSource`.

Also added: `CurrentLedgerEra`, `RetainedLedgerEra`, `StateKind`, `LEDGER_STATE_KINDS`,
`LEDGER_STATE_TAGS`, `LEDGER_TRANSACTION_TAGS`, `TRANSACTION_STAGES`, `TransactionStage`.

### Added: ledger 8 loading

| Export | Where | Signature |
|---|---|---|
| `loadLedger8Protocol` | root | `() => Promise<Ledger8Protocol>` |
| `loadLedgerEra`, `loadLedger8Engine` | root | load an era's runtime on demand |
| `proveLedger8Transaction` | `/prove` | `(tx: LedgerTransactionTypes['v8']['Unproven'], provingProvider: ProvingProvider) => Promise<LedgerTransactionTypes['v8']['Unbound']>` |

Also on the root: `INITIAL_LEDGER_PARAMETERS`, `LedgerEraFacade`, and the compose, state and
engine types `LedgerParametersOption`, `ComposeCallEntry`, `ComposeCallOptions`,
`ComposeCallResultPojo`, `ComposeDeployOptions`, `DeployResultPojo`, `PartitionContext`,
`PartitionedCallTranscript`, `CallTranscriptSource`, `ZswapOfferFactory`, `ContractBalance`,
`ContractEntryPointPojo`, `ContractStatePojo`, `ConstructorResultPojo`, `EncodedStateValue`,
`Ledger8CircuitOptions`, `Ledger8ConstructorOptions`, `Ledger8Engine`, `Ledger8EngineContract`,
`Ledger8SigningKey`, `TranscriptPojo`, `VerifierKeyReader`, `WrapKeepStateCallOptions`.

### Added: error model (`/errors`, also on the root)

```ts
export const MIDNIGHT_JS_ERROR_CATEGORIES: {  // frozen
  readonly USAGE: 'USAGE'; readonly ENVIRONMENT: 'ENVIRONMENT'; readonly TRANSIENT: 'TRANSIENT';
  readonly REJECTED: 'REJECTED'; readonly UNCERTAIN: 'UNCERTAIN'; readonly INTEGRITY: 'INTEGRITY';
  readonly INTERNAL: 'INTERNAL';
};
export type MidnightJsErrorCategory = (typeof MIDNIGHT_JS_ERROR_CATEGORIES)[keyof typeof MIDNIGHT_JS_ERROR_CATEGORIES];
export abstract class MidnightJsError extends Error {
  abstract readonly code: MidnightJsErrorCodeFormat;  // `MIDNIGHT_JS_${string}`
  abstract readonly category: MidnightJsErrorCategory;
}
export const findCodedCause: (failure: unknown) => CodedMidnightJsError | undefined;
```

General classes: `InvalidArgumentError`, `ConfigurationError`, `EnvironmentUnsupportedError`,
`InvariantViolationError`.

Protocol classes: `UnknownProtocolVersionError`, `UnknownLedgerEraError`,
`Ledger8RuntimeMissingError`, `Ledger8RuntimeInvalidError`, `StateConversionFailedError`,
`StateDecodeFailedError`, `StateInconsistentError`, `ComposeFailedError`, `ComposeOptionError`,
`MaintenanceAuthorityMismatchError`, `PayloadNotATransactionError`, `ContractExecutionError`.

`StateInconsistentError(version: LedgerEra, cause: unknown)`: a contract state decoded for an era,
but its content is not consistent. Decoding it as another era will not help.

Also added: `PROTOCOL_ERROR_CODES`, `PROTOCOL_ERROR_CATEGORIES`, `ProtocolErrorCode`,
`COMMON_ERROR_CODES`, `COMMON_ERROR_CATEGORIES`, `CommonErrorCode`, `CodedMidnightJsError`,
`MidnightJsErrorCodeFormat`, `NO_CIRCUIT`, `TRANSACTION_TAG_PREFIX`, `VersionResolutionPath`,
`ProtocolVersionUnknownReason`, `ComposeStage`, `ComposeOption`, `StateConversionStage`,
`MaintenanceAuthorityMismatchReason`, `Ledger8Subpath`.

---

## `@midnight-ntwrk/midnight-js-utils`

No exports were removed.

### Added: configuration and provider set

| Export | Signature |
|---|---|
| `assertValidMidnightConfig` | `(config: MidnightConfig \| null \| undefined, source?: string) => asserts config is MidnightConfig`. Missing config: `ConfigurationError`. Bad `networkId` or `ttlSeconds`: `InvalidArgumentError` |
| `intentTtl` | `(config: MidnightConfig) => Date` (now plus `ttlSeconds`) |
| `createMidnightProviders` | `<P extends MidnightProviders>(providers: P) => P`. Throws `ConfigurationError` for a missing provider, then checks `config` |
| `networks` | `{ preview(): MidnightNetwork; preprod(blockfrostProjectId: string): MidnightNetwork; mainnet(blockfrostProjectId: string): MidnightNetwork }` |

```ts
export interface MidnightNetwork {
  readonly networkId: NetworkId;
  readonly indexer: { readonly queryURL: string; readonly subscriptionURL: string };
  readonly nodeURL: string;
  readonly nodeWsURL: string;
}
```

### Added: error codes and helpers

```ts
export function hasErrorCode(e: unknown): e is Error & { code: MidnightJsErrorCode };
export function hasErrorCode<C extends MidnightJsErrorCode>(e: unknown, code: C): e is Error & { code: C };
export function hasForeignErrorCode<C extends string>(e: unknown, code: ForeignErrorCode<C>): e is Error & { code: C };
export const isMidnightJsError: (e: unknown) => e is Error & { code: MidnightJsErrorCode };
export const errorCategory: (e: unknown) => MidnightJsErrorCategory | undefined;
export function assertNever(value: never, context: string): never;
```

`hasErrorCode` accepts only this framework's codes, so a typo does not compile.
`hasForeignErrorCode` is for codes of other libraries (for example `ECONNREFUSED`). It throws if the
code starts with `MIDNIGHT_JS_`. `assertNever` closes a `switch` over an era union; it throws
`UnhandledUnionMemberError`.

Code tables: `MIDNIGHT_JS_ERROR_CODES`, `MIDNIGHT_JS_ERROR_CATEGORIES`,
`MIDNIGHT_JS_ERROR_CATEGORY_BY_CODE`, `CONTRACTS_ERROR_CODES`, `CONTRACTS_ERROR_CATEGORIES`,
`PROVIDER_ERROR_CODES`, `PROVIDER_ERROR_CATEGORIES`, `UTILS_ERROR_CODES`,
`UTILS_ERROR_CATEGORIES`; types `MidnightJsErrorCode`, `MidnightJsErrorCategory`,
`ContractsErrorCode`, `ProviderErrorCode`, `UtilsErrorCode`.

### Added: deserialization errors

```ts
export type Classification = 'version-mismatch' | 'format-mismatch' | 'unknown';
export type SourceLibrary = 'ledger' | 'compact-runtime' | 'onchain-runtime';
export interface DeserializationContext extends DeserializationCallSite {
  readonly classification: Classification;
  readonly direction?: Direction;
  readonly mitigation: readonly string[];
  readonly extracted?: ExtractedInfo;
}
export class DeserializationError extends MidnightJsError {
  readonly context: DeserializationContext;
  constructor(context: DeserializationContext, cause?: unknown);
}
export const isDeserializationError: (e: unknown) => e is DeserializationError; // plain instanceof
```

`classification` and `mitigation` are on `error.context`, not on the error. `PATTERNS` holds the 12
message patterns the classifier knows.

Typed wrappers. Each takes a `CallSiteContext` (`{ caller: string; details?: … }`):

| Export | Signature |
|---|---|
| `deserializeLedger9ContractState` | `(bytes: Uint8Array, ctx: CallSiteContext) => ContractState` (ledger) |
| `deserializeLedger9CompactContractState` | `(bytes: Uint8Array, ctx: CallSiteContext) => ContractState` (compact-runtime) |
| `deserializeLedger9ZswapChainState` | `(bytes: Uint8Array, ctx: CallSiteContext) => ZswapChainState` |
| `deserializeLedger9Parameters` | `(bytes: Uint8Array, ctx: CallSiteContext) => LedgerParameters` |
| `decodeLedger9StateValue` | `(encoded: EncodedStateValue, ctx: CallSiteContext) => StateValue` |
| `deserializeLedgerTransaction` | `<E extends LedgerEra>(era: E, bytes: Uint8Array, ctx: CallSiteContext) => Promise<LedgerTransaction<'Finalized', E>>` |
| `withDeserializationContext` | `<T>(callSite, fn: () => T) => T` (synchronous only) |

Also added: `classify`, `Direction`, `ExtractedInfo`, `PatternEntry`, `DeserializationCallSite`,
`SOURCE_PACKAGES`.

### Added: era of state bytes

| Export | Signature |
|---|---|
| `ledgerVersionOfContractState` | `(raw: Uint8Array) => LedgerEra` |
| `ledgerVersionOfLedgerParameters` | `(raw: Uint8Array) => LedgerEra` |
| `parseSerializedTag` | reads the header tag of serialized ledger bytes; throws `TagParseError` |

Also added: `ParsedSerializedTag`, `TagParseError`.

### Added: ZK artifact integrity

```ts
export type ZkArtifactIntegrityMode = 'require' | 'require-if-present' | 'warn' | 'off';
export interface ZkConfigIntegrityOptions {
  readonly verify?: ZkArtifactIntegrityMode;   // default 'require'
  readonly expectedManifestHash?: string;      // SHA-256 hex of the manifest
  readonly onWarn?: (message: string) => void; // default console.warn
}
```

Also added: `ZkArtifactManifest`, `ZkArtifactManifestFile`, `ZkArtifactIntegrityError`,
`ZkArtifactContractInfoError`, `ZK_MANIFEST_DIR` (`'compiler'`), `ZK_MANIFEST_FILE_NAME`
(`'contract-manifest.json'`), `ZK_CONTRACT_INFO_FILE_NAME`, `parseZkArtifactManifest`,
`verifyZkArtifactIntegrity`, `assertManifestHash`, `computeSha256Hex`,
`parseZkArtifactRuntimeVersion`.

### Added: signing keys

```ts
export const isValidSigningKey: (value: unknown) => value is SigningKey;
```

True for `{ tag: 'schnorr' | 'ecdsa', value }` where `value` is exactly 64 hex characters.

---

## `@midnight-ntwrk/midnight-js-indexer-public-data-provider`

No exports were removed.

### Changed: `indexerPublicDataProvider`

```ts
// v4.1.1
export const indexerPublicDataProvider = (
  queryURL: string, subscriptionURL: string, webSocketImpl?: typeof ws.WebSocket
): PublicDataProvider;
// v5.0.0
export function indexerPublicDataProvider(config: IndexerProviderConfig): IndexerPublicDataProvider;
/** @deprecated */
export function indexerPublicDataProvider(
  queryURL: string, subscriptionURL: string, webSocket?: typeof ws.WebSocket
): IndexerPublicDataProvider;

export type IndexerProviderConfig = {
  readonly queryURL: string;
  readonly subscriptionURL: string;
  readonly webSocket?: typeof WebSocket;
  readonly pollInterval?: number; // default DEFAULT_POLL_INTERVAL (1000 ms)
};
```

`IndexerPublicDataProvider` is the concrete class. It implements `PublicDataProvider` and adds
`dispose(): Promise<void>`, which closes the WebSocket. An invalid `pollInterval` throws
`IndexerProviderConfigError`.

The provider needs **indexer >= 4.4.0-rc.6**. It reads `stateAt` on every contract-state read.

### Added

| Export | Purpose |
|---|---|
| `getAllContractEvents` | `(provider: Pick<PublicDataProvider, 'queryContractEvents'>, filter: ContractEventQueryFilter) => AsyncIterable<ContractEvent>`: pages through every matching event |
| `parseHexTransaction` | `<E extends LedgerEra>(era: E, s: string, details?) => Promise<LedgerTransaction<'Finalized', E>>` |
| `DEFAULT_POLL_INTERVAL` | `1000` |
| `DEFAULT_CONTRACT_EVENTS_PAGE_SIZE` | `100` |
| `UnknownRecordEraError` | a record's `protocolVersion` maps to no era. Code `MIDNIGHT_JS_PR_UNKNOWN_RECORD_ERA` |
| `DecoderEraUnsupportedError` | the era has no decoder (reachable only from untyped JavaScript) |
| `IndexerPayloadTooLargeError` | an inflated subscription frame is larger than 16 MiB |
| `IndexerInvariantError` | the indexer answered something the provider cannot accept |
| `UpperBoundCheck` | type used by the codec |

Behaviour changes:

- Contract-state reads (`queryContractState`, `queryZSwapAndContractState`,
  `queryDeployContractState`, `watchForContractState`) reject with `UnknownRecordEraError`, and
  `contractStateObservable` ends with it, when the block's era is unknown.
- Error messages no longer contain URL query strings (API tokens).
- Subscriptions use the `graphql-transport-ws+deflate` sub-protocol when the server supports it.

---

## `@midnight-ntwrk/midnight-js-level-private-state-provider`

`levelPrivateStateProvider(config)` keeps its 4.1.1 signature. The provider it returns implements
the new `PrivateStateProvider` (`forContract`, `clearAll`; see the types section).

| Change | Detail |
|---|---|
| Added `StoredSigningKeyFormatError` | a stored signing key has a bad format. Has `contractAddress` |
| Signing keys | 4.x keys stored as bare hex are read as `{ tag: 'schnorr', value }` |
| `set` | throws `PrivateStateSerializationError` for a value that does not survive a round trip (functions, class instances, `ArrayBuffer`, `Error`, …) |
| `changePassword` | re-encrypts the states of every contract of the account |
| Addresses | compared in lower case |

---

## `@midnight-ntwrk/midnight-js-http-client-proof-provider`

### Changed: `httpClientProofProvider`

```ts
// v4.1.1
export const httpClientProofProvider = <K extends string>(
  url: string, zkConfigProvider: ZKConfigProvider<K>, config?: ProvingProviderConfig
): ProofProvider;
// v5.0.0
export function httpClientProofProvider<K extends string>(options: {
  readonly url: string;
  readonly zkConfigProvider: ZKConfigProvider<K> | ZKConfigRegistry;
  readonly timeout?: number;
  readonly headers?: Record<string, string>;
}): ProofProvider;
/** @deprecated Use the options-object form. */
export function httpClientProofProvider<K extends string>(
  url: string, zkConfigProvider: ZKConfigProvider<K> | ZKConfigRegistry, config?: ProvingProviderConfig
): ProofProvider;
```

- The options-object form is new. The positional form still works, but it is deprecated.
- The options type (`HttpClientProofProviderOptions` in the source) is not exported. Write the
  object inline.
- `zkConfigProvider` may be a `ZKConfigRegistry` (for cross-contract calls).
- `proveTx(tx, { timeout })` now honours the timeout. In 4.1.1 it was ignored. Order: per call,
  then construction, then `DEFAULT_TIMEOUT`.

### Changed: `httpClientProvingProvider`

```ts
// v4.1.1
export const httpClientProvingProvider = <K extends string>(
  url: string, zkConfigProvider: ZKConfigProvider<K>, config?: ProvingProviderConfig
): ProvingProvider;
// v5.0.0
export const httpClientProvingProvider = <K extends string>(
  url: string, zkConfigProvider: ZKConfigProvider<K> | ZKConfigRegistry, config?: ProvingProviderConfig
): TimeoutAwareProvingProvider;
```

`TimeoutAwareProvingProvider` extends `ProvingProvider`: its `check` and `prove` take an optional
last `overrideTimeout?: number`. It is still assignable to `ProvingProvider`. The type itself is
not exported.

No exports were added or removed.

---

## `@midnight-ntwrk/midnight-js-fetch-zk-config-provider`

### Changed: constructor

```ts
// v4.1.1
new FetchZkConfigProvider(baseURL: string, fetchFunc?: typeof fetch);
// v5.0.0
new FetchZkConfigProvider(baseURL: string, options?: FetchZkConfigProviderOptions);
export type FetchZkConfigProviderOptions = ZkConfigIntegrityOptions & { readonly fetchFunc?: typeof fetch };
```

Move a custom fetch into the options: `new FetchZkConfigProvider(url, { fetchFunc: myFetch })`.

The provider checks every artifact against `compiler/contract-manifest.json` (default
`verify: 'require'`). It reads the runtime version from the manifest, or else from
`compiler/contract-info.json`.

### Added

```ts
export interface CreateFetchZkConfigProviderOptions extends FetchZkConfigProviderOptions {
  readonly baseURL: string;
}
export function fetchZkConfigProvider<K extends string>(options: CreateFetchZkConfigProviderOptions): FetchZkConfigProvider<K>;
```

---

## `@midnight-ntwrk/midnight-js-node-zk-config-provider`

### Changed: constructor

```ts
// v4.1.1
new NodeZkConfigProvider(directory: string);
// v5.0.0
new NodeZkConfigProvider(directory: string, integrityOptions?: ZkConfigIntegrityOptions);
```

Same integrity check and runtime-version lookup as the fetch provider.

### Added

```ts
export interface NodeZkConfigProviderOptions extends ZkConfigIntegrityOptions {
  readonly directory: string;
}
export function nodeZkConfigProvider<K extends string>(options: NodeZkConfigProviderOptions): NodeZkConfigProvider<K>;
export const nodeZkConfigRegistry: (artifactRoot: string) => Promise<ZKConfigRegistry>;
```

`nodeZkConfigRegistry` walks `artifactRoot` and adds one `NodeZkConfigProvider` per contract
directory it finds.

---

## `@midnight-ntwrk/midnight-js-dapp-connector-proof-provider`

### Changed: `dappConnectorProofProvider`

```ts
// v4.1.1
dappConnectorProofProvider<K extends string>(api: DAppConnectorProvingAPI, zkConfigProvider: ZKConfigProvider<K>, costModel: CostModel): Promise<ProofProvider>;
// v5.0.0
dappConnectorProofProvider<K extends string>(api: DAppConnectorProvingAPI, zkConfigProvider: ZKConfigProvider<K> | ZKConfigRegistry, costModel: CostModel): Promise<ProofProvider>;
```

It now proves both `'v8'` and `'v9'` transactions, and refuses `proveTx(tx, { timeout })` with
`InvalidArgumentError`. The DApp Connector API dependency is `@midnightntwrk/dapp-connector-api`
4.1.0-beta.1.

### Changed: `dappConnectorProvingProvider`

```ts
// v4.1.1
dappConnectorProvingProvider<K extends string>(api: DAppConnectorProvingAPI, zkConfigProvider: ZKConfigProvider<K>): Promise<ProvingProvider>;
// v5.0.0
dappConnectorProvingProvider<K extends string>(api: DAppConnectorProvingAPI, zkConfigProvider: ZKConfigProvider<K> | ZKConfigRegistry): Promise<ProvingProvider>;
```

### Added

```ts
export const dappConnectorWalletProviders: (
  api: DAppConnectorWalletAPI
) => Promise<{ walletProvider: WalletProvider; midnightProvider: MidnightProvider }>;
export const dappConnectorNetwork: (api: DAppConnectorNetworkAPI) => Promise<MidnightNetwork>;
export type DAppConnectorWalletAPI = Pick<WalletConnectedAPI, 'getShieldedAddresses' | 'balanceUnsealedTransaction' | 'submitTransaction'>;
export type DAppConnectorNetworkAPI = Pick<WalletConnectedAPI, 'getConfiguration'>;
```

`dappConnectorWalletProviders` serves both eras. `dappConnectorNetwork` reads the network id and
URLs from the connected wallet and throws `InvalidArgumentError` for a malformed value.

---

## `@midnight-ntwrk/midnight-js-bundled-contract-module-provider` (new)

A new package for dynamic cross-contract calls. It tells the Compact runtime which compiled
contract module implements the contract at an address.

```ts
export type ModulesByAddress = ReadonlyMap<string, ModuleThunk>;
export const bundledContractModuleProvider: (modules: ModulesByAddress) => ContractModuleProvider;
```

`ModuleThunk` and `ContractModuleProvider` come from
`@midnight-ntwrk/midnight-js-protocol/v9/compact-runtime`. The table is checked when the provider is
built: a key that is not a contract address, or two keys that differ only in case and point to
different modules, throw `InvalidArgumentError`. Pass the result as
`MidnightProviders.contractModuleProvider`.

---

## `@midnight-ntwrk/midnight-js` (barrel)

| Change | Detail |
|---|---|
| Removed | `networkId` namespace and the `./network-id` subpath |
| Added subpath | `./protocol/v9`: `CompiledContract`, `ContractExecutable`, type `Contract` |
| Added namespace | `ledger9Protocol` (the same three names) |
| Added at the root, from `protocol/version` | `CURRENT_LEDGER_ERA`, `CurrentLedgerEra`, `LEDGER_ERAS`, `LedgerEra`, `ProtocolVersionSource`, `VersionedRecord`, `latestNetworkLedgerVersion`, `versionOfRecord` |
| Added at the root, from `protocol/errors` | `MidnightJsError`, `MidnightJsErrorCategory`, `MIDNIGHT_JS_ERROR_CATEGORIES`, `COMMON_ERROR_CODES`, `PROTOCOL_ERROR_CODES`, `InvalidArgumentError`, `ConfigurationError`, `EnvironmentUnsupportedError`, `InvariantViolationError`, `UnknownProtocolVersionError`, `UnknownLedgerEraError`, `Ledger8RuntimeMissingError`, `StateDecodeFailedError`, `StateInconsistentError`, `ComposeFailedError`, `ComposeOptionError`, `ComposeStage`, `ComposeOption`, `ContractExecutionError`, `PayloadNotATransactionError`, `NO_CIRCUIT`, `Ledger8Subpath`, `ProtocolVersionUnknownReason`, `VersionResolutionPath` |

The `contracts`, `types` and `utils` namespaces and subpaths are unchanged; they carry the changes
of their packages.

---

## `@midnight-ntwrk/midnight-js-network-id` (removed)

The package is removed. It exported `NetworkId`, `getNetworkId` and `setNetworkId`.

| v4.1.1 | v5.0.0 |
|---|---|
| `setNetworkId(id)` / `getNetworkId()` | `MidnightProviders.config.networkId` |
| `NetworkId` | `NetworkId` from `@midnight-ntwrk/midnight-js-types` |

---

## `@midnight-ntwrk/testkit-js`

No exports were removed.

| Change | Detail |
|---|---|
| `NodeClient` constructor | `new NodeClient(nodeURL: string, logger: Logger, networkId: NetworkId)`. An empty network id throws `TypeError` |
| `initializeMidnightProviders` | sets `config` with `ttlSeconds: 3600` |
| Added | `ForkTestEnvironment`, `ForkEnactment`, `HEALTH_CHECK_TIMEOUT_MS` (10 000 ms), `redactUrl`, `redactedJson` |
| Added subpath `./fixtures-hf` | `HF_FIXTURE_NAMES`, `HF_FIXTURE_STATUSES`, `readHfFixture`, `hfFixturePath`, `hfFixturesManifest`, types `HfFixtureName`, `HfFixtureStatus`, `HfFixtureEntry` |
| Wallet SDK | `@midnightntwrk/wallet-sdk` 2.0.0-rc.0 (was `@midnight-ntwrk/wallet-sdk` 1.1.0) |

`@midnight-ntwrk/testkit-js-e2e` is no longer published.
