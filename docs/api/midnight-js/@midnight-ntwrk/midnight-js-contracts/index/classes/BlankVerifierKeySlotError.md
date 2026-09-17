[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / BlankVerifierKeySlotError

# Class: BlankVerifierKeySlotError

An error indicating that a contract's on-chain entry point declares no verifier key at all.

An absent key means that entry point was never deployed — the shape a constructor-built state
has before a deploy fills it in — rather than a key that happens to be empty
(`packages/protocol/docs/fail-closed-decoding.md`). There is nothing for a proof to be verified
against, so the call is refused before any proving happens.

## Extends

- `Error`

## Constructors

### Constructor

> **new BlankVerifierKeySlotError**(`circuitId`): `BlankVerifierKeySlotError`

#### Parameters

##### circuitId

`string`

The entry point whose slot is blank.

#### Returns

`BlankVerifierKeySlotError`

#### Overrides

`Error.constructor`

## Properties

### circuitId

> `readonly` **circuitId**: `string`

The entry point whose slot is blank.

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_C_BLANK_VERIFIER_KEY_SLOT"` = `CONTRACTS_ERROR_CODES.BLANK_VERIFIER_KEY_SLOT`
