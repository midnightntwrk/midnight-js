[**Midnight.js API Reference v4.1.1**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-utils](../README.md) / withDeserializationContext

# Function: withDeserializationContext()

> **withDeserializationContext**\<`T`\>(`callSite`, `fn`): `T`

Wraps a synchronous deserialization call. If `fn()` throws an `Error`,
the wrapper classifies it and re-throws a `DeserializationError` with
structured context. Non-`Error` throws (`string`, `number`, `null`, etc.)
pass through unchanged.

Sync-only by contract. The typed wrappers in `./typed-wrappers.ts` are
the primary API; use this HOF directly only for ad-hoc deserialization
sites not covered there.

If `fn()` returns a thenable the wrapper throws a `TypeError` rather
than silently bypassing classification — any rejection from the
thenable would otherwise escape the try/catch.

## Type Parameters

### T

`T`

## Parameters

### callSite

[`DeserializationCallSite`](../interfaces/DeserializationCallSite.md)

### fn

() => `T`

## Returns

`T`

## Throws

When `fn()` throws an `Error`.

## Throws

When `fn()` returns a thenable (sync-only violation).

## Example

```ts
// Inside a typed wrapper:
deserializeContractState(buf, ctx) =>
  withDeserializationContext(callSite, () => LedgerContractState.deserialize(buf));
```
