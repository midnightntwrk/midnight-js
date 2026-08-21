[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / MidnightProvider

# Interface: MidnightProvider

Defined in: packages/types/dist/index.d.ts:440

Interface for Midnight transaction submission logic. It could be implemented, e.g., by a wallet,
a third-party service, or a node itself.

## Methods

### submitTx()

> **submitTx**(`tx`): `Promise`\<`string`\>

Defined in: packages/types/dist/index.d.ts:446

Submit a transaction to the network to be consensed upon.

#### Parameters

##### tx

[`FinalizedTransaction`](../../../midnight-js-protocol/ledger/type-aliases/FinalizedTransaction.md)

The finalized transaction to submit.

#### Returns

`Promise`\<`string`\>

The transaction identifier of the submitted transaction.
