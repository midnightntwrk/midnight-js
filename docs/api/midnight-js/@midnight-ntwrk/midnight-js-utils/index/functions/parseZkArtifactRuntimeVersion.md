[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-utils](../../README.md) / [index](../README.md) / parseZkArtifactRuntimeVersion

# Function: parseZkArtifactRuntimeVersion()

> **parseZkArtifactRuntimeVersion**(`rawJson`): `string`

Reads the `runtime-version` a `compactc` `contract-info.json` declares.

Only the runtime version is returned. It names the `compact-runtime` the artifact set was
compiled against, which is what places the artifact on the ledger-era timeline.

FAIL-CLOSED: a missing, empty or non-string `runtime-version` throws rather than answering
`undefined`.

## Parameters

### rawJson

`string`

The file's bytes, decoded as UTF-8 text.

## Returns

`string`

The declared runtime version, verbatim.

## Throws

ZkArtifactContractInfoError if the text is not a JSON object, or declares no usable
`runtime-version`.

## See

[ArtifactRuntimeVersion](../../documents/ArtifactRuntimeVersion.md) for why only this member is read, and why absence is a
refusal rather than a default.
