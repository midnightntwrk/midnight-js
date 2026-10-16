[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / Ledger8PayloadUnsupportedError

# Class: Ledger8PayloadUnsupportedError

Thrown by a provider that only speaks the v9 ledger runtime when it is
handed a v8 payload — serialized, tag-prefixed bytes instead of a live v9
transaction object.

Catching this does NOT mean "the framework cannot do it yet". It means the
specific implementation behind that method does not serve v8 payloads — permanently
for the lifting adapters, contingently for a concrete provider.

Catch it via its stable `code`, using `hasErrorCode` from
`@midnight-ntwrk/midnight-js-utils`.

## See

ProviderEraDeclarations for which providers raise it and why, and for
how it differs from [ProviderEraUnsupportedError](ProviderEraUnsupportedError.md).

## Extends

- [`MidnightJsError`](../../classes/MidnightJsError.md)

## Constructors

### Constructor

> **new Ledger8PayloadUnsupportedError**(`method`, `byteLength?`): `Ledger8PayloadUnsupportedError`

#### Parameters

##### method

[`TransactionMethod`](../type-aliases/TransactionMethod.md)

The provider method that received the payload.

##### byteLength?

`number`

Size of the rejected payload, recorded so a report of
                  this error says something about what arrived. `undefined`
                  when the payload's `txBytes` was missing or not a
                  `Uint8Array` — which the message states, because that
                  caller has a second problem worth knowing about.

#### Returns

`Ledger8PayloadUnsupportedError`

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`constructor`](../../classes/MidnightJsError.md#constructor)

## Properties

### byteLength?

> `readonly` `optional` **byteLength?**: `number`

***

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`category`](../../classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_PR_LEDGER8_PAYLOAD_UNSUPPORTED"`

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`code`](../../classes/MidnightJsError.md#code)

***

### method

> `readonly` **method**: [`TransactionMethod`](../type-aliases/TransactionMethod.md)
