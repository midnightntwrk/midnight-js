[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../../README.md) / [index](../README.md) / UnusableEraArmError

# Class: UnusableEraArmError

Thrown by a provider factory given an era arm it cannot use: a current-era
arm that is not the [EraArmShape](../type-aliases/EraArmShape.md) the factory needs, or a retained-era
entry that is neither `undefined` nor that shape. Raised at construction, so
`supportedEras` never claims an era no arm can serve.

The types rule these arms out, so it is reachable only from JavaScript or
across an untyped boundary. The factory checks shape only: an arm built for
the wrong era, such as a `ProvingProvider` with the other era's key
material, still passes.

Catch it via its stable `code`, using `hasErrorCode` from
`@midnight-ntwrk/midnight-js-utils`.

## Extends

- [`MidnightJsError`](../../../midnight-js-protocol/index/classes/MidnightJsError.md)

## Constructors

### Constructor

> **new UnusableEraArmError**(`seam`, `era`, `expected`, `received`): `UnusableEraArmError`

#### Parameters

##### seam

[`ProviderSeam`](../type-aliases/ProviderSeam.md)

The provider method the rejected arm would have served.

##### era

`"v8"` \| `"v9"`

The ledger era whose arm was rejected.

##### expected

[`EraArmShape`](../type-aliases/EraArmShape.md)

The shape the factory needs for that arm.

##### received

`string`

What was passed instead, for the message only: for example
                `'null'`, `'a class'`, `'an instance of Map'`, or
                `"an object without callable 'prove'"`.

#### Returns

`UnusableEraArmError`

#### Overrides

[`MidnightJsError`](../../../midnight-js-protocol/index/classes/MidnightJsError.md).[`constructor`](../../../midnight-js-protocol/index/classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../../midnight-js-protocol/index/type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../../midnight-js-protocol/index/classes/MidnightJsError.md).[`category`](../../../midnight-js-protocol/index/classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_PR_UNUSABLE_ERA_ARM"` = `UNUSABLE_ERA_ARM`

#### Overrides

[`MidnightJsError`](../../../midnight-js-protocol/index/classes/MidnightJsError.md).[`code`](../../../midnight-js-protocol/index/classes/MidnightJsError.md#code)

***

### era

> `readonly` **era**: `"v8"` \| `"v9"`

The ledger era whose arm was rejected.

***

### expected

> `readonly` **expected**: [`EraArmShape`](../type-aliases/EraArmShape.md)

The shape the factory needs for that arm.

***

### received

> `readonly` **received**: `string`

What was passed instead, for the message only: for example
                `'null'`, `'a class'`, `'an instance of Map'`, or
                `"an object without callable 'prove'"`.

***

### seam

> `readonly` **seam**: [`ProviderSeam`](../type-aliases/ProviderSeam.md)

The provider method the rejected arm would have served.
