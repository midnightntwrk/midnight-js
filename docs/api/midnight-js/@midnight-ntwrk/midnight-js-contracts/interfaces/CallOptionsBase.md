[**Midnight.js API Reference v5.0.0-beta.7**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../README.md) / CallOptionsBase

# Interface: CallOptionsBase\<C, PCK\>

Describes the target of a circuit invocation.

## Type Parameters

### C

`C` *extends* [`Any`](../../midnight-js-protocol/compact-js/namespaces/Contract/type-aliases/Any.md)

### PCK

`PCK` *extends* [`ProvableCircuitId`](../../midnight-js-protocol/compact-js/namespaces/Contract/type-aliases/ProvableCircuitId.md)\<`C`\>

## Properties

### additionalCoinEncPublicKeyMappings?

> `readonly` `optional` **additionalCoinEncPublicKeyMappings?**: `ReadonlyMap`\<`string`, `string`\>

An optional mapping of [CoinPublicKey](../../midnight-js-protocol/onchain-runtime/type-aliases/CoinPublicKey.md) to [EncPublicKey](../../midnight-js-protocol/ledger/type-aliases/EncPublicKey.md) that can be used to resolve encryption
keys for coins created during circuit execution.

***

### circuitId

> `readonly` **circuitId**: `PCK`

The identifier of the circuit to call.

***

### compiledContract

> `readonly` **compiledContract**: [`CompiledContract`](../../midnight-js-protocol/compact-js/namespaces/CompiledContract/interfaces/CompiledContract.md)\<`C`, `any`\>

The contract defining the circuit to call.

***

### contractAddress

> `readonly` **contractAddress**: `string`

The address of the contract being executed.
