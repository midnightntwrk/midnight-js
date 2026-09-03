[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [compact-runtime](../README.md) / degradeToTransient

# Function: degradeToTransient()

> **degradeToTransient**(`x`): `bigint`

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/built-ins.d.ts:81

The Compact builtin `degradeToTransient` function

This function "degrades" the output of a [persistentHash](persistentHash.md) or
[persistentCommit](persistentCommit.md) to a field element, which can then be used in
[transientHash](transientHash.md) or [transientCommit](transientCommit.md).

## Parameters

### x

`Uint8Array`

## Returns

`bigint`

## Throws

If `x` is not 32 bytes long
