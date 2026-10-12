[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / RunRetainedCircuitOptions

# Interface: RunRetainedCircuitOptions\<C, PS\>

Everything runRetainedCircuit needs to run one circuit.

## Type Parameters

### C

`C` *extends* [`RetainedContract`](RetainedContract.md)

### PS

`PS`

## Properties

### address

> `readonly` **address**: `string`

***

### args

> `readonly` **args**: readonly `unknown`[]

***

### circuitId

> `readonly` **circuitId**: `string`

***

### coinPk

> `readonly` **coinPk**: `string`

***

### contract

> `readonly` **contract**: `C`

***

### contractState

> `readonly` **contractState**: [`ContractStatePojo`](ContractStatePojo.md)

The contract state the call runs against, DECODED — the primary state in
its era-neutral encoded form, with the balances the contract holds beside
it.

Era-neutral rather than one era's serialized bytes, because a contract that
an earlier post-fork call has already migrated carries a CURRENT-era
envelope while still executing on the retained runtime. Chain bytes would
have to be decoded by the era that wrote them; this shape is what both
envelopes' readers produce, so one path serves a pre-fork contract and a
migrated one alike.

The balance travels on the same value, so the two halves cannot come off
different reads. executableStateFrom writes it onto a whole
`ContractState`, which is the only form the retained runtime reads a
balance from — handed a bare state value it substitutes an empty map, and a
circuit reading a balance then executes against nothing with every guard
green. That substitution is what #1345 was.

***

### nowSeconds?

> `readonly` `optional` **nowSeconds?**: `number`

The execution clock, in SECONDS since the epoch. Omitted, the wall clock is
used.

Lands on the query context's `block.secondsSinceEpoch`, which
[TranscriptPojo.partitionContext](TranscriptPojo.md#partitioncontext) reports — so without pinning it a
recorded fixture differs on every run
(midnightntwrk/midnight-sdk#403).

***

### privateState

> `readonly` **privateState**: `PS`
