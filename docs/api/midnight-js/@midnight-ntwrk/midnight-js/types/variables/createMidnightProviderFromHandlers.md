[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / createMidnightProviderFromHandlers

# Variable: createMidnightProviderFromHandlers

> `const` **createMidnightProviderFromHandlers**: (`handlers`) => [`MidnightProvider`](../interfaces/MidnightProvider.md)

Assembles a [MidnightProvider](../interfaces/MidnightProvider.md) from one handler per ledger era.

The counterpart to `createProofProviderFromHandlers`, with the same guarantees:
`supportedEras` is computed from the handlers given, and each handle is routed
to its own era's handler.

Every handler is called with `handlers` as `this`.

## Parameters

### handlers

[`MidnightProviderHandlers`](../type-aliases/MidnightProviderHandlers.md)

One entry per ledger era.

## Returns

[`MidnightProvider`](../interfaces/MidnightProvider.md)

A [MidnightProvider](../interfaces/MidnightProvider.md) routing each handle to its era's handler.

## Throws

UnusableEraEntryError if an era entry is neither `undefined` nor a
        function. Raised at construction.

## Throws

InvalidArgumentError if `handlers` is not an object, has no key for
        a ledger era, or serves no era (every entry `undefined`). Raised at
        construction.
