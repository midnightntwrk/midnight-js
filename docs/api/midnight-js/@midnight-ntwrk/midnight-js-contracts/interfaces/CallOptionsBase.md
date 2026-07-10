[**Midnight.js API Reference v5.0.0-beta.4**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../README.md) / CallOptionsBase

# Interface: CallOptionsBase\<C, PCK\>

Describes the target of a circuit invocation.

## Type Parameters

### C

`C` *extends* `Contract.Any`

### PCK

`PCK` *extends* `Contract.ProvableCircuitId`\<`C`\>

## Properties

### additionalCoinEncPublicKeyMappings?

> `readonly` `optional` **additionalCoinEncPublicKeyMappings?**: `ReadonlyMap`\<`string`, `string`\>

An optional mapping of CoinPublicKey to EncPublicKey that can be used to resolve encryption
keys for coins created during circuit execution.

***

### circuitId

> `readonly` **circuitId**: `PCK`

The identifier of the circuit to call.

***

### compiledContract

> `readonly` **compiledContract**: `CompiledContract`\<`C`, `any`\>

The contract defining the circuit to call.

***

### contractAddress

> `readonly` **contractAddress**: `string`

The address of the contract being executed.
