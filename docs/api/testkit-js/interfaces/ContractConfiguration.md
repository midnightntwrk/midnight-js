[**@midnight-ntwrk/testkit-js v5.0.0-beta.8**](../README.md)

***

Configuration interface for Midnight contracts.

## Properties

### privateStateStoreName

> `readonly` **privateStateStoreName**: `string`

Name of the store used for persisting private state data.
This is used as a base name - a signing key store will also be created with "-signing-keys" appended.

***

### zkConfigIntegrity?

> `readonly` `optional` **zkConfigIntegrity?**: `ZkConfigIntegrityOptions`

Integrity-verification options for the ZK artifacts, passed straight to the
config provider. Omitted means the provider's own default, `require`.

Needed because retained-era artifacts cannot satisfy `require`: `compactc`
0.31.1 emits `compiler/contract-info.json` and no
`compiler/contract-manifest.json`, and the manifest is what verification
reads. A pre-fork contract therefore has nothing to verify against, however
intact its artifacts are.

***

### zkConfigPath

> `readonly` **zkConfigPath**: `string`

File system path to the zero-knowledge proof configuration files.
This should point to the directory containing the circuit verification keys and other ZK artifacts.
