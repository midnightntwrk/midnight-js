[**Midnight.js API Reference v5.0.0-beta.6**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../../../README.md) / [compact-js](../../../README.md) / [ContractEventStore](../README.md) / makeLayer

# Variable: makeLayer

> `const` **makeLayer**: (`capacity?`) => `Layer.Layer`\<[`ContractEventStore`](../classes/ContractEventStore.md)\>

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/ContractEventStore.d.ts:158

Builds an in-memory [ContractEventStore](../classes/ContractEventStore.md) layer backed by a `Ref` (full history) and a
**sliding** `PubSub` (live feed). Events accumulate for the lifetime of the provided scope; ids
are monotonic starting at `1`.

## Parameters

### capacity?

`number`

The live-feed buffer size; once more than this many events are buffered for a
subscriber, the oldest are dropped for that subscriber. Defaults to [DEFAULT\_CAPACITY](DEFAULT_CAPACITY.md).

## Returns

`Layer.Layer`\<[`ContractEventStore`](../classes/ContractEventStore.md)\>

## Remarks

The live feed uses a **sliding** buffer rather than a back-pressuring one, and this is a
deliberate liveness choice: `append` publishes to the feed while holding the append lock, so a
back-pressuring buffer would let a single slow or non-draining subscriber fill the buffer, wedge
the suspended publish under the lock, and block **every** subsequent append — including those
driven by circuit execution — indefinitely. A sliding buffer never suspends the publisher, so
appends can never be wedged by a stalled consumer. The trade-off is that a subscriber that cannot
keep up loses the **oldest** un-consumed live events once more than `capacity` accumulate (a gap
in its live tail). Because the full history is always retained in the backing `Ref`, such a
subscriber can recover any missed events by re-`query`-ing or resubscribing with a `fromId`
cursor.
