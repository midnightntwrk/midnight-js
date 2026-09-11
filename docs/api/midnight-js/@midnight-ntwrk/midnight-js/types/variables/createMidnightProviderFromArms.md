[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / createMidnightProviderFromArms

# Variable: createMidnightProviderFromArms

> `const` **createMidnightProviderFromArms**: (`arms`) => [`MidnightProvider`](../interfaces/MidnightProvider.md)

Assembles a [MidnightProvider](../interfaces/MidnightProvider.md) from one arm per ledger era it serves.

The counterpart to `createProofProviderFromArms`, with the same guarantees:
`supportedEras` is computed from the arms supplied, and the tag never appears
in implementation code.

## Parameters

### arms

[`MidnightProviderArms`](../interfaces/MidnightProviderArms.md)

The current-era arm, and a handler for each retained era served.

## Returns

[`MidnightProvider`](../interfaces/MidnightProvider.md)

A [MidnightProvider](../interfaces/MidnightProvider.md) routing each submission to its era's arm.
