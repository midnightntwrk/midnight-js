[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../../README.md) / [index](../README.md) / LedgerTransaction

# Class: LedgerTransaction\<S, E\>

An opaque ledger transaction of one era at one [TransactionStage](../type-aliases/TransactionStage.md).

Made only by [LedgerTransaction.seal](#seal), which refuses an object of any
ledger copy other than the one this framework loaded, or one at another
stage, and read only by [LedgerTransaction.unwrap](#unwrap), which refuses the
wrong era.

## Type Parameters

### S

`S` *extends* [`TransactionStage`](../type-aliases/TransactionStage.md)

The stage the transaction is at.

### E

`E` *extends* `LedgerVersion` = `LedgerVersion`

The era the transaction belongs to; any era when not known.

## Properties

### era

> `readonly` **era**: `E`

***

### stage

> `readonly` **stage**: `S`

## Methods

### serialize()

> **serialize**(): `Uint8Array`

The transaction's serialized bytes.

#### Returns

`Uint8Array`

***

### isLedgerTransaction()

> `static` **isLedgerTransaction**(`value`): value is LedgerTransaction\<TransactionStage, "v8" \| "v9"\>

Whether `value` is a handle made by this copy of the package. A look-alike object, or a
handle made by a second installed copy of the package, gives `false`.

#### Parameters

##### value

`unknown`

#### Returns

value is LedgerTransaction\<TransactionStage, "v8" \| "v9"\>

***

### require()

> `static` **require**\<`S`\>(`value`, `stage`, `method`): `LedgerTransaction`\<`S`\>

Checks that a value is a handle of this copy of the package at the stage a
method takes.

#### Type Parameters

##### S

`S` *extends* [`TransactionStage`](../type-aliases/TransactionStage.md)

#### Parameters

##### value

`unknown`

The value the method received.

##### stage

`S`

The stage the method takes.

##### method

[`TransactionHandleMethod`](../type-aliases/TransactionHandleMethod.md)

The method, named in a refusal.

#### Returns

`LedgerTransaction`\<`S`\>

The handle, narrowed to `stage`.

#### Throws

InvalidTransactionHandleError If `value` is not a handle
  (`not-a-handle`) or is at another stage (`wrong-stage`).

***

### seal()

> `static` **seal**\<`E`, `S`\>(`era`, `stage`, `tx`, `method?`): `LedgerTransaction`\<`S`, `E`\>

Wraps a ledger transaction object in a handle.

#### Type Parameters

##### E

`E` *extends* `"v8"` \| `"v9"`

##### S

`S` *extends* [`TransactionStage`](../type-aliases/TransactionStage.md)

#### Parameters

##### era

`E`

The era of the object.

##### stage

`S`

The stage the object is at.

##### tx

[`LedgerTransactionTypes`](../interfaces/LedgerTransactionTypes.md)\[`E`\]\[`S`\]

The transaction, an object of the ledger copy this framework
  loaded for `era`.

##### method?

[`TransactionHandleMethod`](../type-aliases/TransactionHandleMethod.md) = `'LedgerTransaction.seal'`

The provider method whose answer is sealed, named in a
  refusal; `LedgerTransaction.seal` when omitted.

#### Returns

`LedgerTransaction`\<`S`, `E`\>

#### Throws

InvalidTransactionHandleError If `stage` is not a transaction stage
  (`invalid-stage`), `tx` is not a ledger transaction object
  (`not-a-transaction`), or `tx` is at another stage (`stage-mismatch`).

#### Throws

ForeignLedgerTransactionError If `tx` is an object of another
  ledger copy, or `era` is v8 and the v8 ledger is not loaded yet.

#### Throws

UnknownLedgerVersionError If `era` is not a ledger version.

***

### unwrap()

> `static` **unwrap**\<`E`, `S`\>(`handle`, `era`): [`LedgerTransactionTypes`](../interfaces/LedgerTransactionTypes.md)\[`E`\]\[`S`\]

Reads the ledger transaction object out of a handle.

#### Type Parameters

##### E

`E` *extends* `"v8"` \| `"v9"`

##### S

`S` *extends* [`TransactionStage`](../type-aliases/TransactionStage.md)

#### Parameters

##### handle

`LedgerTransaction`\<`S`\>

A handle made by [LedgerTransaction.seal](#seal).

##### era

`E`

The era the caller serves.

#### Returns

[`LedgerTransactionTypes`](../interfaces/LedgerTransactionTypes.md)\[`E`\]\[`S`\]

The object that was sealed.

#### Throws

InvalidTransactionHandleError If `handle` is not a handle of this
  copy of the package.

#### Throws

UnknownLedgerVersionError If `era` is not a ledger version.

#### Throws

TransactionEraMismatchError If the handle carries another era.
