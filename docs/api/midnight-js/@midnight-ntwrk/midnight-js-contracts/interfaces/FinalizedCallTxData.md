[**Midnight.js API Reference v5.0.0-beta.4**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../README.md) / FinalizedCallTxData

# Interface: FinalizedCallTxData\<C, PCK\>

Contains all information resulting from circuit execution.

## Remarks

**Privacy-sensitive type.** The `private` field is a
[CallResultPrivate](CallResultPrivate.md) carrying ZK-confidential data. Treat the whole
object as confidential when logging, serializing, or transmitting — read
only the `public` field or destructure specific non-sensitive fields rather
than spreading or stringifying the whole object.

## Extends

- [`UnsubmittedCallTxData`](UnsubmittedCallTxData.md)\<`C`, `PCK`\>

## Type Parameters

### C

`C` *extends* `Contract.Any`

### PCK

`PCK` *extends* `Contract.ProvableCircuitId`\<`C`\>

## Properties

### calls

> `readonly` **calls**: readonly `ContractCall`[]

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
