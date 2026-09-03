[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [ledger](../README.md) / TransactionCostModel

# Class: TransactionCostModel

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2789

## Properties

### baselineCost

> `readonly` **baselineCost**: [`RunningCost`](../type-aliases/RunningCost.md)

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2820

A baseline cost to begin with

***

### inputFeeOverhead

> `readonly` **inputFeeOverhead**: `bigint`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2800

The increase in fees to expect from adding a new input to a transaction

***

### outputFeeOverhead

> `readonly` **outputFeeOverhead**: `bigint`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2804

The increase in fees to expect from adding a new output to a transaction

***

### runtimeCostModel

> `readonly` **runtimeCostModel**: [`CostModel`](CostModel.md)

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2815

A cost model for calculating transaction fees

## Methods

### serialize()

> **serialize**(): `Uint8Array`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2806

#### Returns

`Uint8Array`

***

### toString()

> **toString**(`compact?`): `string`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2810

#### Parameters

##### compact?

`boolean`

#### Returns

`string`

***

### deserialize()

> `static` **deserialize**(`raw`): `TransactionCostModel`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2808

#### Parameters

##### raw

`Uint8Array`

#### Returns

`TransactionCostModel`

***

### initialTransactionCostModel()

> `static` **initialTransactionCostModel**(): `TransactionCostModel`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2795

The initial cost model of Midnight

#### Returns

`TransactionCostModel`
