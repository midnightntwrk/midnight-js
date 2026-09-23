[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [utils](../README.md) / withDeserializationContext

# Variable: withDeserializationContext

> `const` **withDeserializationContext**: \<`T`\>(`callSite`, `fn`) => `T`

Wraps a synchronous deserialization call. Whatever `fn()` throws, the
wrapper classifies it and re-throws a `DeserializationError` carrying
structured context, with the original value on `cause`.

A non-`Error` throw is classified on its string form rather than escaping
unwrapped.

SYNC-ONLY BY CONTRACT: if `fn()` returns a thenable the wrapper throws a
`TypeError`. The typed wrappers in `./typed-wrappers.ts` are the primary API;
use this HOF directly only for ad-hoc deserialization sites not covered there.

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

## See

ErrorVocabulary for why a bare string throw is classified rather
than re-thrown, and what the thenable check prevents.

## Example

```ts
// Inside a typed wrapper:
deserializeContractState(buf, ctx) =>
  withDeserializationContext(callSite, () => LedgerContractState.deserialize(buf));
```
