[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / ComposeFailedError

# Class: ComposeFailedError

Thrown when a transaction cannot be composed because a circuit's operation
is missing, under-registered, or names a circuit the contract does not have.
`stage` (see [ComposeStage](../type-aliases/ComposeStage.md)) names which composition step failed and is
a closed union, so a consumer can `switch` on it exhaustively; `version`
names the ledger era the composition was running against.

Most stages are direct assertion failures (a missing lookup, not a wrapped
lower-level exception) and carry no `cause`, like
[Ledger8InstanceMismatchError](Ledger8InstanceMismatchError.md). The exceptions are the stages where
the ledger itself rejected caller-supplied bytes — enumerated under `cause`
below: that failure is preserved on `cause`, the same way
[DownConvertFailedError](DownConvertFailedError.md) preserves its runtime's own message.

`circuitId` names the entry point, never its raw contents: this class
renders no hex and no byte-array dump. `'call-empty'` is the one stage with
no circuit to name, and its message names none.

## Param

**version**

The ledger era the composition was running against.

## Param

**stage**

Which composition step failed — see [ComposeStage](../type-aliases/ComposeStage.md). A
  closed union, so a consumer can `switch` on it exhaustively.

## Param

**circuitId**

The entry-point name, already decoded. [NO\_CIRCUIT](../variables/NO_CIRCUIT.md)
  for `'call-empty'`, the one stage raised before any circuit is looked up.

## Param

**cause**

The runtime's own failure, present only for the stages where
  the ledger itself rejected caller-supplied bytes: `'call-contract-state'`,
  `'call-partition-context'`, `'call-partition'`, `'call-prototype'` and
  `'deploy-verifier-key-blob'`.

## See

 - [ComposeRefusalOrder](../../documents/ComposeRefusalOrder.md)
 - [VerifierKeys](../../documents/VerifierKeys.md)

## Extends

- `Error`

## Constructors

### Constructor

> **new ComposeFailedError**(`version`, `stage`, `circuitId`, `cause?`): `ComposeFailedError`

#### Parameters

##### version

`"v8"` \| `"v9"`

##### stage

[`ComposeStage`](../type-aliases/ComposeStage.md)

##### circuitId

`string`

##### cause?

`unknown`

#### Returns

`ComposeFailedError`

#### Overrides

`Error.constructor`

## Properties

### circuitId

> `readonly` **circuitId**: `string`

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_P_COMPOSE_FAILED"` = `PROTOCOL_ERROR_CODES.COMPOSE_FAILED`

***

### stage

> `readonly` **stage**: [`ComposeStage`](../type-aliases/ComposeStage.md)

***

### version

> `readonly` **version**: `"v8"` \| `"v9"`
