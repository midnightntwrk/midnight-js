[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / SubmitCallTxProviders

# Type Alias: SubmitCallTxProviders\<C, PCK\>

> **SubmitCallTxProviders**\<`C`, `PCK`\> = [`ContractProviders`](ContractProviders.md)\<`C`\> \| [`SubmitTxProviders`](SubmitTxProviders.md)\<`C`, `PCK`\>

The provider set a call entry point accepts.

Two arms, because a call does not always need private state. The arm WITHOUT
`privateStateProvider` is valid only for options that name no
`privateStateId`; naming one without the provider is refused with
[IncompleteCallTxPrivateStateConfig](../classes/IncompleteCallTxPrivateStateConfig.md) before any provider is touched.

## Type Parameters

### C

`C` *extends* [`Contract.Any`](https://github.com/midnightntwrk/midnight-sdk)

### PCK

`PCK` *extends* [`Contract.ProvableCircuitId`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>

## See

[OverloadTyping](../../documents/OverloadTyping.md) for why that run-time refusal is what makes the
narrowing inside these functions sound.
