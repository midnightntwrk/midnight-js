[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../../README.md) / [index](../README.md) / WalletProvider

# Interface: WalletProvider

Interface representing a WalletProvider that handles operations such as
transaction balancing and finalization, and provides access to cryptographic secret keys.

## Properties

### supportedEras

> `readonly` **supportedEras**: readonly (`"v8"` \| `"v9"`)[]

The ledger eras THIS INSTANCE serves. See
[ProofProvider.supportedEras](ProofProvider.md#supportederas) — the field means the same on all three
transaction providers, and all three are read together before an operation
starts.

## Methods

### balanceTx()

> **balanceTx**(`tx`, `ttl?`): `Promise`\<[`FinalizedTx`](../type-aliases/FinalizedTx.md)\>

Balances and signs a transaction, readying it for submission.

#### Parameters

##### tx

[`UnboundTx`](../type-aliases/UnboundTx.md)

The unbound transaction handle to balance.

##### ttl?

`Date`

Expiry for the intent the wallet adds while balancing. The framework always passes
           a `Date` `providers.config.ttlSeconds` after balancing starts; honour it rather than a
           TTL of your own. Implementation-defined when omitted; the testkit's
           `MidnightWalletProvider` defaults to one hour.

#### Returns

`Promise`\<[`FinalizedTx`](../type-aliases/FinalizedTx.md)\>

The balanced, signed transaction handle, in the SAME era as `tx`.

#### Throws

InvalidTransactionHandleError if `tx` is not an unbound handle of this package.

#### Throws

ProviderEraUnsupportedError if the implementation does not serve the handle's era.

#### Throws

ForeignLedgerTransactionError if the balanced transaction is not an object of the
        ledger copy this framework loaded for its era.

#### Throws

InvalidTransactionHandleError if the balanced transaction is not a ledger transaction
        object (`not-a-transaction`) or is not at the Finalized stage (`stage-mismatch`).

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
