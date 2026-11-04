[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / createLedger8UnprovenCallTxFromInitialStates

# Function: createLedger8UnprovenCallTxFromInitialStates()

> **createLedger8UnprovenCallTxFromInitialStates**\<`C`, `PCK`\>(`zkConfigProvider`, `options`, `walletEncryptionPublicKey`): `Promise`\<[`Ledger8UnsubmittedCallTxData`](../interfaces/Ledger8UnsubmittedCallTxData.md)\<`C`, `PCK`\>\>

## Type Parameters

### C

`C` *extends* [`Ledger8Contract`](../interfaces/Ledger8Contract.md)\<`unknown`\>

### PCK

`PCK` *extends* `string`

## Parameters

### zkConfigProvider

[`ZKConfigProvider`](../../../midnight-js/types/classes/ZKConfigProvider.md)\<`string`\>

The source of the circuit's verifier key and of the artifact era.

### options

[`Ledger8CallOptionsWithInitialStates`](../type-aliases/Ledger8CallOptionsWithInitialStates.md)\<`C`, `PCK`\>

Configuration, including the states to run against.

### walletEncryptionPublicKey

`string`

The calling wallet's encryption key.

## Returns

`Promise`\<[`Ledger8UnsubmittedCallTxData`](../interfaces/Ledger8UnsubmittedCallTxData.md)\<`C`, `PCK`\>\>

All data produced by the circuit call and the unproven transaction.
