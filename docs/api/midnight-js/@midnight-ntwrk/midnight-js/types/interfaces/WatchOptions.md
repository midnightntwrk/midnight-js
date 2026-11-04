[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / WatchOptions

# Interface: WatchOptions

Options for the `watchFor*` methods of [PublicDataProvider](PublicDataProvider.md).

## Properties

### maxWaitMs?

> `readonly` `optional` **maxWaitMs?**: `number`

How long to wait for the indexer to report the data, in milliseconds: a
positive integer no larger than 2147483647 (the largest delay a timer can
hold). When it elapses, the call rejects with `WatchTimeoutError` and
polling stops. Omit it to wait indefinitely.

The bound covers the indexer poll only; building the result afterwards is
not bounded. Indexer requests are retried on network failure, so a bound
shorter than that retry window reports an unreachable indexer as a
timeout.

Any other value throws `InvalidArgumentError`
synchronously, before a promise is returned.

Implementations must honour this option; the bound holds only if they do.
