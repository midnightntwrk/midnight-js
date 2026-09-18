[**Midnight.js API Reference v5.0.0-beta.8**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../README.md) / createWalletProvider

# Function: createWalletProvider()

> **createWalletProvider**(`impl`): [`WalletProvider`](../interfaces/WalletProvider.md)

Lifts a v9-only wallet implementation into the version-tagged
[WalletProvider](../interfaces/WalletProvider.md) interface.

Use this rather than tagging by hand. `balanceTx`'s return type is covariant,
so an implementation still resolving a bare `FinalizedTransaction` no longer
satisfies `WalletProvider` — and because TypeScript reports the *parameter*
mismatch first, the compiler error names the 20-odd ledger methods
`V8TxBytes` lacks rather than the missing `version` tag. This adapter keeps
the tag out of implementation code entirely, so that error never arises.

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

## Example

```typescript
const walletProvider = createWalletProvider({
  balanceTx: (tx, ttl) => wallet.balanceAndProveTransaction(tx, ttl),
  getCoinPublicKey: () => wallet.coinPublicKey,
  getEncryptionPublicKey: () => wallet.encryptionPublicKey
});
```
