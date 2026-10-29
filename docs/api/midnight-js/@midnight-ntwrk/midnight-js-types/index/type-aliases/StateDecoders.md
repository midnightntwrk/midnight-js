[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../../README.md) / [index](../README.md) / StateDecoders

# Type Alias: StateDecoders

> **StateDecoders** = `Readonly`\<`Partial`\<`Record`\<`LedgerVersion`, [`StateDecoder`](../interfaces/StateDecoder.md)\>\>\>

One decoder per ledger era. Only the decoder of the value's own era is called.
