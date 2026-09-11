[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / UnsubmittedCallTxPrivateData

# Interface: UnsubmittedCallTxPrivateData\<C, PCK\>

The private data of an unsubmitted call transaction: the circuit execution's
private result ([CallResultPrivate](../type-aliases/CallResultPrivate.md)) combined with the unproven
transaction data ([UnsubmittedTxData](UnsubmittedTxData.md)).

## Extends

- [`CallResultPrivate`](../type-aliases/CallResultPrivate.md)\<`C`, `PCK`\>.[`UnsubmittedTxData`](UnsubmittedTxData.md)

## Type Parameters

### C

`C` *extends* [`Contract$1.Any`](https://github.com/midnightntwrk/midnight-sdk)

### PCK

`PCK` *extends* [`Contract$1.ProvableCircuitId`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>

## Properties

### input

> `readonly` **input**: [`AlignedValue`](https://github.com/midnightntwrk/midnight-ledger)

ZK representation of the circuit arguments.

#### Inherited from

`CallResultPrivate.input`

***

### newCoins

> `readonly` **newCoins**: [`ShieldedCoinInfo`](https://github.com/midnightntwrk/midnight-ledger)[]

New coins created for the caller during the construction of the
transaction. Empty when the call minted nothing to the caller's own key.

#### Inherited from

[`UnsubmittedTxData`](UnsubmittedTxData.md).[`newCoins`](UnsubmittedTxData.md#newcoins)

***

### nextPrivateState

> `readonly` **nextPrivateState**: [`PrivateState`](https://github.com/midnightntwrk/midnight-sdk)

The private state resulting from executing the circuit.

#### Inherited from

`CallResultPrivate.nextPrivateState`

***

### nextZswapLocalState

> `readonly` **nextZswapLocalState**: [`ZswapLocalState`](https://github.com/LFDT-Minokawa/compact)

The Zswap local state resulting from executing the circuit.

#### Inherited from

[`CallResultPrivateBase`](../../types/interfaces/CallResultPrivateBase.md).[`nextZswapLocalState`](../../types/interfaces/CallResultPrivateBase.md#nextzswaplocalstate)

***

### output

> `readonly` **output**: [`AlignedValue`](https://github.com/midnightntwrk/midnight-ledger)

ZK representation of the circuit result.

#### Inherited from

`CallResultPrivate.output`

***

### privateTranscriptOutputs

> `readonly` **privateTranscriptOutputs**: [`AlignedValue`](https://github.com/midnightntwrk/midnight-ledger)[]

ZK representation of the circuit's witness call results.

#### Inherited from

`CallResultPrivate.privateTranscriptOutputs`

***

### result

> `readonly` **result**: [`CircuitReturnType`](https://github.com/midnightntwrk/midnight-sdk)

The JS representation of the value the circuit returned.

#### Inherited from

`CallResultPrivate.result`

***

### unprovenTx

> `readonly` **unprovenTx**: [`UnprovenTransaction`](https://github.com/midnightntwrk/midnight-ledger)

The unproven ledger transaction produced.

#### Inherited from

[`UnsubmittedTxData`](UnsubmittedTxData.md).[`unprovenTx`](UnsubmittedTxData.md#unproventx)
