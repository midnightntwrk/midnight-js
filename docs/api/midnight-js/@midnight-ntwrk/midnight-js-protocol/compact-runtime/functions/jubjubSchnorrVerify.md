[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [compact-runtime](../README.md) / jubjubSchnorrVerify

# Function: jubjubSchnorrVerify()

> **jubjubSchnorrVerify**\<`A`\>(`rtType`, `msg`, `verifyingKey`, `sig`): `boolean`

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/built-ins.d.ts:299

Verifies a Schnorr signature over the JubJub curve.

- `rtType` / `msg`: the message as a typed Compact value
- `pk`: verifying key (a JubJubPoint / EmbeddedGroupAffine)
- `sig`: signature as returned by [jubjubSchnorrSign](jubjubSchnorrSign.md)

Returns `true` if the signature is valid (i.e. `s·G == R + c·pk`).

## Type Parameters

### A

`A`

## Parameters

### rtType

[`CompactType`](../interfaces/CompactType.md)\<`A`\>

### msg

`A`

### verifyingKey

[`JubjubPoint`](../interfaces/JubjubPoint.md)

### sig

[`JubjubSchnorrSignature`](../interfaces/JubjubSchnorrSignature.md)

## Returns

`boolean`
