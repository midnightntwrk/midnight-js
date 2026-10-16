[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / ProviderEraUnsupportedError

# Class: ProviderEraUnsupportedError

Thrown BEFORE an operation starts, when the provider behind one of the three
transaction methods declares that it does not serve the ledger era that operation needs.

This is a pre-flight refusal, not a payload rejection. It is raised by
`assertProvidersSupportEra` from the provider set alone — no payload has been
built, no proof has been requested — and it exists so that an operation whose
wallet cannot balance the result is refused before its proof is paid for,
rather than after.

Distinct from [Ledger8PayloadUnsupportedError](Ledger8PayloadUnsupportedError.md) on purpose, and the two are
not interchangeable:

- This error means the provider SAID SO, in `supportedEras`, before it was
  asked to do anything. The remedy is to wire a different provider.
- `Ledger8PayloadUnsupportedError` means a payload reached a method that will not
  take it. That remains the defence in depth: a declaration is a claim by the
  implementation, and nothing verifies it, so the narrowing in each method still
  runs and still reports its own error when a declaration turns out to be
  wrong.

Catch it via its stable `code`, using `hasErrorCode` from
`@midnight-ntwrk/midnight-js-utils`.

## Extends

- [`MidnightJsError`](../../classes/MidnightJsError.md)

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

[`MidnightJsError`](../../classes/MidnightJsError.md).[`constructor`](../../classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`category`](../../classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_PR_PROVIDER_ERA_UNSUPPORTED"`

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`code`](../../classes/MidnightJsError.md#code)

***

### declared

> `readonly` **declared**: readonly `string`[]

***

### era

> `readonly` **era**: `string`

***

### method

> `readonly` **method**: [`TransactionMethod`](../type-aliases/TransactionMethod.md)
