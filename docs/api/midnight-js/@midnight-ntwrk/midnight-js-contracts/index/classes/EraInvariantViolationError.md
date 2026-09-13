[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / EraInvariantViolationError

# Class: EraInvariantViolationError

An error indicating that a provider, or the read surface, answered in a
different ledger era from the one the flow submitted.

The provider seams and the read surface both carry two eras, but any ONE
flow through this package tags every outgoing payload with a single era and
cannot submit or report anything else. An answer in the other era therefore
means the provider re-tagged or converted the payload it was handed, or that
the flow is pointed at a network whose records belong to the other era.

[EraInvariantViolationError.expected](#expected) names the only era this flow can
accept back, and so which direction the violation went. For the current
era's flows that is the era they submit, which is always `'v9'` — the
default, so call sites that predate the retained-era pipelines read exactly
as they did before it existed. The retained era's finalizing arm passes the
network HEAD instead: it composes retained-era transactions but is recorded
by whichever ledger the head is on, so the head, not the pipeline, is what
the record has to agree with.

[EraInvariantViolationError.received](#received) names the era that actually came
back, when the payload carried a readable one. A payload whose tag is
missing or unrecognised is a different fault and raises
UntaggedPayloadError instead.

## Extends

- `Error`

## Constructors

### Constructor

> **new EraInvariantViolationError**(`seam`, `circuitId?`, `expected?`, `received?`): `EraInvariantViolationError`

#### Parameters

##### seam

[`Seam`](../../../midnight-js/types/type-aliases/Seam.md)

The provider method that returned the payload.

##### circuitId?

`string` \| readonly `string`[]

The circuit, or circuits, whose flow this happened on,
                 when known. A dApp firing many circuits needs this to
                 tell which call broke.

##### expected?

`"v8"` \| `"v9"`

The only era this flow can accept back. Defaults to
                `'v9'`. See the class comment for which fact this names
                on each arm.

##### received?

`"v8"` \| `"v9"`

The era the payload actually carried, when it carried a
                readable one. Named in the message: a refusal that states
                only what it wanted leaves the reader to find out what it
                got.

#### Returns

`EraInvariantViolationError`

#### Overrides

`Error.constructor`

## Properties

### circuitId?

> `readonly` `optional` **circuitId?**: `string` \| readonly `string`[]

The circuit, or circuits, whose flow this happened on,
                 when known. A dApp firing many circuits needs this to
                 tell which call broke.

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_C_ERA_INVARIANT_VIOLATION"` = `CONTRACTS_ERROR_CODES.ERA_INVARIANT_VIOLATION`

***

### expected

> `readonly` **expected**: `"v8"` \| `"v9"` = `'v9'`

The only era this flow can accept back. Defaults to
                `'v9'`. See the class comment for which fact this names
                on each arm.

***

### received?

> `readonly` `optional` **received?**: `"v8"` \| `"v9"`

The era the payload actually carried, when it carried a
                readable one. Named in the message: a refusal that states
                only what it wanted leaves the reader to find out what it
                got.

***

### seam

> `readonly` **seam**: [`Seam`](../../../midnight-js/types/type-aliases/Seam.md)

The provider method that returned the payload.
