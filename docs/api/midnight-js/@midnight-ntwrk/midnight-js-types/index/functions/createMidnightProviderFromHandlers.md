[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../../README.md) / [index](../README.md) / createMidnightProviderFromHandlers

# Function: createMidnightProviderFromHandlers()

> **createMidnightProviderFromHandlers**(`handlers`): [`MidnightProvider`](../interfaces/MidnightProvider.md)

Assembles a [MidnightProvider](../interfaces/MidnightProvider.md) from one arm per ledger era it serves.

The counterpart to `createProofProviderFromHandlers`, with the same guarantees:
`supportedEras` is computed from the handlers supplied, and the tag never appears
in implementation code.

## Parameters

### handlers

[`MidnightProviderHandlers`](../interfaces/MidnightProviderHandlers.md)

The current-era handler, and one for each retained era served.

## Returns

[`MidnightProvider`](../interfaces/MidnightProvider.md)

A [MidnightProvider](../interfaces/MidnightProvider.md) routing each submission to its era's arm.
