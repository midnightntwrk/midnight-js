[**Midnight.js API Reference v5.0.0-rc.3**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-bundled-contract-module-provider](../README.md) / ModulesByAddress

# Type Alias: ModulesByAddress

> **ModulesByAddress** = `ReadonlyMap`\<`string`, [`ModuleThunk`](https://github.com/LFDT-Minokawa/compact)\>

Which module implements the contract deployed at each address. A deployment puts no code on
chain, so this table is the only place the association exists, and only the application has it.

Each entry is a thunk over a literal `import()` specifier, so a bundler sees every edge, splits
the chunk, and fetches an implementation only if a call actually reaches it. Build tooling
generates the table; nothing here executes an entry.
