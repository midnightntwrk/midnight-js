[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / createLedger8UnprovenDeployTxFromVerifierKeys

# Function: createLedger8UnprovenDeployTxFromVerifierKeys()

> **createLedger8UnprovenDeployTxFromVerifierKeys**\<`C`\>(`zkConfigProvider`, `coinPublicKey`, `options`, `encryptionPublicKey`, `config`): `Promise`\<[`Ledger8UnsubmittedDeployTxData`](../interfaces/Ledger8UnsubmittedDeployTxData.md)\<`C`\>\>

## Type Parameters

### C

`C` *extends* [`Ledger8Contract`](../interfaces/Ledger8Contract.md)\<`unknown`\>

## Parameters

### zkConfigProvider

[`ZKConfigProvider`](../../../midnight-js/types/classes/ZKConfigProvider.md)\<`string`\>

The source of the artifact era and of a verifier key per circuit.

### coinPublicKey

`string`

The deploying wallet's coin public key.

### options

[`Ledger8UnprovenDeployTxOptions`](../type-aliases/Ledger8UnprovenDeployTxOptions.md)\<`C`\>

Configuration.

### encryptionPublicKey

`string`

The deploying wallet's encryption key.

### config

[`MidnightConfig`](../../../midnight-js/types/interfaces/MidnightConfig.md)

Network and transaction settings, normally `providers.config`.

## Returns

`Promise`\<[`Ledger8UnsubmittedDeployTxData`](../interfaces/Ledger8UnsubmittedDeployTxData.md)\<`C`\>\>

Everything the constructor produced and the unproven transaction.
