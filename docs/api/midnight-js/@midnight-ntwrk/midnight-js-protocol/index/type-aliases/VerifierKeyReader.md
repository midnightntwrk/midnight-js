[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / VerifierKeyReader

# Type Alias: VerifierKeyReader

> **VerifierKeyReader** = (`provableCircuitId`) => `Promise`\<`Uint8Array` \| `undefined`\>

Reads verifier keys for the entry points a contract declares.

A plain function rather than compact-js's `ZKConfiguration` service, so no
Effect type reaches this package's callers; zkConfigurationLayer
adapts it where the service is needed.

## Parameters

### provableCircuitId

`string`

## Returns

`Promise`\<`Uint8Array` \| `undefined`\>
