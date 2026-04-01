# Release Notes v4.0.4

**Release Date:** April 1, 2026
**Previous Version:** v4.0.2
**Node.js Requirement:** >=22

> **Note:** v4.0.3 was not published due to release pipeline issues. This release includes all changes from both v4.0.3 and v4.0.4.

## New Packages

### `@midnight-ntwrk/midnight-js` -- barrel package (#735)

A single import point that re-exports core midnight-js packages under namespaces. Provider packages are intentionally excluded to keep the barrel lightweight and avoid pulling in heavy HTTP/filesystem dependencies.

**Namespace imports:**
```typescript
import { contracts, networkId, types, utils } from '@midnight-ntwrk/midnight-js';
```

**Sub-path imports:**
```typescript
import { deployContract } from '@midnight-ntwrk/midnight-js/contracts';
import { setNetworkId } from '@midnight-ntwrk/midnight-js/network-id';
```

Re-exports from:
- `@midnight-ntwrk/midnight-js-contracts` as `contracts`
- `@midnight-ntwrk/midnight-js-network-id` as `networkId`
- `@midnight-ntwrk/midnight-js-types` as `types`
- `@midnight-ntwrk/midnight-js-utils` as `utils`

### `@midnight-ntwrk/midnight-js-dapp-connector-proof-provider` (#732)

Wraps the DApp Connector's `getProvingProvider` API into midnight-js's `ProofProvider` interface, enabling wallet-delegated proving without a standalone proof server.

```typescript
import { dappConnectorProofProvider } from '@midnight-ntwrk/midnight-js-dapp-connector-proof-provider';

const proofProvider = await dappConnectorProofProvider(
  walletConnectedAPI,
  zkConfigProvider,
  costModel
);
```

Exports:
- `dappConnectorProofProvider` -- creates a full `ProofProvider` from a DApp Connector wallet API
- `dappConnectorProvingProvider` -- creates just the `ProvingProvider` (lower-level)
- `DAppConnectorProvingAPI` -- type alias for `Pick<WalletConnectedAPI, 'getProvingProvider'>`

## Security

### Per-recipient encryption keys in zswap output creation (#745)

`zswapStateToOffer` encrypted all coin outputs using the wallet's own encryption key, regardless of the actual recipient. When a contract sends coins to a non-wallet address (e.g., `shieldedBurnAddress()`), the wallet discovered coins it could not spend -- phantom balance entries that failed with "Failed to prove transaction" when the user attempted to spend them.

Introduced `EncryptionPublicKeyResolver`, a function type that maps `CoinPublicKey` to `EncPublicKey` for each output. The resolver handles three cases:

1. **Wallet's own key** -- outputs addressed to the wallet use the wallet's encryption key
2. **Burn address** -- outputs to the well-known shielded burn address (`'0'.repeat(64)`) use a deterministic Jubjub curve point (`BURN_ENCRYPTION_PUBLIC_KEY`) derived via SHA-256
3. **Third-party recipients** -- optional `additionalCoinEncPublicKeyMappings` allows DApps to provide encryption keys for custom recipient addresses

`zswapStateToOffer` accepts both a plain `EncPublicKey` (backward compatible) and the new `EncryptionPublicKeyResolver`. Existing code passing an `EncPublicKey` continues to work unchanged.

**Affected contracts:** Any contract using `shieldedBurnAddress()` or sending coins to third-party addresses.

### Browser crypto fallback for `timingSafeEqual` (#737)

`crypto.timingSafeEqual` is not available in browser contexts, which caused `level-private-state-provider` to fail when used in browser builds. Added a constant-time comparison fallback that activates when the Node.js native implementation is unavailable, removing the need for a polyfill.

## Bug Fixes

### GitHub token support for compact fetch (#760)

The compact fetch utility did not support authentication, limiting users to the public GitHub API rate limit of 60 requests/hour. Added support for a `GITHUB_TOKEN` environment variable, which increases the rate limit to 5,000 requests/hour and enables access to private releases.

## Enhancements

### `additionalCoinEncPublicKeyMappings` in deploy and transaction scope APIs (#745, #773)

The per-recipient encryption key resolver is exposed through the high-level APIs:

- `DeployContractOptionsBase` -- new optional `additionalCoinEncPublicKeyMappings` field for contracts whose constructors create outputs to non-wallet addresses
- `CallOptionsBase` -- new optional `additionalCoinEncPublicKeyMappings` field for circuit calls that create outputs to non-wallet addresses
- `ScopedTransactionOptions` -- new optional `additionalCoinEncPublicKeyMappings` field for scoped transactions
- `TransactionContext` -- new `getAdditionalMappings()` method to retrieve scoped mappings

## Bug Fixes (testkit-js)

### Fix 15 bugs covering missing assertions, swallowed errors, and stale env vars (#721)

Comprehensive bug fix across testkit-js:
- Added missing assertion matchers in `expectSuccessfulDeployTx` and `expectSuccessfulCallTx`
- Fixed swallowed errors in client modules (`faucet-client`, `indexer-client`, `node-client`, `proof-server-client`)
- Fixed stale environment variable reads in `env-vars.ts`
- Fixed error handling in `fluent-wallet-builder` and `wallet-state-provider`
- Fixed `bigint-serialization` edge cases
- Added comprehensive unit tests for all fixed areas

## Tests

- Add e2e tests for std library token functions (#772)
- Add unshielded mint and send variant e2e tests (#766)
- Enable custom color token e2e tests (#765)
- Add test for issue #720 (#727)

## Documentation

- API documentation updates (#777, #764, #750, #739, #728, #716)
- Add documentation for `dapp-connector-proof-provider` and `midnight-js` packages (#751)
- Add README and TSDoc for `dapp-connector-proof-provider` and `midnight-js` (#741)
- Add badges to README (#743)

## Dependencies

- Consolidate dependency updates: eslint 10.1.0, jsdom 29.0.1, turbo 2.8.20, typedoc 0.28.18, allure-commandline 2.38.1 (#740)
- Aggregate dependency updates: typescript-eslint 8.57.2, vitest 4.1.2, @vitest/ui 4.1.2, @vitest/coverage-v8 4.1.2, turbo 2.8.21, rollup-plugin-dts 6.4.1 (#759)
- Bump npm_and_yarn group with 3 updates (#746)
- Bump actions/cache to v5.0.4, ctrf-io/github-test-reporter to v1.0.27 (#740)
- Add dependabot cooldown of 7 days to all package ecosystems (#767)

## Links

- [Breaking Changes Details](./breaking-changes.md)
- [New Features Guide](./new-features.md)
- [Migration Guide](./migration-guide.md)
- [API Changes Reference](./api-changes.md)
- [v4.0.2 Release Notes](../v4.0.2/release-notes.md)
- [GitHub Issue #742](https://github.com/midnightntwrk/midnight-js/issues/742)
- [GitHub Issue #635](https://github.com/midnightntwrk/midnight-js/issues/635)
