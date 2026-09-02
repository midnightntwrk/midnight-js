[**Midnight.js API Reference v5.0.0-beta.7**](../../../README.md)

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

`C` *extends* [`Any`](../../midnight-js-protocol/compact-js/namespaces/Contract/type-aliases/Any.md)

## Properties

### initialPrivateState

> `readonly` **initialPrivateState**: [`PrivateState`](../../midnight-js-protocol/compact-js/namespaces/Contract/type-aliases/PrivateState.md)\<`C`\>

The initial private state of the contract deployed to the blockchain. This
value is persisted if the transaction succeeds.

#### Inherited from

[`UnsubmittedDeployTxPrivateData`](UnsubmittedDeployTxPrivateData.md).[`initialPrivateState`](UnsubmittedDeployTxPrivateData.md#initialprivatestate)

***

### initialZswapState

> `readonly` **initialZswapState**: [`ZswapLocalState`](../../midnight-js-protocol/compact-runtime/interfaces/ZswapLocalState.md)

The Zswap state produced as a result of running the contract constructor. Useful for when
inputs or outputs are created in the contract constructor.

***

### newCoins

> `readonly` **newCoins**: [`ShieldedCoinInfo`](../../midnight-js-protocol/ledger/type-aliases/ShieldedCoinInfo.md)[]

New coins created during the construction of the transaction.

#### Inherited from

[`UnsubmittedTxData`](UnsubmittedTxData.md).[`newCoins`](UnsubmittedTxData.md#newcoins)

***

### signingKey

> `readonly` **signingKey**: [`SigningKey`](../../midnight-js-protocol/onchain-runtime/type-aliases/SigningKey.md)

The signing key that was added as the deployed contract's maintenance authority.

#### Inherited from

[`UnsubmittedDeployTxPrivateData`](UnsubmittedDeployTxPrivateData.md).[`signingKey`](UnsubmittedDeployTxPrivateData.md#signingkey)

***

### unprovenTx

> `readonly` **unprovenTx**: [`UnprovenTransaction`](../../midnight-js-protocol/ledger/type-aliases/UnprovenTransaction.md)

The unproven ledger transaction produced.

#### Inherited from

[`UnsubmittedTxData`](UnsubmittedTxData.md).[`unprovenTx`](UnsubmittedTxData.md#unproventx)
