[**Midnight.js API Reference v5.0.0-beta.7**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-utils](../README.md) / decodeLedgerStateValue

# Function: decodeLedgerStateValue()

> **decodeLedgerStateValue**(`encoded`, `ctx`): [`StateValue`](https://github.com/midnightntwrk/midnight-ledger)

Decode an onchain-runtime [LedgerStateValue](https://github.com/midnightntwrk/midnight-ledger) from its
[EncodedStateValue](https://github.com/midnightntwrk/midnight-ledger) representation (a tagged union, NOT a byte
buffer — `StateValue.decode` operates on the structured encoding produced
by `StateValue.encode()`).

Source attribution is `onchain-runtime` (per D8) even though the type
is re-exported through the `ledger` sub-path — mitigation hints point
to the underlying runtime package.

## Parameters

### encoded

[`EncodedStateValue`](https://github.com/midnightntwrk/midnight-ledger)

### ctx

[`CallSiteContext`](../interfaces/CallSiteContext.md)

## Returns

[`StateValue`](https://github.com/midnightntwrk/midnight-ledger)

## Throws

On any underlying onchain-runtime decode
  failure.
