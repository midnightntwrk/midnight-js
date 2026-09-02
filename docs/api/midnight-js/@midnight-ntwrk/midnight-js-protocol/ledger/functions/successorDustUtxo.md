[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [ledger](../README.md) / successorDustUtxo

# Function: successorDustUtxo()

> **successorDustUtxo**(`qdo`, `now`, `subtractFee`, `newCommitmentIndex`, `genInfo`, `sk`, `dustParams`): [`QualifiedDustOutput`](../type-aliases/QualifiedDustOutput.md)

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2738

Returns a new Dust UTXO with a reduced value and the sequential nonce

## Parameters

### qdo

[`QualifiedDustOutput`](../type-aliases/QualifiedDustOutput.md)

### now

`Date`

### subtractFee

`bigint`

### newCommitmentIndex

`bigint`

### genInfo

[`DustGenerationInfo`](../type-aliases/DustGenerationInfo.md)

### sk

[`DustSecretKey`](../classes/DustSecretKey.md)

### dustParams

[`DustParameters`](../classes/DustParameters.md)

## Returns

[`QualifiedDustOutput`](../type-aliases/QualifiedDustOutput.md)
