[**Midnight.js API Reference v5.0.0-beta.6**](../../../../../README.md)

***

[Midnight.js API Reference](../../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../../README.md) / [compact-js/effect](../README.md) / validateEvents

# Variable: validateEvents

> `const` **validateEvents**: (`events`) => `Effect.Effect`\<`void`, [`ContractEventValidationError`](../namespaces/ContractEventValidationError/classes/ContractEventValidationError.md)\>

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/ContractEventValidator.d.ts:17

Validates that `events` is a well-formed array of contract log events.

Events reach this boundary as untrusted input, so they are decoded from `unknown` with a
Schema — yielding both the structural validation and a typed failure, rather than
hand-rolled `in`/`instanceof` checks.

## Parameters

### events

`unknown`

The value to validate.

## Returns

`Effect.Effect`\<`void`, [`ContractEventValidationError`](../namespaces/ContractEventValidationError/classes/ContractEventValidationError.md)\>

An Effect that fails with a
[ContractEventValidationError.ContractEventValidationError](../namespaces/ContractEventValidationError/classes/ContractEventValidationError.md) if `events` is not a valid
array of log events.
