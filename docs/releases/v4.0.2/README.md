# midnight-js v4.0.2 Release Documentation

**Release Date:** March 24, 2026
**Previous Version:** v4.0.1
**Migration Complexity:** Low

## Quick Links

- [Release Notes](./release-notes.md) - High-level changelog
- [Breaking Changes](./breaking-changes.md) - v4.0.1 breaking change #4 reverted
- [New Features](./new-features.md) - Headers support in proof provider
- [Migration Guide](./migration-guide.md) - Step-by-step upgrade from v4.0.1
- [API Changes](./api-changes.md) - Restored APIs from v3.2.0

## Overview

v4.0.2 is a patch release that reverts the `addCalls` API refactor introduced in v4.0.1 (#648), which caused failures for contracts using shielded operations. The `createUnprovenLedgerCallTx` signature and `extractUserAddressedOutputs` export are restored to match v3.2.0 (with ledger-v8 types).

## Key Changes

1. **Revert `addCalls` API refactor** - Restores `ContractCallPrototype` approach for shielded contract compatibility (#695)
2. **Security: command injection prevention** - Replace shell string interpolation with safe argument arrays in compact CLI (#711)
3. **Fallible offer error reporting** - Fix Map serialization and scopeName in error messages (#705)
4. **Type safety** - Replace `as any` casts with `isEffectContractError` type guard (#712)

## Requirements

- **Node.js:** 22+
- **TypeScript:** 5.8+

## Testing Checklist

- [ ] Revert any v4.0.1 `addCalls` API call site adaptations
- [ ] Restore `extractUserAddressedOutputs` usages if previously removed
- [ ] Restore `partitionedTranscript` parameter in `createUnprovenLedgerCallTx` calls
- [ ] Contracts using `receiveShielded`/`sendShielded` work correctly
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass

---

**Last Updated:** March 24, 2026
**License:** Apache-2.0
