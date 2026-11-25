[**Midnight.js API Reference v5.0.3**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnightntwrk/midnight-js-indexer-public-data-provider](../../README.md) / [index](../README.md) / IndexerPayloadTooLargeError

# Class: IndexerPayloadTooLargeError

A compressed subscription message inflated beyond the size limit.

## Extends

- [`IndexerError`](IndexerError.md)

## Constructors

### Constructor

> **new IndexerPayloadTooLargeError**(`message`): `IndexerPayloadTooLargeError`

#### Parameters

##### message

`string`

#### Returns

`IndexerPayloadTooLargeError`

#### Overrides

[`IndexerError`](IndexerError.md).[`constructor`](IndexerError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../../midnight-js/index/type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`IndexerError`](IndexerError.md).[`category`](IndexerError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_PR_INDEXER_PAYLOAD_TOO_LARGE"` = `PROVIDER_ERROR_CODES.INDEXER_PAYLOAD_TOO_LARGE`

#### Overrides

[`IndexerError`](IndexerError.md).[`code`](IndexerError.md#code)
