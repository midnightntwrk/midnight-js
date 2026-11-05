[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../../README.md) / [index](../README.md) / LedgerTransaction

# Class: LedgerTransaction\<S, E\>

A ledger transaction of one era at one [TransactionStage](../type-aliases/TransactionStage.md), as the bytes that ledger wrote.

Made only by [LedgerTransaction.fromBytes](#frombytes), which checks the header the ledger of that era
writes for that stage, or by [LedgerTransaction.seal](#seal), which does the same with an object's
bytes. No handle holds a ledger object. The caller decodes it with its own ledger copy:

```ts
import { Transaction } from '@midnightntwrk/ledger-v9';

const tx = record.tx.deserialize({ v9: Transaction });
```

The bytes live in a private field, so `structuredClone`, `postMessage` and JSON drop them. To send
one elsewhere, send `serialize()`, `era` and `stage`, and rebuild it with
[LedgerTransaction.fromBytes](#frombytes).

## Type Parameters

### S

`S` *extends* [`TransactionStage`](../type-aliases/TransactionStage.md)

The stage the transaction is at.

### E

`E` *extends* `LedgerEra` = `LedgerEra`

The era the transaction belongs to; any era when not known.

## Properties

### era

> `readonly` **era**: `E`

***

### stage

> `readonly` **stage**: `S`

## Methods

### deserialize()

> **deserialize**\<`D`\>(`decoders`): [`DecodedTransaction`](../type-aliases/DecodedTransaction.md)\<`D`, `E`, `S`\>

Decodes the transaction with the class for its own era, at its own stage.

#### Type Parameters

##### D

`D` *extends* `Readonly`\<`Partial`\<`Record`\<`"v8"` \| `"v9"`, [`TransactionDecoder`](../interfaces/TransactionDecoder.md)\>\>\>

#### Parameters

##### decoders

[`TransactionDecodersFor`](../type-aliases/TransactionDecodersFor.md)\<`D`, `E`\>

One `Transaction` class per ledger era, from the caller's own ledger copy, e.g.
  `{ v9: Transaction }`. It must have a class for at least one era the handle's type allows, or
  the call does not compile. Narrow on `era` first, or pass a class for each era, so the
  handle's own era is always covered.

#### Returns

[`DecodedTransaction`](../type-aliases/DecodedTransaction.md)\<`D`, `E`, `S`\>

An object of the caller's class at this handle's stage.

#### Throws

TransactionDecoderMissingError When `decoders` has no class for `this.era`.

#### Throws

TransactionDecodeFailedError When the class throws an error that is not a
  `MidnightJsError`, for example because the bytes after the header are corrupt. A
  `MidnightJsError` is rethrown unchanged.

***

### serialize()

> **serialize**(): `Uint8Array`

#### Returns

`Uint8Array`

A copy of the bytes, exactly as the ledger wrote them.

***

### fromBytes()

> `static` **fromBytes**\<`E`, `S`\>(`era`, `stage`, `bytes`, `method?`): `LedgerTransaction`\<`S`, `E`\>

Makes a handle from the bytes of a transaction.

#### Type Parameters

##### E

`E` *extends* `"v8"` \| `"v9"`

##### S

`S` *extends* `"Unproven"` \| `"Unbound"` \| `"Finalized"`

#### Parameters

##### era

`E`

The era of the ledger that wrote the bytes.

##### stage

`S`

The stage the transaction is at.

##### bytes

`Uint8Array`

The serialized transaction. The handle keeps a copy.

##### method?

[`TransactionHandleMethod`](../type-aliases/TransactionHandleMethod.md) = `'LedgerTransaction.fromBytes'`

The provider method whose answer is wrapped, named in a refusal;
  `LedgerTransaction.fromBytes` when omitted.

#### Returns

`LedgerTransaction`\<`S`, `E`\>

#### Throws

UnknownLedgerEraError If `era` is not a ledger era.

#### Throws

InvalidTransactionHandleError If `stage` is not a transaction stage (`invalid-stage`),
  `bytes` is not a `Uint8Array` (`not-bytes`), or the bytes do not start with the header the
  ledger of `era` writes for `stage` (`header-mismatch`).

***

### isLedgerTransaction()

> `static` **isLedgerTransaction**(`value`): value is LedgerTransaction\<"Unproven" \| "Unbound" \| "Finalized", "v8" \| "v9"\>

Whether `value` is a handle made by this copy of the package. A look-alike object, or a
handle made by a second installed copy of the package, gives `false`.

#### Parameters

##### value

`unknown`

#### Returns

value is LedgerTransaction\<"Unproven" \| "Unbound" \| "Finalized", "v8" \| "v9"\>

***

### require()

> `static` **require**\<`S`\>(`value`, `stage`, `method`): `LedgerTransaction`\<`S`\>

Checks that a value is a handle of this copy of the package at the stage a
method takes.

#### Type Parameters

##### S

`S` *extends* `"Unproven"` \| `"Unbound"` \| `"Finalized"`

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

Makes a handle from a transaction object of any ledger copy:
`fromBytes(era, stage, tx.serialize())`.

#### Type Parameters

##### E

`E` *extends* `"v8"` \| `"v9"`

##### S

`S` *extends* `"Unproven"` \| `"Unbound"` \| `"Finalized"`

#### Parameters

##### era

`E`

The era of the object.

##### stage

`S`

The stage the object is at.

##### tx

The transaction.

###### serialize

##### method?

[`TransactionHandleMethod`](../type-aliases/TransactionHandleMethod.md) = `'LedgerTransaction.seal'`

The provider method whose answer is sealed, named in a refusal;
  `LedgerTransaction.seal` when omitted.

#### Returns

`LedgerTransaction`\<`S`, `E`\>

#### Throws

InvalidTransactionHandleError If `tx` has no `serialize` method (`not-a-transaction`),
  or as [LedgerTransaction.fromBytes](#frombytes) does.

#### Throws

UnknownLedgerEraError If `era` is not a ledger era.
