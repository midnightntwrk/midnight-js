[**Midnight.js API Reference v5.0.0-beta.6**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../../../README.md) / [platform-js/effect/Configuration](../README.md) / configProvider

# Variable: configProvider

> `const` **configProvider**: (`json`) => `ConfigProvider.ConfigProvider`

Defined in: node\_modules/@midnight-ntwrk/platform-js/dist/dts/effect/Configuration.d.ts:62

Creates a platform independent configuration provider,

## Parameters

### json

`unknown`

A JSON object from which configuration values can be read.

## Returns

`ConfigProvider.ConfigProvider`

A `ConfigProvider` that defaults to values present in `json`, but allows them to be overridden
via environment variables.
