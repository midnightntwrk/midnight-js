[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / ExecuteConstructorOptions

# Interface: ExecuteConstructorOptions

Everything executeConstructor needs to run one contract constructor.

## Properties

### args

> `readonly` **args**: readonly `unknown`[]

***

### coinPk

> `readonly` **coinPk**: `string`

***

### contract

> `readonly` **contract**: `Ledger8ConstructorContractLike`

***

### privateState

> `readonly` **privateState**: `unknown`

***

### signingKey?

> `readonly` `optional` **signingKey?**: `string`

The key the deployed contract's maintenance authority is built from. A
caller that omits it gets a freshly sampled one, reported back on
[ConstructorResultPojo.signingKey](ConstructorResultPojo.md#signingkey) — the only copy that will ever
exist, so it has to be kept.
