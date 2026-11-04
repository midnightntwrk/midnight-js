[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / Ledger8UnprovenDeployTxOptionsBase

# Interface: Ledger8UnprovenDeployTxOptionsBase\<C\>

Configuration for building a retained-era deploy without submitting it, with
`createLedger8UnprovenDeployTx` or `createLedger8UnprovenDeployTxFromVerifierKeys`. A builder
stores nothing, so the constructor's private state needs no id to be stored under.

## Extends

- `Ledger8DeployContractOptionsShared`\<`C`\>

## Type Parameters

### C

`C` *extends* [`Ledger8Contract`](Ledger8Contract.md)

## Properties

### compiledContract

> `readonly` **compiledContract**: `C`

#### Inherited from

`Ledger8DeployContractOptionsShared.compiledContract`

***

### initialPrivateState?

> `readonly` `optional` **initialPrivateState?**: [`Ledger8PrivateState`](../type-aliases/Ledger8PrivateState.md)\<`C`\>

The private state the constructor runs against.

#### Remarks

**Privacy-sensitive.**

***

### signingKey?

> `readonly` `optional` **signingKey?**: [`SigningKey`](https://github.com/midnightntwrk/midnight-ledger)

The signing key to register as the deployed contract's maintenance
authority. If undefined, a fresh one is sampled.

The same `{ tag, value }` shape the current era takes. The retained era
signs with `schnorr` only, so any other key -- or a value that is not
exactly 64 hexadecimal characters -- is refused with
`Ledger8SigningKeyError` (reason `'unusable'`) before anything is composed.

#### Inherited from

`Ledger8DeployContractOptionsShared.signingKey`
