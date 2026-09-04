[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / PrivateStateExport

# Interface: PrivateStateExport

Defined in: packages/types/dist/index.d.ts:457

Represents the exported private state data structure.
All metadata is included in the encrypted payload to prevent tampering.

## Properties

### encryptedPayload

> `readonly` **encryptedPayload**: `string`

Defined in: packages/types/dist/index.d.ts:466

Encrypted payload containing version, metadata, and serialized private states.
Format: base64-encoded AES-256-GCM encrypted JSON.

***

### format

> `readonly` **format**: `"midnight-private-state-export"`

Defined in: packages/types/dist/index.d.ts:461

Format identifier. Must be 'midnight-private-state-export'.

***

### salt

> `readonly` **salt**: `string`

Defined in: packages/types/dist/index.d.ts:471

Salt used for key derivation (hex-encoded, 32 bytes / 64 characters).
Required for decryption with the export password.
