[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / ExportPrivateStatesOptions

# Interface: ExportPrivateStatesOptions

Defined in: packages/types/dist/index.d.ts:481

Options for exporting private states.

## Properties

### maxStates?

> `readonly` `optional` **maxStates?**: `number`

Defined in: packages/types/dist/index.d.ts:493

Maximum number of states to export.
Defaults to MAX_EXPORT_STATES (10000).
Set to a lower value to limit memory usage.

***

### password?

> `readonly` `optional` **password?**: `string`

Defined in: packages/types/dist/index.d.ts:487

Password used to encrypt the export.
Must be at least 16 characters.
If not provided, uses the storage password.
