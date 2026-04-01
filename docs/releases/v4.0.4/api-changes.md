# API Changes Reference v4.0.4

> **Note:** v4.0.3 was not published due to release pipeline issues. This release includes all changes from both v4.0.3 and v4.0.4.

## Package: @midnight-ntwrk/midnight-js (NEW)

Barrel package providing unified imports. All exports are re-exports from existing packages.

```typescript
// Namespace exports
export * as contracts from '@midnight-ntwrk/midnight-js-contracts';
export * as networkId from '@midnight-ntwrk/midnight-js-network-id';
export * as types from '@midnight-ntwrk/midnight-js-types';
export * as utils from '@midnight-ntwrk/midnight-js-utils';
```

Sub-path exports available at:
- `@midnight-ntwrk/midnight-js/contracts`
- `@midnight-ntwrk/midnight-js/network-id`
- `@midnight-ntwrk/midnight-js/types`
- `@midnight-ntwrk/midnight-js/utils`

## Package: @midnight-ntwrk/midnight-js-dapp-connector-proof-provider (NEW)

### Exports

#### `dappConnectorProofProvider` (function)

```typescript
export const dappConnectorProofProvider = async <K extends string>(
  api: DAppConnectorProvingAPI,
  zkConfigProvider: ZKConfigProvider<K>,
  costModel: CostModel,
): Promise<ProofProvider>;
```

Creates a `ProofProvider` from a DApp Connector wallet API, enabling wallet-delegated proving.

#### `dappConnectorProvingProvider` (function)

```typescript
export const dappConnectorProvingProvider = async <K extends string>(
  api: DAppConnectorProvingAPI,
  zkConfigProvider: ZKConfigProvider<K>,
): Promise<ProvingProvider>;
```

Lower-level function that creates just the `ProvingProvider`.

#### `DAppConnectorProvingAPI` (type)

```typescript
export type DAppConnectorProvingAPI = Pick<WalletConnectedAPI, 'getProvingProvider'>;
```

Type alias for the minimal wallet API surface needed for proving.

---

## Package: @midnight-ntwrk/midnight-js-contracts

### New Exports

#### `EncryptionPublicKeyResolver` (type)

```typescript
export type EncryptionPublicKeyResolver = (
  coinPublicKey: CoinPublicKey
) => EncPublicKey | undefined;
```

Resolves a `CoinPublicKey` to the corresponding `EncPublicKey` for output encryption. Returns `undefined` if the key cannot be resolved.

#### `SHIELDED_BURN_COIN_PUBLIC_KEY` (constant)

```typescript
export const SHIELDED_BURN_COIN_PUBLIC_KEY: CoinPublicKey = '0'.repeat(64);
```

The well-known shielded burn address from Compact's `shieldedBurnAddress()`.

#### `BURN_ENCRYPTION_PUBLIC_KEY` (constant)

```typescript
export const BURN_ENCRYPTION_PUBLIC_KEY: EncPublicKey =
  'f5b9fa49d3c4f06582dab6ba45c85f6b1927873105b4c8cf363b9b57ca910f65';
```

A valid Jubjub curve point for encrypting burn outputs. Derived via SHA-256 hash-to-curve.

#### `createEncryptionPublicKeyResolver` (function)

```typescript
export const createEncryptionPublicKeyResolver = (
  walletCoinPublicKey: CoinPublicKey,
  walletEncryptionPublicKey: EncPublicKey,
  additionalCoinEncPublicKeyMappings?: ReadonlyMap<CoinPublicKey, EncPublicKey>
): EncryptionPublicKeyResolver;
```

Creates a resolver that maps `CoinPublicKey` to `EncPublicKey`. Handles the wallet's own key, the shielded burn address, and optional additional mappings.

#### `encryptionPublicKeyResolverForZswapState` (function)

```typescript
export const encryptionPublicKeyResolverForZswapState = (
  zswapState: ZswapLocalState,
  walletCoinPublicKey: CoinPublicKey,
  walletEncryptionPublicKey: EncPublicKey,
  additionalCoinEncPublicKeyMappings?: ReadonlyMap<CoinPublicKey, EncPublicKey>
): EncryptionPublicKeyResolver;
```

Creates a resolver from a `ZswapLocalState`, validating that the state's coin public key matches the wallet's.

### Modified Exports

#### `zswapStateToOffer` -- parameter type widened

**v4.0.2:**
```typescript
export const zswapStateToOffer = (
  zswapLocalState: ZswapLocalState,
  encryptionPublicKey: EncPublicKey,
  addressAndChainStateTuple?: { ... }
): UnprovenOffer | undefined;
```

**v4.0.4:**
```typescript
export const zswapStateToOffer = (
  zswapLocalState: ZswapLocalState,
  encryptionPublicKeyOrResolver: EncPublicKey | EncryptionPublicKeyResolver,
  addressAndChainStateTuple?: { ... }
): UnprovenOffer | undefined;
```

**Non-breaking:** Passing an `EncPublicKey` is still supported and behaves identically to v4.0.2.

#### `createZswapOutput` -- parameter type changed (internal)

**v4.0.2:**
```typescript
export const createZswapOutput = (
  output: { coinInfo: ShieldedCoinInfo; recipient: Recipient },
  encryptionPublicKey: EncPublicKey,
  segmentNumber?: number
): UnprovenOutput;
```

**v4.0.4:**
```typescript
export const createZswapOutput = (
  output: { coinInfo: ShieldedCoinInfo; recipient: Recipient },
  encryptionPublicKeyResolver: EncryptionPublicKeyResolver,
  segmentNumber?: number
): UnprovenOutput;
```

**Note:** This is an internal utility. If you imported it directly, pass a resolver instead of a plain key.

#### `CallOptionsBase` -- new optional field

```diff
  export type CallOptionsBase<C, PCK> = {
+   readonly additionalCoinEncPublicKeyMappings?: ReadonlyMap<CoinPublicKey, EncPublicKey>;
    readonly compiledContract: CompiledContract<C>;
    readonly circuitId: PCK;
    readonly contractAddress: ContractAddress;
  };
```

#### `DeployContractOptionsBase` -- new optional field

```diff
  export type DeployContractOptionsBase<C> = ContractConstructorOptionsWithArguments<C> & {
+   readonly additionalCoinEncPublicKeyMappings?: ReadonlyMap<CoinPublicKey, EncPublicKey>;
    readonly signingKey?: SigningKey;
    readonly privateStateId?: PrivateStateId;
  };
```

#### `ScopedTransactionOptions` -- new optional field

```diff
  export type ScopedTransactionOptions = {
    readonly scopeName?: string;
+   readonly additionalCoinEncPublicKeyMappings?: ReadonlyMap<CoinPublicKey, EncPublicKey>;
  };
```

#### `TransactionContext` -- new method

```diff
  export interface TransactionContext<C> {
+   getAdditionalMappings(): ReadonlyMap<CoinPublicKey, EncPublicKey> | undefined;
    getCachedContractStates(): ContractStates<Contract.PrivateState<C>> | PublicContractStates | undefined;
    // ...
  };
```

---

## Package: @midnight-ntwrk/level-private-state-provider

### Internal change (no public API impact)

Added a fallback constant-time comparison in `storage-encryption.ts` when `crypto.timingSafeEqual` is not available (browser contexts).

## Package: @midnight-ntwrk/compact

### Modified Exports

#### `fetchCompact` -- GitHub token support

The fetch function now reads the `GITHUB_TOKEN` environment variable to authenticate GitHub API requests. No signature changes.

---

## Complete API Diff by Package

### @midnight-ntwrk/midnight-js (NEW)

```diff
+ export * as contracts from '@midnight-ntwrk/midnight-js-contracts'
+ export * as networkId from '@midnight-ntwrk/midnight-js-network-id'
+ export * as types from '@midnight-ntwrk/midnight-js-types'
+ export * as utils from '@midnight-ntwrk/midnight-js-utils'
```

### @midnight-ntwrk/midnight-js-dapp-connector-proof-provider (NEW)

```diff
+ export const dappConnectorProofProvider: (api, zkConfigProvider, costModel) => Promise<ProofProvider>
+ export const dappConnectorProvingProvider: (api, zkConfigProvider) => Promise<ProvingProvider>
+ export type DAppConnectorProvingAPI = Pick<WalletConnectedAPI, 'getProvingProvider'>
```

### @midnight-ntwrk/midnight-js-contracts

```diff
+ export type EncryptionPublicKeyResolver = (coinPublicKey: CoinPublicKey) => EncPublicKey | undefined
+ export const SHIELDED_BURN_COIN_PUBLIC_KEY: CoinPublicKey
+ export const BURN_ENCRYPTION_PUBLIC_KEY: EncPublicKey
+ export const createEncryptionPublicKeyResolver: (walletCpk, walletEpk, additionalMappings?) => EncryptionPublicKeyResolver
+ export const encryptionPublicKeyResolverForZswapState: (zswapState, walletCpk, walletEpk, additionalMappings?) => EncryptionPublicKeyResolver

  export const zswapStateToOffer: (
    zswapLocalState: ZswapLocalState,
-   encryptionPublicKey: EncPublicKey,
+   encryptionPublicKeyOrResolver: EncPublicKey | EncryptionPublicKeyResolver,
    addressAndChainStateTuple?: { ... }
  ) => UnprovenOffer | undefined

  export type CallOptionsBase<C, PCK> = {
+   readonly additionalCoinEncPublicKeyMappings?: ReadonlyMap<CoinPublicKey, EncPublicKey>;
    // ...
  }

  export type DeployContractOptionsBase<C> = {
+   readonly additionalCoinEncPublicKeyMappings?: ReadonlyMap<CoinPublicKey, EncPublicKey>;
    // ...
  }

  export type ScopedTransactionOptions = {
+   readonly additionalCoinEncPublicKeyMappings?: ReadonlyMap<CoinPublicKey, EncPublicKey>;
    // ...
  }

  export interface TransactionContext<C> {
+   getAdditionalMappings(): ReadonlyMap<CoinPublicKey, EncPublicKey> | undefined;
    // ...
  }
```
