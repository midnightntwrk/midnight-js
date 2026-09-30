[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / AnyEraContractStateReadSurface

# Type Alias: AnyEraContractStateReadSurface

> **AnyEraContractStateReadSurface** = `Pick`\<[`PublicDataProvider`](../../../midnight-js/types/interfaces/PublicDataProvider.md), `"queryRawContractState"`\>

The slice of [PublicDataProvider](../../../midnight-js/types/interfaces/PublicDataProvider.md) [getAnyEraContractState](../functions/getAnyEraContractState.md) reads.

Declared as a slice rather than the whole provider, so a caller can satisfy it with anything
that serves raw contract states.
