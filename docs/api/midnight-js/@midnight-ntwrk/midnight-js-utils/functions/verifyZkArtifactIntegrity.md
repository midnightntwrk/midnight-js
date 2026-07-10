[**Midnight.js API Reference v5.0.0-beta.4**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-utils](../README.md) / verifyZkArtifactIntegrity

# Function: verifyZkArtifactIntegrity()

> **verifyZkArtifactIntegrity**(`params`): `void`

Verifies one artifact's bytes against the manifest entry for `relativePath`.
- `off`: no-op.
- missing manifest/entry: `require` throws, `warn` warns and returns.
- length or digest mismatch: always throws (except `off`). Length is checked first as a cheap
  pre-hash guard so a truncated artifact fails with a clear "expected N bytes" error.

## Parameters

### params

#### bytes

`Uint8Array`

#### manifest

[`ZkArtifactManifest`](../interfaces/ZkArtifactManifest.md) \| `undefined`

#### mode

[`ZkArtifactIntegrityMode`](../type-aliases/ZkArtifactIntegrityMode.md)

#### onWarn?

(`message`) => `void`

#### relativePath

`string`

## Returns

`void`
