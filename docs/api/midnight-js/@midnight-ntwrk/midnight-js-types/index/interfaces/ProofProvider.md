[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../../README.md) / [index](../README.md) / ProofProvider

# Interface: ProofProvider

Interface for a proof server running in a trusted environment.

## Properties

### supportedEras

> `readonly` **supportedEras**: readonly (`"v8"` \| `"v9"`)[]

The ledger eras THIS INSTANCE serves.

Read before an operation starts, by `assertProvidersSupportEra`, so a set of
providers that cannot carry a transaction end to end is refused before its
proof is paid for. A provider built by one of the `create*` factories has
this computed from the handlers it was given; a provider implementing this
interface directly states it.

Declare every era `proveTx` really serves and no more. Nothing verifies the
claim — an era listed here but not served still fails at `proveTx`, just
later and after more work.

## Methods

### proveTx()

> **proveTx**(`unprovenTx`, `proveTxConfig?`): `Promise`\<[`UnboundTx`](../type-aliases/UnboundTx.md)\>

Creates call proofs for an unproven transaction. The resulting transaction is unbalanced and
must be balanced using the [WalletProvider](WalletProvider.md) interface.

#### Parameters

##### unprovenTx

[`UnprovenTx`](../type-aliases/UnprovenTx.md)

The unproven transaction handle.

##### proveTxConfig?

[`ProveTxConfig`](ProveTxConfig.md)

The configuration for the proof request to the proof provider. Empty in case
                     a deploy transaction is being proved with no user-defined timeout.

#### Returns

`Promise`\<[`UnboundTx`](../type-aliases/UnboundTx.md)\>

The proven transaction handle, in the SAME era as `unprovenTx`. Read it with
         `proven.deserialize({ v9: Transaction })`, with `Transaction` from your own ledger copy.

#### Throws

InvalidTransactionHandleError if `unprovenTx` is not an unproven handle of this package.

#### Throws

ProviderEraUnsupportedError if the implementation does not serve the handle's era.
        [createLedger9ProofProvider](../functions/createLedger9ProofProvider.md) serves v9 only; `httpClientProofProvider` and
        `dappConnectorProofProvider` serve both eras.

#### Throws

InvalidTransactionHandleError if the proven transaction is not a transaction object or
        bytes (`not-a-transaction`), or is not an Unbound transaction of the handle's era
        (`header-mismatch`).

#### Throws

PayloadNotATransactionError if a provider built with [createProofProviderFromHandlers](../functions/createProofProviderFromHandlers.md)
        is answered with a transaction whose body does not decode.

#### Throws

Ledger8RuntimeMissingError if a provider of this framework proves a v8 transaction and
        the v8 runtime cannot be loaded.

#### Throws

TransactionDecodeFailedError if a provider of this framework cannot decode `unprovenTx`.

#### Throws

InvalidArgumentError if `proveTxConfig.timeout` is set and the implementation cannot
        apply it. [createLedger9ProofProvider](../functions/createLedger9ProofProvider.md), [createProofProviderFromProvingProviders](../functions/createProofProviderFromProvingProviders.md) and
        `dappConnectorProofProvider` refuse it before any proving starts;
        `httpClientProofProvider` honours it.
