[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / ImportPrivateStatesOptions

# Interface: ImportPrivateStatesOptions

Defined in: packages/types/dist/index.d.ts:498

Options for importing private states.

## Properties

### conflictStrategy?

> `readonly` `optional` **conflictStrategy?**: `"skip"` \| `"overwrite"` \| `"error"`

Defined in: packages/types/dist/index.d.ts:512

How to handle conflicts when a private state ID already exists.
- 'skip': Keep existing state, ignore imported state
- 'overwrite': Replace existing state with imported state
- 'error': Throw an error if any conflict is detected
Default: 'error'

***

### maxStates?

> `readonly` `optional` **maxStates?**: `number`

Defined in: packages/types/dist/index.d.ts:518

Maximum number of states to import.
Defaults to MAX_EXPORT_STATES (10000).
Set to a lower value to limit memory usage.

***

### password?

> `readonly` `optional` **password?**: `string`

Defined in: packages/types/dist/index.d.ts:504

Password used to decrypt the import.
Must match the password used during export.
If not provided, uses the storage password.
