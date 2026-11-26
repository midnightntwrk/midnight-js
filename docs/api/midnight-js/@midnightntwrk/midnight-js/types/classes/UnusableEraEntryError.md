[**Midnight.js API Reference v5.0.3**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnightntwrk/midnight-js](../../README.md) / [types](../README.md) / UnusableEraEntryError

# Class: UnusableEraEntryError

Thrown by a provider factory given an era entry that is neither `undefined`
nor the [EraEntryShape](../type-aliases/EraEntryShape.md) the factory needs. Raised at construction, so
`supportedEras` never claims an era no entry can serve.

The types rule these entries out, so it is reachable only from JavaScript or
across an untyped boundary. The factory checks shape only: an entry built for
the wrong era, such as a `ProvingProvider` with the other era's key
material, still passes.

Catch it via its stable `code`, using `hasErrorCode` from
`@midnightntwrk/midnight-js-utils`.

## Extends

- [`MidnightJsError`](../../index/classes/MidnightJsError.md)

## Constructors

### Constructor

> **new UnusableEraEntryError**(`method`, `era`, `expected`, `received`): `UnusableEraEntryError`

#### Parameters

##### method

[`TransactionMethod`](../type-aliases/TransactionMethod.md)

The provider method the rejected entry would have served.

##### era

`"v8"` \| `"v9"`

The ledger era whose entry was rejected.

##### expected

[`EraEntryShape`](../type-aliases/EraEntryShape.md)

The shape the factory needs for that entry.

##### received

`string`

What was passed instead, for the message only: for example
                `'null'`, `'a class'`, `'an instance of Map'`, or
                `"an object without callable 'prove'"`.

#### Returns

`UnusableEraEntryError`

#### Overrides

[`MidnightJsError`](../../index/classes/MidnightJsError.md).[`constructor`](../../index/classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../index/type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../index/classes/MidnightJsError.md).[`category`](../../index/classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_PR_UNUSABLE_ERA_ENTRY"`

#### Overrides

[`MidnightJsError`](../../index/classes/MidnightJsError.md).[`code`](../../index/classes/MidnightJsError.md#code)

***

### era

> `readonly` **era**: `"v8"` \| `"v9"`

***

### expected

> `readonly` **expected**: [`EraEntryShape`](../type-aliases/EraEntryShape.md)

***

### method

> `readonly` **method**: [`TransactionMethod`](../type-aliases/TransactionMethod.md)

***

### received

> `readonly` **received**: `string`
