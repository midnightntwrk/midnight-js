[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / UnprovenCallTxProvidersBase

# Type Alias: UnprovenCallTxProvidersBase

> **UnprovenCallTxProvidersBase** = `Pick`\<[`ContractProviders`](ContractProviders.md), `"zkConfigProvider"` \| `"publicDataProvider"` \| `"walletProvider"`\>

Defined in: packages/contracts/dist/index.d.ts:811

The minimum set of providers needed to create a call transaction, the ZK
artifact provider and a wallet. By defining this type, users can choose to
omit a private state provider if they're creating a call transaction for a
contract with no private state.
