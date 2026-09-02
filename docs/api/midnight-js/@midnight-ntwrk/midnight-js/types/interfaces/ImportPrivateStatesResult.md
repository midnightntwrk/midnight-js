[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / ImportPrivateStatesResult

# Interface: ImportPrivateStatesResult

Defined in: packages/types/dist/index.d.ts:523

Result of an import operation.

## Properties

### imported

> `readonly` **imported**: `number`

Defined in: packages/types/dist/index.d.ts:527

Number of states successfully imported.

***

### overwritten

> `readonly` **overwritten**: `number`

Defined in: packages/types/dist/index.d.ts:535

Number of states that overwrote existing states (when conflictStrategy is 'overwrite').

***

### skipped

> `readonly` **skipped**: `number`

Defined in: packages/types/dist/index.d.ts:531

Number of states skipped due to conflicts (when conflictStrategy is 'skip').
