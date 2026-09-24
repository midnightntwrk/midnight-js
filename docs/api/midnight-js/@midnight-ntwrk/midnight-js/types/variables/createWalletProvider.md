[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / createWalletProvider

# Variable: createWalletProvider

> `const` **createWalletProvider**: (`impl`) => [`WalletProvider`](../interfaces/WalletProvider.md)

Lifts a v9-only wallet implementation into the version-tagged
[WalletProvider](../interfaces/WalletProvider.md) interface.

USE THIS RATHER THAN TAGGING BY HAND. It keeps the `version` tag out of
implementation code, where a hand-tagged implementation meets a compiler error
that does not name the real problem.

The returned provider serves the v9 arm only — `supportedEras` says so — and
that is permanent rather than a gap: it lifts a v9-only implementation. It
rejects a v8 payload with `V8PayloadUnsupportedError` and an untagged one with
`UntaggedPayloadError`. To serve a retained era as well, use
[createWalletProviderFromArms](createWalletProviderFromArms.md).

## Parameters

### impl

[`V9WalletProvider`](../interfaces/V9WalletProvider.md)

The v9-only wallet implementation to wrap.

## Returns

[`WalletProvider`](../interfaces/WalletProvider.md)

A [WalletProvider](../interfaces/WalletProvider.md) that narrows inbound payloads and tags
         outbound ones.

## See

SeamEraDeclarations for the compiler error this avoids, and for
why serving the v9 arm only is permanent rather than a gap.

## Example

```typescript
const walletProvider = createWalletProvider({
  balanceTx: (tx, ttl) => wallet.balanceAndProveTransaction(tx, ttl),
  getCoinPublicKey: () => wallet.coinPublicKey,
  getEncryptionPublicKey: () => wallet.encryptionPublicKey
});
```
