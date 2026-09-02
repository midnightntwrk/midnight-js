[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [compact-runtime](../README.md) / EncodedZswapLocalState

# Interface: EncodedZswapLocalState

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/zswap.d.ts:110

Tracks the coins consumed and produced throughout circuit execution.

## Properties

### coinPublicKey

> **coinPublicKey**: [`EncodedCoinPublicKey`](EncodedCoinPublicKey.md)

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/zswap.d.ts:114

The Zswap coin public key of the user executing the circuit.

***

### currentIndex

> **currentIndex**: `bigint`

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/zswap.d.ts:118

The Merkle tree index of the next coin produced.

***

### inputs

> **inputs**: [`EncodedQualifiedShieldedCoinInfo`](EncodedQualifiedShieldedCoinInfo.md)[]

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/zswap.d.ts:122

The coins consumed as inputs to the circuit.

***

### outputs

> **outputs**: `object`[]

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/zswap.d.ts:126

The coins produced as outputs from the circuit.

#### coinInfo

> **coinInfo**: [`EncodedShieldedCoinInfo`](EncodedShieldedCoinInfo.md)

#### recipient

> **recipient**: [`EncodedRecipient`](EncodedRecipient.md)
