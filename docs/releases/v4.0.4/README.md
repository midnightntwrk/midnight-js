# midnight-js v4.0.4 Release Documentation

**Release Date:** April 1, 2026
**Previous Version:** v4.0.3
**Migration Complexity:** Low (backward-compatible)

## Quick Links

- [Release Notes](./release-notes.md) - High-level changelog
- [Breaking Changes](./breaking-changes.md) - None in this release
- [New Features](./new-features.md) - Per-recipient encryption, browser crypto fallback, GitHub token for compact fetch
- [Migration Guide](./migration-guide.md) - Step-by-step upgrade from v4.0.3
- [API Changes](./api-changes.md) - New types, options, and exports

## Overview

v4.0.4 is a patch release focused on a critical encryption fix: `zswapStateToOffer` previously encrypted all coin outputs to the wallet's own encryption key, regardless of the actual recipient. This caused phantom balances and "Failed to prove transaction" errors when contracts sent coins to non-wallet addresses (e.g., `shieldedBurnAddress`). The fix introduces `EncryptionPublicKeyResolver` to resolve the correct encryption key per recipient while maintaining full backward compatibility.

Additionally, this release adds browser compatibility for `crypto.timingSafeEqual` and support for GitHub tokens in compact fetch to increase rate limits.

## Key Changes

1. **Per-recipient encryption keys in zswap output creation** - Fixes phantom balance bug for contracts using `shieldedBurnAddress` or third-party recipients (#745)
2. **Browser crypto fallback** - Provides fallback when `crypto.timingSafeEqual` is missing in browser contexts (#737)
3. **GitHub token for compact fetch** - Supports `GITHUB_TOKEN` for private releases and higher rate limits (#760)
4. **E2E test coverage** - New tests for std library token functions, unshielded mint/send variants, and custom color tokens (#772, #766, #765)

## Requirements

- **Node.js:** 22+
- **TypeScript:** 5.8+

## Testing Checklist

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
