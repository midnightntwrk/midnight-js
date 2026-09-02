[**Midnight.js API Reference v5.0.0-beta.7**](../../../../../README.md)

***

[Midnight.js API Reference](../../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../../README.md) / [compact-js](../../README.md) / ContractEventStore

# ContractEventStore

An in-process accumulator, and query surface, over the [ContractLog.ContractEvent](../ContractLog/type-aliases/ContractEvent.md)s
produced by locally executed circuits (MIP-0002 Part 2).

## Remarks

This is deliberately **indexer-agnostic**: the store is an in-memory accumulator over events
from local circuit execution, not a chain index. Its [ContractEventFilter](interfaces/ContractEventFilter.md) and monotonic
`id` cursor are shaped to align with the MIP's `ContractEventFilter` / `id` so a future
indexer-backed implementation (in `midnight-js`) can reuse the same types.

Typical usage — decode a circuit result's raw events and append them, then query:

## Example

```ts
import { ContractExecutable, ContractLog, ContractEventStore } from '@midnight-ntwrk/compact-js/effect';
import { Effect } from 'effect';

const program = Effect.gen(function* () {
  const store = yield* ContractEventStore.ContractEventStore;
  const result = yield* contract.circuit(circuitId, ctx, ...args);
  yield* store.append(ContractLog.decodeAll(result.events));
  return yield* store.query({ eventType: 'unshielded-mint' });
}).pipe(Effect.provide(ContractEventStore.layer));
```

## Other

- [ContractEventStore](namespaces/ContractEventStore/README.md)
- [DEFAULT\_CAPACITY](variables/DEFAULT_CAPACITY.md)
- [matches](variables/matches.md)

## layers

- [layer](variables/layer.md)
- [makeLayer](variables/makeLayer.md)

## model

- [ContractEventFilter](interfaces/ContractEventFilter.md)
- [FieldPrefixFilter](interfaces/FieldPrefixFilter.md)
- [StoredEvent](type-aliases/StoredEvent.md)

## services

- [ContractEventStore](classes/ContractEventStore.md)
