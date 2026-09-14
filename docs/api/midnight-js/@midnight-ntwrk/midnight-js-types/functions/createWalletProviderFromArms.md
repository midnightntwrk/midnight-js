[**Midnight.js API Reference v5.0.0-beta.8**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../README.md) / createWalletProviderFromArms

# Function: createWalletProviderFromArms()

> **createWalletProviderFromArms**(`arms`): [`WalletProvider`](../interfaces/WalletProvider.md)

Assembles a [WalletProvider](../interfaces/WalletProvider.md) from one arm per ledger era it serves.

The counterpart to `createProofProviderFromArms`, with the same guarantees:
`supportedEras` is computed from the arms supplied, the tag never appears in
implementation code, and an answer is always tagged as the era the request
carried.

## Parameters

### arms

[`WalletProviderArms`](../interfaces/WalletProviderArms.md)

The current-era arm, any retained arms, and the two key readers.

## Returns

[`WalletProvider`](../interfaces/WalletProvider.md)

A [WalletProvider](../interfaces/WalletProvider.md) routing each request to its era's arm.
