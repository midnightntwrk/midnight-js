[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [onchain-runtime](../README.md) / transientCommit

# Function: transientCommit()

> **transientCommit**(`align`, `val`, `opening`): [`Value`](../type-aliases/Value.md)

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:672

**`Internal`**

Internal implementation of the transient commitment primitive

## Parameters

### align

[`Alignment`](../type-aliases/Alignment.md)

### val

[`Value`](../type-aliases/Value.md)

### opening

[`Value`](../type-aliases/Value.md)

## Returns

[`Value`](../type-aliases/Value.md)

## Throws

If [val](#transientcommit) does not have alignment [align](#transientcommit), or
[opening](#transientcommit) does not encode a field element
