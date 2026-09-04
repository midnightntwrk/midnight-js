[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / ProveTxConfig

# Interface: ProveTxConfig

Defined in: packages/types/dist/index.d.ts:826

The configuration for the proof request to the proof provider.

## Properties

### timeout?

> `readonly` `optional` **timeout?**: `number`

Defined in: packages/types/dist/index.d.ts:833

The timeout for the request, in milliseconds. This is a per-request timeout for the underlying
proof server call, not a hard wall-clock ceiling for the whole `proveTx` call — the proof
provider's internal retry/backoff means a `proveTx` call may take longer than this value when
retries occur. See https://github.com/midnightntwrk/midnight-js/issues/974.
