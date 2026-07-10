[**Midnight.js API Reference v5.0.0-beta.4**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../README.md) / UnsubmittedCallTxPrivateData

# Interface: UnsubmittedCallTxPrivateData\<C, PCK\>

The private data of an unsubmitted call transaction: the circuit execution's
private result ([CallResultPrivate](CallResultPrivate.md)) combined with the unproven
transaction data ([UnsubmittedTxData](UnsubmittedTxData.md)).

## Extends

- [`CallResultPrivate`](CallResultPrivate.md)\<`C`, `PCK`\>.[`UnsubmittedTxData`](UnsubmittedTxData.md)

## Type Parameters

### C

`C` *extends* `Contract.Any`

### PCK

`PCK` *extends* `Contract.ProvableCircuitId`\<`C`\>

## Properties

### input

> `readonly` **input**: `AlignedValue`

ZK representation of the circuit arguments.

#### Inherited from

[`CallResultPrivate`](CallResultPrivate.md).[`input`](CallResultPrivate.md#input)

***

### newCoins

> `readonly` **newCoins**: `ShieldedCoinInfo`[]

New coins created during the construction of the transaction.

#### Inherited from

[`UnsubmittedTxData`](UnsubmittedTxData.md).[`newCoins`](UnsubmittedTxData.md#newcoins)

***

### nextPrivateState

> `readonly` **nextPrivateState**: `PrivateState`\<`C`\>

The private state resulting from executing the circuit.

#### Inherited from

[`CallResultPrivate`](CallResultPrivate.md).[`nextPrivateState`](CallResultPrivate.md#nextprivatestate)

***

### nextZswapLocalState

> `readonly` **nextZswapLocalState**: `ZswapLocalState`

The Zswap local state resulting from executing the circuit.

#### Inherited from

[`CallResultPrivate`](CallResultPrivate.md).[`nextZswapLocalState`](CallResultPrivate.md#nextzswaplocalstate)

***

### output

> `readonly` **output**: `AlignedValue`

ZK representation of the circuit result.

#### Inherited from

[`CallResultPrivate`](CallResultPrivate.md).[`output`](CallResultPrivate.md#output)

***

### privateTranscriptOutputs

> `readonly` **privateTranscriptOutputs**: `AlignedValue`[]

ZK representation of the circuit witness call results.

#### Inherited from

[`CallResultPrivate`](CallResultPrivate.md).[`privateTranscriptOutputs`](CallResultPrivate.md#privatetranscriptoutputs)

***

### result

> `readonly` **result**: `CircuitReturnType`\<`C`, `PCK`\>

The JS representation of the value returned by the circuit.

#### Inherited from

[`CallResultPrivate`](CallResultPrivate.md).[`result`](CallResultPrivate.md#result)

***

### unprovenTx

> `readonly` **unprovenTx**: `UnprovenTransaction`

The unproven ledger transaction produced.

#### Inherited from

[`UnsubmittedTxData`](UnsubmittedTxData.md).[`unprovenTx`](UnsubmittedTxData.md#unproventx)
