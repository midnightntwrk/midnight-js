[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / VersionResolutionPath

# Type Alias: VersionResolutionPath

> **VersionResolutionPath** = `"read"` \| `"construct"`

Which call path asked for a ledger version:
- `'read'` — the version was taken off an existing record.
- `'construct'` — the version was chosen to build something new against the
  network's current head.
