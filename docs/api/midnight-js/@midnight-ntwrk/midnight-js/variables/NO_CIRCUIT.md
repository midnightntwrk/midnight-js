[**Midnight.js API Reference v5.0.0-beta.7**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js](../README.md) / [](../README.md) / NO\_CIRCUIT

# Variable: NO\_CIRCUIT

> `const` **NO\_CIRCUIT**: `"(none)"` = `"(none)"`

What `circuitId` a [ComposeFailedError](../classes/ComposeFailedError.md) names when the failure happened
before any circuit was looked up — only `'call-empty'` reaches this today.

Exported, and one literal rather than a per-module copy, so a consumer
reading `circuitId` off a caught error can compare against it instead of
matching a string this package could change, and so it can never be mistaken
for a real entry point a caller might try to resolve.

## See

ComposeRefusalOrder
