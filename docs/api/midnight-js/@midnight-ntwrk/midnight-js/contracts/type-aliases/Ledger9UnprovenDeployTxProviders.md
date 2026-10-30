[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / Ledger9UnprovenDeployTxProviders

# Type Alias: Ledger9UnprovenDeployTxProviders\<C\>

> **Ledger9UnprovenDeployTxProviders**\<`C`\> = `Pick`\<[`Ledger9ContractProviders`](Ledger9ContractProviders.md)\<`C`\>, `"zkConfigProvider"` \| `"walletProvider"` \| `"config"`\>

Providers needed to create an unproven deployment transactions, just the ZK artifact
provider and a wallet.
 *

## Type Parameters

### C

`C` *extends* [`Contract.Any`](https://github.com/midnightntwrk/midnight-sdk)

## Throws

EraMismatchError with reason `'contract-era-unsupported'` for a contract whose artifacts
        do not declare ledger 9, before anything else.
