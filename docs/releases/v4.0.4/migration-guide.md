# Migration Guide v4.0.2 to v4.0.4

> **Note:** v4.0.3 was not published due to release pipeline issues. This guide covers migrating directly from v4.0.2 to v4.0.4.

## Overview

This guide covers migrating from midnight-js v4.0.2 to v4.0.4. This release is fully backward compatible -- no code changes are required for existing functionality. However, you may want to adopt the new barrel package for simplified imports and the `EncryptionPublicKeyResolver` to fix phantom balance issues.

## Step 1: Update Dependencies

```bash
yarn upgrade @midnight-ntwrk/midnight-js-contracts@^4.0.4
yarn upgrade @midnight-ntwrk/level-private-state-provider@^4.0.4
yarn upgrade @midnight-ntwrk/compact@^4.0.4
```

## Step 2: (Optional) Adopt the Barrel Package

Instead of importing from individual packages, use the new `@midnight-ntwrk/midnight-js` barrel:

```bash
yarn add @midnight-ntwrk/midnight-js@^4.0.4
```

**Before (v4.0.2):**
```typescript
import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import type { PrivateStateId } from '@midnight-ntwrk/midnight-js-types';
```

**After (v4.0.4) -- namespace imports:**
```typescript
import { contracts, networkId, types } from '@midnight-ntwrk/midnight-js';
```

**After (v4.0.4) -- sub-path imports:**
```typescript
import { deployContract } from '@midnight-ntwrk/midnight-js/contracts';
import { setNetworkId } from '@midnight-ntwrk/midnight-js/network-id';
import type { PrivateStateId } from '@midnight-ntwrk/midnight-js/types';
```

Both styles are supported. Direct package imports continue to work unchanged.

## Step 3: (Optional) Adopt DApp Connector Proof Provider

If your DApp uses the DApp Connector wallet API and you want wallet-delegated proving:

```bash
yarn add @midnight-ntwrk/midnight-js-dapp-connector-proof-provider@^4.0.4
```

```typescript
import { dappConnectorProofProvider } from '@midnight-ntwrk/midnight-js-dapp-connector-proof-provider';

const proofProvider = await dappConnectorProofProvider(
  walletConnectedAPI,
  zkConfigProvider,
  costModel
);
```

This replaces the need for a standalone proof server when the wallet provides proving capabilities.

## Step 4: (Optional) Adopt Per-Recipient Encryption

If your contracts use `shieldedBurnAddress()` or send coins to non-wallet addresses, adopt the resolver to eliminate phantom balances.

**Before (v4.0.2) -- all outputs encrypted to wallet key:**
```typescript
import { encryptionPublicKeyForZswapState, zswapStateToOffer } from '@midnight-ntwrk/midnight-js-contracts';

const encKey = encryptionPublicKeyForZswapState(zswapState, walletCpk, walletEpk);
const offer = zswapStateToOffer(zswapLocalState, encKey);
```

**After (v4.0.4) -- each output encrypted to its recipient's key:**
```typescript
import {
  encryptionPublicKeyResolverForZswapState,
  zswapStateToOffer
} from '@midnight-ntwrk/midnight-js-contracts';

const resolver = encryptionPublicKeyResolverForZswapState(
  zswapState,
  walletCoinPublicKey,
  walletEncryptionPublicKey
);
const offer = zswapStateToOffer(zswapLocalState, resolver);
```

The v4.0.2 approach still works and produces the same result for contracts that only send coins to the wallet itself.

## Step 5: (Optional) Provide Third-Party Recipient Mappings

If your contract sends coins to known third-party addresses (not the wallet, not the burn address):

```typescript
const additionalMappings = new Map<CoinPublicKey, EncPublicKey>([
  [recipientCoinPublicKey, recipientEncPublicKey]
]);

const resolver = encryptionPublicKeyResolverForZswapState(
  zswapState,
  walletCoinPublicKey,
  walletEncryptionPublicKey,
  additionalMappings
);
```

Or through the high-level API:

```typescript
// When calling a circuit
await contract.callTx.transfer(args, {
  additionalCoinEncPublicKeyMappings: additionalMappings
});

// When deploying
await deployContract(providers, {
  contract: compiledContract,
  additionalCoinEncPublicKeyMappings: additionalMappings
});

// Through scoped transactions
await contract.transaction({
  scopeName: 'my-transfer',
  additionalCoinEncPublicKeyMappings: additionalMappings
}, async (txCtx) => {
  await txCtx.callCircuit('transfer', args);
});
```

## Step 6: (Optional) Remove Browser Polyfills

If you previously polyfilled `crypto.timingSafeEqual` for browser builds using `level-private-state-provider`, you can remove the polyfill. The package now includes a built-in fallback.

## Step 7: (Optional) Set GitHub Token

For faster compact fetches and access to private releases:

```bash
export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Troubleshooting

### Phantom balances after burn operations

**Symptom:** Wallet shows coins that fail with "Failed to prove transaction" when spent.

**Cause:** Burn outputs were encrypted to the wallet's key, making them appear spendable.

**Solution:** Upgrade to v4.0.4. If using the low-level `zswapStateToOffer` directly, switch to the resolver-based approach (Step 4 above). The high-level API uses the resolver automatically.

### `Unable to resolve encryption public key for recipient`

**Cause:** A contract created a coin output addressed to a `CoinPublicKey` that is not the wallet's, not the burn address, and not in `additionalCoinEncPublicKeyMappings`.

**Solution:** Provide the recipient's encryption key via `additionalCoinEncPublicKeyMappings` (Step 5 above).

### Rate limiting on compact fetch

**Symptom:** GitHub API returns 403 with rate limit exceeded.

**Solution:** Set `GITHUB_TOKEN` environment variable (Step 7 above) to increase the rate limit from 60 to 5,000 requests/hour.

## Rollback Plan

If rollback is needed:
1. Downgrade: `yarn upgrade @midnight-ntwrk/midnight-js-contracts@^4.0.2`
2. Remove `@midnight-ntwrk/midnight-js` and `@midnight-ntwrk/midnight-js-dapp-connector-proof-provider` if added
3. Replace any `EncryptionPublicKeyResolver` usage with plain `EncPublicKey`
4. Remove `additionalCoinEncPublicKeyMappings` from call/deploy/transaction options
5. Note: phantom balance issue will return for contracts using `shieldedBurnAddress()`
