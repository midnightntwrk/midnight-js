[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / LedgerParametersUnservedError

# Class: LedgerParametersUnservedError

An error indicating that the read surface served a contract state without the block's ledger
parameters, so a call cannot be composed against the cost model the chain is running.

A caller that genuinely cannot read the chain selects the compatibility path by name — see
`INITIAL_LEDGER_PARAMETERS` in `midnight-js-protocol`.

## See

[ErrorTaxonomy](../../documents/ErrorTaxonomy.md) for why this refuses rather than substituting the ledger's initial
parameters.

## Extends

- [`MidnightJsError`](../../../midnight-js/classes/MidnightJsError.md)

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

[`MidnightJsError`](../../../midnight-js/classes/MidnightJsError.md).[`constructor`](../../../midnight-js/classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../../midnight-js/type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../../midnight-js/classes/MidnightJsError.md).[`category`](../../../midnight-js/classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_C_LEDGER_PARAMETERS_UNSERVED"` = `CONTRACTS_ERROR_CODES.LEDGER_PARAMETERS_UNSERVED`

#### Overrides

[`MidnightJsError`](../../../midnight-js/classes/MidnightJsError.md).[`code`](../../../midnight-js/classes/MidnightJsError.md#code)

***

### contractAddress

> `readonly` **contractAddress**: `string`

The contract whose state was read without its block's parameters.
