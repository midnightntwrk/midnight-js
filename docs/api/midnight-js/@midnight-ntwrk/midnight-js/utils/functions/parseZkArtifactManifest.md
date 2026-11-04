[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [utils](../README.md) / parseZkArtifactManifest

# Function: parseZkArtifactManifest()

> **parseZkArtifactManifest**(`rawJson`): [`ZkArtifactManifest`](../interfaces/ZkArtifactManifest.md)

Parses a `compactc` `contract-manifest.json`. Asserts `manifest-version === '1'`, flattens exactly
one directory level into `"<dir>/<fileName>"` keys (nested sub-directories are ignored), validates
each file entry, and throws [ZkArtifactIntegrityError](../classes/ZkArtifactIntegrityError.md) on any structural violation. A
key repeated within one object also throws, so a manifest pinned by its hash cannot certify an
entry other than the one a reader of its text sees.

## Parameters

### rawJson

`string`

## Returns

[`ZkArtifactManifest`](../interfaces/ZkArtifactManifest.md)
