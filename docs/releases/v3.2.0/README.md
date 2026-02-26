# midnight-js v3.2.0 Release Documentation

**Release Date:** February 26, 2026
**Previous Version:** v3.1.0
**Migration Complexity:** Medium

## Quick Links

- [Release Notes](./release-notes.md) - High-level changelog
- [Breaking Changes](./breaking-changes.md) - Detailed breaking changes
- [New Features](./new-features.md) - Complete feature documentation
- [Migration Guide](./migration-guide.md) - Step-by-step upgrade
- [API Changes](./api-changes.md) - Complete API reference

## Breaking Changes (2)

1. **LevelPrivateStateProvider: `walletProvider` removed** - Must use `privateStoragePasswordProvider` (#528)
2. **LevelPrivateStateProvider: `accountId` required** - Mandatory for account isolation (#545)

## Security Enhancements (7)

1. Multi-version encryption with 600k PBKDF2 iterations (#530)
2. Consistent salt generation for race condition prevention (#534)
3. Encryption caching with invalidation API (#538)
4. Secure password rotation with atomic writes (#542)
5. Account-scoped storage isolation (#545)
6. Scoped transaction identity validation (#555)
7. CI/CD shell injection fixes (#493)

## New Features (5)

1. Signing key export/import with encryption (#526)
2. Private state export/import with conflict resolution (#526)
3. Password rotation APIs for states and keys (#542)
4. Account migration support (#545)
5. Mnemonic-based wallet generation in testkit (#524)

## Quick Migration

### Before (v3.1.0)
```typescript
import { levelPrivateStateProvider } from '@midnight-ntwrk/level-private-state-provider';

const provider = levelPrivateStateProvider({
  walletProvider: myWalletProvider
});
```

### After (v3.2.0)
```typescript
import { levelPrivateStateProvider } from '@midnight-ntwrk/level-private-state-provider';

const provider = levelPrivateStateProvider({
  privateStoragePasswordProvider: () => process.env.STORAGE_PASSWORD!,
  accountId: walletAddress // Now required
});
```

## Requirements

- **Node.js:** 22+
- **TypeScript:** 5.0+
- **Yarn:** 4.10.3 (recommended)

## Dependencies

```json
{
  "@midnight-ntwrk/wallet-sdk-facade": "2.0.0-rc.2",
  "@midnight-ntwrk/compactc": "0.29.0"
}
```

## Upgrade Difficulty

| Component | Difficulty |
|-----------|-----------|
| LevelPrivateStateProvider config | Medium |
| Account-scoped migration | Low (automatic) |
| Encryption version migration | None (automatic) |

## Testing Checklist

- [ ] TypeScript compilation passes
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Private state encryption works
- [ ] Account isolation verified
- [ ] Password rotation works
- [ ] Export/import functionality works

## Support

- [GitHub Issues](https://github.com/midnightntwrk/midnight-js/issues)
- [GitHub Discussions](https://github.com/midnightntwrk/midnight-js/discussions)
- [Documentation](https://docs.midnight.network/)

---

**Last Updated:** February 26, 2026
**License:** Apache-2.0
