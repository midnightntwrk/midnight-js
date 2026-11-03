[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / SubmittedOperation

# Interface: SubmittedOperation

WHICH operation a submit rejection belongs to: the identity every refusal
below has to name so its remediation can actually be followed.

A dApp with several calls in flight shares one error handler, so an error
telling it to "check whether this finalized" is unfollowable unless it says
which contract and which entry point. Contract addresses and circuit ids are
identifiers, which messages may carry; decoded state and key bytes are what
they may not.

## Properties

### circuitId

> `readonly` **circuitId**: `string`

The entry point this operation ran. A deploy has no circuit of its own and
reports the constructor's own name, `'initialState'`; a maintenance
authority replacement reports NO\_CIRCUIT.

***

### contractAddress

> `readonly` **contractAddress**: `string`

The contract this operation targets. For a deploy this is the address the
composition MINTED, which is the address a caller has to check before
deploying again — a deploy mints a fresh nonce, so a second attempt lands
at a different address and would not overwrite the first.

***

### kind

> `readonly` **kind**: [`SubmittedOperationKind`](../type-aliases/SubmittedOperationKind.md)

Whether this operation deploys a contract, calls one already deployed, or maintains one.

***

### networkVersion

> `readonly` **networkVersion**: `"v9"` \| `"v8"`

The ledger version the network was on when this operation started.

One field, two uses, and they are the same fact: it is the era of the
transaction carried across the provider methods, and it is the `startEra` a
fork diagnosis compares a fresh reading against.
