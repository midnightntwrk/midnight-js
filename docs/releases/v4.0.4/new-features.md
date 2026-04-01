# New Features v4.0.4

> **Note:** v4.0.3 was not published due to release pipeline issues. This release includes all changes from both v4.0.3 and v4.0.4.

## 1. Barrel Package `@midnight-ntwrk/midnight-js` (#735)

A new convenience package that re-exports all core midnight-js packages under a single import. Provider packages are intentionally excluded to keep the barrel lightweight.

### Namespace Imports

```typescript
import { contracts, networkId, types, utils } from '@midnight-ntwrk/midnight-js';

const contract = await contracts.deployContract(providers, options);
networkId.setNetworkId('testnet');
```

### Sub-path Imports

For tree-shaking and direct access:

```typescript
import { deployContract } from '@midnight-ntwrk/midnight-js/contracts';
import { setNetworkId } from '@midnight-ntwrk/midnight-js/network-id';
import type { PrivateStateId } from '@midnight-ntwrk/midnight-js/types';
import { createBalancedTransaction } from '@midnight-ntwrk/midnight-js/utils';
```

### What's Included

| Namespace | Source Package |
|-----------|---------------|
| `contracts` | `@midnight-ntwrk/midnight-js-contracts` |
| `networkId` | `@midnight-ntwrk/midnight-js-network-id` |
| `types` | `@midnight-ntwrk/midnight-js-types` |
| `utils` | `@midnight-ntwrk/midnight-js-utils` |

Provider packages (`http-client-proof-provider`, `level-private-state-provider`, etc.) are **not** included -- import them directly.

---

## 2. DApp Connector Proof Provider (#732)

A new package `@midnight-ntwrk/midnight-js-dapp-connector-proof-provider` that bridges the DApp Connector wallet API with midnight-js's `ProofProvider` interface. This enables wallet-delegated proving -- the wallet handles proof generation instead of requiring a standalone proof server.

### Usage

```typescript
import { dappConnectorProofProvider } from '@midnight-ntwrk/midnight-js-dapp-connector-proof-provider';

// walletAPI is a WalletConnectedAPI from the DApp Connector
const proofProvider = await dappConnectorProofProvider(
  walletAPI,
  zkConfigProvider,
  costModel
);

// Use proofProvider wherever ProofProvider is expected
const providers = {
  proofProvider,
  // ...other providers
};
```

### Lower-Level API

If you only need the `ProvingProvider` (without cost model wrapping):

```typescript
import { dappConnectorProvingProvider } from '@midnight-ntwrk/midnight-js-dapp-connector-proof-provider';

const provingProvider = await dappConnectorProvingProvider(walletAPI, zkConfigProvider);
```

---

## 3. Per-Recipient Encryption Keys (#745)

### Problem

`zswapStateToOffer` encrypted all coin outputs using the wallet's own encryption key, regardless of the actual recipient. When a Compact contract called `shieldedBurnAddress()` to burn coins, the wallet would discover those burned coins as spendable balance -- phantom entries that failed with "Failed to prove transaction" when spent.

### Solution

Introduced `EncryptionPublicKeyResolver` -- a function that maps each recipient's `CoinPublicKey` to the correct `EncPublicKey` for output encryption.

### Usage

#### Basic (automatic burn address handling)

```typescript
import {
  createEncryptionPublicKeyResolver,
  zswapStateToOffer
} from '@midnight-ntwrk/midnight-js-contracts';

const resolver = createEncryptionPublicKeyResolver(
  walletCoinPublicKey,
  walletEncryptionPublicKey
);

const offer = zswapStateToOffer(zswapLocalState, resolver);
```

The resolver automatically handles:
- Wallet's own address -> wallet's encryption key
- Shielded burn address (`'0'.repeat(64)`) -> `BURN_ENCRYPTION_PUBLIC_KEY` (a valid Jubjub point)

#### With third-party recipient mappings

For contracts that send coins to known third-party addresses:

```typescript
const additionalMappings = new Map<CoinPublicKey, EncPublicKey>([
  [recipientCoinPublicKey, recipientEncPublicKey]
]);

const resolver = createEncryptionPublicKeyResolver(
  walletCoinPublicKey,
  walletEncryptionPublicKey,
  additionalMappings
);
```

#### Through the high-level API

Pass `additionalCoinEncPublicKeyMappings` when calling circuits or deploying contracts:

```typescript
// In a scoped transaction
const tx = contract.callTx.myCircuit(args, {
  additionalCoinEncPublicKeyMappings: new Map([
    [recipientCpk, recipientEpk]
  ])
});
```

Or through `ScopedTransactionOptions`:

```typescript
const result = await contract.transaction({
  scopeName: 'my-transfer',
  additionalCoinEncPublicKeyMappings: mappings
}, async (txCtx) => {
  // txCtx.getAdditionalMappings() returns the mappings
  await txCtx.callCircuit('transfer', args);
});
```

### Exported Constants

```typescript
// The well-known shielded burn address CoinPublicKey
export const SHIELDED_BURN_COIN_PUBLIC_KEY: CoinPublicKey = '0'.repeat(64);

// Valid Jubjub point for burn output encryption
export const BURN_ENCRYPTION_PUBLIC_KEY: EncPublicKey =
  'f5b9fa49d3c4f06582dab6ba45c85f6b1927873105b4c8cf363b9b57ca910f65';
```

---

## 4. Browser Crypto Fallback (#737)

The `level-private-state-provider` package now works in browser contexts without requiring a `crypto.timingSafeEqual` polyfill.

Previously, browser builds failed because `crypto.timingSafeEqual` is a Node.js-only API. The storage encryption module now detects when this API is missing and uses a constant-time comparison fallback.

### Impact

No code changes required. Browser builds that previously required a polyfill for `crypto.timingSafeEqual` now work out of the box.

---

## 5. GitHub Token for Compact Fetch (#760)

The compact fetch utility now supports a `GITHUB_TOKEN` environment variable for GitHub API authentication.

### Benefits

- Access private Compact releases
- Increase rate limit from 60 to 5,000 requests/hour

### Usage

Set the `GITHUB_TOKEN` environment variable before running compact fetch:

```bash
export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

No code changes are required -- the token is picked up automatically from the environment.
