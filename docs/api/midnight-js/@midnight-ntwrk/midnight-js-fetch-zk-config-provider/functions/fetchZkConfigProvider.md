[**Midnight.js API Reference v5.0.0-beta.4**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-fetch-zk-config-provider](../README.md) / fetchZkConfigProvider

# Function: fetchZkConfigProvider()

> **fetchZkConfigProvider**\<`K`\>(`options`): [`FetchZkConfigProvider`](../classes/FetchZkConfigProvider.md)\<`K`\>

Factory for [FetchZkConfigProvider](../classes/FetchZkConfigProvider.md) following the `provider(options)` convention.

## Type Parameters

### K

`K` *extends* `string`

The circuit-ID union. It is not inferred from `options`, so supply it explicitly
(e.g. `fetchZkConfigProvider<'a' | 'b'>({ … })`) to keep `getProverKey` narrowed; it otherwise widens to `string`.

## Parameters

### options

[`CreateFetchZkConfigProviderOptions`](../interfaces/CreateFetchZkConfigProviderOptions.md)

## Returns

[`FetchZkConfigProvider`](../classes/FetchZkConfigProvider.md)\<`K`\>
