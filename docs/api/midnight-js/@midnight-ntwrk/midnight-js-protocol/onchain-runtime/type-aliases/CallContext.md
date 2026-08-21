[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [onchain-runtime](../README.md) / CallContext

# Type Alias: CallContext

> **CallContext** = `object`

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:299

The context information of a call provided to the VM.

## Properties

### balance

> **balance**: `Map`\<[`TokenType`](TokenType.md), `bigint`\>

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:321

The balances held by the called contract at the time it was called.

***

### caller?

> `optional` **caller?**: [`PublicAddress`](PublicAddress.md)

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:325

A public address identifying an entity.

***

### comIndices

> **comIndices**: `Map`\<[`CoinCommitment`](CoinCommitment.md), `number`\>

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:304

The commitment indices map accessible to the contract.

***

### lastBlockTime

> **lastBlockTime**: `bigint`

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:329

The [secondsSinceEpoch](#secondssinceepoch) of the previous block

***

### ownAddress

> **ownAddress**: [`ContractAddress`](ContractAddress.md)

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:300

***

### parentBlockHash

> **parentBlockHash**: `string`

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:317

The hash of the block prior to this transaction, as a hex-encoded string

***

### secondsSinceEpoch

> **secondsSinceEpoch**: `bigint`

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:308

The seconds since the UNIX epoch that have elapsed

***

### secondsSinceEpochErr

> **secondsSinceEpochErr**: `number`

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:313

The maximum error on [secondsSinceEpoch](#secondssinceepoch) that should occur, as a
positive seconds value
