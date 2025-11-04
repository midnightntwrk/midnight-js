[**@midnight-ntwrk/testkit-js v3.0.0**](../README.md)

***

> **expectSuccessfulCallTx**\<`C`, `ICK`\>(`providers`, `callTxData`, `callTxOptions?`, `nextPrivateState?`): `Promise`\<`void`\>

## Type Parameters

### C

`C` *extends* `Contract`\<`any`, `Witnesses`\<`any`\>\>

### ICK

`ICK` *extends* `string`

## Parameters

### providers

`MidnightProviders`\<`ImpureCircuitId`\<`C`\>, `string`, `unknown`\>

### callTxData

`FinalizedCallTxData`\<`C`, `ICK`\>

### callTxOptions?

`CallTxOptions`\<`C`, `ICK`\>

### nextPrivateState?

`PrivateState`\<`C`\>

## Returns

`Promise`\<`void`\>
