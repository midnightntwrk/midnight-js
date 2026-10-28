[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / createMidnightProvider

# Variable: createMidnightProvider

> `const` **createMidnightProvider**: (`submitTx`) => [`MidnightProvider`](../interfaces/MidnightProvider.md)

Lifts a v9-only submission function into the [MidnightProvider](../interfaces/MidnightProvider.md)
interface, unwrapping each handle on the way in.

The returned provider serves v9 only — `supportedEras` says so — and refuses
a v8 handle with `ProviderEraUnsupportedError`. To serve v8 as well, use
[createMidnightProviderFromHandlers](createMidnightProviderFromHandlers.md).

## Parameters

### submitTx

(`tx`) => `Promise`\<[`TransactionId`](https://github.com/midnightntwrk/midnight-ledger)\>

The v9-only submission function to wrap.

## Returns

[`MidnightProvider`](../interfaces/MidnightProvider.md)

A [MidnightProvider](../interfaces/MidnightProvider.md) serving v9.

## Example

```typescript
const midnightProvider = createMidnightProvider((tx) => wallet.submitTransaction(tx.serialize()));
```
