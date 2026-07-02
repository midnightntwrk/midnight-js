[**Midnight.js API Reference v5.0.0-alpha.1**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-utils](../README.md) / decodeLedgerStateValue

# Function: decodeLedgerStateValue()

> **decodeLedgerStateValue**(`encoded`, `ctx`): `StateValue`

Decode an onchain-runtime LedgerStateValue from its
EncodedStateValue representation (a tagged union, NOT a byte
buffer — `StateValue.decode` operates on the structured encoding produced
by `StateValue.encode()`).

Source attribution is `onchain-runtime` (per D8) even though the type
is re-exported through the `ledger` sub-path — mitigation hints point
to the underlying runtime package.

## Parameters

### encoded

`EncodedStateValue`

### ctx

[`CallSiteContext`](../interfaces/CallSiteContext.md)

## Returns

`StateValue`

## Throws

On any underlying onchain-runtime decode
  failure.
