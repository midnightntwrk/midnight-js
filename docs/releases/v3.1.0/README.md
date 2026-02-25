# midnight-js v3.1.0 Release Documentation

**Release Date:** February 9, 2025
**Previous Version:** v3.0.0
**Migration Complexity:** **Low**

## Quick Links

- [Release Notes](./release-notes.md) - High-level changelog
- [New Features](./new-features.md) - Complete feature documentation
- [Migration Guide](./migration-guide.md) - Step-by-step upgrade
- [API Changes](./api-changes.md) - Complete API reference

## New Features

1. Private state import/export functionality (#435)
2. Contract address scoping for private state operations (#470)

## Bug Fixes

1. TransactionContext excluded from circuit call arguments (#497)

## Quick Example: New Import/Export Feature

```typescript
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';

const provider = levelPrivateStateProvider({ walletProvider });

// Export private states (backup)
const exportData = await provider.exportPrivateStates();

// Import private states (restore)
await provider.importPrivateStates(exportData, { onConflict: 'skip' });
```

## Requirements

- **Node.js:** 22+
- **TypeScript:** 5.0+
- **Yarn:** 4.12.0 (recommended)

## Support

- [GitHub Issues](https://github.com/midnightntwrk/midnight-js/issues)
- [GitHub Discussions](https://github.com/midnightntwrk/midnight-js/discussions)
- [Documentation](https://docs.midnight.network/)

---

**Last Updated:** February 9, 2025
**License:** Apache-2.0
