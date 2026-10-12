[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / MidnightConfig

# Interface: MidnightConfig

Settings the framework applies to every transaction it builds.

## Properties

### networkId

> `readonly` **networkId**: `string`

The network transactions are built for. Must be a non-empty string without surrounding whitespace.
Bech32m wallet keys must be encoded for this network; hex keys are not checked against it.

***

### ttlSeconds

> `readonly` **ttlSeconds**: `number`

How long a built transaction stays valid, in whole seconds, counted from when the framework starts
building it. The framework also passes it to `walletProvider.balanceTx`, counted from when balancing
starts. The intent the wallet adds gets this lifetime only if the wallet honours that `ttl`; a wallet
behind the DApp Connector cannot, and uses its own. Must be a positive whole number.
