[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [ledger](../README.md) / QueryContext

# Class: QueryContext

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:860

Provides the information needed to fully process a transaction, including
information about the rest of the transaction, and the state of the chain at
the time of execution.

## Constructors

### Constructor

> **new QueryContext**(`state`, `address`): `QueryContext`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:865

Construct a basic context from a contract's address and current state
value

#### Parameters

##### state

[`ChargedState`](ChargedState.md)

##### address

`string`

#### Returns

`QueryContext`

## Properties

### address

> `readonly` **address**: `string`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:905

The address of the contract

***

### block

> **block**: [`CallContext`](../type-aliases/CallContext.md)

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:909

The block-level information accessible to the contract

***

### comIndices

> `readonly` **comIndices**: `Map`\<`string`, `bigint`\>

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:914

The commitment indices map accessible to the contract, primarily via
[qualify](#qualify)

***

### effects

> **effects**: [`Effects`](../type-aliases/Effects.md)

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:919

The effects that occurred during execution against this context, should
match those declared in a [Transcript](../type-aliases/Transcript.md)

***

### state

> `readonly` **state**: [`ChargedState`](ChargedState.md)

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:923

The current contract state retained in the context

## Methods

### insertCommitment()

> **insertCommitment**(`comm`, `index`): `QueryContext`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:872

Register a given coin commitment as being accessible at a specific index,
for use when receiving coins in-contract, and needing to record their
index to later spend them

#### Parameters

##### comm

`string`

##### index

`bigint`

#### Returns

`QueryContext`

***

### qualify()

> **qualify**(`coin`): [`Value`](../type-aliases/Value.md) \| `undefined`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:880

**`Internal`**

Internal counterpart to [insertCommitment](#insertcommitment); upgrades an encoded
[ShieldedCoinInfo](../type-aliases/ShieldedCoinInfo.md) to an encoded [QualifiedShieldedCoinInfo](../type-aliases/QualifiedShieldedCoinInfo.md) using the
inserted commitments

#### Parameters

##### coin

[`Value`](../type-aliases/Value.md)

#### Returns

[`Value`](../type-aliases/Value.md) \| `undefined`

***

### query()

> **query**(`ops`, `cost_model`, `gas_limit?`): [`QueryResults`](QueryResults.md)

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:893

Runs a sequence of operations in gather mode, returning the results of the
gather.

#### Parameters

##### ops

[`Op`](../type-aliases/Op.md)\<`null`\>[]

##### cost\_model

[`CostModel`](CostModel.md)

##### gas\_limit?

[`RunningCost`](../type-aliases/RunningCost.md)

#### Returns

[`QueryResults`](QueryResults.md)

***

### runTranscript()

> **runTranscript**(`transcript`, `cost_model`): `QueryContext`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:887

Runs a transcript in verifying mode against the current query context,
outputting a new query context, with the [state](#state) and [effects](#effects)
from after the execution.

#### Parameters

##### transcript

[`Transcript`](../type-aliases/Transcript.md)\<[`AlignedValue`](../type-aliases/AlignedValue.md)\>

##### cost\_model

[`CostModel`](CostModel.md)

#### Returns

`QueryContext`

***

### toString()

> **toString**(`compact?`): `string`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:900

#### Parameters

##### compact?

`boolean`

#### Returns

`string`

***

### toVmStack()

> **toVmStack**(): [`VmStack`](VmStack.md)

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:898

Converts the QueryContext to [VmStack](VmStack.md).

#### Returns

[`VmStack`](VmStack.md)
