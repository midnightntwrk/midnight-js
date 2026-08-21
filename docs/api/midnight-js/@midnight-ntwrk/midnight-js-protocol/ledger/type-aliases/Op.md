[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [ledger](../README.md) / Op

# Type Alias: Op\<R\>

> **Op**\<`R`\> = \{ `noop`: \{ `n`: `number`; \}; \} \| `"lt"` \| `"eq"` \| `"type"` \| `"size"` \| `"new"` \| `"and"` \| `"or"` \| `"neg"` \| `"log"` \| `"root"` \| `"pop"` \| \{ `popeq`: \{ `cached`: `boolean`; `result`: `R`; \}; \} \| \{ `addi`: \{ `immediate`: `number`; \}; \} \| \{ `subi`: \{ `immediate`: `number`; \}; \} \| \{ `push`: \{ `storage`: `boolean`; `value`: [`EncodedStateValue`](EncodedStateValue.md); \}; \} \| \{ `branch`: \{ `skip`: `number`; \}; \} \| \{ `jmp`: \{ `skip`: `number`; \}; \} \| `"add"` \| `"sub"` \| \{ `concat`: \{ `cached`: `boolean`; `n`: `number`; \}; \} \| `"member"` \| \{ `rem`: \{ `cached`: `boolean`; \}; \} \| \{ `dup`: \{ `n`: `number`; \}; \} \| \{ `swap`: \{ `n`: `number`; \}; \} \| \{ `idx`: \{ `cached`: `boolean`; `path`: [`Key`](Key.md)[]; `pushPath`: `boolean`; \}; \} \| \{ `ins`: \{ `cached`: `boolean`; `n`: `number`; \}; \} \| `"ckpt"`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:216

An individual operation in the onchain VM

## Type Parameters

### R

`R`

`null` or [AlignedValue](AlignedValue.md), for gathering and verifying
mode respectively
