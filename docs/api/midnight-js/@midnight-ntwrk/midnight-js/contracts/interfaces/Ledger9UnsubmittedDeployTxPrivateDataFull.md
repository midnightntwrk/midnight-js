[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / Ledger9UnsubmittedDeployTxPrivateDataFull

# Interface: Ledger9UnsubmittedDeployTxPrivateDataFull\<C\>

The private data of an unsubmitted deployment transaction: the deploy-specific
private data ([Ledger9UnsubmittedDeployTxPrivateData](Ledger9UnsubmittedDeployTxPrivateData.md)) combined with the
unproven transaction data ([Ledger9UnsubmittedTxData](Ledger9UnsubmittedTxData.md)) and the Zswap state
produced by running the contract constructor.

## Extends

- [`Ledger9UnsubmittedDeployTxPrivateData`](Ledger9UnsubmittedDeployTxPrivateData.md)\<`C`\>.[`Ledger9UnsubmittedTxData`](Ledger9UnsubmittedTxData.md)

## Type Parameters

### C

`C` *extends* [`Contract$1.Any`](https://github.com/midnightntwrk/midnight-sdk)

## Properties

### initialPrivateState

> `readonly` **initialPrivateState**: [`PrivateState`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>

The initial private state of the contract deployed to the blockchain. This
value is persisted if the transaction succeeds.

#### Inherited from

[`Ledger9UnsubmittedDeployTxPrivateData`](Ledger9UnsubmittedDeployTxPrivateData.md).[`initialPrivateState`](Ledger9UnsubmittedDeployTxPrivateData.md#initialprivatestate)

***

### initialZswapState

> `readonly` **initialZswapState**: [`ZswapLocalState`](https://github.com/LFDT-Minokawa/compact)

The Zswap state produced as a result of running the contract constructor. Useful for when
inputs or outputs are created in the contract constructor.

***

### newCoins

> `readonly` **newCoins**: [`ShieldedCoinInfo`](https://github.com/midnightntwrk/midnight-ledger)[]

New coins created for the caller during the construction of the
transaction. Empty when the call minted nothing to the caller's own key.

#### Inherited from

[`Ledger9UnsubmittedTxData`](Ledger9UnsubmittedTxData.md).[`newCoins`](Ledger9UnsubmittedTxData.md#newcoins)

***

### signingKey

> `readonly` **signingKey**: [`SigningKey`](https://github.com/midnightntwrk/midnight-ledger)

The signing key that was added as the deployed contract's maintenance authority.

#### Inherited from

[`Ledger9UnsubmittedDeployTxPrivateData`](Ledger9UnsubmittedDeployTxPrivateData.md).[`signingKey`](Ledger9UnsubmittedDeployTxPrivateData.md#signingkey)

***

### unprovenTx

> `readonly` **unprovenTx**: [`UnprovenTx`](../../types/type-aliases/UnprovenTx.md)

The unproven transaction produced, as a v9 handle. Read it with
`LedgerTransaction.unwrap(unprovenTx, 'v9')`.

#### Inherited from

[`Ledger9UnsubmittedTxData`](Ledger9UnsubmittedTxData.md).[`unprovenTx`](Ledger9UnsubmittedTxData.md#unproventx)
