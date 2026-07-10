[**Midnight.js API Reference v5.0.0-beta.4**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../README.md) / UnsubmittedDeployTxPrivateDataFull

# Interface: UnsubmittedDeployTxPrivateDataFull\<C\>

The private data of an unsubmitted deployment transaction: the deploy-specific
private data ([UnsubmittedDeployTxPrivateData](UnsubmittedDeployTxPrivateData.md)) combined with the
unproven transaction data ([UnsubmittedTxData](UnsubmittedTxData.md)) and the Zswap state
produced by running the contract constructor.

## Extends

- [`UnsubmittedDeployTxPrivateData`](UnsubmittedDeployTxPrivateData.md)\<`C`\>.[`UnsubmittedTxData`](UnsubmittedTxData.md)

## Type Parameters

### C

`C` *extends* `Contract.Any`

## Properties

### initialPrivateState

> `readonly` **initialPrivateState**: `PrivateState`\<`C`\>

The initial private state of the contract deployed to the blockchain. This
value is persisted if the transaction succeeds.

#### Inherited from

[`UnsubmittedDeployTxPrivateData`](UnsubmittedDeployTxPrivateData.md).[`initialPrivateState`](UnsubmittedDeployTxPrivateData.md#initialprivatestate)

***

### initialZswapState

> `readonly` **initialZswapState**: `ZswapLocalState`

The Zswap state produced as a result of running the contract constructor. Useful for when
inputs or outputs are created in the contract constructor.

***

### newCoins

> `readonly` **newCoins**: `ShieldedCoinInfo`[]

New coins created during the construction of the transaction.

#### Inherited from

[`UnsubmittedTxData`](UnsubmittedTxData.md).[`newCoins`](UnsubmittedTxData.md#newcoins)

***

### signingKey

> `readonly` **signingKey**: `SigningKey`

The signing key that was added as the deployed contract's maintenance authority.

#### Inherited from

[`UnsubmittedDeployTxPrivateData`](UnsubmittedDeployTxPrivateData.md).[`signingKey`](UnsubmittedDeployTxPrivateData.md#signingkey)

***

### unprovenTx

> `readonly` **unprovenTx**: `UnprovenTransaction`

The unproven ledger transaction produced.

#### Inherited from

[`UnsubmittedTxData`](UnsubmittedTxData.md).[`unprovenTx`](UnsubmittedTxData.md#unproventx)
