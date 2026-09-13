[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / WalletProvider

# Interface: WalletProvider

Interface representing a WalletProvider that handles operations such as
transaction balancing and finalization, and provides access to cryptographic secret keys.

## Properties

### supportedEras

> `readonly` **supportedEras**: readonly (`"v8"` \| `"v9"`)[]

The ledger eras THIS INSTANCE serves. See
[ProofProvider.supportedEras](ProofProvider.md#supportederas) — the field means the same on all three
transaction seams, and all three are read together before an operation
starts.

## Methods

### balanceTx()

> **balanceTx**(`tx`, `ttl?`): `Promise`\<[`VersionedFinalizedTransaction`](../type-aliases/VersionedFinalizedTransaction.md)\>

Balances and signs a transaction, readying it for submission.

#### Parameters

##### tx

[`VersionedUnboundTransaction`](../type-aliases/VersionedUnboundTransaction.md)

The version-tagged transaction to balance: `{ version: 'v9', tx }` for a live v9
          ledger object, `{ version: 'v8', txBytes }` for v8-era serialized bytes.

##### ttl?

`Date`

Time-to-live for the balanced transaction. Implementation-defined when omitted;
           the testkit's `MidnightWalletProvider` defaults to one hour.

#### Returns

`Promise`\<[`VersionedFinalizedTransaction`](../type-aliases/VersionedFinalizedTransaction.md)\>

The balanced, signed transaction, version-tagged. Narrow on `version` — or call
         `unwrapV9` — before reading the payload.

#### Throws

V8PayloadUnsupportedError if the implementation does not handle the v8 arm.

#### Throws

UntaggedPayloadError if `version` is missing or unrecognised.

***

### getCoinPublicKey()

> **getCoinPublicKey**(): `string`

#### Returns

`string`

***

### getEncryptionPublicKey()

> **getEncryptionPublicKey**(): `string`

#### Returns

`string`
