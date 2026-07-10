[**Midnight.js API Reference v5.0.0-beta.4**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-node-zk-config-provider](../README.md) / NodeZkConfigProviderOptions

# Interface: NodeZkConfigProviderOptions

Options for [nodeZkConfigProvider](../functions/nodeZkConfigProvider.md). Combines the artifact `directory` with integrity options.

## Extends

- `ZkConfigIntegrityOptions`

## Properties

### directory

> `readonly` **directory**: `string`

The base directory containing the key and ZKIR subdirectories.

***

### expectedManifestHash?

> `readonly` `optional` **expectedManifestHash?**: `string`

SHA-256 hex of the manifest file's bytes, pinned by the application at build time. This is the
only mode that resists a coordinated swap of the artifacts and their co-located manifest: it
anchors the whole chain to a hash the application controls rather than one fetched alongside the
artifacts it certifies.

#### Inherited from

`ZkConfigIntegrityOptions.expectedManifestHash`

***

### onWarn?

> `readonly` `optional` **onWarn?**: (`message`) => `void`

Warning sink for `warn` mode. Default: `console.warn`.

#### Parameters

##### message

`string`

#### Returns

`void`

#### Inherited from

`ZkConfigIntegrityOptions.onWarn`

***

### verify?

> `readonly` `optional` **verify?**: `ZkArtifactIntegrityMode`

Default `'require'` (fail-closed). Trust boundary: without [expectedManifestHash](#expectedmanifesthash) the
manifest is loaded from the same base location as the artifacts, so `require`/`warn` detect
corruption (partial deploy, truncation, a stale or wrong artifact set) but NOT an adversary who
can rewrite both the artifacts and the co-located manifest. Set [expectedManifestHash](#expectedmanifesthash) to
defend against that coordinated substitution.

#### Inherited from

`ZkConfigIntegrityOptions.verify`
