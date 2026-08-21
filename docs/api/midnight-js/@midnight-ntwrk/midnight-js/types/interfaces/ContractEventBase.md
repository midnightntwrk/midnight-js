[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / ContractEventBase

# Interface: ContractEventBase

Defined in: packages/types/dist/index.d.ts:953

Fields common to every [ContractEvent](../type-aliases/ContractEvent.md) variant, regardless of type.

## Properties

### contractAddress

> `readonly` **contractAddress**: `string`

Defined in: packages/types/dist/index.d.ts:970

Address of the contract that emitted the event.

***

### id

> `readonly` **id**: `number`

Defined in: packages/types/dist/index.d.ts:958

Monotonic indexer cursor for this event. Inclusive resumption point — to
resume *after* this event, pass `{ fromId: id + 1 }`.

***

### maxId

> `readonly` **maxId**: `number`

Defined in: packages/types/dist/index.d.ts:963

Highest event id the indexer currently knows (the chain tip for events).
Compare against [id](#id) to detect catch-up / whether more events exist.

***

### raw

> `readonly` **raw**: `string`

Defined in: packages/types/dist/index.d.ts:983

Opaque hex `VersionedLogItem` bytes, carried verbatim. Never decoded or
validated by this provider — the forward bridge to a future compact-js
payload decoder.

***

### transactionId

> `readonly` **transactionId**: `number`

Defined in: packages/types/dist/index.d.ts:977

Indexer-internal `BIGSERIAL` row id of the emitting transaction — **not**
the chain transaction hash. To fetch the chain transaction, issue a
separate query. Note the asymmetry with [ContractEventFilterBase.transactionHash](ContractEventFilterBase.md#transactionhash),
which narrows by chain hash.

***

### version

> `readonly` **version**: `number`

Defined in: packages/types/dist/index.d.ts:968

Payload schema version — selects the (future) per-event payload decoder.
Iteration-1 events are `version: 1`.
