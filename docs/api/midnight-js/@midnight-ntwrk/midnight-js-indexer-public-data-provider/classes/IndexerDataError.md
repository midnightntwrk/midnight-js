[**Midnight.js API Reference v5.0.0-beta.7**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-indexer-public-data-provider](../README.md) / IndexerDataError

# Class: IndexerDataError

An error raised when indexer-returned data is structurally inconsistent
with the provider's expectations: unknown enum values, broken referential
integrity between related rows, or missing relations the schema implies
should be present.

Distinct from:
- [IndexerSubscriptionDataError](IndexerSubscriptionDataError.md) — missing top-level field on a
  subscription payload (server returned `null`/`undefined` for a field).
- [IndexerFormattedError](IndexerFormattedError.md) — errors the server explicitly returned
  as `GraphQLFormattedError` entries.
- [IndexerQueryError](IndexerQueryError.md) — transport / Apollo failure before data is
  parsed.

Construct via the static factory methods to ensure the message and
[context](#context) stay in sync.

## Extends

- [`IndexerError`](IndexerError.md)

## Constructors

### Constructor

> **new IndexerDataError**(`context`): `IndexerDataError`

#### Parameters

##### context

[`IndexerDataErrorContext`](../type-aliases/IndexerDataErrorContext.md)

#### Returns

`IndexerDataError`

#### Overrides

[`IndexerError`](IndexerError.md).[`constructor`](IndexerError.md#constructor)

## Properties

### context

> `readonly` **context**: [`IndexerDataErrorContext`](../type-aliases/IndexerDataErrorContext.md)

## Methods

### eraDisagreement()

> `static` **eraDisagreement**(`protocolVersion`, `reportedVersion`, `envelopeVersion`): `IndexerDataError`

#### Parameters

##### protocolVersion

`number`

##### reportedVersion

`"v8"` \| `"v9"`

##### envelopeVersion

`"v8"` \| `"v9"`

#### Returns

`IndexerDataError`

***

### malformedParametersEncoding()

> `static` **malformedParametersEncoding**(): `IndexerDataError`

#### Returns

`IndexerDataError`

***

### malformedStateEncoding()

> `static` **malformedStateEncoding**(): `IndexerDataError`

#### Returns

`IndexerDataError`

***

### malformedTransactionEncoding()

> `static` **malformedTransactionEncoding**(): `IndexerDataError`

#### Returns

`IndexerDataError`

***

### missingContractAction()

> `static` **missingContractAction**(`contractAddress`): `IndexerDataError`

#### Parameters

##### contractAddress

`string`

#### Returns

`IndexerDataError`

***

### missingEventField()

> `static` **missingEventField**(`typename`, `field`): `IndexerDataError`

#### Parameters

##### typename

`string`

##### field

`string`

#### Returns

`IndexerDataError`

***

### missingHeadBlock()

> `static` **missingHeadBlock**(): `IndexerDataError`

#### Returns

`IndexerDataError`

***

### missingIdentifier()

> `static` **missingIdentifier**(`contractAddress`, `actionIndex`, `identifiersLength`): `IndexerDataError`

#### Parameters

##### contractAddress

`string`

##### actionIndex

`number`

##### identifiersLength

`number`

#### Returns

`IndexerDataError`

***

### undatedState()

> `static` **undatedState**(): `IndexerDataError`

#### Returns

`IndexerDataError`

***

### unknownAddressKind()

> `static` **unknownAddressKind**(`typename`, `field`, `value`): `IndexerDataError`

#### Parameters

##### typename

`string`

##### field

`string`

##### value

`string`

#### Returns

`IndexerDataError`

***

### unknownEventType()

> `static` **unknownEventType**(`typename`): `IndexerDataError`

#### Parameters

##### typename

`string`

#### Returns

`IndexerDataError`

***

### unknownStatus()

> `static` **unknownStatus**(`value`): `IndexerDataError`

#### Parameters

##### value

`string`

#### Returns

`IndexerDataError`

***

### unsupportedDecodeEra()

> `static` **unsupportedDecodeEra**(`version`): `IndexerDataError`

#### Parameters

##### version

`"v8"` \| `"v9"`

#### Returns

`IndexerDataError`

***

### unsupportedParametersEra()

> `static` **unsupportedParametersEra**(`version`): `IndexerDataError`

#### Parameters

##### version

`"v8"` \| `"v9"`

#### Returns

`IndexerDataError`
