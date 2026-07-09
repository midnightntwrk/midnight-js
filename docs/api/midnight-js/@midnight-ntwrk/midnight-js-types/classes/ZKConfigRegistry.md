[**Midnight.js API Reference v5.0.0-beta.3**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../README.md) / ZKConfigRegistry

# Class: ZKConfigRegistry

Resolves canonical contract key locations to ZK artifacts across a *set* of compiled-contract
artifact sources.

A cross-contract call transaction carries one proof per contract in the call tree, so proving
requires artifacts for several compiled contracts, keyed by `(contractAddress, circuitId)`. No
registration of addresses is required: the binding is *derived* by joining on the verifier key.
Each location embeds the SHA-256 of the call's deployed verifier key (known at transaction
assembly from the contract's resolved on-chain state), and resolution selects the source whose
local verifier key for the circuit matches. The join is sound because it is the predicate the
chain itself enforces — a proof must verify against the deployed key — and it makes the
resolution immune to redeploys, multiple deployments of one contract, and circuit-name
collisions across contracts.

The sources are the per-contract [ZKConfigProvider](ZKConfigProvider.md)s the application already constructs. The
location→source binding and each source's verifier-key hashes are memoized; the (potentially
multi-MB) artifacts themselves are re-fetched from the bound source rather than retained, so the
registry's memory does not grow with the number of distinct locations resolved.

## Constructors

### Constructor

> **new ZKConfigRegistry**(`sources`): `ZKConfigRegistry`

#### Parameters

##### sources

`Iterable`\<[`ZKConfigProvider`](ZKConfigProvider.md)\<`string`\>\>

The compiled-contract artifact sources to resolve against — one per compiled
contract the application can call (its own contracts and any cross-contract call targets).

#### Returns

`ZKConfigRegistry`

## Methods

### asKeyMaterialProvider()

> **asKeyMaterialProvider**(): [`KeyMaterialProvider`](../type-aliases/KeyMaterialProvider.md)

Adapts this registry to the DApp connector's [KeyMaterialProvider](../type-aliases/KeyMaterialProvider.md), allowing a wallet
to resolve the key locations of a transaction assembled by this application.

#### Returns

[`KeyMaterialProvider`](../type-aliases/KeyMaterialProvider.md)

***

### get()

> **get**(`location`): `Promise`\<[`ZKConfig`](../interfaces/ZKConfig.md)\<`string`\>\>

Resolves the ZK artifacts for a structured contract key.

#### Parameters

##### location

`ContractKeyLocation`

The contract address, circuit, and deployed verifier key hash to resolve.

#### Returns

`Promise`\<[`ZKConfig`](../interfaces/ZKConfig.md)\<`string`\>\>

#### Throws

ZKArtifactNotFoundError If no source's verifier key for the circuit matches.

***

### resolveKeyLocation()

> **resolveKeyLocation**(`keyLocation`): `Promise`\<[`ZKConfig`](../interfaces/ZKConfig.md)\<`string`\> \| `undefined`\>

Resolves the ZK artifacts for a key-location string from a proof preimage.

#### Parameters

##### keyLocation

`string`

The key-location string.

#### Returns

`Promise`\<[`ZKConfig`](../interfaces/ZKConfig.md)\<`string`\> \| `undefined`\>

The matched artifacts, or `undefined` if `keyLocation` is not a contract key
location (for example, a `midnight/` protocol builtin, which provers resolve elsewhere).

#### Throws

ZKArtifactNotFoundError If `keyLocation` is a contract key location but no source's
verifier key for the circuit matches the embedded hash.
