[**Midnight.js API Reference v5.0.0-alpha.1**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../README.md) / ContractEventType

# Type Alias: ContractEventType

> **ContractEventType** = `"ShieldedSpend"` \| `"ShieldedReceive"` \| `"ShieldedMint"` \| `"ShieldedBurn"` \| `"UnshieldedSpend"` \| `"UnshieldedReceive"` \| `"UnshieldedMint"` \| `"UnshieldedBurn"` \| `"Paused"` \| `"Unpaused"` \| `"Misc"`

The eleven contract event variants surfaced by the indexer (MIP-0002 public
contract log emission). The variant *set* is identical to compact-js's
`LogEventType`; only the string casing differs (PascalCase here, kebab-case
in compact-js, SCREAMING_SNAKE on the indexer wire). Adding a variant is a
breaking change — the mapping, filter translation, and exhaustiveness guards
all key off this union.
