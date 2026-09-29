[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / ExecutableContractState

# Interface: ExecutableContractState

A down-converted state WITH the balance read off the same contract state.

The pair exists as one type because the two halves have to describe the same
block. They used to be two independent options on
executeCircuit, held together by a comment, so a caller could pass a
balance read from another block or another contract and reproduce the defect
this pairing closes — every guard green, the transcript wrong.

Built by toExecutableState, which takes ONE [ContractStatePojo](ContractStatePojo.md)
and therefore has no second value to get wrong.

## See

[RetainedEraExecution](../../documents/RetainedEraExecution.md)

## Extends

- [`DownConvertedState`](DownConvertedState.md)

## Properties

### balance

> `readonly` **balance**: [`ContractBalance`](../type-aliases/ContractBalance.md)

***

### data

> `readonly` **data**: `ChargedState`

#### Inherited from

[`DownConvertedState`](DownConvertedState.md).[`data`](DownConvertedState.md#data)
