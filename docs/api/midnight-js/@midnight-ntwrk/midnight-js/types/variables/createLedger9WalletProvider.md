[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / createLedger9WalletProvider

# Variable: createLedger9WalletProvider

> `const` **createLedger9WalletProvider**: (`impl`) => [`WalletProvider`](../interfaces/WalletProvider.md)

Lifts a v9-only wallet implementation into the [WalletProvider](../interfaces/WalletProvider.md)
interface, unwrapping each handle on the way in and sealing the answer on the
way out.

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
// The wallet runs its own copy of the ledger, so the transaction crosses as bytes.
const walletProvider = createLedger9WalletProvider({
  balanceTx: async (tx, ttl) =>
    deserializeTransactionAtStage('v9', 'Finalized', await wallet.balanceTransaction(tx.serialize(), ttl)),
  getCoinPublicKey: () => wallet.coinPublicKey,
  getEncryptionPublicKey: () => wallet.encryptionPublicKey
});
```
