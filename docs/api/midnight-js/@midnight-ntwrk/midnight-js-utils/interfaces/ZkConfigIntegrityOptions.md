[**Midnight.js API Reference v5.0.0-beta.3**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-utils](../README.md) / ZkConfigIntegrityOptions

# Interface: ZkConfigIntegrityOptions

Integrity options shared by both ZK config providers' constructor option bags.

## Properties

### expectedManifestHash?

> `readonly` `optional` **expectedManifestHash?**: `string`

SHA-256 hex of the manifest file's bytes, pinned by the application at build time. This is the
only mode that resists a coordinated swap of the artifacts and their co-located manifest: it
anchors the whole chain to a hash the application controls rather than one fetched alongside the
artifacts it certifies.

***

### onWarn?

> `readonly` `optional` **onWarn?**: (`message`) => `void`

Warning sink for `warn` mode. Default: `console.warn`.

#### Parameters

##### message

`string`

#### Returns

`void`

***

### verify?

> `readonly` `optional` **verify?**: [`ZkArtifactIntegrityMode`](../type-aliases/ZkArtifactIntegrityMode.md)

Default `'require'` (fail-closed). Trust boundary: without [expectedManifestHash](#expectedmanifesthash) the
manifest is loaded from the same base location as the artifacts, so `require`/`warn` detect
corruption (partial deploy, truncation, a stale or wrong artifact set) but NOT an adversary who
can rewrite both the artifacts and the co-located manifest. Set [expectedManifestHash](#expectedmanifesthash) to
defend against that coordinated substitution.
