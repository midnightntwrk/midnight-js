[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [utils](../README.md) / withDeserializationContext

# Variable: withDeserializationContext

> `const` **withDeserializationContext**: \<`T`\>(`callSite`, `fn`) => `T`

Wraps a synchronous deserialization call. Whatever `fn()` throws, the
wrapper classifies it and re-throws a `DeserializationError` carrying
structured context, with the original value on `cause`.

A non-`Error` throw is classified on its string form rather than escaping
unwrapped: some wasm-bindgen bindings surface a `Result<_, String>` as a
bare string, and a caller that received one would get a value with no
`cause`, no call site and no `instanceof` identity to branch on.

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

When `fn()` throws anything at all.

## Throws

When `fn()` returns a thenable (sync-only violation).

## Example

```ts
// Inside a typed wrapper:
deserializeContractState(buf, ctx) =>
  withDeserializationContext(callSite, () => LedgerContractState.deserialize(buf));
```
