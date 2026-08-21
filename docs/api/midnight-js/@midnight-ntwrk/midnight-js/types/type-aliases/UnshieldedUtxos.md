[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / UnshieldedUtxos

# Type Alias: UnshieldedUtxos

> **UnshieldedUtxos** = `object`

Defined in: packages/types/dist/index.d.ts:153

Represents a collection of unshielded UTXOs, which are unspent transaction outputs that are not shielded.
This type is used to manage and track the state of unshielded UTXOs.

## Properties

### created

> `readonly` **created**: readonly [`UnshieldedUtxo`](UnshieldedUtxo.md)[]

Defined in: packages/types/dist/index.d.ts:157

Represents the unshielded UTXOs that have been created but not yet spent.

***

### spent

> `readonly` **spent**: readonly [`UnshieldedUtxo`](UnshieldedUtxo.md)[]

Defined in: packages/types/dist/index.d.ts:161

Represents the unshielded UTXOs that have been spent.
