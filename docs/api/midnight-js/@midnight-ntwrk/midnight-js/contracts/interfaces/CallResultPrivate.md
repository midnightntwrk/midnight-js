[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / CallResultPrivate

# Interface: CallResultPrivate\<C, PCK\>

Defined in: packages/contracts/dist/index.d.ts:94

The private (sensitive) portions of the call result.

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

## Extended by

- [`UnsubmittedCallTxPrivateData`](UnsubmittedCallTxPrivateData.md)

## Type Parameters

### C

`C` *extends* [`Contract.Any`](https://github.com/midnightntwrk/midnight-sdk)

### PCK

`PCK` *extends* [`Contract.ProvableCircuitId`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>

## Properties

### input

> `readonly` **input**: [`AlignedValue`](https://github.com/midnightntwrk/midnight-ledger)

Defined in: packages/contracts/dist/index.d.ts:98

ZK representation of the circuit arguments.

***

### nextPrivateState

> `readonly` **nextPrivateState**: [`PrivateState`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>

Defined in: packages/contracts/dist/index.d.ts:114

The private state resulting from executing the circuit.

***

### nextZswapLocalState

> `readonly` **nextZswapLocalState**: [`ZswapLocalState`](https://github.com/LFDT-Minokawa/compact)

Defined in: packages/contracts/dist/index.d.ts:118

The Zswap local state resulting from executing the circuit.

***

### output

> `readonly` **output**: [`AlignedValue`](https://github.com/midnightntwrk/midnight-ledger)

Defined in: packages/contracts/dist/index.d.ts:102

ZK representation of the circuit result.

***

### privateTranscriptOutputs

> `readonly` **privateTranscriptOutputs**: [`AlignedValue`](https://github.com/midnightntwrk/midnight-ledger)[]

Defined in: packages/contracts/dist/index.d.ts:106

ZK representation of the circuit witness call results.

***

### result

> `readonly` **result**: [`CircuitReturnType`](https://github.com/midnightntwrk/midnight-sdk)\<`C`, `PCK`\>

Defined in: packages/contracts/dist/index.d.ts:110

The JS representation of the value returned by the circuit.
