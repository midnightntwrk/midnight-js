[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [compact-runtime](../README.md) / ShieldedCoinRecipientDescriptor

# Variable: ShieldedCoinRecipientDescriptor

> `const` **ShieldedCoinRecipientDescriptor**: `object`

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/compact-types.d.ts:222

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

##### is\_left

> **is\_left**: `boolean`

##### left

> **left**: `object`

###### left.bytes

> **bytes**: `Uint8Array`

##### right

> **right**: `object`

###### right.bytes

> **bytes**: `Uint8Array`

### toValue()

> **toValue**(`value`): [`Value`](../../onchain-runtime/type-aliases/Value.md)

#### Parameters

##### value

###### is_left

`boolean`

###### left

\{ `bytes`: `Uint8Array`; \}

###### left.bytes

`Uint8Array`

###### right

\{ `bytes`: `Uint8Array`; \}

###### right.bytes

`Uint8Array`

#### Returns

[`Value`](../../onchain-runtime/type-aliases/Value.md)
