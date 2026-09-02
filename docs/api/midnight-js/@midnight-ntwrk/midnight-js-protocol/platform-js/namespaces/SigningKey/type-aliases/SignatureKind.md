[**Midnight.js API Reference v5.0.0-beta.7**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../../../README.md) / [platform-js](../../../README.md) / [SigningKey](../README.md) / SignatureKind

# Type Alias: SignatureKind

> **SignatureKind** = *typeof* [`SignatureKinds`](../variables/SignatureKinds.md)\[`number`\]

Defined in: node\_modules/@midnight-ntwrk/platform-js/dist/dts/effect/SigningKey.d.ts:12

The kind of signature scheme that a [SigningKey](../interfaces/SigningKey.md) is used with.

## Remarks

This mirrors the `SignatureKind` discriminant used by the Midnight ledger (Ledger 9). It is kept as a plain
string literal union so that a [SigningKey](../interfaces/SigningKey.md) is structurally compatible with the ledger's representation
without requiring a direct dependency on it.
