[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [ledger](../README.md) / ContractDeploy

# Class: ContractDeploy

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2348

A contract deployment segment, instructing the creation of a new contract
address, if not already present

## Constructors

### Constructor

> **new ContractDeploy**(`initial_state`): `ContractDeploy`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2354

Creates a deployment for an arbitrary contract state

The deployment and its address are randomised.

#### Parameters

##### initial\_state

[`ContractState`](ContractState.md)

#### Returns

`ContractDeploy`

## Properties

### address

> `readonly` **address**: `string`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2361

The address this deployment will attempt to create

***

### initialState

> `readonly` **initialState**: [`ContractState`](ContractState.md)

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2362

## Methods

### toString()

> **toString**(`compact?`): `string`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2356

#### Parameters

##### compact?

`boolean`

#### Returns

`string`
