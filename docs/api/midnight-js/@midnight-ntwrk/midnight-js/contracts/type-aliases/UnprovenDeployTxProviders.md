[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / UnprovenDeployTxProviders

# Type Alias: UnprovenDeployTxProviders\<C\>

> **UnprovenDeployTxProviders**\<`C`\> = `Pick`\<[`ContractProviders`](ContractProviders.md)\<`C`\>, `"zkConfigProvider"` \| `"walletProvider"`\>

Defined in: packages/contracts/dist/index.d.ts:1350

Providers needed to create an unproven deployment transactions, just the ZK artifact
provider and a wallet.

## Type Parameters

### C

`C` *extends* [`Any`](../../../midnight-js-protocol/compact-js/namespaces/Contract/type-aliases/Any.md)
