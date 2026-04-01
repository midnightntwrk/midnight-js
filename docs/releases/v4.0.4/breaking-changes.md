# Breaking Changes v4.0.4

> **Note:** v4.0.3 was not published due to release pipeline issues. This release includes all changes from both v4.0.3 and v4.0.4.

v4.0.4 introduces **no breaking changes**. All new APIs are additive and backward compatible.

## Backward Compatibility

### `zswapStateToOffer` accepts both `EncPublicKey` and `EncryptionPublicKeyResolver`

The second parameter of `zswapStateToOffer` changed from `EncPublicKey` to `EncPublicKey | EncryptionPublicKeyResolver`. When a plain `EncPublicKey` is passed, it is wrapped in a resolver that returns that key for all recipients -- preserving the existing behavior exactly.

```typescript
// v4.0.2 -- still works in v4.0.4
const offer = zswapStateToOffer(zswapLocalState, encryptionPublicKey);

// v4.0.4 -- new resolver-based usage
const resolver = createEncryptionPublicKeyResolver(walletCpk, walletEpk);
const offer = zswapStateToOffer(zswapLocalState, resolver);
```

### `createZswapOutput` signature changed (internal API)

`createZswapOutput` now takes an `EncryptionPublicKeyResolver` instead of a plain `EncPublicKey`. This is an internal utility and not part of the public API surface. If you imported it directly, update your call sites to pass a resolver function.

### New optional fields on existing interfaces

The following interfaces have new **optional** fields that do not affect existing code:

- `DeployContractOptionsBase.additionalCoinEncPublicKeyMappings`
- `CallOptionsBase.additionalCoinEncPublicKeyMappings`
- `ScopedTransactionOptions.additionalCoinEncPublicKeyMappings`
