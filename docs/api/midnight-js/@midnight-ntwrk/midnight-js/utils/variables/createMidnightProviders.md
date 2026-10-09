[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [utils](../README.md) / createMidnightProviders

# Variable: createMidnightProviders

> `const` **createMidnightProviders**: \<`P`\>(`providers`) => `P`

Checks a provider set the dApp built and returns it unchanged, so a broken set fails at
application start instead of at the first operation.

## Type Parameters

### P

`P` *extends* [`MidnightProviders`](../../types/interfaces/MidnightProviders.md)

## Parameters

### providers

`P`

The provider set to check.

## Returns

`P`

The same `providers` object.

## Throws

ConfigurationError If a required provider is missing, or as [assertValidMidnightConfig](../functions/assertValidMidnightConfig.md).

## Throws

InvalidArgumentError As [assertValidMidnightConfig](../functions/assertValidMidnightConfig.md).
