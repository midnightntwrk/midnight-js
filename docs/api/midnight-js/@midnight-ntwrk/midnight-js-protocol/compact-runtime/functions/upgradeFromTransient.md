[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [compact-runtime](../README.md) / upgradeFromTransient

# Function: upgradeFromTransient()

> **upgradeFromTransient**(`x`): `Uint8Array`

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/built-ins.d.ts:91

The Compact builtin `upgradeFromTransient` function

This function "upgrades" the output of a [transientHash](transientHash.md) or
[transientCommit](transientCommit.md) to 256-bit byte string, which can then be used in
[persistentHash](persistentHash.md) or [persistentCommit](persistentCommit.md).

## Parameters

### x

`bigint`

## Returns

`Uint8Array`

## Throws

If `x` is not a valid field element
