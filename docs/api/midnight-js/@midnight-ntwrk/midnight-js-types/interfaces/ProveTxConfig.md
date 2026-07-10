[**Midnight.js API Reference v5.0.0-beta.4**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../README.md) / ProveTxConfig

# Interface: ProveTxConfig

The configuration for the proof request to the proof provider.

## Properties

### timeout?

> `readonly` `optional` **timeout?**: `number`

The timeout for the request, in milliseconds. This is a per-request timeout for the underlying
proof server call, not a hard wall-clock ceiling for the whole `proveTx` call — the proof
provider's internal retry/backoff means a `proveTx` call may take longer than this value when
retries occur. See https://github.com/midnightntwrk/midnight-js/issues/974.
