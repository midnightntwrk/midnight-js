[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [onchain-runtime](../README.md) / VmStack

# Class: VmStack

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:1135

Represents the state of the VM's stack at a specific point. The stack is an
array of [StateValue](StateValue.md)s, each of which is also annotated with whether
it is "strong" or "weak"; that is, whether it is permitted to be stored
on-chain or not.

## Constructors

### Constructor

> **new VmStack**(): `VmStack`

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:1136

#### Returns

`VmStack`

## Methods

### get()

> **get**(`idx`): [`StateValue`](StateValue.md) \| `undefined`

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:1144

#### Parameters

##### idx

`number`

#### Returns

[`StateValue`](StateValue.md) \| `undefined`

***

### isStrong()

> **isStrong**(`idx`): `boolean` \| `undefined`

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:1146

#### Parameters

##### idx

`number`

#### Returns

`boolean` \| `undefined`

***

### length()

> **length**(): `number`

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:1142

#### Returns

`number`

***

### push()

> **push**(`value`, `is_strong`): `void`

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:1138

#### Parameters

##### value

[`StateValue`](StateValue.md)

##### is\_strong

`boolean`

#### Returns

`void`

***

### removeLast()

> **removeLast**(): `void`

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:1140

#### Returns

`void`

***

### toString()

> **toString**(`compact?`): `string`

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:1148

#### Parameters

##### compact?

`boolean`

#### Returns

`string`
