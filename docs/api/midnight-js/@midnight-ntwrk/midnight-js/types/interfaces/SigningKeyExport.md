[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / SigningKeyExport

# Interface: SigningKeyExport

Defined in: packages/types/dist/index.d.ts:541

Represents the exported signing key data structure.
All metadata is included in the encrypted payload to prevent tampering.

## Properties

### encryptedPayload

> `readonly` **encryptedPayload**: `string`

Defined in: packages/types/dist/index.d.ts:550

Encrypted payload containing version, metadata, and signing keys.
Format: base64-encoded AES-256-GCM encrypted JSON.

***

### format

> `readonly` **format**: `"midnight-signing-key-export"`

Defined in: packages/types/dist/index.d.ts:545

Format identifier. Must be 'midnight-signing-key-export'.

***

### salt

> `readonly` **salt**: `string`

Defined in: packages/types/dist/index.d.ts:555

Salt used for key derivation (hex-encoded, 32 bytes / 64 characters).
Required for decryption with the export password.
