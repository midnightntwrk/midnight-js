[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / UnsubmittedDeployTxPrivateDataFull

# Interface: UnsubmittedDeployTxPrivateDataFull\<C\>

Defined in: packages/contracts/dist/index.d.ts:548

The private data of an unsubmitted deployment transaction: the deploy-specific
private data ([UnsubmittedDeployTxPrivateData](UnsubmittedDeployTxPrivateData.md)) combined with the
unproven transaction data ([UnsubmittedTxData](UnsubmittedTxData.md)) and the Zswap state
produced by running the contract constructor.

## Extends

- [`UnsubmittedDeployTxPrivateData`](UnsubmittedDeployTxPrivateData.md)\<`C`\>.[`UnsubmittedTxData`](UnsubmittedTxData.md)

## Type Parameters

### C

`C` *extends* [`Contract$1.Any`](https://github.com/midnightntwrk/midnight-sdk)

## Properties

### initialPrivateState

> `readonly` **initialPrivateState**: [`PrivateState`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>

Defined in: packages/contracts/dist/index.d.ts:509

The initial private state of the contract deployed to the blockchain. This
value is persisted if the transaction succeeds.

#### Inherited from

[`UnsubmittedDeployTxPrivateData`](UnsubmittedDeployTxPrivateData.md).[`initialPrivateState`](UnsubmittedDeployTxPrivateData.md#initialprivatestate)

***

### initialZswapState

> `readonly` **initialZswapState**: [`ZswapLocalState`](https://github.com/LFDT-Minokawa/compact)

Defined in: packages/contracts/dist/index.d.ts:553

The Zswap state produced as a result of running the contract constructor. Useful for when
inputs or outputs are created in the contract constructor.

***

### newCoins

> `readonly` **newCoins**: [`ShieldedCoinInfo`](https://github.com/midnightntwrk/midnight-ledger)[]

Defined in: packages/contracts/dist/index.d.ts:471

New coins created during the construction of the transaction.

#### Inherited from

[`UnsubmittedTxData`](UnsubmittedTxData.md).[`newCoins`](UnsubmittedTxData.md#newcoins)

***

### signingKey

> `readonly` **signingKey**: [`SigningKey`](https://github.com/midnightntwrk/midnight-ledger)

Defined in: packages/contracts/dist/index.d.ts:504

The signing key that was added as the deployed contract's maintenance authority.

#### Inherited from

[`UnsubmittedDeployTxPrivateData`](UnsubmittedDeployTxPrivateData.md).[`signingKey`](UnsubmittedDeployTxPrivateData.md#signingkey)

***

### unprovenTx

> `readonly` **unprovenTx**: [`UnprovenTransaction`](https://github.com/midnightntwrk/midnight-ledger)

Defined in: packages/contracts/dist/index.d.ts:467

The unproven ledger transaction produced.

#### Inherited from

[`UnsubmittedTxData`](UnsubmittedTxData.md).[`unprovenTx`](UnsubmittedTxData.md#unproventx)
