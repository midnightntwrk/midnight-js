[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / SubmitRejectionUndiagnosedError

# Class: SubmitRejectionUndiagnosedError

An error indicating that a submission was rejected and that whether the
network crossed the ledger fork under it could not be established.

An `AggregateError` because nothing may be dropped: the submission rejection
is what happened to the transaction, and [reason](#reason) is why no diagnosis
could be made. `cause` names the proximate failure so a consumer walking only
cause chains still lands somewhere useful.

DO NOT COPY THE CARRIED REJECTION'S CODE ONTO THIS ERROR. It has its own for
a reason.

## See

[StaleHeadRemediation](../../documents/StaleHeadRemediation.md) for that reason, and for the two arms.

## Extends

- `AggregateError`

## Constructors

### Constructor

> **new SubmitRejectionUndiagnosedError**(`operation`, `rejection`, `undiagnosed`): `SubmitRejectionUndiagnosedError`

#### Parameters

##### operation

[`SubmittedOperation`](../interfaces/SubmittedOperation.md)

Which operation was rejected.

##### rejection

`unknown`

The submit rejection, already sanitized. Always the FIRST
                 entry of `errors`.

##### undiagnosed

[`SubmitRejectionUndiagnosedCause`](../type-aliases/SubmitRejectionUndiagnosedCause.md)

Why no diagnosis could be made.

#### Returns

`SubmitRejectionUndiagnosedError`

#### Overrides

`AggregateError.constructor`

## Properties

### circuitId

> `readonly` **circuitId**: `string`

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_C_SUBMIT_REJECTION_UNDIAGNOSED"` = `CONTRACTS_ERROR_CODES.SUBMIT_REJECTION_UNDIAGNOSED`

***

### contractAddress

> `readonly` **contractAddress**: `string`

***

### kind

> `readonly` **kind**: [`StaleHeadOperationKind`](../type-aliases/StaleHeadOperationKind.md)

***

### reason

> `readonly` **reason**: `"head-read-failed"` \| `"head-moved-backwards"`

Which of the two undiagnosable conditions this is.

***

### startEra

> `readonly` **startEra**: `"v8"` \| `"v9"`

The era the operation resolved when it started.
