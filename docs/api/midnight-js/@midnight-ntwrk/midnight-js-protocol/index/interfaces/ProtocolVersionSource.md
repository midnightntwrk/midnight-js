[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / ProtocolVersionSource

# Interface: ProtocolVersionSource

Anything that can report the network's current head protocol version —
typically an indexer or node client. Consumed by [networkHeadVersion](../functions/networkHeadVersion.md).

## Methods

### queryLatestProtocolVersion()

> **queryLatestProtocolVersion**(): `Promise`\<`number`\>

#### Returns

`Promise`\<`number`\>

The network's current head `protocolVersion` integer.
