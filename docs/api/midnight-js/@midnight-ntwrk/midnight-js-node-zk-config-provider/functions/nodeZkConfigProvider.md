[**Midnight.js API Reference v5.0.0-beta.4**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-node-zk-config-provider](../README.md) / nodeZkConfigProvider

# Function: nodeZkConfigProvider()

> **nodeZkConfigProvider**\<`K`\>(`options`): [`NodeZkConfigProvider`](../classes/NodeZkConfigProvider.md)\<`K`\>

Factory for [NodeZkConfigProvider](../classes/NodeZkConfigProvider.md) following the `provider(options)` convention.

## Type Parameters

### K

`K` *extends* `string`

The circuit-ID union. It is not inferred from `options`, so supply it explicitly
(e.g. `nodeZkConfigProvider<'a' | 'b'>({ … })`) to keep `getProverKey` narrowed; it otherwise widens to `string`.

## Parameters

### options

[`NodeZkConfigProviderOptions`](../interfaces/NodeZkConfigProviderOptions.md)

## Returns

[`NodeZkConfigProvider`](../classes/NodeZkConfigProvider.md)\<`K`\>
