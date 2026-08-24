[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [compact-runtime](../README.md) / jubjubSchnorrVerifyingKey

# Function: jubjubSchnorrVerifyingKey()

> **jubjubSchnorrVerifyingKey**(`signingKey`): [`JubjubPoint`](../interfaces/JubjubPoint.md)

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/utils.d.ts:66

Derives the Schnorr verifying key (public key) from a signing key.

Equivalent to [ecMulGenerator](ecMulGenerator.md)(signingKey).

## Parameters

### signingKey

`bigint`

## Returns

[`JubjubPoint`](../interfaces/JubjubPoint.md)
