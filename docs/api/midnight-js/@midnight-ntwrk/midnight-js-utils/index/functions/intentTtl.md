[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-utils](../../README.md) / [index](../README.md) / intentTtl

# Function: intentTtl()

> **intentTtl**(`config`): `Date`

The expiry for an intent built now: the current time plus `config.ttlSeconds`.

## Parameters

### config

`MidnightConfig`

The config whose `ttlSeconds` is applied.

## Returns

`Date`

## Throws

ConfigurationError, InvalidArgumentError As [assertValidMidnightConfig](assertValidMidnightConfig.md).
