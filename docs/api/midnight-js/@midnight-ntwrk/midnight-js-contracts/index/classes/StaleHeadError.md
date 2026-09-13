[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / StaleHeadError

# Class: StaleHeadError

An error indicating that the network crossed the ledger fork between an
operation resolving the head era and its transaction being submitted, and
that a fresh head read confirms the move.

Carries a two-step remediation, and the order matters: verify the transaction
did not finalize BEFORE acting, because a submission rejected while the head
was moving can still have been recorded.

The provider's own rejection travels on `cause`, already sanitized of
anything that could carry transaction or witness material — see
[Ledger8SeamFailedError](../namespaces/Ledger8/classes/SeamFailedError.md), which is the form it arrives in.

## See

[StaleHeadRemediation](../../documents/StaleHeadRemediation.md) for why a submit rejection is diagnosed
     rather than propagated, and why a deploy's remediation differs.

## Extends

- `Error`

## Constructors

### Constructor

> **new StaleHeadError**(`operation`, `freshEra`, `cause`): `StaleHeadError`

#### Parameters

##### operation

[`SubmittedOperation`](../interfaces/SubmittedOperation.md)

Which operation was rejected. Flattened onto the error
                 rather than nested, so a caller reads `error.circuitId`
                 without knowing this type exists.

##### freshEra

`"v8"` \| `"v9"`

The era a fresh head read reports now. Retained on the
                error because it is what a caller re-runs against.

##### cause

`unknown`

The submit rejection, already sanitized.

#### Returns

`StaleHeadError`

#### Overrides

`Error.constructor`

## Properties

### circuitId

> `readonly` **circuitId**: `string`

The entry point that was run, so a caller with several in flight knows which.

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_C_STALE_HEAD"` = `CONTRACTS_ERROR_CODES.STALE_HEAD`

***

### contractAddress

> `readonly` **contractAddress**: `string`

The contract to reconcile, which is the first remediation step's subject.

***

### freshEra

> `readonly` **freshEra**: `"v8"` \| `"v9"`

The era a fresh head read reports now. Retained on the
                error because it is what a caller re-runs against.

***

### kind

> `readonly` **kind**: [`StaleHeadOperationKind`](../type-aliases/StaleHeadOperationKind.md)

Whether the refused operation was a call or a deploy — the discriminant a
caller branches on, and which remediation the message carries.

***

### startEra

> `readonly` **startEra**: `"v8"` \| `"v9"`

The era the operation resolved when it started.
