# Release Notes v4.0.2

**Release Date:** March 24, 2026
**Previous Version:** v4.0.1
**Node.js Requirement:** >=22

## Bug Fixes

### Revert `createUnprovenLedgerCallTx` to `ContractCallPrototype` approach (#695)

The `PreTranscript + Transaction.addCalls()` approach introduced in v4.0.1 (#648) fails for contracts using shielded coin operations (`receiveShielded`, `sendShielded`, `writeCoin`). The `addCalls()` stack machine does not initialize its stack identically to compact-runtime's `queryLedgerState` during circuit execution, causing `"expected a cell, received null"` errors when shielded operations produce `dup` ops expecting items on the initial stack.

Reverted `createUnprovenLedgerCallTx` to use `ContractCallPrototype + Intent.addCall()` with `PartitionedTranscript`, which correctly handles shielded coin operations.

**Affected contracts:** Any contract using `receiveShielded`, `sendShielded`, or `writeCoin` (e.g., Seabattle `join_p1`/`join_p2`, Lunarswap `addLiquidity`).

#### Corrections to v4.0.1 release documentation

The v4.0.1 release notes described breaking change #4 ("Transaction building refactored to `addCalls` API", #648). That change has been reverted. The following statements from v4.0.1 docs are no longer accurate:

- ~~`createUnprovenLedgerCallTx` signature now requires `ledgerParameters` and `coinPublicKey` parameters~~ -- Reverted. The function takes `partitionedTranscript: PartitionedTranscript` and does not require `ledgerParameters` or `coinPublicKey`.
- ~~`extractUserAddressedOutputs` has been removed~~ -- Restored. This function is exported from `@midnight-ntwrk/midnight-js-contracts`.
- ~~`partitionedTranscript` parameter replaced with `publicTranscript` (`Op<AlignedValue>[]`)~~ -- Reverted. The parameter is `partitionedTranscript: PartitionedTranscript`.

The `createUnprovenLedgerCallTx` signature in v4.0.2 matches the v3.2.0 signature (with ledger-v8 types). Users who adapted call sites to the v4.0.1 signature must revert those changes.

All other v4.0.1 breaking changes remain valid: ledger v7-to-v8 migration (#607), `queryZSwapAndContractState` 3-tuple (#633), and `CallOptionsProviderDataDependencies` requiring `ledgerParameters` (#633).

### Rehash `ZswapChainState` before spending from Merkle tree (#695)

`ZswapInput.newContractOwned` in ledger-v8 requires the chain state's Merkle tree to be rehashed before validating coin inclusion proofs. The `zswapStateToOffer` function now calls `postBlockUpdate()` on the chain state before constructing inputs. Without this, contracts that spend coins deposited in a prior transaction (e.g., Seabattle `join_p2` calling `mergeCoinImmediate` on a coin from `join_p1`) fail with `"attempted to spend from a Merkle tree that was not rehashed"`.

### Fix `CompactError` propagation in `createUnprovenDeployTxFromVerifierKeys` (#695)

The error handler in `createUnprovenDeployTxFromVerifierKeys` only checked for `ContractRuntimeError` when unwrapping errors from the contract runtime. The `compact-js` dependency now wraps `initialState` errors as `ContractConfigurationError`. Updated the handler to recognize both `ContractRuntimeError` and `ContractConfigurationError`, so `CompactError` messages propagate correctly to callers.

### Fix fallible offer error reporting (#705)

Two bugs in fallible transaction error reporting:

1. **Map serialization in `TxFailedError`:** `segmentStatusMap` was silently lost during `JSON.stringify` because `Map` is not natively serializable. The replacer now converts `Map` instances to plain objects via `Object.fromEntries`.

2. **Incorrect `scopeName` in scoped transaction errors:** Error messages referenced the `options` parameter (only set for nested transactions) instead of the resolved `txOptions`. Root transactions always displayed `<unnamed>` even when a `scopeName` was provided.

### Fix fallible error handling (#704)

Fixed error construction in fallible transaction handling where the error object was incorrectly built.

### Replace error `as any` casts with type guard (#712)

Introduced `isEffectContractError` type guard in `errors.ts` to safely narrow Effect-ts errors instead of using fragile `(error as any)` introspection. Removed all `as-any` casts and `eslint-disable` comments from catch blocks in `unproven-call-tx.ts` and `unproven-deploy-tx.ts`.

## Security

### Command injection prevention in compact CLI tools (#711)

`execSync`/`exec` with template literals in `fetch-compact.mts` and `run-compactc.cjs` were vulnerable to command injection when version strings or CLI arguments contained shell metacharacters. Replaced with `spawnSync`/`spawn` using argument arrays, which bypass the shell entirely.

### Pin `upload-sarif-github-action` to latest SHA

Pinned the SARIF upload GitHub Action to a specific commit SHA to prevent supply chain attacks from compromised tags.

## Enhancements

### Headers support in `httpClientProvingProvider` (#685)

The `ProvingProviderConfig` interface now accepts an optional `headers` field (`Record<string, string>`), which is forwarded to all HTTP requests made by the proving provider. This enables authentication and custom header injection for proof server communication.

```typescript
const provider = httpClientProvingProvider(zkConfigProvider, proofServerUrl, {
  timeout: 60_000,
  headers: { 'Authorization': 'Bearer <token>' }
});
```

## Chore

- Remove dead code from zswap-utils offer construction (#710) — removed unused `__uint8Array_val__` reviver from `deserializeCoinInfo` and dead null filter from `unprovenOfferFromMap`
- Update `scan.yaml` CI workflow (#708)

## Documentation

- API documentation update (#703)
- Release notes for v4.0.1 (#698, #696)

## Links

- [Breaking Changes Details](./breaking-changes.md)
- [New Features Guide](./new-features.md)
- [Migration Guide](./migration-guide.md)
- [API Changes Reference](./api-changes.md)
- [v4.0.1 Release Notes](../v4.0.1/release-notes.md)
- [GitHub Issue #686](https://github.com/midnightntwrk/midnight-js/issues/686)
