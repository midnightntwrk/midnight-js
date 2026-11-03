[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../../README.md) / [index](../README.md) / ProviderEraUnsupportedError

# Class: ProviderEraUnsupportedError

Thrown when the provider behind one of the three transaction methods does
not serve the ledger era a transaction needs.

Raised in two places, with the same remedy — wire a provider that serves the
era:

- by `assertProvidersSupportEra`, from the providers' `supportedEras` alone,
  before an operation starts, so a transaction the set cannot carry end to
  end is refused before its proof is paid for;
- by a provider built with a `create*FromHandlers` factory, when a handle
  arrives in an era it has no handler for. A declaration is a claim nothing
  verifies, so the method refuses again before doing any work.

Catch it via its stable `code`, using `hasErrorCode` from
`@midnight-ntwrk/midnight-js-utils`.

## Extends

- [`MidnightJsError`](../../../midnight-js-protocol/index/classes/MidnightJsError.md)

## Constructors

### Constructor

> **new ProviderEraUnsupportedError**(`method`, `era`, `declared`): `ProviderEraUnsupportedError`

#### Parameters

##### method

[`TransactionMethod`](../type-aliases/TransactionMethod.md)

The method whose provider does not declare `era`. Reported
              in pipeline order, so this names the first method the
              operation would have reached.

##### era

`string`

The ledger era the operation needs every provider to serve.

##### declared

readonly `string`[]

What that provider does declare. An empty list is the
                honest reading of a provider carrying no declaration at all
                — which a JavaScript caller, or a consumer built against an
                older `midnight-js-types`, really can supply.

#### Returns

`ProviderEraUnsupportedError`

#### Overrides

[`MidnightJsError`](../../../midnight-js-protocol/index/classes/MidnightJsError.md).[`constructor`](../../../midnight-js-protocol/index/classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../../midnight-js-protocol/index/type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../../midnight-js-protocol/index/classes/MidnightJsError.md).[`category`](../../../midnight-js-protocol/index/classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_PR_PROVIDER_ERA_UNSUPPORTED"` = `PROVIDER_ERA_UNSUPPORTED`

#### Overrides

[`MidnightJsError`](../../../midnight-js-protocol/index/classes/MidnightJsError.md).[`code`](../../../midnight-js-protocol/index/classes/MidnightJsError.md#code)

***

### declared

> `readonly` **declared**: readonly `string`[]

What that provider does declare. An empty list is the
                honest reading of a provider carrying no declaration at all
                — which a JavaScript caller, or a consumer built against an
                older `midnight-js-types`, really can supply.

***

### era

> `readonly` **era**: `string`

The ledger era the operation needs every provider to serve.

***

### method

> `readonly` **method**: [`TransactionMethod`](../type-aliases/TransactionMethod.md)

The method whose provider does not declare `era`. Reported
              in pipeline order, so this names the first method the
              operation would have reached.
