# Migration Guide v4.0.3 to v4.0.4

## Overview

This guide covers migrating from midnight-js v4.0.3 to v4.0.4. This release is fully backward compatible -- no code changes are required for existing functionality. However, if your contracts use `shieldedBurnAddress()` or send coins to third-party addresses, you may want to adopt the new `EncryptionPublicKeyResolver` to fix phantom balance issues.

## Step 1: Update Dependencies

```bash
yarn upgrade @midnight-ntwrk/midnight-js-contracts@^4.0.4
yarn upgrade @midnight-ntwrk/level-private-state-provider@^4.0.4
yarn upgrade @midnight-ntwrk/compact@^4.0.4
```

## Step 2: (Optional) Adopt Per-Recipient Encryption

If your contracts use `shieldedBurnAddress()` or send coins to non-wallet addresses, adopt the resolver to eliminate phantom balances.

**Before (v4.0.3) -- all outputs encrypted to wallet key:**
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

The v4.0.3 approach still works and produces the same result for contracts that only send coins to the wallet itself.

## Step 3: (Optional) Provide Third-Party Recipient Mappings

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

## Step 4: (Optional) Remove Browser Polyfills

If you previously polyfilled `crypto.timingSafeEqual` for browser builds using `level-private-state-provider`, you can remove the polyfill. The package now includes a built-in fallback.

## Step 5: (Optional) Set GitHub Token

For faster compact fetches and access to private releases:

```bash
export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Troubleshooting

### Phantom balances after burn operations

**Symptom:** Wallet shows coins that fail with "Failed to prove transaction" when spent.

**Cause:** Burn outputs were encrypted to the wallet's key, making them appear spendable.

**Solution:** Upgrade to v4.0.4. If using the low-level `zswapStateToOffer` directly, switch to the resolver-based approach (Step 2 above). The high-level API uses the resolver automatically.

### `Unable to resolve encryption public key for recipient`

**Cause:** A contract created a coin output addressed to a `CoinPublicKey` that is not the wallet's, not the burn address, and not in `additionalCoinEncPublicKeyMappings`.

**Solution:** Provide the recipient's encryption key via `additionalCoinEncPublicKeyMappings` (Step 3 above).

### Rate limiting on compact fetch

**Symptom:** GitHub API returns 403 with rate limit exceeded.

**Solution:** Set `GITHUB_TOKEN` environment variable (Step 5 above) to increase the rate limit from 60 to 5,000 requests/hour.

## Rollback Plan

If rollback is needed:
1. Downgrade: `yarn upgrade @midnight-ntwrk/midnight-js-contracts@^4.0.3`
2. Replace any `EncryptionPublicKeyResolver` usage with plain `EncPublicKey`
3. Remove `additionalCoinEncPublicKeyMappings` from call/deploy/transaction options
4. Note: phantom balance issue will return for contracts using `shieldedBurnAddress()`
