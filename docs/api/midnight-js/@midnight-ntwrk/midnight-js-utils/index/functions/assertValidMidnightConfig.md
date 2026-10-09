[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-utils](../../README.md) / [index](../README.md) / assertValidMidnightConfig

# Function: assertValidMidnightConfig()

> **assertValidMidnightConfig**(`config`, `source?`): `asserts config is MidnightConfig`

Checks a MidnightConfig before any work is done with it.

## Parameters

### config

`MidnightConfig` \| `null` \| `undefined`

The config to check; `undefined` or `null` when a caller did not pass one.

### source?

`string` = `'providers.config'`

Where the config was read from, named in the error.

## Returns

`asserts config is MidnightConfig`

## Throws

ConfigurationError If `config` is missing.

## Throws

InvalidArgumentError If `config.networkId` is not a non-empty string
without surrounding whitespace, or if `config.ttlSeconds` is not a positive whole number, or is too large for the
expiry to be a valid `Date`.
