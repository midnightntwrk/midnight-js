[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [compact-runtime](../README.md) / ShieldedCoinInfoDescriptor

# Variable: ShieldedCoinInfoDescriptor

> `const` **ShieldedCoinInfoDescriptor**: `object`

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/compact-types.d.ts:191

## Type Declaration

### alignment()

> **alignment**(): [`Alignment`](../../onchain-runtime/type-aliases/Alignment.md)

#### Returns

[`Alignment`](../../onchain-runtime/type-aliases/Alignment.md)

### fromValue()

> **fromValue**(`value`): `object`

#### Parameters

##### value

[`Value`](../../onchain-runtime/type-aliases/Value.md)

#### Returns

`object`

##### color

> **color**: `Uint8Array`

##### nonce

> **nonce**: `Uint8Array`

##### value

> **value**: `bigint`

### toValue()

> **toValue**(`value`): [`Value`](../../onchain-runtime/type-aliases/Value.md)

#### Parameters

##### value

###### color

`Uint8Array`

###### nonce

`Uint8Array`

###### value

`bigint`

#### Returns

[`Value`](../../onchain-runtime/type-aliases/Value.md)
