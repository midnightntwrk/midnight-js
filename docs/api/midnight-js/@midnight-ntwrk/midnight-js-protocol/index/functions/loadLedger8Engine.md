[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / loadLedger8Engine

# Function: loadLedger8Engine()

> **loadLedger8Engine**(): `Promise`\<[`Ledger8Engine`](../interfaces/Ledger8Engine.md)\>

The only sanctioned runtime path to the engine's public surface.

The retained `compact-runtime@0.16` glue and
`@midnight-ntwrk/onchain-runtime-v3` WASM load only on the first call — never
as a side effect of importing the package root.

A failed load is not memoised: the next call retries the import. Exactly two
rejections propagate unchanged — [Ledger8RuntimeMissingError](../classes/Ledger8RuntimeMissingError.md) from the
retained-runtime acquisition, and [Ledger8InstanceMismatchError](../classes/Ledger8InstanceMismatchError.md) from
the construction-time instance guard — keeping their class, code and
discriminants intact for callers. Every other failure is wrapped in
[Ledger8RuntimeMissingError](../classes/Ledger8RuntimeMissingError.md), including the coded
`Ledger8RuntimeInvalidError` that same guard raises for an incomplete
runtime, and a raw module-resolution error on the engine chunk itself.

## Returns

`Promise`\<[`Ledger8Engine`](../interfaces/Ledger8Engine.md)\>

The engine's public surface, memoised after the first successful
  load.

## Throws

Ledger8RuntimeMissingError If the retained runtime, or the `./engine`
  chunk itself, cannot be acquired.

## Throws

Ledger8InstanceMismatchError If the construction-time instance guard
  found `onchain-runtime-v3` resolved to two physically distinct copies.

## See

 - [ModuleGraphAndLazyLoading](../../documents/ModuleGraphAndLazyLoading.md)
 - [EraSeam](../../documents/EraSeam.md)
