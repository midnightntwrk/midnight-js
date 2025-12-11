[**Midnight.js API Reference v3.0.0-alpha.9**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../README.md) / createCallTxOptions

# Function: createCallTxOptions()

> **createCallTxOptions**\<`C`, `ICK`\>(`contract`, `circuitId`, `contractAddress`, `privateStateId`, `args`): [`CallTxOptions`](../type-aliases/CallTxOptions.md)\<`C`, `ICK`\>

Creates a [CallTxOptions](../type-aliases/CallTxOptions.md) object from various data.

## Type Parameters

### C

`C` *extends* `Contract`\<`any`, `Witnesses`\<`any`\>\>

### ICK

`ICK` *extends* `string`

## Parameters

### contract

`C`

### circuitId

`ICK`

### contractAddress

`string`

### privateStateId

`string` | `undefined`

### args

`CircuitParameters`\<`C`, `ICK`\>

## Returns

[`CallTxOptions`](../type-aliases/CallTxOptions.md)\<`C`, `ICK`\>
