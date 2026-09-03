[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [ledger](../README.md) / StateMap

# Class: StateMap

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1028

Represents a key-value map, where keys are [AlignedValue](../type-aliases/AlignedValue.md)s, and values
are [StateValue](StateValue.md)s.

## Constructors

### Constructor

> **new StateMap**(): `StateMap`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1029

#### Returns

`StateMap`

## Methods

### get()

> **get**(`key`): [`StateValue`](StateValue.md) \| `undefined`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1033

#### Parameters

##### key

[`AlignedValue`](../type-aliases/AlignedValue.md)

#### Returns

[`StateValue`](StateValue.md) \| `undefined`

***

### insert()

> **insert**(`key`, `value`): `StateMap`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1035

#### Parameters

##### key

[`AlignedValue`](../type-aliases/AlignedValue.md)

##### value

[`StateValue`](StateValue.md)

#### Returns

`StateMap`

***

### keys()

> **keys**(): [`AlignedValue`](../type-aliases/AlignedValue.md)[]

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1031

#### Returns

[`AlignedValue`](../type-aliases/AlignedValue.md)[]

***

### remove()

> **remove**(`key`): `StateMap`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1037

#### Parameters

##### key

[`AlignedValue`](../type-aliases/AlignedValue.md)

#### Returns

`StateMap`

***

### toString()

> **toString**(`compact?`): `string`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1039

#### Parameters

##### compact?

`boolean`

#### Returns

`string`
