[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [compact-runtime](../README.md) / ZswapLocalState

# Interface: ZswapLocalState

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/zswap.d.ts:23

Tracks the coins consumed and produced throughout circuit execution.

## Properties

### coinPublicKey

> **coinPublicKey**: `string`

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/zswap.d.ts:27

The Zswap coin public key of the user executing the circuit.

***

### currentIndex

> **currentIndex**: `bigint`

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/zswap.d.ts:31

The Merkle tree index of the next coin produced.

***

### inputs

> **inputs**: [`QualifiedShieldedCoinInfo`](../../onchain-runtime/type-aliases/QualifiedShieldedCoinInfo.md)[]

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/zswap.d.ts:35

The coins consumed as inputs to the circuit.

***

### outputs

> **outputs**: `object`[]

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/zswap.d.ts:39

The coins produced as outputs from the circuit.

#### coinInfo

> **coinInfo**: [`ShieldedCoinInfo`](../../onchain-runtime/type-aliases/ShieldedCoinInfo.md)

#### recipient

> **recipient**: [`Recipient`](Recipient.md)
