[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / CallOptionsBase

# Interface: CallOptionsBase\<C, PCK\>

Defined in: packages/contracts/dist/index.d.ts:12

Describes the target of a circuit invocation.

## Type Parameters

### C

`C` *extends* [`Contract.Any`](https://github.com/midnightntwrk/midnight-sdk)

### PCK

`PCK` *extends* [`Contract.ProvableCircuitId`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>

## Properties

### additionalCoinEncPublicKeyMappings?

> `readonly` `optional` **additionalCoinEncPublicKeyMappings?**: `ReadonlyMap`\<`string`, `string`\>

Defined in: packages/contracts/dist/index.d.ts:17

An optional mapping of [CoinPublicKey](https://github.com/midnightntwrk/midnight-ledger) to [EncPublicKey](https://github.com/midnightntwrk/midnight-ledger) that can be used to resolve encryption
keys for coins created during circuit execution.

***

### circuitId

> `readonly` **circuitId**: `PCK`

Defined in: packages/contracts/dist/index.d.ts:25

The identifier of the circuit to call.

***

### compiledContract

> `readonly` **compiledContract**: [`CompiledContract`](https://github.com/midnightntwrk/midnight-sdk)\<`C`, `any`\>

Defined in: packages/contracts/dist/index.d.ts:21

The contract defining the circuit to call.

***

### contractAddress

> `readonly` **contractAddress**: `string`

Defined in: packages/contracts/dist/index.d.ts:29

The address of the contract being executed.
