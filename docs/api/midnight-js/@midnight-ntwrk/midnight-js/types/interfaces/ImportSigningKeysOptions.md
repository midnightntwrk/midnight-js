[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / ImportSigningKeysOptions

# Interface: ImportSigningKeysOptions

Defined in: packages/types/dist/index.d.ts:582

Options for importing signing keys.

## Properties

### conflictStrategy?

> `readonly` `optional` **conflictStrategy?**: `"skip"` \| `"overwrite"` \| `"error"`

Defined in: packages/types/dist/index.d.ts:596

How to handle conflicts when a signing key already exists for an address.
- 'skip': Keep existing key, ignore imported key
- 'overwrite': Replace existing key with imported key
- 'error': Throw an error if any conflict is detected
Default: 'error'

***

### maxKeys?

> `readonly` `optional` **maxKeys?**: `number`

Defined in: packages/types/dist/index.d.ts:602

Maximum number of keys to import.
Defaults to MAX_EXPORT_SIGNING_KEYS (10000).
Set to a lower value to limit memory usage.

***

### password?

> `readonly` `optional` **password?**: `string`

Defined in: packages/types/dist/index.d.ts:588

Password used to decrypt the import.
Must match the password used during export.
If not provided, uses the storage password.
