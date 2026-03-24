# Breaking Changes v4.0.2

v4.0.2 introduces no new breaking changes. However, it **reverts** breaking change #4 from v4.0.1, which means users who already adapted to the v4.0.1 `addCalls` API must revert those adaptations.

## 1. Revert of v4.0.1 Breaking Change #4: `addCalls` API (#695)

### Reason

The `PreTranscript + Transaction.addCalls()` approach introduced in v4.0.1 (#648) fails for contracts using shielded coin operations (`receiveShielded`, `sendShielded`, `writeCoin`). The `addCalls()` stack machine does not initialize its stack identically to compact-runtime, causing `"expected a cell, received null"` errors. This affected real-world contracts including Seabattle and Lunarswap.

### Impact

If you adapted your code to v4.0.1's `addCalls` API, you must revert those changes. If you are upgrading directly from v3.2.0 to v4.0.2, the `createUnprovenLedgerCallTx` signature matches v3.2.0 (with ledger-v8 types) and no action is needed for this change.

### Restored APIs

#### `createUnprovenLedgerCallTx` — original signature restored

**v4.0.1 (removed):**
```typescript
createUnprovenLedgerCallTx(
  circuitId: AnyProvableCircuitId,
  contractAddress: ContractAddress,
  initialContractState: ContractState,
  zswapChainState: ZswapChainState,
  publicTranscript: Op<AlignedValue>[],       // changed
  privateTranscriptOutputs: AlignedValue[],
  input: AlignedValue,
  output: AlignedValue,
  nextZswapLocalState: ZswapLocalState,
  encryptionPublicKey: EncPublicKey,
  ledgerParameters: LedgerParameters          // added
): UnprovenTransaction
```

**v4.0.2 (restored):**
```typescript
createUnprovenLedgerCallTx(
  circuitId: AnyProvableCircuitId,
  contractAddress: ContractAddress,
  initialContractState: ContractState,
  zswapChainState: ZswapChainState,
  partitionedTranscript: PartitionedTranscript, // restored
  privateTranscriptOutputs: AlignedValue[],
  input: AlignedValue,
  output: AlignedValue,
  nextZswapLocalState: ZswapLocalState,
  encryptionPublicKey: EncPublicKey
  // ledgerParameters removed
): UnprovenTransaction
```

#### `extractUserAddressedOutputs` — restored

This function was removed in v4.0.1 (#648) and is now re-exported from `@midnight-ntwrk/midnight-js-contracts`.

```typescript
extractUserAddressedOutputs(
  transcript: Transcript<AlignedValue> | undefined
): UtxoOutput[]
```

### Migration Steps

1. Replace `publicTranscript` parameter with `partitionedTranscript: PartitionedTranscript` in `createUnprovenLedgerCallTx` calls
2. Remove the `ledgerParameters` parameter from `createUnprovenLedgerCallTx` calls (note: `ledgerParameters` is still required in `CallOptionsProviderDataDependencies`)
3. Restore any `extractUserAddressedOutputs` usages that were removed for v4.0.1

---

## Common Migration Issues

### Error: "expected a cell, received null" on shielded operations

**Cause:** Using v4.0.1's `addCalls` API with contracts that call `receiveShielded`, `sendShielded`, or `writeCoin`.

**Solution:** Upgrade to v4.0.2. The `ContractCallPrototype` approach correctly handles shielded operations.

### Error: "attempted to spend from a Merkle tree that was not rehashed"

**Cause:** The chain state's Merkle tree was not rehashed before constructing coin inclusion proofs.

**Solution:** Upgrade to v4.0.2. The `zswapStateToOffer` function now calls `postBlockUpdate()` automatically.
