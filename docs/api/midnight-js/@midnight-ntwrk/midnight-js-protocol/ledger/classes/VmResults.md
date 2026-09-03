[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [ledger](../README.md) / VmResults

# Class: VmResults

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1110

Represents the results of a VM call

## Properties

### events

> `readonly` **events**: [`GatherResult`](../type-aliases/GatherResult.md)[]

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1118

The events that got emitted by this VM invocation

***

### gasCost

> `readonly` **gasCost**: [`RunningCost`](../type-aliases/RunningCost.md)

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1122

The computed gas cost of running this VM invocation

***

### stack

> `readonly` **stack**: [`VmStack`](VmStack.md)

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1126

The VM stack at the end of the VM invocation

## Methods

### toString()

> **toString**(`compact?`): `string`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1113

#### Parameters

##### compact?

`boolean`

#### Returns

`string`
