[**Midnight.js API Reference v5.0.0-beta.4**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-fetch-zk-config-provider](../README.md) / CreateFetchZkConfigProviderOptions

# Interface: CreateFetchZkConfigProviderOptions

Options for [fetchZkConfigProvider](../functions/fetchZkConfigProvider.md). Combines the remote `baseURL` with fetch and integrity options.

Named with a `Create` prefix because [FetchZkConfigProviderOptions](../type-aliases/FetchZkConfigProviderOptions.md) — the class constructor's
options — already exists; the prefix keeps both names unambiguous rather than being a style inconsistency.

## Extends

- [`FetchZkConfigProviderOptions`](../type-aliases/FetchZkConfigProviderOptions.md)

## Properties

### baseURL

> `readonly` **baseURL**: `string`

The endpoint to query for ZK artifacts.

***

### expectedManifestHash?

> `readonly` `optional` **expectedManifestHash?**: `string`

SHA-256 hex of the manifest file's bytes, pinned by the application at build time. This is the
only mode that resists a coordinated swap of the artifacts and their co-located manifest: it
anchors the whole chain to a hash the application controls rather than one fetched alongside the
artifacts it certifies.

#### Inherited from

`FetchZkConfigProviderOptions.expectedManifestHash`

***

### fetchFunc?

> `readonly` `optional` **fetchFunc?**: \{(`input`, `init?`): `Promise`\<`Response`\>; (`input`, `init?`): `Promise`\<`Response`\>; \}

#### Call Signature

> (`input`, `init?`): `Promise`\<`Response`\>

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Window/fetch)

##### Parameters

###### input

`URL` \| `RequestInfo`

###### init?

`RequestInit`

##### Returns

`Promise`\<`Response`\>

#### Call Signature

> (`input`, `init?`): `Promise`\<`Response`\>

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Window/fetch)

##### Parameters

###### input

`string` \| `URL` \| `Request`

###### init?

`RequestInit`

##### Returns

`Promise`\<`Response`\>

#### Inherited from

`FetchZkConfigProviderOptions.fetchFunc`

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

`FetchZkConfigProviderOptions.onWarn`

***

### verify?

> `readonly` `optional` **verify?**: `ZkArtifactIntegrityMode`

Default `'require'` (fail-closed). Trust boundary: without [expectedManifestHash](#expectedmanifesthash) the
manifest is loaded from the same base location as the artifacts, so `require`/`warn` detect
corruption (partial deploy, truncation, a stale or wrong artifact set) but NOT an adversary who
can rewrite both the artifacts and the co-located manifest. Set [expectedManifestHash](#expectedmanifesthash) to
defend against that coordinated substitution.

#### Inherited from

`FetchZkConfigProviderOptions.verify`
