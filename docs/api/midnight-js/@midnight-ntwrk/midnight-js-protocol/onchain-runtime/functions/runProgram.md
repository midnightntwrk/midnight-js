[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [onchain-runtime](../README.md) / runProgram

# Function: runProgram()

> **runProgram**(`initial`, `ops`, `cost_model`, `gas_limit?`): [`VmResults`](../classes/VmResults.md)

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:738

Runs a VM program against an initial stack, with an optional gas limit

## Parameters

### initial

[`VmStack`](../classes/VmStack.md)

### ops

[`Op`](../type-aliases/Op.md)\<`null`\>[]

### cost\_model

[`CostModel`](../classes/CostModel.md)

### gas\_limit?

[`RunningCost`](../type-aliases/RunningCost.md)

## Returns

[`VmResults`](../classes/VmResults.md)
