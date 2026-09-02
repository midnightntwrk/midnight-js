[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [ledger](../README.md) / SegmentSpecifier

# Type Alias: SegmentSpecifier

> **SegmentSpecifier** = \{ `tag`: `"first"`; \} \| \{ `tag`: `"guaranteedOnly"`; \} \| \{ `tag`: `"random"`; \} \| \{ `tag`: `"specific"`; `value`: `number`; \}

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2387

Specifies where something should execute in a transaction.

Options are:
- As the first thing (alias for `{ tag: 'specific', value: 1 }`)
- In any physical segment, but only utilising the guaranteed logical segment
- In a random segment (ideal for merging with other intents)
- In a specific directly provided segment (in the range 1..65535)
