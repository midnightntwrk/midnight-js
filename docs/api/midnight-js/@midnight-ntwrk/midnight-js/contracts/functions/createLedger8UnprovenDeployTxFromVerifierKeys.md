[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / createLedger8UnprovenDeployTxFromVerifierKeys

# Function: createLedger8UnprovenDeployTxFromVerifierKeys()

> **createLedger8UnprovenDeployTxFromVerifierKeys**\<`C`\>(`zkConfigProvider`, `coinPublicKey`, `options`, `encryptionPublicKey`, `config`): `Promise`\<[`Ledger8UnsubmittedDeployTxData`](../interfaces/Ledger8UnsubmittedDeployTxData.md)\<`C`\>\>

## Type Parameters

### C

`C` *extends* [`Ledger8Contract`](../interfaces/Ledger8Contract.md)\<`unknown`\>

## Parameters

### zkConfigProvider

[`ZKConfigProvider`](../../types/classes/ZKConfigProvider.md)\<`string`\>

### coinPublicKey

`string`

### options

[`Ledger8UnprovenDeployTxOptions`](../type-aliases/Ledger8UnprovenDeployTxOptions.md)\<`C`\>

### encryptionPublicKey

`string`

### config

[`MidnightConfig`](../../types/interfaces/MidnightConfig.md)

## Returns

`Promise`\<[`Ledger8UnsubmittedDeployTxData`](../interfaces/Ledger8UnsubmittedDeployTxData.md)\<`C`\>\>
