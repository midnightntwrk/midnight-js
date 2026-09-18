[**Midnight.js API Reference v5.0.0-beta.8**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../README.md) / MidnightProvider

# Interface: MidnightProvider

Interface for Midnight transaction submission logic. It could be implemented, e.g., by a wallet,
a third-party service, or a node itself.

## Properties

### supportedEras

> `readonly` **supportedEras**: readonly (`"v9"` \| `"v8"`)[]

The ledger eras THIS INSTANCE serves. See
[ProofProvider.supportedEras](ProofProvider.md#supportederas) — the field means the same on all three
transaction seams, and all three are read together before an operation
starts.

## Methods

### submitTx()

> **submitTx**(`tx`): `Promise`\<`string`\>

Submit a transaction to the network to be consensed upon.

#### Parameters

##### tx

[`VersionedFinalizedTransaction`](../type-aliases/VersionedFinalizedTransaction.md)

The version-tagged finalized transaction to submit: `{ version: 'v9', tx }` for a
          live v9 ledger object, `{ version: 'v8', txBytes }` for v8-era serialized bytes.

#### Returns

`Promise`\<`string`\>

The transaction identifier of the submitted transaction. Not version-tagged — a
         transaction identifier is era-independent.

#### Throws

V8PayloadUnsupportedError if the implementation does not handle the v8 arm.

#### Throws

UntaggedPayloadError if `version` is missing or unrecognised.
