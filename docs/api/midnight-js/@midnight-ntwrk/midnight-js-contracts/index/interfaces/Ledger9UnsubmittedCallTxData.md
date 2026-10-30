[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / Ledger9UnsubmittedCallTxData

# Interface: Ledger9UnsubmittedCallTxData\<C, PCK\>

Contains all information resulting from circuit execution.

## Remarks

**Privacy-sensitive type.** The `private` field is a
[Ledger9CallResultPrivate](../type-aliases/Ledger9CallResultPrivate.md) carrying ZK-confidential data. Treat the whole
object as confidential when logging, serializing, or transmitting — read
only the `public` field or destructure specific non-sensitive fields rather
than spreading or stringifying the whole object.

## Extends

- [`Ledger9CallResult`](Ledger9CallResult.md)\<`C`, `PCK`\>

## Extended by

- [`Ledger9FinalizedCallTxData`](Ledger9FinalizedCallTxData.md)

## Type Parameters

### C

`C` *extends* [`Contract.Any`](https://github.com/midnightntwrk/midnight-sdk)

### PCK

`PCK` *extends* [`Contract.ProvableCircuitId`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>

## Properties

### calls

> `readonly` **calls**: readonly [`ContractCall`](https://github.com/midnightntwrk/midnight-sdk)[]

Proof data for every contract call made while executing the circuit, in execution-trace order:
cross-contract callees first, the root call last. For a circuit that performs no cross-contract
calls this contains a single entry (the root). Consistent with `compact-js`'s
`ContractExecutable.Ledger9CallResult.calls`.

#### Remarks

**Privacy-sensitive.** Each entry carries ZK input/output and private transcript data
for a call in the tree. Treat as confidential alongside [private](Ledger9CallResult.md#private).

#### Inherited from

[`Ledger9CallResult`](Ledger9CallResult.md).[`calls`](Ledger9CallResult.md#calls)

***

### era

> `readonly` **era**: `"v9"`

The pipeline that produced this result: always ledger 9 here.

Read off the compiled artifact, NEVER off a transaction record — the two
facts disagree after the fork, and only this one says which module the
objects in this result came from.

#### Inherited from

[`Ledger9CallResult`](Ledger9CallResult.md).[`era`](Ledger9CallResult.md#era)

***

### private

> `readonly` **private**: [`Ledger9UnsubmittedCallTxPrivateData`](Ledger9UnsubmittedCallTxPrivateData.md)\<`C`, `PCK`\>

Private data relevant to this call transaction.

#### Overrides

[`Ledger9CallResult`](Ledger9CallResult.md).[`private`](Ledger9CallResult.md#private)

***

### public

> `readonly` **public**: [`Ledger9CallResultPublic`](Ledger9CallResultPublic.md)

The public/non-sensitive data produced by the circuit execution.

#### Remarks

Describes the **root** contract call (the circuit that was invoked). It is the
application-facing view; equivalent to the last entry of [calls](Ledger9CallResult.md#calls).

#### Inherited from

[`Ledger9CallResult`](Ledger9CallResult.md).[`public`](Ledger9CallResult.md#public)
