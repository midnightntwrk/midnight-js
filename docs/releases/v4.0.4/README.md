# midnight-js v4.0.4 Release Documentation

**Release Date:** April 1, 2026
**Previous Version:** v4.0.2
**Migration Complexity:** Low (backward-compatible)

> **Note:** v4.0.3 was not published due to release pipeline issues. This release includes all changes from both v4.0.3 and v4.0.4.

## Quick Links

- [Release Notes](./release-notes.md) - High-level changelog
- [Breaking Changes](./breaking-changes.md) - None in this release
- [New Features](./new-features.md) - Barrel package, DApp connector proof provider, per-recipient encryption, browser crypto fallback, GitHub token for compact fetch
- [Migration Guide](./migration-guide.md) - Step-by-step upgrade from v4.0.2
- [API Changes](./api-changes.md) - New packages, types, options, and exports

## Overview

v4.0.4 includes all changes from the unpublished v4.0.3 and v4.0.4 development cycles.

**From v4.0.3:** Two new packages -- `@midnight-ntwrk/midnight-js` (barrel package for simplified imports) and `@midnight-ntwrk/midnight-js-dapp-connector-proof-provider` (wallet-delegated proving without a standalone proof server). Also includes 15 testkit-js bug fixes.

**From v4.0.4:** A critical encryption fix where `zswapStateToOffer` previously encrypted all coin outputs to the wallet's own encryption key regardless of recipient, causing phantom balances. The fix introduces `EncryptionPublicKeyResolver` for per-recipient encryption. Also adds browser compatibility for `crypto.timingSafeEqual` and GitHub token support in compact fetch.

## Key Changes

1. **New barrel package `@midnight-ntwrk/midnight-js`** - Single import point for contracts, networkId, types, and utils (#735)
2. **New `dapp-connector-proof-provider` package** - Wallet-delegated proving via DApp Connector API (#732)
3. **Per-recipient encryption keys in zswap output creation** - Fixes phantom balance bug for contracts using `shieldedBurnAddress` or third-party recipients (#745)
4. **Browser crypto fallback** - Provides fallback when `crypto.timingSafeEqual` is missing in browser contexts (#737)
5. **GitHub token for compact fetch** - Supports `GITHUB_TOKEN` for private releases and higher rate limits (#760)
6. **Testkit-js bug fixes** - 15 fixes covering missing assertions, swallowed errors, and stale env vars (#721)
7. **E2E test coverage** - New tests for std library token functions, unshielded mint/send variants, and custom color tokens (#772, #766, #765)

## Requirements

- **Node.js:** 22+
- **TypeScript:** 5.8+

## Testing Checklist

- [ ] `@midnight-ntwrk/midnight-js` barrel imports resolve correctly
- [ ] `@midnight-ntwrk/midnight-js/contracts` sub-path import works
- [ ] `dappConnectorProofProvider` creates a valid `ProofProvider`
- [ ] Contracts using `shieldedBurnAddress` no longer show phantom balances
- [ ] Existing code passing `EncPublicKey` to `zswapStateToOffer` still works (backward compat)
- [ ] Browser builds work without `crypto.timingSafeEqual` polyfill
- [ ] `GITHUB_TOKEN` env var is respected by compact fetch
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass

---

**Last Updated:** April 1, 2026
**License:** Apache-2.0
