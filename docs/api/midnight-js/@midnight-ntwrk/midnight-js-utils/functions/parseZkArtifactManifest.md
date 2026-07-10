[**Midnight.js API Reference v5.0.0-beta.4**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-utils](../README.md) / parseZkArtifactManifest

# Function: parseZkArtifactManifest()

> **parseZkArtifactManifest**(`rawJson`): [`ZkArtifactManifest`](../interfaces/ZkArtifactManifest.md)

Parses a `compactc` `contract-manifest.json`. Asserts `manifest-version === '1'`, flattens exactly
one directory level into `"<dir>/<fileName>"` keys (nested sub-directories are ignored), validates
each file entry, and throws [ZkArtifactIntegrityError](../classes/ZkArtifactIntegrityError.md) on any structural violation.

## Parameters

### rawJson

`string`

## Returns

[`ZkArtifactManifest`](../interfaces/ZkArtifactManifest.md)
