[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / CallResultPrivate

# Type Alias: CallResultPrivate\<C, PCK\>

> **CallResultPrivate**\<`C`, `PCK`\> = [`CallResultPrivateBase`](../../types/interfaces/CallResultPrivateBase.md)\<[`Contract.CircuitReturnType`](https://github.com/midnightntwrk/midnight-sdk)\<`C`, `PCK`\>, [`Contract.PrivateState`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>\>

The private (sensitive) portions of the call result.

## Type Parameters

### C

`C` *extends* [`Contract.Any`](https://github.com/midnightntwrk/midnight-sdk)

### PCK

`PCK` *extends* [`Contract.ProvableCircuitId`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>

## Remarks

**Privacy-sensitive type.** Every field on this type carries data the
zero-knowledge proofs were designed to keep confidential: the ZK-aligned
circuit input/output, the private transcript outputs from witness calls,
the JS-typed circuit result, the next private state, and the next Zswap
local state.

Application code must not log, serialize, or transmit instances of this
type. If a non-sensitive subset of the call result is needed (for example,
the JS `result` value alone), extract that field explicitly rather than
passing the whole object across a trust boundary.
