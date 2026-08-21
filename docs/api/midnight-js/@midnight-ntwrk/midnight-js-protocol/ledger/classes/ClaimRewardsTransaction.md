[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [ledger](../README.md) / ClaimRewardsTransaction

# Class: ClaimRewardsTransaction\<S\>

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:3242

A request to allocate rewards, authorized by the reward's recipient

## Type Parameters

### S

`S` *extends* [`Signaturish`](../type-aliases/Signaturish.md)

## Constructors

### Constructor

> **new ClaimRewardsTransaction**\<`S`\>(`markerS`, `network_id`, `value`, `owner`, `nonce`, `signature`, `kind?`): `ClaimRewardsTransaction`\<`S`\>

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:3243

#### Parameters

##### markerS

`S`\[`"instance"`\]

##### network\_id

`string`

##### value

`bigint`

##### owner

[`SignatureVerifyingKey`](../type-aliases/SignatureVerifyingKey.md)

##### nonce

`string`

##### signature

`S`

##### kind?

[`ClaimKind`](../type-aliases/ClaimKind.md)

#### Returns

`ClaimRewardsTransaction`\<`S`\>

## Properties

### dataToSign

> `readonly` **dataToSign**: `Uint8Array`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:3260

The raw data any valid signature must be over to approve this transaction.

***

### kind

> `readonly` **kind**: [`ClaimKind`](../type-aliases/ClaimKind.md)

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:3287

The kind of claim being made, either a `Reward` or a `CardanoBridge` claim.

***

### nonce

> `readonly` **nonce**: `string`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:3277

The rewarded coin's randomness, preventing it from colliding with other coins.

***

### owner

> `readonly` **owner**: [`SignatureVerifyingKey`](../type-aliases/SignatureVerifyingKey.md)

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:3272

The signing key owning this coin.

***

### signature

> `readonly` **signature**: `S`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:3282

The signature on this request.

***

### value

> `readonly` **value**: `bigint`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:3267

The rewarded coin's value, in atomic units dependent on the currency

Bounded to be a non-negative 64-bit integer

## Methods

### addSignature()

> **addSignature**(`signature`): `ClaimRewardsTransaction`\<[`SignatureEnabled`](SignatureEnabled.md)\>

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:3247

#### Parameters

##### signature

[`Signature`](../type-aliases/Signature.md)

#### Returns

`ClaimRewardsTransaction`\<[`SignatureEnabled`](SignatureEnabled.md)\>

***

### eraseSignatures()

> **eraseSignatures**(): `ClaimRewardsTransaction`\<[`SignatureErased`](SignatureErased.md)\>

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:3249

#### Returns

`ClaimRewardsTransaction`\<[`SignatureErased`](SignatureErased.md)\>

***

### serialize()

> **serialize**(): `Uint8Array`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:3251

#### Returns

`Uint8Array`

***

### toString()

> **toString**(`compact?`): `string`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:3255

#### Parameters

##### compact?

`boolean`

#### Returns

`string`

***

### deserialize()

> `static` **deserialize**\<`S`\>(`markerS`, `raw`): `ClaimRewardsTransaction`\<`S`\>

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:3253

#### Type Parameters

##### S

`S` *extends* [`Signaturish`](../type-aliases/Signaturish.md)

#### Parameters

##### markerS

`S`\[`"instance"`\]

##### raw

`Uint8Array`

#### Returns

`ClaimRewardsTransaction`\<`S`\>

***

### new()

> `static` **new**(`network_id`, `value`, `owner`, `nonce`, `kind`): `ClaimRewardsTransaction`\<[`SignatureErased`](SignatureErased.md)\>

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:3245

#### Parameters

##### network\_id

`string`

##### value

`bigint`

##### owner

[`SignatureVerifyingKey`](../type-aliases/SignatureVerifyingKey.md)

##### nonce

`string`

##### kind

[`ClaimKind`](../type-aliases/ClaimKind.md)

#### Returns

`ClaimRewardsTransaction`\<[`SignatureErased`](SignatureErased.md)\>
