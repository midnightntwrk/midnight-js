[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../../README.md) / [index](../README.md) / Ledger9Prover

# Type Alias: Ledger9Prover

> **Ledger9Prover** = (`tx`, `config?`) => `Promise`\<[`UnboundTransaction`](UnboundTransaction.md)\>

Proves a ledger 9 transaction, which is passed to `proveTx` as a live ledger
object because both sides share the ledger 9 WASM instance. It fills the
`currentEra` slot while ledger 9 is the current era.

## Parameters

### tx

[`UnprovenTransaction`](https://github.com/midnightntwrk/midnight-ledger)

### config?

[`ProveTxConfig`](../interfaces/ProveTxConfig.md)

## Returns

`Promise`\<[`UnboundTransaction`](UnboundTransaction.md)\>
