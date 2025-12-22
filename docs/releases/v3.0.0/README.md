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
3. **WalletProvider.balanceTx** - Returns discriminated union (#346)
4. **Unproven Transaction Types** - New transaction workflow (#125)
5. **ZswapOffer Changes** - Empty offers no longer allowed (#125)
6. **networkId Type** - Changed from enum to string (#125)

## New Features (10)

1. Configurable password provider
2. Async transaction handling (#348)
3. AES-256-GCM storage encryption
4. BalanceTransactionToProve type (#320)
5. Compact compiler 0.27.0 (#373)
6. Uint8Array circuit results (#268)
7. Fixed ESM/CJS support
8. Unshielded token support (NIGHT) (#125)
9. Unproven transaction types (#125)
10. Transaction TTL configuration (#125)

## Quick Migration

### Before (v2.1.0)
```typescript
const provider = new LevelPrivateStateProvider({
  storeDirectory: './data'
});

const txId = midnightProvider.submitTx(tx);
const recipe = await walletProvider.balanceTx(provingRecipe);
```

### After (v3.0.0)
```typescript
const provider = new LevelPrivateStateProvider({
  storeDirectory: './data',
  passwordProvider: async () => process.env.PASSWORD!
});

const txId = await midnightProvider.submitTx(tx);

const result = await walletProvider.balanceTx(provingRecipe);
if ('type' in result && result.type === 'BalanceTransactionToProve') {
  // Handle balance transaction
} else {
  // Handle proving recipe
}
```

## Requirements

- **Node.js:** 22+ ⚠️
- **TypeScript:** 5.0+
- **Yarn:** 4.10.3 (recommended)

## Dependencies

```json
{
  "@midnight-ntwrk/compact-runtime": "0.11.0-rc.1",
  "@midnight-ntwrk/ledger-v6": "6.1.0-alpha.6",
  "@midnight-ntwrk/onchain-runtime-v1": "1.0.0-alpha.5",
  "@midnight-ntwrk/wallet-sdk-facade": "1.0.0-beta.12"
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
