[**Midnight.js API Reference v5.0.0-rc.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / WalletProviderHandlers

# Type Alias: WalletProviderHandlers

> **WalletProviderHandlers** = \{ readonly \[E in LedgerEra\]: ((tx: LedgerTransaction\<"Unbound", E\>, ttl?: Date) =\> Promise\<TransactionAnswer\>) \| undefined \} & `object`

The per-era handlers and key readers [createWalletProviderFromHandlers](../variables/createWalletProviderFromHandlers.md)
assembles a [WalletProvider](../interfaces/WalletProvider.md) from: one key per ledger era, a handler for
an era the wallet balances and `undefined` for one it does not.

A handler receives the handle of its own era. It passes `tx.serialize()` to a
wallet, or decodes the handle with its own ledger copy. It answers with a
transaction object of any ledger copy, or with its bytes. The answer is
decoded once, so a corrupt body is refused at `balanceTx`.

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
