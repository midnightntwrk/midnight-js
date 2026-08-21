[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [ledger](../README.md) / ContractState

# Class: ContractState

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:808

The state of a contract, consisting primarily of the [data](#data) accessible
directly to the contract, and the map of [ContractOperation](ContractOperation.md)s that can
be called on it, the keys of which can be accessed with [operations](#operations),
and the individual operations can be read with [operation](#operation) and written
to with [setOperation](#setoperation).

## Constructors

### Constructor

> **new ContractState**(): `ContractState`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:812

Creates a blank contract state

#### Returns

`ContractState`

## Properties

### balance

> **balance**: `Map`\<[`TokenType`](../type-aliases/TokenType.md), `bigint`\>

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:852

The public balances held by this contract

***

### data

> **data**: [`ChargedState`](ChargedState.md)

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:844

The current value of the primary state of the contract

***

### maintenanceAuthority

> **maintenanceAuthority**: [`ContractMaintenanceAuthority`](ContractMaintenanceAuthority.md)

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:848

The maintenance authority associated with this contract

## Methods

### operation()

> **operation**(`operation`): [`ContractOperation`](ContractOperation.md) \| `undefined`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:822

Get the operation at a specific entry point name

#### Parameters

##### operation

`string` \| `Uint8Array`\<`ArrayBufferLike`\>

#### Returns

[`ContractOperation`](ContractOperation.md) \| `undefined`

***

### operations()

> **operations**(): (`string` \| `Uint8Array`\<`ArrayBufferLike`\>)[]

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:817

Return a list of the entry points currently registered on this contract

#### Returns

(`string` \| `Uint8Array`\<`ArrayBufferLike`\>)[]

***

### query()

> **query**(`query`, `cost_model`): [`GatherResult`](../type-aliases/GatherResult.md)[]

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:833

Runs a series of operations against the current state, and returns the
results

#### Parameters

##### query

[`Op`](../type-aliases/Op.md)\<`null`\>[]

##### cost\_model

[`CostModel`](CostModel.md)

#### Returns

[`GatherResult`](../type-aliases/GatherResult.md)[]

***

### serialize()

> **serialize**(): `Uint8Array`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:835

#### Returns

`Uint8Array`

***

### setOperation()

> **setOperation**(`operation`, `value`): `void`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:827

Set a specific entry point name to contain a given operation

#### Parameters

##### operation

`string` \| `Uint8Array`\<`ArrayBufferLike`\>

##### value

[`ContractOperation`](ContractOperation.md)

#### Returns

`void`

***

### toString()

> **toString**(`compact?`): `string`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:839

#### Parameters

##### compact?

`boolean`

#### Returns

`string`

***

### deserialize()

> `static` **deserialize**(`raw`): `ContractState`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:837

#### Parameters

##### raw

`Uint8Array`

#### Returns

`ContractState`
