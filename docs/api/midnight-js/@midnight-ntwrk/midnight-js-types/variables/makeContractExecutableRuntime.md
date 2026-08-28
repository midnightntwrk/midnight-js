[**Midnight.js API Reference v5.0.0-beta.6**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../README.md) / makeContractExecutableRuntime

# Variable: makeContractExecutableRuntime

> `const` **makeContractExecutableRuntime**: (`zkConfigProvider`, `options`) => [`ManagedRuntime`](#)\<[`Context`](../../midnight-js-protocol/compact-js/namespaces/ContractExecutable/namespaces/ContractExecutable/type-aliases/Context.md), `ConfigError.ConfigError`\>

Constructs an Effect managed runtime configured to execute contract executables.

## Parameters

### zkConfigProvider

[`ZKConfigProvider`](../classes/ZKConfigProvider.md)\<`string`\>

The [ZKConfigProvider](../classes/ZKConfigProvider.md) that is to be adapted.

### options

[`ContractExecutableRuntimeOptions`](../type-aliases/ContractExecutableRuntimeOptions.md)

Values that will be mapped into and made available within the constructed runtime.

## Returns

[`ManagedRuntime`](#)\<[`Context`](../../midnight-js-protocol/compact-js/namespaces/ContractExecutable/namespaces/ContractExecutable/type-aliases/Context.md), `ConfigError.ConfigError`\>

An Effect [ManagedRuntime](#) that can be used to execute [ContractExecutable](../../midnight-js-protocol/compact-js/namespaces/ContractExecutable/README.md) instances.
