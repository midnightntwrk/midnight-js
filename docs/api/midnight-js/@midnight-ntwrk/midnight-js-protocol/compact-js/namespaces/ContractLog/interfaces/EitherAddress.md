[**Midnight.js API Reference v5.0.0-beta.7**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../../../README.md) / [compact-js](../../../README.md) / [ContractLog](../README.md) / EitherAddress

# Interface: EitherAddress

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/ContractLog.d.ts:56

The recipient/sender side of an unshielded event — an `Either<ZswapCoinPublicKey, ContractAddress>`.
`kind` is the `Either` discriminant; `bytes` are the raw 32-byte address.

## Properties

### bytes

> `readonly` **bytes**: `Uint8Array`

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/ContractLog.d.ts:58

***

### kind

> `readonly` **kind**: `"coin-public-key"` \| `"contract-address"`

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/ContractLog.d.ts:57
