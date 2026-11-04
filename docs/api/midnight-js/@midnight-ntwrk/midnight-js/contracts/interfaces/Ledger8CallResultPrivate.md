[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / Ledger8CallResultPrivate

# Interface: Ledger8CallResultPrivate\<C, PCK\>

The private, ZK-confidential half of a retained-era circuit execution.

Carries [CallResultPrivateBase](../../types/interfaces/CallResultPrivateBase.md) and [UnsubmittedTxDataBase](../../types/interfaces/UnsubmittedTxDataBase.md) — so
the execution members and the caller's new coins come from the same
declarations the current era uses — and adds `unprovenTx`, the transaction
this call composed.

## Remarks

**Privacy-sensitive.** Carries the ZK input and output, the private
transcript outputs, the next private state, the post-call Zswap local state
and shielded coin material. Treat as confidential when logging, serializing
or transmitting.

## Extends

- [`CallResultPrivateBase`](../../types/interfaces/CallResultPrivateBase.md)\<[`Ledger8CircuitReturnType`](../type-aliases/Ledger8CircuitReturnType.md)\<`C`, `PCK`\>, [`Ledger8PrivateState`](../type-aliases/Ledger8PrivateState.md)\<`C`\>\>.[`UnsubmittedTxDataBase`](../../types/interfaces/UnsubmittedTxDataBase.md)

## Type Parameters

### C

`C` *extends* [`Ledger8Contract`](Ledger8Contract.md)

### PCK

`PCK` *extends* [`Ledger8CircuitId`](../type-aliases/Ledger8CircuitId.md)\<`C`\>

## Properties

### input

> `readonly` **input**: [`AlignedValue`](https://github.com/midnightntwrk/midnight-ledger)

ZK representation of the circuit arguments.

#### Inherited from

[`CallResultPrivateBase`](../../types/interfaces/CallResultPrivateBase.md).[`input`](../../types/interfaces/CallResultPrivateBase.md#input)

***

### newCoins

> `readonly` **newCoins**: [`ShieldedCoinInfo`](https://github.com/midnightntwrk/midnight-ledger)[]

New coins created for the caller during the construction of the
transaction. Empty when the call minted nothing to the caller's own key.

#### Inherited from

[`UnsubmittedTxDataBase`](../../types/interfaces/UnsubmittedTxDataBase.md).[`newCoins`](../../types/interfaces/UnsubmittedTxDataBase.md#newcoins)

***

### nextPrivateState

> `readonly` **nextPrivateState**: [`Ledger8PrivateState`](../type-aliases/Ledger8PrivateState.md)

The private state resulting from executing the circuit.

#### Inherited from

[`CallResultPrivateBase`](../../types/interfaces/CallResultPrivateBase.md).[`nextPrivateState`](../../types/interfaces/CallResultPrivateBase.md#nextprivatestate)

***

### nextZswapLocalState

> `readonly` **nextZswapLocalState**: [`ZswapLocalState`](https://github.com/LFDT-Minokawa/compact)

The Zswap local state resulting from executing the circuit.

#### Inherited from

[`Ledger9UnsubmittedCallTxPrivateData`](Ledger9UnsubmittedCallTxPrivateData.md).[`nextZswapLocalState`](Ledger9UnsubmittedCallTxPrivateData.md#nextzswaplocalstate)

***

### output

> `readonly` **output**: [`AlignedValue`](https://github.com/midnightntwrk/midnight-ledger)

ZK representation of the circuit result.

#### Inherited from

[`CallResultPrivateBase`](../../types/interfaces/CallResultPrivateBase.md).[`output`](../../types/interfaces/CallResultPrivateBase.md#output)

***

### privateTranscriptOutputs

> `readonly` **privateTranscriptOutputs**: [`AlignedValue`](https://github.com/midnightntwrk/midnight-ledger)[]

ZK representation of the circuit's witness call results.

#### Inherited from

[`CallResultPrivateBase`](../../types/interfaces/CallResultPrivateBase.md).[`privateTranscriptOutputs`](../../types/interfaces/CallResultPrivateBase.md#privatetranscriptoutputs)

***

### result

> `readonly` **result**: [`Ledger8CircuitReturnType`](../type-aliases/Ledger8CircuitReturnType.md)

The JS representation of the value the circuit returned.

#### Inherited from

[`CallResultPrivateBase`](../../types/interfaces/CallResultPrivateBase.md).[`result`](../../types/interfaces/CallResultPrivateBase.md#result-1)

***

### unprovenTx

> `readonly` **unprovenTx**: [`UnprovenTx`](../../types/type-aliases/UnprovenTx.md)

The UNPROVEN transaction this call composed, in the era of the network
head it was composed for: a v8 handle before the fork, a v9 handle after
it. Read `unprovenTx.era` before unwrapping it.
