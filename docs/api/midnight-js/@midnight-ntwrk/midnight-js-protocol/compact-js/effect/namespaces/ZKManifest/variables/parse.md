[**Midnight.js API Reference v5.0.0-beta.6**](../../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../../../../README.md) / [compact-js/effect](../../../README.md) / [ZKManifest](../README.md) / parse

# Variable: parse

> `const` **parse**: (`rawJson`) => `Effect.Effect`\<[`ZKManifest`](../interfaces/ZKManifest.md), [`ZKManifestError`](../../ZKManifestError/classes/ZKManifestError.md)\>

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/ZKManifest.d.ts:49

Parses and validates the raw JSON contents of a ZK artifact manifest, flattening its
directory-nested entries into [ZKManifest.files](../interfaces/ZKManifest.md#files).

The manifest reaches this boundary as untrusted input, so it is decoded with a Schema —
yielding structural validation and a typed failure rather than hand-rolled checks. An unknown or
missing [manifest-version](SUPPORTED_MANIFEST_VERSION.md) fails the parse, since a manifest we
cannot interpret must not be treated as a passing integrity check.

## Parameters

### rawJson

`string`

The raw JSON text of the manifest file.

## Returns

`Effect.Effect`\<[`ZKManifest`](../interfaces/ZKManifest.md), [`ZKManifestError`](../../ZKManifestError/classes/ZKManifestError.md)\>

An Effect that yields a [ZKManifest](../interfaces/ZKManifest.md), or fails with a
[ZKManifestError.ZKManifestError](../../ZKManifestError/classes/ZKManifestError.md).
