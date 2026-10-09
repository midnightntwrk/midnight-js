[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / LedgerParametersUnservedError

# Class: LedgerParametersUnservedError

An error indicating that the read surface served a contract state without the block's ledger
parameters, so a call cannot be composed against the cost model the chain is running.

A caller that genuinely cannot read the chain selects the compatibility path by name — see
`INITIAL_LEDGER_PARAMETERS` in `midnight-js-protocol`.

## See

[ErrorTaxonomy](../../documents/ErrorTaxonomy.md) for why this refuses rather than substituting the ledger's initial
parameters.

## Extends

- [`MidnightJsError`](../../classes/MidnightJsError.md)

## Constructors

### Constructor

> **new LedgerParametersUnservedError**(`contractAddress`): `LedgerParametersUnservedError`

#### Parameters

##### contractAddress

`string`

The contract whose state was read without its block's parameters.

#### Returns

`LedgerParametersUnservedError`

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`constructor`](../../classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`category`](../../classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_C_LEDGER_PARAMETERS_UNSERVED"`

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`code`](../../classes/MidnightJsError.md#code)

***

### contractAddress

> `readonly` **contractAddress**: `string`
