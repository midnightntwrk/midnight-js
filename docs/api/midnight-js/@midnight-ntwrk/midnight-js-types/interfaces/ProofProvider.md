[**Midnight.js API Reference v3.0.0**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../README.md) / ProofProvider

# Interface: ProofProvider\<K\>

Interface for a proof server running in a trusted environment.

## Type Parameters

### K

`K` *extends* `string`

The type of the circuit ID used by the provider.

## Methods

### proveTx()

> **proveTx**(`unprovenTx`, `proveTxConfig?`): `Promise`\<[`ProvenTransaction`](../type-aliases/ProvenTransaction.md)\>

Creates call proofs for an unproven transaction. The resulting transaction is unbalanced and
must be balanced using the [WalletProvider](WalletProvider.md) interface.
          contain a single contract call.

#### Parameters

##### unprovenTx

`UnprovenTransaction`

##### proveTxConfig?

[`ProveTxConfig`](ProveTxConfig.md)\<`K`\>

The configuration for the proof request to the proof provider. Empty in case
                     a deploy transaction is being proved with no user-defined timeout.

#### Returns

`Promise`\<[`ProvenTransaction`](../type-aliases/ProvenTransaction.md)\>
