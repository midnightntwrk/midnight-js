[**Midnight.js API Reference v5.0.0-beta.8**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../../../README.md) / [index](../../../README.md) / [Ledger8](../README.md) / Witness

# Type Alias: Witness\<PS\>

> **Witness**\<`PS`\> = (...`args`) => readonly \[`PS`, `unknown`\]

A retained-era witness implementation, which returns the next private state
paired with the value the circuit reads.

`PS` is threaded through the FIRST tuple member so a witness declared over the wrong private
state is refused. It sits in a result position, where `PS` is covariant, so every concrete
contract still satisfies the era top type.

## Type Parameters

### PS

`PS` = `unknown`

## Parameters

### args

...`never`[]

## Returns

readonly \[`PS`, `unknown`\]
