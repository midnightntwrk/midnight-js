[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / createLedger8UnprovenCallTxFromInitialStates

# Function: createLedger8UnprovenCallTxFromInitialStates()

> **createLedger8UnprovenCallTxFromInitialStates**\<`C`, `PCK`\>(`zkConfigProvider`, `options`, `walletEncryptionPublicKey`): `Promise`\<[`Ledger8UnsubmittedCallTxData`](../interfaces/Ledger8UnsubmittedCallTxData.md)\<`C`, `PCK`\>\>

## Type Parameters

### C

`C` *extends* [`Ledger8Contract`](../interfaces/Ledger8Contract.md)\<`unknown`\>

### PCK

`PCK` *extends* `string`

## Parameters

### zkConfigProvider

[`ZKConfigProvider`](../../types/classes/ZKConfigProvider.md)\<`string`\>

### options

[`Ledger8CallOptionsWithInitialStates`](../type-aliases/Ledger8CallOptionsWithInitialStates.md)\<`C`, `PCK`\>

### walletEncryptionPublicKey

`string`

## Returns

`Promise`\<[`Ledger8UnsubmittedCallTxData`](../interfaces/Ledger8UnsubmittedCallTxData.md)\<`C`, `PCK`\>\>
