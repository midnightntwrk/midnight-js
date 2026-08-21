[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [ledger](../README.md) / LedgerParameters

# Class: LedgerParameters

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2744

Parameters used by the Midnight ledger, including transaction fees and
bounds

## Properties

### dust

> `readonly` **dust**: [`DustParameters`](DustParameters.md)

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2759

The parameters associated with DUST.

***

### feePrices

> `readonly` **feePrices**: [`FeePrices`](../type-aliases/FeePrices.md)

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2786

The fee prices for transaction

***

### transactionCostModel

> `readonly` **transactionCostModel**: [`TransactionCostModel`](TransactionCostModel.md)

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2755

The cost model used for transaction fees contained in these parameters

## Methods

### maxPriceAdjustment()

> **maxPriceAdjustment**(): `number`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2768

The maximum price adjustment per block with the current parameters, as a multiplicative
factor (that is: 1.1 would indicate a 10% adjustment). Will always return the positive (>1)
adjustment factor. Note that negative adjustments are the additive inverse (1.1 has a
corresponding 0.9 downward adjustment), *not* the multiplicative as might reasonably be
assumed.

#### Returns

`number`

***

### normalizeFullness()

> **normalizeFullness**(`fullness`): [`NormalizedCost`](../type-aliases/NormalizedCost.md)

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2781

Normalizes a detailed block fullness cost to the block limits.

#### Parameters

##### fullness

[`SyntheticCost`](../type-aliases/SyntheticCost.md)

#### Returns

[`NormalizedCost`](../type-aliases/NormalizedCost.md)

#### Throws

if any of the block limits is exceeded

***

### serialize()

> **serialize**(): `Uint8Array`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2770

#### Returns

`Uint8Array`

***

### toString()

> **toString**(`compact?`): `string`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2774

#### Parameters

##### compact?

`boolean`

#### Returns

`string`

***

### deserialize()

> `static` **deserialize**(`raw`): `LedgerParameters`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2772

#### Parameters

##### raw

`Uint8Array`

#### Returns

`LedgerParameters`

***

### initialParameters()

> `static` **initialParameters**(): `LedgerParameters`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2750

The initial parameters of Midnight

#### Returns

`LedgerParameters`
