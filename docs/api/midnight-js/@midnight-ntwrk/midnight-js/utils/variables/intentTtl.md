[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [utils](../README.md) / intentTtl

# Variable: intentTtl

> `const` **intentTtl**: (`config`) => `Date`

The expiry for an intent built now: the current time plus `config.ttlSeconds`.

## Parameters

### config

[`MidnightConfig`](../../types/interfaces/MidnightConfig.md)

The config whose `ttlSeconds` is applied.

## Returns

`Date`

## Throws

ConfigurationError, InvalidArgumentError As [assertValidMidnightConfig](../functions/assertValidMidnightConfig.md).
