[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / AnyEraContractStateReadSurface

# Type Alias: AnyEraContractStateReadSurface

> **AnyEraContractStateReadSurface** = `Pick`\<[`PublicDataProvider`](../../types/interfaces/PublicDataProvider.md), `"queryRawContractState"`\>

The slice of [PublicDataProvider](../../types/interfaces/PublicDataProvider.md) [getAnyEraContractState](../variables/getAnyEraContractState.md) reads.

Declared as a slice rather than the whole provider, so a caller can satisfy it with anything
that serves raw contract states.
