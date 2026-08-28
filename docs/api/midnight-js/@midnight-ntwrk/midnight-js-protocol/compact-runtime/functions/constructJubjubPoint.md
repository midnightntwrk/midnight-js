[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [compact-runtime](../README.md) / constructJubjubPoint

# Function: constructJubjubPoint()

> **constructJubjubPoint**(`x`, `y`): [`JubjubPoint`](../interfaces/JubjubPoint.md)

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/built-ins.d.ts:119

The Compact builtin `constructJubjubPoint` function

This function constructs a Compact `JubjubPoint` from the X- and
Y-coordinates.  NOTE that it does not check that the coordinates represent a
valid point on the Jubjub curve.

## Parameters

### x

`bigint`

### y

`bigint`

## Returns

[`JubjubPoint`](../interfaces/JubjubPoint.md)
