[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [ledger](../README.md) / EncodedStateValue

# Type Alias: EncodedStateValue

> **EncodedStateValue** = \{ `tag`: `"null"`; \} \| \{ `content`: [`AlignedValue`](AlignedValue.md); `tag`: `"cell"`; \} \| \{ `content`: `Map`\<[`AlignedValue`](AlignedValue.md), `EncodedStateValue`\>; `tag`: `"map"`; \} \| \{ `content`: `EncodedStateValue`[]; `tag`: `"array"`; \} \| \{ `content`: \[`number`, `Map`\<`bigint`, \[`Uint8Array`, `undefined`\]\>\]; `tag`: `"boundedMerkleTree"`; \}

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:268

An alternative encoding of [StateValue](../classes/StateValue.md) for use in [Op](Op.md) for
technical reasons
