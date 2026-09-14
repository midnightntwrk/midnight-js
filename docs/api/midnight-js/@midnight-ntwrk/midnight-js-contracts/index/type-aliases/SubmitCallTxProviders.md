[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / SubmitCallTxProviders

# Type Alias: SubmitCallTxProviders\<C, PCK\>

> **SubmitCallTxProviders**\<`C`, `PCK`\> = [`ContractProviders`](ContractProviders.md)\<`C`\> \| [`SubmitTxProviders`](SubmitTxProviders.md)\<`C`, `PCK`\>

The provider set a call entry point accepts.

Two arms because a call does not always need private state:
`SubmitTxProviders` is `ContractProviders` without `privateStateProvider`,
so a contract that declares no private state can be called with a set that
has none. Naming only `ContractProviders` would demand a provider such a
caller has no reason to build.

The arm without the provider is valid only for options that name no
`privateStateId`. Naming one without a `privateStateProvider` is refused
before any provider is touched, with
[IncompleteCallTxPrivateStateConfig](../classes/IncompleteCallTxPrivateStateConfig.md) -- so the pairing the type cannot
state is enforced at run time rather than left to go wrong. That refusal is
what makes the narrowing inside these functions sound.

## Type Parameters

### C

`C` *extends* [`Contract.Any`](https://github.com/midnightntwrk/midnight-sdk)

### PCK

`PCK` *extends* [`Contract.ProvableCircuitId`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>
