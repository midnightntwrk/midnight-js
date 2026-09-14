[**Midnight.js API Reference v5.0.0-beta.8**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../README.md) / CurrentEraProver

# Type Alias: CurrentEraProver

> **CurrentEraProver** = (`tx`, `config?`) => `Promise`\<[`UnboundTransaction`](UnboundTransaction.md)\>

Proves a CURRENT-era transaction, which crosses this seam as a live ledger
object because both sides share the current era's WASM instance.

## Parameters

### tx

[`UnprovenTransaction`](https://github.com/midnightntwrk/midnight-ledger)

### config?

[`ProveTxConfig`](../interfaces/ProveTxConfig.md)

## Returns

`Promise`\<[`UnboundTransaction`](UnboundTransaction.md)\>
