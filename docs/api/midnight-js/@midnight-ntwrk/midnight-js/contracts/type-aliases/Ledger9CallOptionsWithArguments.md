[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / Ledger9CallOptionsWithArguments

# Type Alias: Ledger9CallOptionsWithArguments\<C, PCK\>

> **Ledger9CallOptionsWithArguments**\<`C`, `PCK`\> = [`Contract.CircuitParameters`](https://github.com/midnightntwrk/midnight-sdk)\<`C`, `PCK`\> *extends* \[\] ? [`Ledger9CallOptionsBase`](../interfaces/Ledger9CallOptionsBase.md)\<`C`, `PCK`\> : [`Ledger9CallOptionsBase`](../interfaces/Ledger9CallOptionsBase.md)\<`C`, `PCK`\> & `object`

Conditional type that optionally adds the inferred circuit argument types to
the options for a circuit call.

## Type Parameters

### C

`C` *extends* [`Contract.Any`](https://github.com/midnightntwrk/midnight-sdk)

### PCK

`PCK` *extends* [`Contract.ProvableCircuitId`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>
