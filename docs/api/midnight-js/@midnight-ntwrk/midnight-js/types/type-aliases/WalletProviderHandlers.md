[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / WalletProviderHandlers

# Type Alias: WalletProviderHandlers

> **WalletProviderHandlers** = \{ readonly \[E in LedgerVersion\]: ((tx: LedgerTransactionTypes\[E\]\["Unbound"\], ttl?: Date) =\> Promise\<LedgerTransactionTypes\[E\]\["Finalized"\]\>) \| undefined \} & `object`

The per-era handlers and key readers [createWalletProviderFromHandlers](../variables/createWalletProviderFromHandlers.md)
assembles a [WalletProvider](../interfaces/WalletProvider.md) from: one key per ledger era, a handler for
an era the wallet balances and `undefined` for one it does not.

A handler takes and returns objects of the ledger copy this framework loaded
for its era. A handler that hands the transaction to another ledger copy —
a wallet SDK built on its own install of the ledger package — serializes it
on the way out and decodes the answer into the framework's copy on the way in,
with `deserializeTransactionAtStage` from
`@midnight-ntwrk/midnight-js-protocol/transaction`.

The two key readers sit beside the handlers rather than inside one: they are
properties of the wallet, not of the era a transaction belongs to.

## Type Declaration

### getCoinPublicKey

> `readonly` **getCoinPublicKey**: () => [`CoinPublicKey`](https://github.com/midnightntwrk/midnight-ledger)

#### Returns

[`CoinPublicKey`](https://github.com/midnightntwrk/midnight-ledger)

### getEncryptionPublicKey

> `readonly` **getEncryptionPublicKey**: () => [`EncPublicKey`](https://github.com/midnightntwrk/midnight-ledger)

#### Returns

[`EncPublicKey`](https://github.com/midnightntwrk/midnight-ledger)
