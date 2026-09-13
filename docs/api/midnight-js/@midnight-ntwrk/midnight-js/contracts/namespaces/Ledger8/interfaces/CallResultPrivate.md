[**Midnight.js API Reference v5.0.0-beta.7**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../../../README.md) / [contracts](../../../README.md) / [Ledger8](../README.md) / CallResultPrivate

# Interface: CallResultPrivate\<C, K\>

The private, ZK-confidential half of a retained-era circuit execution.

Carries [CallResultPrivateBase](../../../../types/interfaces/CallResultPrivateBase.md) and [UnsubmittedTxDataBase](../../../../types/interfaces/UnsubmittedTxDataBase.md) — so
the execution members and the caller's new coins come from the same
declarations the current era uses — and adds `txBytes`, which stands in for
`unprovenTx`: the retained composer answers with serialized bytes, and
deserializing one into a live `UnprovenTransaction` eagerly would pay for an
object most callers never read. ADR-0010 records that as a cost decision;
build one from these bytes through the same public loader if you want it.

## Remarks

**Privacy-sensitive.** Carries the ZK input and output, the private
transcript outputs, the next private state, the post-call Zswap local state
and shielded coin material. Treat as confidential when logging, serializing
or transmitting.

## Extends

- [`CallResultPrivateBase`](../../../../types/interfaces/CallResultPrivateBase.md)\<[`CircuitReturnType`](../type-aliases/CircuitReturnType.md)\<`C`, `K`\>, [`PrivateState`](../type-aliases/PrivateState.md)\<`C`\>\>.[`UnsubmittedTxDataBase`](../../../../types/interfaces/UnsubmittedTxDataBase.md)

## Type Parameters

### C

`C` *extends* [`Contract`](Contract.md)

### K

`K` *extends* [`CircuitId`](../type-aliases/CircuitId.md)\<`C`\>

## Properties

### input

> `readonly` **input**: [`AlignedValue`](https://github.com/midnightntwrk/midnight-ledger)

ZK representation of the circuit arguments.

#### Inherited from

[`CallResultPrivateBase`](../../../../types/interfaces/CallResultPrivateBase.md).[`input`](../../../../types/interfaces/CallResultPrivateBase.md#input)

***

### newCoins

> `readonly` **newCoins**: [`ShieldedCoinInfo`](https://github.com/midnightntwrk/midnight-ledger)[]

New coins created for the caller during the construction of the
transaction. Empty when the call minted nothing to the caller's own key.

#### Inherited from

[`UnsubmittedTxDataBase`](../../../../types/interfaces/UnsubmittedTxDataBase.md).[`newCoins`](../../../../types/interfaces/UnsubmittedTxDataBase.md#newcoins)

***

### nextPrivateState

> `readonly` **nextPrivateState**: [`PrivateState`](../type-aliases/PrivateState.md)

The private state resulting from executing the circuit.

#### Inherited from

[`CallResultPrivateBase`](../../../../types/interfaces/CallResultPrivateBase.md).[`nextPrivateState`](../../../../types/interfaces/CallResultPrivateBase.md#nextprivatestate)

***

### nextZswapLocalState

> `readonly` **nextZswapLocalState**: [`ZswapLocalState`](https://github.com/LFDT-Minokawa/compact)

The Zswap local state resulting from executing the circuit.

#### Inherited from

[`CallResultPrivateBase`](../../../../types/interfaces/CallResultPrivateBase.md).[`nextZswapLocalState`](../../../../types/interfaces/CallResultPrivateBase.md#nextzswaplocalstate)

***

### output

> `readonly` **output**: [`AlignedValue`](https://github.com/midnightntwrk/midnight-ledger)

ZK representation of the circuit result.

#### Inherited from

[`CallResultPrivateBase`](../../../../types/interfaces/CallResultPrivateBase.md).[`output`](../../../../types/interfaces/CallResultPrivateBase.md#output)

***

### privateTranscriptOutputs

> `readonly` **privateTranscriptOutputs**: [`AlignedValue`](https://github.com/midnightntwrk/midnight-ledger)[]

ZK representation of the circuit's witness call results.

#### Inherited from

[`CallResultPrivateBase`](../../../../types/interfaces/CallResultPrivateBase.md).[`privateTranscriptOutputs`](../../../../types/interfaces/CallResultPrivateBase.md#privatetranscriptoutputs)

***

### result

> `readonly` **result**: [`CircuitReturnType`](../type-aliases/CircuitReturnType.md)

The JS representation of the value the circuit returned.

#### Inherited from

[`CallResultPrivateBase`](../../../../types/interfaces/CallResultPrivateBase.md).[`result`](../../../../types/interfaces/CallResultPrivateBase.md#result-1)

***

### txBytes

> `readonly` **txBytes**: `Uint8Array`

The UNPROVEN transaction this call composed, serialized.
