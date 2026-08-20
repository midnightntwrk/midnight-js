[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [ledger](../README.md) / persistentCommit

# Function: persistentCommit()

> **persistentCommit**(`align`, `val`, `opening`): [`Value`](../type-aliases/Value.md)

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:689

**`Internal`**

Internal implementation of the persistent commitment primitive

## Parameters

### align

[`Alignment`](../type-aliases/Alignment.md)

### val

[`Value`](../type-aliases/Value.md)

### opening

[`Value`](../type-aliases/Value.md)

## Returns

[`Value`](../type-aliases/Value.md)

## Throws

If [val](#persistentcommit) does not have alignment [align](#persistentcommit),
[opening](#persistentcommit) does not encode a 32-byte bytestring, or any component has a
compress alignment
