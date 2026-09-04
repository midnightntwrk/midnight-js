[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / UnsubmittedDeployTxPrivateData

# Interface: UnsubmittedDeployTxPrivateData\<C\>

Defined in: packages/contracts/dist/index.d.ts:500

Base type for private data relevant to an unsubmitted deployment transaction.

## Remarks

**Privacy-sensitive type.** The `signingKey` field carries the contract's
maintenance authority, and `initialPrivateState` carries application-defined
private state that the zero-knowledge proofs were designed to keep
confidential. Every field on this type is private.

Application code must not log, serialize, or transmit instances of this
type. If a non-sensitive identifier derived from the deployment is needed,
compute it explicitly outside this type rather than passing the whole
object across a trust boundary.

## Extended by

- [`UnsubmittedDeployTxPrivateDataFull`](UnsubmittedDeployTxPrivateDataFull.md)

## Type Parameters

### C

`C` *extends* [`Contract$1.Any`](https://github.com/midnightntwrk/midnight-sdk)

## Properties

### initialPrivateState

> `readonly` **initialPrivateState**: [`PrivateState`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>

Defined in: packages/contracts/dist/index.d.ts:509

The initial private state of the contract deployed to the blockchain. This
value is persisted if the transaction succeeds.

***

### signingKey

> `readonly` **signingKey**: [`SigningKey`](https://github.com/midnightntwrk/midnight-ledger)

Defined in: packages/contracts/dist/index.d.ts:504

The signing key that was added as the deployed contract's maintenance authority.
