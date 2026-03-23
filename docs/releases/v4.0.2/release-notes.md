# Release Notes v4.0.2

**Release Date:** March 2026
**Previous Version:** v4.0.1
**Node.js Requirement:** >=22

## Bug Fixes

### Revert `createUnprovenLedgerCallTx` to `ContractCallPrototype` approach (#686)

The `PreTranscript + Transaction.addCalls()` approach introduced in v4.0.0 (#648) fails for contracts using shielded coin operations (`receiveShielded`, `sendShielded`, `writeCoin`). The `addCalls()` stack machine does not initialize its stack identically to compact-runtime's `queryLedgerState` during circuit execution, causing `"expected a cell, received null"` errors when shielded operations produce `dup` ops expecting items on the initial stack.

Reverted `createUnprovenLedgerCallTx` to use `ContractCallPrototype + Intent.addCall()` with `PartitionedTranscript`, which correctly handles shielded coin operations.

**Affected contracts:** Any contract using `receiveShielded`, `sendShielded`, or `writeCoin` (e.g., Seabattle `join_p1`/`join_p2`, Lunarswap `addLiquidity`).

#### Corrections to v4.0.0 release documentation

The v4.0.0 release notes described breaking change #4 ("Transaction building refactored to `addCalls` API", #648). That change has been reverted. The following statements from v4.0.0 docs are no longer accurate:

- ~~`createUnprovenLedgerCallTx` signature now requires `ledgerParameters` and `coinPublicKey` parameters~~ -- Reverted. The function takes `partitionedTranscript: PartitionedTranscript` and does not require `ledgerParameters` or `coinPublicKey`.
- ~~`extractUserAddressedOutputs` has been removed~~ -- Restored. This function is exported from `@midnight-ntwrk/midnight-js-contracts`.
- ~~`partitionedTranscript` parameter replaced with `publicTranscript` (`Op<AlignedValue>[]`)~~ -- Reverted. The parameter is `partitionedTranscript: PartitionedTranscript`.

The `createUnprovenLedgerCallTx` signature in v4.0.2 matches the v3.2.0 signature (with ledger-v8 types). Users who adapted call sites to the v4.0.0 signature must revert those changes.

All other v4.0.0 breaking changes remain valid: ledger v7-to-v8 migration (#607), `queryZSwapAndContractState` 3-tuple (#633), and `CallOptionsProviderDataDependencies` requiring `ledgerParameters` (#633).

### Rehash `ZswapChainState` before spending from Merkle tree

`ZswapInput.newContractOwned` in ledger-v8 requires the chain state's Merkle tree to be rehashed before validating coin inclusion proofs. The `zswapStateToOffer` function now calls `postBlockUpdate()` on the chain state before constructing inputs. Without this, contracts that spend coins deposited in a prior transaction (e.g., Seabattle `join_p2` calling `mergeCoinImmediate` on a coin from `join_p1`) fail with `"attempted to spend from a Merkle tree that was not rehashed"`.

### Fix `CompactError` propagation in `createUnprovenDeployTxFromVerifierKeys`

The error handler in `createUnprovenDeployTxFromVerifierKeys` only checked for `ContractRuntimeError` when unwrapping errors from the contract runtime. The `compact-js` dependency now wraps `initialState` errors as `ContractConfigurationError`. Updated the handler to recognize both `ContractRuntimeError` and `ContractConfigurationError`, so `CompactError` messages propagate correctly to callers.

## Links

- [v4.0.0 Release Notes](../v4.0.0/release-notes.md)
- [GitHub Issue #686](https://github.com/midnightntwrk/midnight-js/issues/686)
