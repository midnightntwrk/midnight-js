[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / LedgerTransactionTypes

# Interface: LedgerTransactionTypes

The ledger transaction class of each era at each [TransactionStage](../type-aliases/TransactionStage.md).

## Properties

### v8

> **v8**: `object`

#### Finalized

> **Finalized**: `FinalizedTransaction`

#### Unbound

> **Unbound**: `Transaction`\<`SignatureEnabled`, `Proof`, `PreBinding`\>

#### Unproven

> **Unproven**: `UnprovenTransaction`

***

### v9

> **v9**: `object`

#### Finalized

> **Finalized**: [`FinalizedTransaction`](https://github.com/midnightntwrk/midnight-ledger)

#### Unbound

> **Unbound**: [`Transaction`](https://github.com/midnightntwrk/midnight-ledger)\<[`SignatureEnabled`](https://github.com/midnightntwrk/midnight-ledger), [`Proof`](https://github.com/midnightntwrk/midnight-ledger), [`PreBinding`](https://github.com/midnightntwrk/midnight-ledger)\>

#### Unproven

> **Unproven**: [`UnprovenTransaction`](https://github.com/midnightntwrk/midnight-ledger)
