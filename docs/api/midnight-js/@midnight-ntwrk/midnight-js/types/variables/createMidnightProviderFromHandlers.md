[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / createMidnightProviderFromHandlers

# Variable: createMidnightProviderFromHandlers

> `const` **createMidnightProviderFromHandlers**: (`handlers`) => [`MidnightProvider`](../interfaces/MidnightProvider.md)

Assembles a [MidnightProvider](../interfaces/MidnightProvider.md) from one handler per ledger era it serves.

The counterpart to `createProofProviderFromHandlers`, with the same guarantees:
`supportedEras` is computed from the handlers supplied, and the tag never appears
in implementation code.

`currentEra` is called with `handlers` as `this`; a retained-era handler is
called with no `this`.

## Parameters

### handlers

[`MidnightProviderHandlers`](../interfaces/MidnightProviderHandlers.md)

The current-era handler, and one for each retained era served.

## Returns

[`MidnightProvider`](../interfaces/MidnightProvider.md)

A [MidnightProvider](../interfaces/MidnightProvider.md) routing each submission to its era's handler.

## Throws

UnusableEraEntryError if `currentEra`, or a `retainedEras` entry other
        than `undefined`, is not a function. Raised at construction.

## Throws

InvalidArgumentError if `handlers` is not an object, or `retainedEras`
        is not a plain object keyed only by retained eras. Raised at construction.
