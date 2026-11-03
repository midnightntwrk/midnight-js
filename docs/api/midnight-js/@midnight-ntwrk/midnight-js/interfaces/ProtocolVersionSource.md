[**Midnight.js API Reference v5.0.0-rc.5**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js](../README.md) / [](../README.md) / ProtocolVersionSource

# Interface: ProtocolVersionSource

Anything that can report the network's latest protocol version —
typically an indexer or node client. Consumed by [latestNetworkLedgerVersion](../variables/latestNetworkLedgerVersion.md).

## Methods

### queryLatestProtocolVersion()

> **queryLatestProtocolVersion**(): `Promise`\<`number`\>

#### Returns

`Promise`\<`number`\>

The network's latest `protocolVersion` integer.
