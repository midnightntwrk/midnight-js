[**@midnight-ntwrk/testkit-js v3.0.0**](../README.md)

***

> **expectFoundAndDeployedStatesEqual**\<`C`\>(`providers`, `deployTxData`, `foundDeployTxData`, `privateStateId?`, `initialPrivateState?`): `Promise`\<`void`\>

## Type Parameters

### C

`C` *extends* `Contract`\<`any`, `Witnesses`\<`any`\>\>

## Parameters

### providers

`MidnightProviders`\<`ImpureCircuitId`\<`C`\>, `string`, `unknown`\>

### deployTxData

`FinalizedDeployTxData`\<`C`\>

### foundDeployTxData

`FinalizedDeployTxDataBase`\<`C`\>

### privateStateId?

`string`

### initialPrivateState?

`PrivateState`\<`C`\>

## Returns

`Promise`\<`void`\>
