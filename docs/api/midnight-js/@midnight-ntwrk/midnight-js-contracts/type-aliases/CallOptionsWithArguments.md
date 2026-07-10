[**Midnight.js API Reference v5.0.0-beta.4**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../README.md) / CallOptionsWithArguments

# Type Alias: CallOptionsWithArguments\<C, PCK\>

> **CallOptionsWithArguments**\<`C`, `PCK`\> = `Contract.CircuitParameters`\<`C`, `PCK`\> *extends* \[\] ? [`CallOptionsBase`](../interfaces/CallOptionsBase.md)\<`C`, `PCK`\> : [`CallOptionsBase`](../interfaces/CallOptionsBase.md)\<`C`, `PCK`\> & `object`

Conditional type that optionally adds the inferred circuit argument types to
the options for a circuit call.

## Type Parameters

### C

`C` *extends* `Contract.Any`

### PCK

`PCK` *extends* `Contract.ProvableCircuitId`\<`C`\>
