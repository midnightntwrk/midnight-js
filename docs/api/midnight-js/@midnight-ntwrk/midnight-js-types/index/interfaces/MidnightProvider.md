[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../../README.md) / [index](../README.md) / MidnightProvider

# Interface: MidnightProvider

Interface for Midnight transaction submission logic. It could be implemented, e.g., by a wallet,
a third-party service, or a node itself.

## Properties

### supportedEras

> `readonly` **supportedEras**: readonly (`"v8"` \| `"v9"`)[]

The ledger eras THIS INSTANCE serves. See
[ProofProvider.supportedEras](ProofProvider.md#supportederas) — the field means the same on all three
transaction providers, and all three are read together before an operation
starts.

## Methods

### submitTx()

> **submitTx**(`tx`): `Promise`\<`string`\>

Submit a transaction to the network to be consensed upon.

#### Parameters

##### tx

[`FinalizedTx`](../type-aliases/FinalizedTx.md)

The finalized transaction handle to submit.

#### Returns

`Promise`\<`string`\>

The transaction identifier of the submitted transaction. A transaction identifier is
         era-independent.

#### Throws

InvalidTransactionHandleError if `tx` is not a finalized handle of this package.

#### Throws

ProviderEraUnsupportedError if the implementation does not serve the handle's era.
