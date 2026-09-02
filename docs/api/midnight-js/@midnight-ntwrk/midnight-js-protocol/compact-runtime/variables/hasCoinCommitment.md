[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [compact-runtime](../README.md) / hasCoinCommitment

# Variable: hasCoinCommitment

> `const` **hasCoinCommitment**: (`context`, `coinInfo`, `recipient`) => `boolean`

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/zswap.d.ts:188

Checks whether a coin commitment has already been added to the current query context.

## Parameters

### context

[`CircuitContext`](../interfaces/CircuitContext.md)

The current circuit context.

### coinInfo

[`EncodedShieldedCoinInfo`](../interfaces/EncodedShieldedCoinInfo.md)

The coin information to check.

### recipient

[`EncodedRecipient`](../interfaces/EncodedRecipient.md)

The coin recipient to check.

## Returns

`boolean`
