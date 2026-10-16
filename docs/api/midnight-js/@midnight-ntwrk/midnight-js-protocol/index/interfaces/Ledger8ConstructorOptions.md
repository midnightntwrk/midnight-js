[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / Ledger8ConstructorOptions

# Interface: Ledger8ConstructorOptions\<C, PS\>

Everything runLedger8Constructor needs to run one constructor.

## Type Parameters

### C

`C` *extends* [`Ledger8EngineContract`](Ledger8EngineContract.md)

### PS

`PS`

## Properties

### args

> `readonly` **args**: readonly `unknown`[]

***

### coinPk

> `readonly` **coinPk**: `string`

***

### contract

> `readonly` **contract**: `C`

***

### privateState

> `readonly` **privateState**: `PS`

***

### signingKey?

> `readonly` `optional` **signingKey?**: `string`

The key the contract's maintenance authority is built from. Optional:
compact-js samples one when it is absent, and the result reports whichever
was used.

***

### verifierKeys

> `readonly` **verifierKeys**: [`VerifierKeyReader`](../type-aliases/VerifierKeyReader.md)

Reads the verifier key for each entry point the constructor registers.
