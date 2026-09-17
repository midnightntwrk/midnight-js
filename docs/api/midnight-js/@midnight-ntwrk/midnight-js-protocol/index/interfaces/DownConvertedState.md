[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / DownConvertedState

# Interface: DownConvertedState

The result of a down-convert: only the primary state data a pre-fork
circuit reads during execution.

Deliberately not a full pre-fork `ContractState`: it carries no
`.operations`, `.maintenanceAuthority` or `.balance`, which remain the
caller's to carry.

## See

[RetainedEraExecution](../../documents/RetainedEraExecution.md)

## Properties

### data

> `readonly` **data**: `ChargedState`
