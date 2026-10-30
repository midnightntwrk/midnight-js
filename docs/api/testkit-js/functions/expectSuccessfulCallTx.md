[**@midnight-ntwrk/testkit-js v5.0.0-rc.5**](../README.md)

***

> **expectSuccessfulCallTx**\<`C`, `PCK`\>(`providers`, `callTxData`, `callTxOptions?`, `nextPrivateState?`): `Promise`\<`void`\>

## Type Parameters

### C

`C` *extends* `Any`

### PCK

`PCK` *extends* `string`

## Parameters

### providers

`MidnightProviders`\<`ProvableCircuitId`\<`C`\>, `string`, `unknown`\>

### callTxData

`Ledger9FinalizedCallTxData`\<`C`, `PCK`\>

### callTxOptions?

`Ledger9CallTxOptions`\<`C`, `PCK`\>

### nextPrivateState?

`PrivateState`\<`C`\>

## Returns

`Promise`\<`void`\>
