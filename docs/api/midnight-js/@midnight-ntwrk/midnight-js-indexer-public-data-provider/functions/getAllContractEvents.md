[**Midnight.js API Reference v5.0.0-beta.4**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-indexer-public-data-provider](../README.md) / getAllContractEvents

# Function: getAllContractEvents()

> **getAllContractEvents**(`provider`, `filter`): `AsyncIterable`\<`ContractEvent`\>

Iterates **all** contract events matching `filter`, safely paged, yielding in
ascending `id` order. The recommended way to read full history — it hides the
off-by-one and offset-instability traps of manual `queryContractEvents`
paging (spec §3.3).

Provider-agnostic: depends only on the `queryContractEvents` primitive.

Stability: the upper bound is pinned **once**, at the first page. When
`filter.toBlock` is given the indexer bounds the set server-side; otherwise
the highest event id known at the first page (`maxId`) is the snapshot tip,
and events appended after it (`id > tip`) are excluded — so a page-boundary
insert can neither duplicate nor skip. Iteration ends on the first short page
(a page shorter than the page size) or once the snapshot tip is passed.

The consumer can stop early by `break`ing the `for await` loop — no further
requests are issued.

## Parameters

### provider

`Pick`\<[`PublicDataProvider`](#), `"queryContractEvents"`\>

Anything exposing `queryContractEvents`.

### filter

`ContractEventQueryFilter`

The events to iterate; `contractAddress` is required.

## Returns

`AsyncIterable`\<`ContractEvent`\>
