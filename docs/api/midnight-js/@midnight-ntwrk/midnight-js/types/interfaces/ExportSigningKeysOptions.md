[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / ExportSigningKeysOptions

# Interface: ExportSigningKeysOptions

Defined in: packages/types/dist/index.d.ts:565

Options for exporting signing keys.

## Properties

### maxKeys?

> `readonly` `optional` **maxKeys?**: `number`

Defined in: packages/types/dist/index.d.ts:577

Maximum number of keys to export.
Defaults to MAX_EXPORT_SIGNING_KEYS (10000).
Set to a lower value to limit memory usage.

***

### password?

> `readonly` `optional` **password?**: `string`

Defined in: packages/types/dist/index.d.ts:571

Password used to encrypt the export.
Must be at least 16 characters.
If not provided, uses the storage password.
