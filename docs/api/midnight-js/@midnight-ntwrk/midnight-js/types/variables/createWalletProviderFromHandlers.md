[**Midnight.js API Reference v5.0.0-rc.3**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / createWalletProviderFromHandlers

# Variable: createWalletProviderFromHandlers

> `const` **createWalletProviderFromHandlers**: (`handlers`) => [`WalletProvider`](../interfaces/WalletProvider.md)

Assembles a [WalletProvider](../interfaces/WalletProvider.md) from one arm per ledger era it serves.

The counterpart to `createProofProviderFromHandlers`, with the same guarantees:
`supportedEras` is computed from the handlers supplied, the tag never appears in
implementation code, and an answer is always tagged as the era the request
carried.

## Parameters

### handlers

[`WalletProviderHandlers`](../interfaces/WalletProviderHandlers.md)

The current-era handler, any retained-era handlers, and the two key readers.

## Returns

[`WalletProvider`](../interfaces/WalletProvider.md)

A [WalletProvider](../interfaces/WalletProvider.md) routing each request to its era's arm.
