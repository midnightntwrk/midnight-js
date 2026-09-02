[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / ProofProvider

# Interface: ProofProvider

Defined in: packages/types/dist/index.d.ts:839

Interface for a proof server running in a trusted environment.

## Type Param

**K**

The type of the circuit ID used by the provider.

## Methods

### proveTx()

> **proveTx**(`unprovenTx`, `proveTxConfig?`): `Promise`\<[`UnboundTransaction`](../type-aliases/UnboundTransaction.md)\>

Defined in: packages/types/dist/index.d.ts:848

Creates call proofs for an unproven transaction. The resulting transaction is unbalanced and
must be balanced using the [WalletProvider](WalletProvider.md) interface.
          contain a single contract call.

#### Parameters

##### unprovenTx

[`UnprovenTransaction`](../../../midnight-js-protocol/ledger/type-aliases/UnprovenTransaction.md)

##### proveTxConfig?

[`ProveTxConfig`](ProveTxConfig.md)

The configuration for the proof request to the proof provider. Empty in case
                     a deploy transaction is being proved with no user-defined timeout.

#### Returns

`Promise`\<[`UnboundTransaction`](../type-aliases/UnboundTransaction.md)\>
