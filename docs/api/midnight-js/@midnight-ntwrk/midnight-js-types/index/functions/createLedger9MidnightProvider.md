[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../../README.md) / [index](../README.md) / createLedger9MidnightProvider

# Function: createLedger9MidnightProvider()

> **createLedger9MidnightProvider**(`submitTx`): [`MidnightProvider`](../interfaces/MidnightProvider.md)

Lifts a v9-only submission function into the [MidnightProvider](../interfaces/MidnightProvider.md)
interface, unwrapping each handle on the way in.

The returned provider serves v9 only — `supportedEras` says so — and refuses
a v8 handle with `ProviderEraUnsupportedError`. To serve v8 as well, use
[createMidnightProviderFromHandlers](createMidnightProviderFromHandlers.md).

## Parameters

### submitTx

(`tx`) => `Promise`\<`string`\>

The v9-only submission function to wrap.

## Returns

[`MidnightProvider`](../interfaces/MidnightProvider.md)

A [MidnightProvider](../interfaces/MidnightProvider.md) serving v9.

## Example

```typescript
const midnightProvider = createLedger9MidnightProvider((tx) => wallet.submitTransaction(tx.serialize()));
```
