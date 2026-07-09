[**Midnight.js API Reference v5.0.0-beta.3**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-dapp-connector-proof-provider](../README.md) / dappConnectorProofProvider

# Function: dappConnectorProofProvider()

> **dappConnectorProofProvider**\<`K`\>(`api`, `zkConfigProvider`, `costModel`): `Promise`\<[`ProofProvider`](#)\>

Creates a [ProofProvider](#) that delegates proving to a DApp Connector wallet.

## Type Parameters

### K

`K` *extends* `string`

Union of circuit identifier strings defined by the contract.

## Parameters

### api

[`DAppConnectorProvingAPI`](../type-aliases/DAppConnectorProvingAPI.md)

DApp Connector wallet API exposing `getProvingProvider`.

### zkConfigProvider

`ZKConfigRegistry` \| [`ZKConfigProvider`](#)\<`K`\>

A single [ZKConfigProvider](#) or a multi-source
ZKConfigRegistry that supplies ZK configuration artifacts and key material. A registry is
required to prove transactions that make cross-contract calls, which carry one proof per contract
in the call tree.

### costModel

`CostModel`

Cost model applied during transaction proving.

## Returns

`Promise`\<[`ProofProvider`](#)\>

A [ProofProvider](#) whose `proveTx` method delegates to the wallet.

## Remarks

Combines a wallet-backed [dappConnectorProvingProvider](dappConnectorProvingProvider.md) with the given `costModel`
to produce a transaction-level proof provider. The wallet's proving provider is obtained
once during initialization and reused for all subsequent `proveTx` calls.
