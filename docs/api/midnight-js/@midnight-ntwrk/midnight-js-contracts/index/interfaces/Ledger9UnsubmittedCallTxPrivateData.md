[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / Ledger9UnsubmittedCallTxPrivateData

# Interface: Ledger9UnsubmittedCallTxPrivateData\<C, PCK\>

The private data of an unsubmitted call transaction: the circuit execution's
private result ([Ledger9CallResultPrivate](../type-aliases/Ledger9CallResultPrivate.md)) combined with the unproven
transaction data ([Ledger9UnsubmittedTxData](Ledger9UnsubmittedTxData.md)).

## Extends

- [`Ledger9CallResultPrivate`](../type-aliases/Ledger9CallResultPrivate.md)\<`C`, `PCK`\>.[`Ledger9UnsubmittedTxData`](Ledger9UnsubmittedTxData.md)

## Type Parameters

### C

`C` *extends* [`Contract.Any`](https://github.com/midnightntwrk/midnight-sdk)

### PCK

`PCK` *extends* [`Contract.ProvableCircuitId`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>

## Properties

### input

> `readonly` **input**: [`AlignedValue`](https://github.com/midnightntwrk/midnight-ledger)

ZK representation of the circuit arguments.

#### Inherited from

`Ledger9CallResultPrivate.input`

***

### newCoins

> `readonly` **newCoins**: [`ShieldedCoinInfo`](https://github.com/midnightntwrk/midnight-ledger)[]

New coins created for the caller during the construction of the
transaction. Empty when the call minted nothing to the caller's own key.

#### Inherited from

[`Ledger9UnsubmittedTxData`](Ledger9UnsubmittedTxData.md).[`newCoins`](Ledger9UnsubmittedTxData.md#newcoins)

***

### nextPrivateState

> `readonly` **nextPrivateState**: [`PrivateState`](https://github.com/midnightntwrk/midnight-sdk)

The private state resulting from executing the circuit.

#### Inherited from

`Ledger9CallResultPrivate.nextPrivateState`

***

### nextZswapLocalState

> `readonly` **nextZswapLocalState**: [`ZswapLocalState`](https://github.com/LFDT-Minokawa/compact)

The Zswap local state resulting from executing the circuit.

#### Inherited from

`Ledger9CallResultPrivate.nextZswapLocalState`

***

### output

> `readonly` **output**: [`AlignedValue`](https://github.com/midnightntwrk/midnight-ledger)

ZK representation of the circuit result.

#### Inherited from

`Ledger9CallResultPrivate.output`

***

### privateTranscriptOutputs

> `readonly` **privateTranscriptOutputs**: [`AlignedValue`](https://github.com/midnightntwrk/midnight-ledger)[]

ZK representation of the circuit's witness call results.

#### Inherited from

`Ledger9CallResultPrivate.privateTranscriptOutputs`

***

### result

> `readonly` **result**: [`CircuitReturnType`](https://github.com/midnightntwrk/midnight-sdk)

The JS representation of the value the circuit returned.

#### Inherited from

`Ledger9CallResultPrivate.result`

***

### unprovenTx

> `readonly` **unprovenTx**: [`UnprovenTx`](../../../midnight-js/types/type-aliases/UnprovenTx.md)

The unproven transaction produced, as a v9 handle. Read it with
`LedgerTransaction.unwrap(unprovenTx, 'v9')`.

#### Inherited from

[`Ledger9UnsubmittedTxData`](Ledger9UnsubmittedTxData.md).[`unprovenTx`](Ledger9UnsubmittedTxData.md#unproventx)
