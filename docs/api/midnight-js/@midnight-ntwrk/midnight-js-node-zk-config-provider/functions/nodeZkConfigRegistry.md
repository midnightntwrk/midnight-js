[**Midnight.js API Reference v5.0.0-alpha.1**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-node-zk-config-provider](../README.md) / nodeZkConfigRegistry

# Function: nodeZkConfigRegistry()

> **nodeZkConfigRegistry**(`artifactRoot`): `Promise`\<`ZKConfigRegistry`\>

Creates a ZKConfigRegistry by discovering every compiled contract artifact bundle under
a directory tree.

This is the zero-configuration way to provide ZK artifacts for transactions that make
cross-contract calls: point it at the project's artifact root (for example the directory
containing the `compactc` `managed/<contract>` outputs, or the project root itself) and every
bundle found — any directory containing `keys/` and `zkir/` subdirectories — becomes a registry
source. No addresses are registered and no per-contract enumeration is needed; the registry
binds deployed contracts to bundles by verifier key at resolution time.

`node_modules` and hidden directories are not descended into, and discovery stops at a bundle
(bundles do not nest).

## Parameters

### artifactRoot

`string`

The directory to search for artifact bundles.

## Returns

`Promise`\<`ZKConfigRegistry`\>

## Throws

Error If no artifact bundle exists under `artifactRoot`.
