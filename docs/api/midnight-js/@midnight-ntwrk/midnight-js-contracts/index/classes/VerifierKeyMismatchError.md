[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / VerifierKeyMismatchError

# Class: VerifierKeyMismatchError

An error indicating that the verifier key compiled locally for a circuit does not byte-match the
key registered on chain for that entry point.

Raised BEFORE proving, which is the whole value of the check: a proof generated against a key the
chain does not hold is rejected on submission, after the cost of generating it has been paid.

This is also what catches a mis-dispatched operation — the wrong pipeline, or the wrong contract
address — because either one shows up here as a key that does not match the slot.

## See

[VerificationPath](../../documents/VerificationPath.md) for what this check buys and what it cannot classify.

## Extends

- [`MidnightJsError`](../../../midnight-js/classes/MidnightJsError.md)

## Constructors

### Constructor

> **new VerifierKeyMismatchError**(`circuitId`): `VerifierKeyMismatchError`

#### Parameters

##### circuitId

`string`

The entry point whose key did not match.

#### Returns

`VerifierKeyMismatchError`

#### Overrides

[`MidnightJsError`](../../../midnight-js/classes/MidnightJsError.md).[`constructor`](../../../midnight-js/classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../../midnight-js/type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../../midnight-js/classes/MidnightJsError.md).[`category`](../../../midnight-js/classes/MidnightJsError.md#category)

***

### circuitId

> `readonly` **circuitId**: `string`

The entry point whose key did not match.

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_C_VERIFIER_KEY_MISMATCH"` = `CONTRACTS_ERROR_CODES.VERIFIER_KEY_MISMATCH`

#### Overrides

[`MidnightJsError`](../../../midnight-js/classes/MidnightJsError.md).[`code`](../../../midnight-js/classes/MidnightJsError.md#code)
