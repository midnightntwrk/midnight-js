[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / submitLedger8DeployTx

# Function: submitLedger8DeployTx()

> **submitLedger8DeployTx**\<`C`\>(`providers`, `options`): `Promise`\<[`Ledger8FinalizedDeployTxData`](../interfaces/Ledger8FinalizedDeployTxData.md)\<`C`\>\>

## Type Parameters

### C

`C` *extends* [`Ledger8Contract`](../interfaces/Ledger8Contract.md)\<`unknown`\>

## Parameters

### providers

[`Ledger8ContractProviders`](../type-aliases/Ledger8ContractProviders.md)\<`C`, [`Ledger8CircuitId`](../type-aliases/Ledger8CircuitId.md)\<`C`\>\>

The providers used to deploy the contract.

### options

[`Ledger8DeployContractOptions`](../type-aliases/Ledger8DeployContractOptions.md)\<`C`\>

Configuration.

## Returns

`Promise`\<[`Ledger8FinalizedDeployTxData`](../interfaces/Ledger8FinalizedDeployTxData.md)\<`C`\>\>

The finalized deploy data, including the minted contract address and the signing key now
         stored against it.
