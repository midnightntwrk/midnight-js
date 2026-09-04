[**Midnight.js API Reference v5.0.0-beta.7**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../README.md) / createCallTxOptions

# Function: createCallTxOptions()

> **createCallTxOptions**\<`C`, `PCK`\>(`compiledContract`, `circuitId`, `contractAddress`, `privateStateId`, `additionalCoinEncPublicKeyMappings`, `args`): [`CallTxOptions`](../type-aliases/CallTxOptions.md)\<`C`, `PCK`\>

Creates a [CallTxOptions](../type-aliases/CallTxOptions.md) object from various data.

## Type Parameters

### C

`C` *extends* [`Any`](https://github.com/midnightntwrk/midnight-sdk)

### PCK

`PCK` *extends* `string`

## Parameters

### compiledContract

[`CompiledContract`](https://github.com/midnightntwrk/midnight-sdk)\<`C`, `any`\>

### circuitId

`PCK`

### contractAddress

`string`

### privateStateId

`string` \| `undefined`

### additionalCoinEncPublicKeyMappings

`ReadonlyMap`\<`string`, `string`\> \| `undefined`

### args

[`CircuitParameters`](https://github.com/midnightntwrk/midnight-sdk)\<`C`, `PCK`\>

## Returns

[`CallTxOptions`](../type-aliases/CallTxOptions.md)\<`C`, `PCK`\>
