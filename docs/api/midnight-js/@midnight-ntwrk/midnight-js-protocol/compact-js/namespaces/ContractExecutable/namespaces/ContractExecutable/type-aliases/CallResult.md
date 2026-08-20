[**Midnight.js API Reference v5.0.0-beta.6**](../../../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../../../../../README.md) / [compact-js](../../../../../README.md) / [ContractExecutable](../../../README.md) / [ContractExecutable](../README.md) / CallResult

# Type Alias: CallResult\<C, PS, K\>

> **CallResult**\<`C`, `PS`, `K`\> = `object`

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/ContractExecutable.d.ts:153

The result of invoking a circuit.

`calls` holds the proof data for every contract call made during execution, in
`callProofDataTrace` order — callees first, the root call last. The application-facing
`result`, `privateState`, and `zswapLocalState` belong to the root contract and are
statically typed for it; sub-calls expose only proof data (other contracts' types are not
known here, and only the root holds private/zswap state).

`events` is the single execution-wide log-event list across the whole call tree, in emission
order; each event is tagged with its emitting contract's address, so a per-contract view is a
filter over that tag. Events are NOT consensus state and are handled by the indexer; size and
well-formedness are enforced on-chain by the ledger/VM (degraded, not failed) per MIP-0002.

The events are kept **raw** here to avoid paying decode cost when unused. To obtain typed,
per-event payloads, decode on demand with `ContractLog.decodeAll(result.events)` (which
degrades gracefully and never throws); feed them to a `ContractEventStore` to query/subscribe.

## Type Parameters

### C

`C` *extends* [`Contract`](../../../../../interfaces/Contract.md)\<`PS`\>

### PS

`PS`

### K

`K` *extends* [`ProvableCircuitId`](../../../../../type-aliases/ProvableCircuitId.md)\<`C`\>

## Properties

### calls

> `readonly` **calls**: readonly [`ContractCall`](ContractCall.md)[]

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/ContractExecutable.d.ts:158

***

### events

> `readonly` **events**: [`LogEvent`](../../../../../../compact-runtime/type-aliases/LogEvent.md)[]

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/ContractExecutable.d.ts:157

***

### privateState

> `readonly` **privateState**: `PS` \| `undefined`

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/ContractExecutable.d.ts:155

***

### result

> `readonly` **result**: [`CircuitReturnType`](../../../../Contract/type-aliases/CircuitReturnType.md)\<`C`, `K`\>

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/ContractExecutable.d.ts:154

***

### zswapLocalState

> `readonly` **zswapLocalState**: [`ZswapLocalState`](../../../../../../compact-runtime/interfaces/ZswapLocalState.md)

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/ContractExecutable.d.ts:156
