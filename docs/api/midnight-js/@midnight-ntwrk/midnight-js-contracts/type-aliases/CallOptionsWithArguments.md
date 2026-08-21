[**Midnight.js API Reference v5.0.0-beta.6**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../README.md) / CallOptionsWithArguments

# Type Alias: CallOptionsWithArguments\<C, PCK\>

> **CallOptionsWithArguments**\<`C`, `PCK`\> = [`CircuitParameters`](../../midnight-js-protocol/compact-js/namespaces/Contract/type-aliases/CircuitParameters.md)\<`C`, `PCK`\> *extends* \[\] ? [`CallOptionsBase`](../interfaces/CallOptionsBase.md)\<`C`, `PCK`\> : [`CallOptionsBase`](../interfaces/CallOptionsBase.md)\<`C`, `PCK`\> & `object`

Conditional type that optionally adds the inferred circuit argument types to
the options for a circuit call.

## Type Parameters

### C

`C` *extends* [`Any`](../../midnight-js-protocol/compact-js/namespaces/Contract/type-aliases/Any.md)

### PCK

`PCK` *extends* [`ProvableCircuitId`](../../midnight-js-protocol/compact-js/namespaces/Contract/type-aliases/ProvableCircuitId.md)\<`C`\>
