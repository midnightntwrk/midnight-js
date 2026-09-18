[**Midnight.js API Reference v5.0.0-beta.8**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-dapp-connector-proof-provider](../README.md) / dappConnectorProofProvider

# Function: dappConnectorProofProvider()

> **dappConnectorProofProvider**\<`K`\>(`api`, `zkConfigProvider`, `costModel`): `Promise`\<[`ProofProvider`](../../midnight-js/types/interfaces/ProofProvider.md)\>

Creates a [ProofProvider](../../midnight-js/types/interfaces/ProofProvider.md) that delegates proving to a DApp Connector wallet.

## Type Parameters

### K

`K` *extends* `string`

Union of circuit identifier strings defined by the contract.

## Parameters

### api

[`DAppConnectorProvingAPI`](../type-aliases/DAppConnectorProvingAPI.md)

DApp Connector wallet API exposing `getProvingProvider`.

### zkConfigProvider

[`ZKConfigRegistry`](../../midnight-js/types/classes/ZKConfigRegistry.md) \| [`ZKConfigProvider`](../../midnight-js/types/classes/ZKConfigProvider.md)\<`K`\>

A single [ZKConfigProvider](../../midnight-js/types/classes/ZKConfigProvider.md) or a multi-source
[ZKConfigRegistry](../../midnight-js/types/classes/ZKConfigRegistry.md) that supplies ZK configuration artifacts and key material. A registry is
required to prove transactions that make cross-contract calls, which carry one proof per contract
in the call tree.

### costModel

[`CostModel`](https://github.com/midnightntwrk/midnight-ledger)

Cost model applied during transaction proving on the CURRENT ledger era.

**Not consulted on the retained (`v8`) era**, which uses that era's own cost model instead. This
is not an oversight and not a silent fallback: the retained ledger ships its own `CostModel`
class and type-checks `prove()`'s argument against it across the WASM boundary, so the value
passed here would be rejected outright. Pairing the transaction with its own era's model is the
only correct pairing, so an override is not offered at all rather than offered and quietly
ignored.

## Returns

`Promise`\<[`ProofProvider`](../../midnight-js/types/interfaces/ProofProvider.md)\>

A [ProofProvider](../../midnight-js/types/interfaces/ProofProvider.md) whose `proveTx` method delegates to the wallet.

## Remarks

Combines a wallet-backed [dappConnectorProvingProvider](dappConnectorProvingProvider.md) with the given `costModel`
to produce a transaction-level proof provider. The wallet's proving provider is obtained
once during initialization and reused for all subsequent `proveTx` calls.
