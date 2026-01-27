# midnight-js v3.0.0 Release Documentation

**Release Date:** December 17, 2024  
**Previous Version:** v2.1.0  
**Migration Complexity:** ⚠️ **Medium-High**

## Quick Links

- [📋 Release Notes](./release-notes.md) - High-level changelog
- [💥 Breaking Changes](./breaking-changes.md) - Detailed breaking changes
- [✨ New Features](./new-features.md) - Complete feature documentation
- [🔄 Migration Guide](./migration-guide.md) - Step-by-step upgrade
- [📚 API Changes](./api-changes.md) - Complete API reference

## Breaking Changes (6)

1. **LevelPrivateStateProvider** - Must provide `walletProvider` OR `passwordProvider` (#342, #346)
2. **Async Transactions** - `submitTx` now returns `Promise<TransactionId>` (#348)
3. **WalletProvider.balanceTx** - Signature changed to return `FinalizedTransaction`
4. **Unproven Transaction Types** - New transaction workflow (#125)
5. **ZswapOffer Changes** - Empty offers no longer allowed (#125)
6. **networkId Type** - Changed from enum to string (#125)

## New Features

1. Configurable password provider
2. Async transaction handling (#348)
3. AES-256-GCM storage encryption
4. Compact.js Integration (#370)
5. Ledger v7 Support (#414)
6. Scoped Transactions (#404)
7. KeyMaterialProvider Type (#430)
8. Compact compiler update (#402)
9. Uint8Array circuit results (#268)
10. Fixed ESM/CJS support
11. Unshielded token support (NIGHT) (#125)
12. Transaction TTL configuration (#125)

## Quick Migration

### Before (v2.1.0)
```typescript
const provider = new LevelPrivateStateProvider({
  storeDirectory: './data'
});

const txId = midnightProvider.submitTx(tx);
const result = await walletProvider.balanceTx(unprovenTx);
```

### After (v3.0.0)
```typescript
const provider = new LevelPrivateStateProvider({
  storeDirectory: './data',
  passwordProvider: async () => process.env.PASSWORD!
});

const txId = await midnightProvider.submitTx(tx);
const finalizedTx = await walletProvider.balanceTx(unboundTx, newCoins, ttl);
```

## Requirements

- **Node.js:** 22+ ⚠️
- **TypeScript:** 5.0+
- **Yarn:** 4.10.3 (recommended)

## Dependencies

```json
{
  "@midnight-ntwrk/ledger-v7": "^7.x.x",
  "@midnight-ntwrk/wallet-sdk-facade": "1.0.0-beta.16",
  "@midnight-ntwrk/compact-runtime": "^0.x.x"
}
```

## Migration Time Estimates

- **Small projects:** 2-4 hours
- **Medium projects:** 4-8 hours
- **Large projects:** 1-2 days

## Upgrade Difficulty

| Component | Difficulty |
|-----------|-----------|
| LevelPrivateStateProvider | 🟡 Medium |
| Transaction Handling | 🟡 Medium |
| WalletProvider | 🟠 High |

## Support

- [GitHub Issues](https://github.com/midnightntwrk/midnight-js/issues)
- [GitHub Discussions](https://github.com/midnightntwrk/midnight-js/discussions)
- [Documentation](https://docs.midnight.network/)

## Testing Checklist

- [ ] TypeScript compilation passes
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Transaction submission works
- [ ] Contract calls execute
- [ ] Storage encryption works

---

**Last Updated:** December 18, 2024  
**License:** Apache-2.0
