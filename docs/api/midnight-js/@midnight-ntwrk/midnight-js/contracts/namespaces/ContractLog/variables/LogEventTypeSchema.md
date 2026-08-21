[**Midnight.js API Reference v5.0.0-beta.6**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../../../README.md) / [contracts](../../../README.md) / [ContractLog](../README.md) / LogEventTypeSchema

# Variable: LogEventTypeSchema

> `const` **LogEventTypeSchema**: `Schema.Literal`\<\[`"shielded-spend"`, `"shielded-receive"`, `"shielded-mint"`, `"shielded-burn"`, `"unshielded-spend"`, `"unshielded-receive"`, `"unshielded-mint"`, `"unshielded-burn"`, `"paused"`, `"unpaused"`, `"misc"`\]\>

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/ContractLog.d.ts:42

Schema for the standard `LogEventType` discriminants emitted by Compact contracts — the single
source of truth for the event-type literals, imported by `ContractEventValidator`.
