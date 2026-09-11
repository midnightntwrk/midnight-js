[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / FinalizedCallTxData

# Interface: FinalizedCallTxData\<C, PCK\>

Contains all information resulting from circuit execution.

## Remarks

**Privacy-sensitive type.** The `private` field is a
[CallResultPrivate](../type-aliases/CallResultPrivate.md) carrying ZK-confidential data. Treat the whole
object as confidential when logging, serializing, or transmitting — read
only the `public` field or destructure specific non-sensitive fields rather
than spreading or stringifying the whole object.

## Extends

- [`UnsubmittedCallTxData`](UnsubmittedCallTxData.md)\<`C`, `PCK`\>

## Type Parameters

### C

`C` *extends* [`Contract$1.Any`](https://github.com/midnightntwrk/midnight-sdk)

### PCK

`PCK` *extends* [`Contract$1.ProvableCircuitId`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>

## Properties

### calls

> `readonly` **calls**: readonly [`ContractCall`](https://github.com/midnightntwrk/midnight-sdk)[]

Proof data for every contract call made while executing the circuit, in execution-trace order:
cross-contract callees first, the root call last. For a circuit that performs no cross-contract
calls this contains a single entry (the root). Consistent with `compact-js`'s
`ContractExecutable.CallResult.calls`.

#### Remarks

**Privacy-sensitive.** Each entry carries ZK input/output and private transcript data
for a call in the tree. Treat as confidential alongside [private](CallResult.md#private).

#### Inherited from

[`UnsubmittedCallTxData`](UnsubmittedCallTxData.md).[`calls`](UnsubmittedCallTxData.md#calls)

***

### circuitId

> `readonly` **circuitId**: [`ProvableCircuitId`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>

The circuit whose call this result describes.

On the result itself rather than only in the caller's own variables: a
handler that receives a finalized result -- from a queue, a retry, a
batch -- has the execution data and no way back to the options that
produced it. Both eras carry it.

In a scope that made several calls this names the LAST one, which is the
call `public`, `private` and `calls` also describe: this type is one
call's result, not the transaction's. The transaction may carry more, and
a failure reports all of them -- `CallTxFailedError`'s `circuitId` is the
accumulated list. The two are answering different questions, and a caller
routing on this one is routing on the call, not the transaction.

Typed as the contract's whole circuit-id union, NOT as `PCK`, and that is
load-bearing. This type is reachable through `TransactionContext[Submit]`,
so naming `PCK` in a property position makes the context invariant in
`PCK`. A scope is legitimately typed with the union --
`withContractScopedTransaction<C>` defaults it that way -- while the calls
made inside it name one circuit each, and invariance refuses exactly that
pairing. `SubmittedCallTx` has no scope on its path and names `PCK`
precisely.

What catches a regression here is `testkit-js-e2e`'s scoped-transaction
test, through the repo-wide `typecheck:tests`. NOT an assertion in this
package: reproducing the failure needs a contract whose circuits differ in
arity, and every era-9 fixture here declares exactly one no-argument
circuit, so an in-package assertion passes whichever way this member is
typed. Do not add one and take it for a gate.

***

### era

> `readonly` **era**: `"ledger9"`

The pipeline that produced this result: always the current era here.

Read off the compiled artifact, NEVER off a transaction record — the two
facts disagree after the fork, and only this one says which module the
objects in this result came from.

#### Inherited from

[`UnsubmittedCallTxData`](UnsubmittedCallTxData.md).[`era`](UnsubmittedCallTxData.md#era)

***

### private

> `readonly` **private**: [`UnsubmittedCallTxPrivateData`](UnsubmittedCallTxPrivateData.md)\<`C`, `PCK`\>

Private data relevant to this call transaction.

#### Inherited from

[`UnsubmittedCallTxData`](UnsubmittedCallTxData.md).[`private`](UnsubmittedCallTxData.md#private)

***

### public

> `readonly` **public**: [`FinalizedCallTxPublicData`](FinalizedCallTxPublicData.md)

Public data relevant to this call transaction.

#### Overrides

[`UnsubmittedCallTxData`](UnsubmittedCallTxData.md).[`public`](UnsubmittedCallTxData.md#public)
