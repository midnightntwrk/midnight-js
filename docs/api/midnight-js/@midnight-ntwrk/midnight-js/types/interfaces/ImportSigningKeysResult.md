[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / ImportSigningKeysResult

# Interface: ImportSigningKeysResult

Defined in: packages/types/dist/index.d.ts:607

Result of a signing key import operation.

## Properties

### imported

> `readonly` **imported**: `number`

Defined in: packages/types/dist/index.d.ts:611

Number of keys successfully imported.

***

### overwritten

> `readonly` **overwritten**: `number`

Defined in: packages/types/dist/index.d.ts:619

Number of keys that overwrote existing keys (when conflictStrategy is 'overwrite').

***

### skipped

> `readonly` **skipped**: `number`

Defined in: packages/types/dist/index.d.ts:615

Number of keys skipped due to conflicts (when conflictStrategy is 'skip').
