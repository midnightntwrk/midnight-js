[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / createLedger8UnprovenDeployTx

# Function: createLedger8UnprovenDeployTx()

> **createLedger8UnprovenDeployTx**\<`C`\>(`providers`, `options`): `Promise`\<[`Ledger8UnsubmittedDeployTxData`](../interfaces/Ledger8UnsubmittedDeployTxData.md)\<`C`\>\>

## Type Parameters

### C

`C` *extends* [`Ledger8Contract`](../interfaces/Ledger8Contract.md)\<`unknown`\>

## Parameters

### providers

[`Ledger8ContractProviders`](../type-aliases/Ledger8ContractProviders.md)\<`C`, [`Ledger8CircuitId`](../type-aliases/Ledger8CircuitId.md)\<`C`\>\>

The providers used to read the artifact era, the head, the verifier keys, the
       wallet keys and the transaction providers' eras.

### options

[`Ledger8UnprovenDeployTxOptions`](../type-aliases/Ledger8UnprovenDeployTxOptions.md)\<`C`\>

Configuration.

## Returns

`Promise`\<[`Ledger8UnsubmittedDeployTxData`](../interfaces/Ledger8UnsubmittedDeployTxData.md)\<`C`\>\>

Everything the constructor produced and the unproven transaction.
