[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / createWalletProviderFromHandlers

# Variable: createWalletProviderFromHandlers

> `const` **createWalletProviderFromHandlers**: (`handlers`) => [`WalletProvider`](../interfaces/WalletProvider.md)

Assembles a [WalletProvider](../interfaces/WalletProvider.md) from one handler per ledger era.

The counterpart to `createProofProviderFromHandlers`, with the same guarantees:
`supportedEras` is computed from the handlers given, each handle is routed to
its own era's handler, and the answer is sealed in that same era.

Every handler and both key readers are called with `handlers` as `this`.

## Parameters

### handlers

[`WalletProviderHandlers`](../type-aliases/WalletProviderHandlers.md)

One entry per ledger era, and the two key readers.

## Returns

[`WalletProvider`](../interfaces/WalletProvider.md)

A [WalletProvider](../interfaces/WalletProvider.md) routing each handle to its era's handler.

## Throws

UnusableEraEntryError if an era entry is neither `undefined` nor a
        function. Raised at construction.

## Throws

InvalidArgumentError if `handlers` is not an object, has no key for a
        ledger era, serves no era (every entry `undefined`), or a key reader is
        not a function. Raised at construction.
