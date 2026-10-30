[**Midnight.js API Reference v5.0.0-rc.5**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-dapp-connector-proof-provider](../README.md) / dappConnectorNetwork

# Function: dappConnectorNetwork()

> **dappConnectorNetwork**(`api`): `Promise`\<[`MidnightNetwork`](../../midnight-js/utils/interfaces/MidnightNetwork.md)\>

Reads the network id and endpoints of a browser dApp from its DApp Connector wallet, so the dApp uses the
network and the services the user picked in the wallet.

## Parameters

### api

[`DAppConnectorNetworkAPI`](../type-aliases/DAppConnectorNetworkAPI.md)

The DApp Connector's `ConnectedAPI`, or any object with the method in [DAppConnectorNetworkAPI](../type-aliases/DAppConnectorNetworkAPI.md).

## Returns

`Promise`\<[`MidnightNetwork`](../../midnight-js/utils/interfaces/MidnightNetwork.md)\>

## Remarks

The connector reports one node URI. A Substrate node serves HTTP and WebSocket on the same address, so the
other node URL is the same URI with the matching scheme.

## Throws

InvalidArgumentError If the wallet's `networkId` is empty, or one of its URIs is not a URL of the
expected scheme with a host. The message names the field, never its value, which can hold a token.

## Example

```typescript
const network = await dappConnectorNetwork(connectedApi);
const publicDataProvider = indexerPublicDataProvider(network.indexer);
```
