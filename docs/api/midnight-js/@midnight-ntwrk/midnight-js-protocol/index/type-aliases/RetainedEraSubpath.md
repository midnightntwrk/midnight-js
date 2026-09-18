[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / RetainedEraSubpath

# Type Alias: RetainedEraSubpath

> **RetainedEraSubpath** = `"/v8"` \| `"/engine"`

Which lazily-loaded subpath export [Ledger8RuntimeMissingError](../classes/Ledger8RuntimeMissingError.md) failed
to acquire. Each chunk pulls a different set of retained-era dependencies, so
naming the wrong one sends an operator to an entry point that loaded fine.

## See

[ModuleGraphAndLazyLoading](../../documents/ModuleGraphAndLazyLoading.md)
