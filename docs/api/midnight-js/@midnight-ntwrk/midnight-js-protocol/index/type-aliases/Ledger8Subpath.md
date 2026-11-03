[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / Ledger8Subpath

# Type Alias: Ledger8Subpath

> **Ledger8Subpath** = `"/v8"` \| `"/v8/engine"`

Which lazily-loaded subpath export [Ledger8RuntimeMissingError](../classes/Ledger8RuntimeMissingError.md) failed
to acquire. Each chunk pulls a different set of ledger 8 dependencies, so
naming the wrong one sends an operator to an entry point that loaded fine.

## See

[ModuleGraphAndLazyLoading](../../documents/ModuleGraphAndLazyLoading.md)
