[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-indexer-public-data-provider](../../README.md) / [index](../README.md) / IndexerSubscriptionDataError

# Class: IndexerSubscriptionDataError

An error raised when an indexer subscription payload is missing a field
the provider relies on. Carries the missing field name for diagnostics.

## Extends

- [`IndexerError`](IndexerError.md)

## Constructors

### Constructor

> **new IndexerSubscriptionDataError**(`missingField`): `IndexerSubscriptionDataError`

#### Parameters

##### missingField

[`IndexerSubscriptionField`](../type-aliases/IndexerSubscriptionField.md)

#### Returns

`IndexerSubscriptionDataError`

#### Overrides

[`IndexerError`](IndexerError.md).[`constructor`](IndexerError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../../midnight-js/type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`IndexerError`](IndexerError.md).[`category`](IndexerError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_PR_INDEXER_SUBSCRIPTION_DATA_INVALID"` = `PROVIDER_ERROR_CODES.INDEXER_SUBSCRIPTION_DATA_INVALID`

#### Overrides

[`IndexerError`](IndexerError.md).[`code`](IndexerError.md#code)

***

### missingField

> `readonly` **missingField**: [`IndexerSubscriptionField`](../type-aliases/IndexerSubscriptionField.md)
