[**Midnight.js API Reference v5.0.0-beta.7**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../README.md) / CallOptionsBase

# Interface: CallOptionsBase\<C, PCK\>

Describes the target of a circuit invocation.

## Type Parameters

### C

`C` *extends* [`Contract.Any`](https://github.com/midnightntwrk/midnight-sdk)

### PCK

`PCK` *extends* [`Contract.ProvableCircuitId`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>

## Properties

### additionalCoinEncPublicKeyMappings?

> `readonly` `optional` **additionalCoinEncPublicKeyMappings?**: `ReadonlyMap`\<`string`, `string`\>

An optional mapping of [CoinPublicKey](https://github.com/midnightntwrk/midnight-ledger) to [EncPublicKey](https://github.com/midnightntwrk/midnight-ledger) that can be used to resolve encryption
keys for coins created during circuit execution.

***

### circuitId

> `readonly` **circuitId**: `PCK`

The identifier of the circuit to call.

***

### compiledContract

> `readonly` **compiledContract**: [`CompiledContract`](https://github.com/midnightntwrk/midnight-sdk)\<`C`, `any`\>

The contract defining the circuit to call.

***

### contractAddress

> `readonly` **contractAddress**: `string`

The address of the contract being executed.
