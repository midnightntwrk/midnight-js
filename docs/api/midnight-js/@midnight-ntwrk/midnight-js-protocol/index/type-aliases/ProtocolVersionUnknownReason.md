[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / ProtocolVersionUnknownReason

# Type Alias: ProtocolVersionUnknownReason

> **ProtocolVersionUnknownReason** = `"unknown"` \| `"malformed"`

Why `protocolVersionToLedger` could not resolve a ledger version:
- `'malformed'` — the input was not even a well-formed protocolVersion
  value (not a non-negative integer).
- `'unknown'` — the input was a well-formed integer, but outside every
  range this framework version knows how to map.
