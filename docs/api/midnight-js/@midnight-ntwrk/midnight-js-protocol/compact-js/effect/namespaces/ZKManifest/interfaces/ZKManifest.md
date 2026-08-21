[**Midnight.js API Reference v5.0.0-beta.6**](../../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../../../../README.md) / [compact-js/effect](../../../README.md) / [ZKManifest](../README.md) / ZKManifest

# Interface: ZKManifest

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/ZKManifest.d.ts:22

A parsed ZK artifact manifest — the integrity manifest emitted by `compactc` alongside the
compiled contract assets.

The on-disk format nests file entries under their directory (`keys`, `zkir`, `contract`,
`compiler`); this parsed form flattens them into [files](#files), keyed by their POSIX relative
path (e.g. `"keys/clear.verifier"`) so lookups line up with the paths assets are read from.

## Properties

### compilerVersion?

> `readonly` `optional` **compilerVersion?**: `string`

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/ZKManifest.d.ts:26

The version of `compactc` that produced the assets, if recorded.

***

### files

> `readonly` **files**: `ReadonlyMap`\<`string`, [`ZKManifestFile`](ZKManifestFile.md)\>

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/ZKManifest.d.ts:32

File integrity entries keyed by `"<dir>/<file>"` relative path.

***

### languageVersion?

> `readonly` `optional` **languageVersion?**: `string`

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/ZKManifest.d.ts:28

The Compact language version the source targeted, if recorded.

***

### manifestVersion

> `readonly` **manifestVersion**: `"1"`

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/ZKManifest.d.ts:24

The manifest format version — always [SUPPORTED\_MANIFEST\_VERSION](../variables/SUPPORTED_MANIFEST_VERSION.md) for a successful parse.

***

### runtimeVersion?

> `readonly` `optional` **runtimeVersion?**: `string`

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/ZKManifest.d.ts:30

The `@midnight-ntwrk/compact-runtime` version the assets target, if recorded.
