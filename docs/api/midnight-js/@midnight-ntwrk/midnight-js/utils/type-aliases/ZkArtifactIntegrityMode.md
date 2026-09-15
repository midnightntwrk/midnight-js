[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [utils](../README.md) / ZkArtifactIntegrityMode

# Type Alias: ZkArtifactIntegrityMode

> **ZkArtifactIntegrityMode** = `"require"` \| `"require-if-present"` \| `"warn"` \| `"off"`

How a provider reacts to a manifest that does not cover an artifact. A digest mismatch always
throws (except `off`).

- `require`: both a wholly absent manifest and a manifest without an entry for the artifact throw.
- `require-if-present`: a wholly absent manifest warns; a manifest that exists must cover the
  artifact, so a missing entry throws. `compactc` only began emitting the manifest in 0.33, so
  this is the mode for artifacts compiled by a toolchain that never produced one.
- `warn`: both cases warn.
- `off`: no verification at all.
