[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / TxFailedError

# Class: TxFailedError

A transaction this framework submitted that the chain recorded with a
non-success status, in either ledger era. The one class to catch.

Read [TxFailedError.operation](#operation) for which operation failed, and
[TxFailedError.record](#record) for what the chain recorded. `record.tx` is a
`FinalizedTx` in the era `record.era` names; read it with
`LedgerTransaction.unwrap(record.tx, record.era)` after narrowing on `era`.

[TxFailedError.signingKey](#signingkey) is NAMED in the message but never rendered
into it: after a failed deploy or replacement it may be the only copy of the
authority over a contract that landed. It is not enumerable, so a logger that
serializes an error's properties does not write it out.

Branch on the registered code rather than `instanceof` where more than one
copy of this package may be loaded.

## Extends

- [`MidnightJsError`](../../../midnight-js/classes/MidnightJsError.md)

## Constructors

### Constructor

> **new TxFailedError**(`operation`, `record`, `details`): `TxFailedError`

#### Parameters

##### operation

`"deploy"` \| `"replace-authority"`

The operation whose transaction failed.

##### record

[`FinalizedTxRead`](../../../midnight-js/types/type-aliases/FinalizedTxRead.md)

The finalized record the chain reported, tagged with its era.

##### details

What the operation was about. Each operation requires the members it always has.

###### contractAddress

`string`

###### signingKey

[`SigningKey`](https://github.com/midnightntwrk/midnight-ledger)

#### Returns

`TxFailedError`

#### Overrides

[`MidnightJsError`](../../../midnight-js/classes/MidnightJsError.md).[`constructor`](../../../midnight-js/classes/MidnightJsError.md#constructor)

### Constructor

> **new TxFailedError**(`operation`, `record`, `details`): `TxFailedError`

#### Parameters

##### operation

`"insert-verifier-key"` \| `"remove-verifier-key"`

##### record

[`FinalizedTxRead`](../../../midnight-js/types/type-aliases/FinalizedTxRead.md)

##### details

###### circuitId

`string`

###### contractAddress

`string`

#### Returns

`TxFailedError`

#### Overrides

[`MidnightJsError`](../../../midnight-js/classes/MidnightJsError.md).[`constructor`](../../../midnight-js/classes/MidnightJsError.md#constructor)

### Constructor

> **new TxFailedError**(`operation`, `record`, `details`): `TxFailedError`

#### Parameters

##### operation

`"call"`

##### record

[`FinalizedTxRead`](../../../midnight-js/types/type-aliases/FinalizedTxRead.md)

##### details

###### circuitId

`string` \| readonly `string`[]

###### contractAddress?

`string`

#### Returns

`TxFailedError`

#### Overrides

`MidnightJsError.constructor`

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../../midnight-js/type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../../midnight-js/classes/MidnightJsError.md).[`category`](../../../midnight-js/classes/MidnightJsError.md#category)

***

### circuitId?

> `readonly` `optional` **circuitId?**: `string` \| readonly `string`[]

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_C_TX_FAILED"` = `CONTRACTS_ERROR_CODES.TX_FAILED`

#### Overrides

[`MidnightJsError`](../../../midnight-js/classes/MidnightJsError.md).[`code`](../../../midnight-js/classes/MidnightJsError.md#code)

***

### contractAddress?

> `readonly` `optional` **contractAddress?**: `string`

***

### operation

> `readonly` **operation**: [`TxFailedOperation`](../type-aliases/TxFailedOperation.md)

***

### record

> `readonly` **record**: [`FinalizedTxRead`](../../../midnight-js/types/type-aliases/FinalizedTxRead.md)

***

### signingKey?

> `readonly` `optional` **signingKey?**: [`SigningKey`](https://github.com/midnightntwrk/midnight-ledger)
