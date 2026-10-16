[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / createWalletProviderFromHandlers

# Variable: createWalletProviderFromHandlers

> `const` **createWalletProviderFromHandlers**: (`handlers`) => [`WalletProvider`](../interfaces/WalletProvider.md)

Assembles a [WalletProvider](../interfaces/WalletProvider.md) from one handler per ledger era it serves.

The counterpart to `createProofProviderFromHandlers`, with the same guarantees:
`supportedEras` is computed from the handlers supplied, the tag never appears in
implementation code, and an answer is always tagged as the era the request
carried.

`currentEra` and the key readers are called with `handlers` as `this`; a
retained-era handler is called with no `this`.

## Parameters

### handlers

[`WalletProviderHandlers`](../interfaces/WalletProviderHandlers.md)

The current-era handler, any retained-era handlers, and the two key readers.

## Returns

[`WalletProvider`](../interfaces/WalletProvider.md)

A [WalletProvider](../interfaces/WalletProvider.md) routing each request to its era's handler.

## Throws

UnusableEraEntryError if `currentEra`, or a `retainedEras` entry other
        than `undefined`, is not a function. Raised at construction.

## Throws

InvalidArgumentError if `handlers` is not an object, `retainedEras` is
        not a plain object keyed only by retained eras, or a key reader is not
        a function. Raised at construction.
