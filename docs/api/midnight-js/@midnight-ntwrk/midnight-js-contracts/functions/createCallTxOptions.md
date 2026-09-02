[**Midnight.js API Reference v5.0.0-beta.7**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../README.md) / createCallTxOptions

# Function: createCallTxOptions()

> **createCallTxOptions**\<`C`, `PCK`\>(`compiledContract`, `circuitId`, `contractAddress`, `privateStateId`, `additionalCoinEncPublicKeyMappings`, `args`): [`CallTxOptions`](../type-aliases/CallTxOptions.md)\<`C`, `PCK`\>

Creates a [CallTxOptions](../type-aliases/CallTxOptions.md) object from various data.

## Type Parameters

### C

`C` *extends* [`Any`](../../midnight-js-protocol/compact-js/namespaces/Contract/type-aliases/Any.md)

### PCK

`PCK` *extends* `string`

## Parameters

### compiledContract

[`CompiledContract`](../../midnight-js-protocol/compact-js/namespaces/CompiledContract/interfaces/CompiledContract.md)\<`C`, `any`\>

### circuitId

`PCK`

### contractAddress

`string`

### privateStateId

`string` \| `undefined`

### additionalCoinEncPublicKeyMappings

`ReadonlyMap`\<`string`, `string`\> \| `undefined`

### args

[`CircuitParameters`](../../midnight-js-protocol/compact-js/namespaces/Contract/type-aliases/CircuitParameters.md)\<`C`, `PCK`\>

## Returns

[`CallTxOptions`](../type-aliases/CallTxOptions.md)\<`C`, `PCK`\>
