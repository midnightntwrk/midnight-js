[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / UnusableEraEntryError

# Class: UnusableEraEntryError

Thrown by a provider factory given an era entry it cannot use: a `currentEra`
that is not the [EraEntryShape](../type-aliases/EraEntryShape.md) the factory needs, or a retained-era
entry that is neither `undefined` nor that shape. Raised at construction, so
`supportedEras` never claims an era no entry can serve.

The types rule these entries out, so it is reachable only from JavaScript or
across an untyped boundary. The factory checks shape only: an entry built for
the wrong era, such as a `ProvingProvider` with the other era's key
material, still passes.

Catch it via its stable `code`, using `hasErrorCode` from
`@midnight-ntwrk/midnight-js-utils`.

## Extends

- [`MidnightJsError`](../../classes/MidnightJsError.md)

## Constructors

### Constructor

> **new UnusableEraEntryError**(`seam`, `era`, `expected`, `received`): `UnusableEraEntryError`

#### Parameters

##### seam

[`ProviderSeam`](../type-aliases/ProviderSeam.md)

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

[`MidnightJsError`](../../classes/MidnightJsError.md).[`constructor`](../../classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`category`](../../classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_PR_UNUSABLE_ERA_ENTRY"`

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`code`](../../classes/MidnightJsError.md#code)

***

### era

> `readonly` **era**: `"v8"` \| `"v9"`

***

### expected

> `readonly` **expected**: [`EraEntryShape`](../type-aliases/EraEntryShape.md)

***

### received

> `readonly` **received**: `string`

***

### seam

> `readonly` **seam**: [`ProviderSeam`](../type-aliases/ProviderSeam.md)
