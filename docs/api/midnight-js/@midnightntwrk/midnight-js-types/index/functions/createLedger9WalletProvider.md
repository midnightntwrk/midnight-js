[**Midnight.js API Reference v5.0.3**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnightntwrk/midnight-js-types](../../README.md) / [index](../README.md) / createLedger9WalletProvider

# Function: createLedger9WalletProvider()

> **createLedger9WalletProvider**(`impl`): [`WalletProvider`](../interfaces/WalletProvider.md)

Lifts a v9-only wallet implementation into the [WalletProvider](../interfaces/WalletProvider.md)
interface, sealing the answer on the way out.

The returned provider serves v9 only — `supportedEras` says so — and refuses
a v8 handle with `ProviderEraUnsupportedError`. To serve v8 as well, use
[createWalletProviderFromHandlers](createWalletProviderFromHandlers.md).

## Parameters

### impl

[`Ledger9WalletProvider`](../interfaces/Ledger9WalletProvider.md)

The v9-only wallet implementation to wrap.

## Returns

[`WalletProvider`](../interfaces/WalletProvider.md)

A [WalletProvider](../interfaces/WalletProvider.md) serving v9.

## Example

```typescript
// A wallet with its own ledger copy takes `tx.serialize()` and may answer with bytes.
const walletProvider = createLedger9WalletProvider(myWallet);
```
