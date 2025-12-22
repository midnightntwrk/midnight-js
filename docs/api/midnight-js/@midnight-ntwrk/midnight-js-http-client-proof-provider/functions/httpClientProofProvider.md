[**Midnight.js API Reference v3.0.0-alpha.11**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-http-client-proof-provider](../README.md) / httpClientProofProvider

# Function: httpClientProofProvider()

> **httpClientProofProvider**\<`K`\>(`url`): `ProofProvider`\<`K`\>

Creates a ProofProvider by creating a client for a running proof server.
Allows for HTTP and HTTPS. The data passed to 'proveTx' are intended to be
secret, so usage of this function should be heavily scrutinized.

## Type Parameters

### K

`K` *extends* `string`

## Parameters

### url

`string`

The url of a running proof server.

## Returns

`ProofProvider`\<`K`\>
