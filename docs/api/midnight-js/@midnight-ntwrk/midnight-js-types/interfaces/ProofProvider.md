[**Midnight.js API Reference v5.0.0-beta.7**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../README.md) / ProofProvider

# Interface: ProofProvider

Interface for a proof server running in a trusted environment.

## Type Param

**K**

The type of the circuit ID used by the provider.

## Properties

### supportedEras

> `readonly` **supportedEras**: readonly (`"v9"` \| `"v8"`)[]

The ledger eras THIS INSTANCE serves.

Read before an operation starts, by `assertSeamsSupportEra`, so a set of
providers that cannot carry a transaction end to end is refused before its
proof is paid for. A provider built by one of the `create*` factories has
this computed from the arms it was given; a provider implementing this
interface directly states it.

Declare every era `proveTx` really serves and no more. Nothing verifies the
claim — an era listed here but not served still fails at `proveTx`, just
later and after more work.

## Methods

### proveTx()

> **proveTx**(`unprovenTx`, `proveTxConfig?`): `Promise`\<[`VersionedUnboundTransaction`](../type-aliases/VersionedUnboundTransaction.md)\>

Creates call proofs for an unproven transaction. The resulting transaction is unbalanced and
must be balanced using the [WalletProvider](WalletProvider.md) interface.

#### Parameters

##### unprovenTx

[`VersionedUnprovenTransaction`](../type-aliases/VersionedUnprovenTransaction.md)

The version-tagged unproven transaction: wrap a live v9 ledger object as
                  `{ version: 'v9', tx }`, or v8-era serialized bytes as
                  `{ version: 'v8', txBytes }`.

##### proveTxConfig?

[`ProveTxConfig`](ProveTxConfig.md)

The configuration for the proof request to the proof provider. Empty in case
                     a deploy transaction is being proved with no user-defined timeout.

#### Returns

`Promise`\<[`VersionedUnboundTransaction`](../type-aliases/VersionedUnboundTransaction.md)\>

The proven transaction, version-tagged, and always in the SAME arm the request
         carried. Narrow on `version` — or call `unwrapV9` — before reading the payload.

#### Throws

V8PayloadUnsupportedError if the implementation does not handle the v8 arm. Which
        implementations do is worth knowing before you send one: `httpClientProofProvider`
        and `dappConnectorProofProvider` both serve it, taking and returning serialized
        bytes. [createProofProvider](../functions/createProofProvider.md) does NOT — it adapts a v9-only `ProvingProvider`,
        so it refuses the v8 arm on the way in, which is the honest answer for what it wraps.

#### Throws

PayloadNotATransactionError if the v8 arm's `txBytes` is not a serialized transaction.
        Raised by the providers that serve that arm and defined in
        `@midnight-ntwrk/midnight-js-protocol/errors` (not a runtime dependency of this
        package, so it is named here rather than imported); match it with `hasErrorCode`
        against `PROTOCOL_ERROR_CODES.PAYLOAD_NOT_A_TRANSACTION`.

#### Throws

UntaggedPayloadError if `version` is missing or unrecognised.
