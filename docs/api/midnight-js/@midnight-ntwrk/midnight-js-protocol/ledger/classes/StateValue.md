[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [ledger](../README.md) / StateValue

# Class: StateValue

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1067

Represents the core of a contract's state, and recursively represents each
of its components.

There are different *classes* of state values:
- `null`
- Cells of [AlignedValue](../type-aliases/AlignedValue.md)s
- Maps from [AlignedValue](../type-aliases/AlignedValue.md)s to state values
- Bounded Merkle trees containing [AlignedValue](../type-aliases/AlignedValue.md) leaves
- Short (\<= 15 element) arrays of state values

State values are *immutable*, any operations that mutate states will return
a new state instead.

## Methods

### arrayPush()

> **arrayPush**(`value`): `StateValue`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1082

#### Parameters

##### value

`StateValue`

#### Returns

`StateValue`

***

### asArray()

> **asArray**(): `StateValue`[] \| `undefined`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1090

#### Returns

`StateValue`[] \| `undefined`

***

### asBoundedMerkleTree()

> **asBoundedMerkleTree**(): [`StateBoundedMerkleTree`](StateBoundedMerkleTree.md) \| `undefined`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1088

#### Returns

[`StateBoundedMerkleTree`](StateBoundedMerkleTree.md) \| `undefined`

***

### asCell()

> **asCell**(): [`AlignedValue`](../type-aliases/AlignedValue.md)

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1084

#### Returns

[`AlignedValue`](../type-aliases/AlignedValue.md)

***

### asMap()

> **asMap**(): [`StateMap`](StateMap.md) \| `undefined`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1086

#### Returns

[`StateMap`](StateMap.md) \| `undefined`

***

### encode()

> **encode**(): [`EncodedStateValue`](../type-aliases/EncodedStateValue.md)

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1099

**`Internal`**

#### Returns

[`EncodedStateValue`](../type-aliases/EncodedStateValue.md)

***

### logSize()

> **logSize**(): `number`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1092

#### Returns

`number`

***

### toString()

> **toString**(`compact?`): `string`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1094

#### Parameters

##### compact?

`boolean`

#### Returns

`string`

***

### type()

> **type**(): `"map"` \| `"null"` \| `"cell"` \| `"array"` \| `"boundedMerkleTree"`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1070

#### Returns

`"map"` \| `"null"` \| `"cell"` \| `"array"` \| `"boundedMerkleTree"`

***

### decode()

> `static` **decode**(`value`): `StateValue`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1104

**`Internal`**

#### Parameters

##### value

[`EncodedStateValue`](../type-aliases/EncodedStateValue.md)

#### Returns

`StateValue`

***

### newArray()

> `static` **newArray**(): `StateValue`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1080

#### Returns

`StateValue`

***

### newBoundedMerkleTree()

> `static` **newBoundedMerkleTree**(`tree`): `StateValue`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1078

#### Parameters

##### tree

[`StateBoundedMerkleTree`](StateBoundedMerkleTree.md)

#### Returns

`StateValue`

***

### newCell()

> `static` **newCell**(`value`): `StateValue`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1074

#### Parameters

##### value

[`AlignedValue`](../type-aliases/AlignedValue.md)

#### Returns

`StateValue`

***

### newMap()

> `static` **newMap**(`map`): `StateValue`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1076

#### Parameters

##### map

[`StateMap`](StateMap.md)

#### Returns

`StateValue`

***

### newNull()

> `static` **newNull**(): `StateValue`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1072

#### Returns

`StateValue`
