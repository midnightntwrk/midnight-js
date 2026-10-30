[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / makeLedger9ContractExecutableRuntime

# Variable: makeLedger9ContractExecutableRuntime

> `const` **makeLedger9ContractExecutableRuntime**: (`zkConfigProvider`, `options`) => [`ManagedRuntime`](#)\<[`ContractExecutable.ContractExecutable.Context`](https://github.com/midnightntwrk/midnight-sdk), `ConfigError.ConfigError`\>

Constructs an Effect managed runtime configured to execute contract executables.

## Parameters

### zkConfigProvider

[`ZKConfigProvider`](../classes/ZKConfigProvider.md)\<`string`\>

The [ZKConfigProvider](../classes/ZKConfigProvider.md) that is to be adapted.

### options

[`Ledger9ContractExecutableRuntimeOptions`](../type-aliases/Ledger9ContractExecutableRuntimeOptions.md)

Values that will be mapped into and made available within the constructed runtime.

## Returns

[`ManagedRuntime`](#)\<[`ContractExecutable.ContractExecutable.Context`](https://github.com/midnightntwrk/midnight-sdk), `ConfigError.ConfigError`\>

An Effect [ManagedRuntime](#) that can be used to execute [ContractExecutable](https://github.com/midnightntwrk/midnight-sdk) instances.
