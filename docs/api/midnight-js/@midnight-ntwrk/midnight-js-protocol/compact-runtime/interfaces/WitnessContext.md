[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [compact-runtime](../README.md) / WitnessContext

# Interface: WitnessContext\<L, PS\>

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/witness.d.ts:5

The external information accessible from within a Compact witness call

## Type Parameters

### L

`L` = `any`

### PS

`PS` = `any`

## Properties

### contractAddress

> `readonly` **contractAddress**: `string`

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/witness.d.ts:18

The address of the contract being called

***

### ledger

> `readonly` **ledger**: `L`

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/witness.d.ts:10

The projected ledger state, if the transaction were to run against the
ledger state as you locally see it currently

***

### privateState

> `readonly` **privateState**: `PS`

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/witness.d.ts:14

The current private state for the contract
