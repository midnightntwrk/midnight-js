[**Midnight.js API Reference v5.0.0-rc.4**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-network-id](../README.md) / getNetworkId

# ~~Function: getNetworkId()~~

> **getNetworkId**(): `string`

Retrieves the currently set global network identifier.

## Returns

`string`

The currently set [NetworkId](../type-aliases/NetworkId.md).

## Throws

If [setNetworkId](setNetworkId.md) has not been called.

## Deprecated

Since 5.0.0 the framework no longer reads this value. Read
`MidnightProviders.config.networkId` instead. Removed in 6.0.
