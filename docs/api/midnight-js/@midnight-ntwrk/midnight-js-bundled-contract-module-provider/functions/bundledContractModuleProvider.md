[**Midnight.js API Reference v5.0.0-rc.4**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-bundled-contract-module-provider](../README.md) / bundledContractModuleProvider

# Function: bundledContractModuleProvider()

> **bundledContractModuleProvider**(`modules`): [`ContractModuleProvider`](https://github.com/LFDT-Minokawa/compact)

Resolves a cross-contract callee to one of the modules bundled with this application, listed in a
[ModulesByAddress](../type-aliases/ModulesByAddress.md) table. Addresses are matched case-insensitively.

The table is read once, here, so the provider is a snapshot: an entry added to the source map
afterwards is not resolved. Every key is checked to be a contract address at that point too,
because a mistyped one is otherwise indistinguishable at the call from an address with no
implementation deployed at it.

## Parameters

### modules

[`ModulesByAddress`](../type-aliases/ModulesByAddress.md)

The address-to-module table.

## Returns

[`ContractModuleProvider`](https://github.com/LFDT-Minokawa/compact)

A provider resolving an address to its thunk, or `undefined` when the table holds no
entry for it — which the runtime reports as an unsupported implementation.

## Throws

InvalidArgumentError If a key is not a contract address.

## Throws

InvalidArgumentError If two keys differ only in case and name different modules, since one of them would
otherwise be dropped silently.
