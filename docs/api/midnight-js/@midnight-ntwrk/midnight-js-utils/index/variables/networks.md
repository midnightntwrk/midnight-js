[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-utils](../../README.md) / [index](../README.md) / networks

# Variable: networks

> `const` **networks**: `object`

Public endpoints of the Midnight networks. Call the network to get its [MidnightNetwork](../interfaces/MidnightNetwork.md).

`preview` is hosted by Midnight. `preprod` and `mainnet` are served by Blockfrost, so they take
a Blockfrost project token for that network and put it on every URL as `?project_id=<token>`.
The URLs then carry the token: remove it before you log them.

These are defaults that can change between releases. To use other endpoints, pass your own
[MidnightNetwork](../interfaces/MidnightNetwork.md). A browser dApp with a DApp Connector wallet takes its endpoints from the wallet
with `dappConnectorNetwork` from `@midnight-ntwrk/midnight-js-dapp-connector-proof-provider`.

## Type Declaration

### mainnet

> `readonly` **mainnet**: (`blockfrostProjectId`) => [`MidnightNetwork`](../interfaces/MidnightNetwork.md)

#### Parameters

##### blockfrostProjectId

`string`

#### Returns

[`MidnightNetwork`](../interfaces/MidnightNetwork.md)

#### Throws

InvalidArgumentError If `blockfrostProjectId` is empty or has whitespace around it.

### preprod

> `readonly` **preprod**: (`blockfrostProjectId`) => [`MidnightNetwork`](../interfaces/MidnightNetwork.md)

#### Parameters

##### blockfrostProjectId

`string`

#### Returns

[`MidnightNetwork`](../interfaces/MidnightNetwork.md)

#### Throws

InvalidArgumentError If `blockfrostProjectId` is empty or has whitespace around it.

### preview

> `readonly` **preview**: () => [`MidnightNetwork`](../interfaces/MidnightNetwork.md)

#### Returns

[`MidnightNetwork`](../interfaces/MidnightNetwork.md)

## Example

```typescript
const preview = networks.preview();
const mainnet = networks.mainnet(blockfrostMainnetProjectId);
```
