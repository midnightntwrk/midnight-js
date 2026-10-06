[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / loadLedger8

# Function: loadLedger8()

> **loadLedger8**(): `Promise`\<`__module`\>

The only sanctioned runtime path to the v8 ledger era.

The v8 WASM loads on the first call and not before.

A failed load is not memoised: the rejection propagates as
[Ledger8RuntimeMissingError](../classes/Ledger8RuntimeMissingError.md) and the next call retries the import.

## Returns

`Promise`\<`__module`\>

The v8 ledger module, memoised after the first successful load.

## Throws

Ledger8RuntimeMissingError If the `./v8` chunk cannot be imported.
  The returned promise rejects with it, carrying the underlying failure on
  `cause`.

## See

 - [ModuleGraphAndLazyLoading](../../documents/ModuleGraphAndLazyLoading.md)
 - [EraSeam](../../documents/EraSeam.md)
