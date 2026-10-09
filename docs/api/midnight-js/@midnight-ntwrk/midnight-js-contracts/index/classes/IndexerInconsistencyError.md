[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / IndexerInconsistencyError

# Class: IndexerInconsistencyError

An error indicating that the read surface reported a network head and a contract state whose eras
disagree, and that the disagreement survived a fresh head read.

Distinct from [HeadStateEraMismatchError](HeadStateEraMismatchError.md), and the distinction is the point: there the head
reading was merely stale and re-running fixes it. Here the head is confirmed, so the served state
and the served head cannot both describe one chain — which is a fault in the data served, not a
timing artefact the caller can correct. Deliberately NOT reported as a fork in progress: nothing
observed here establishes that one is under way, and telling a caller to wait out a fork that is
not happening is worse than telling it to retry.

## Extends

- [`MidnightJsError`](../../../midnight-js/classes/MidnightJsError.md)

## Constructors

### Constructor

> **new IndexerInconsistencyError**(`head`, `stateEra`): `IndexerInconsistencyError`

#### Parameters

##### head

`"v8"` \| `"v9"`

The era the network head reported, confirmed by a fresh read.

##### stateEra

`"v8"` \| `"v9"`

The era the fetched state's own envelope was written by.

#### Returns

`IndexerInconsistencyError`

#### Overrides

[`MidnightJsError`](../../../midnight-js/classes/MidnightJsError.md).[`constructor`](../../../midnight-js/classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../../midnight-js/type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../../midnight-js/classes/MidnightJsError.md).[`category`](../../../midnight-js/classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_C_INDEXER_INCONSISTENCY"` = `CONTRACTS_ERROR_CODES.INDEXER_INCONSISTENCY`

#### Overrides

[`MidnightJsError`](../../../midnight-js/classes/MidnightJsError.md).[`code`](../../../midnight-js/classes/MidnightJsError.md#code)

***

### head

> `readonly` **head**: `"v8"` \| `"v9"`

The era the network head reported, confirmed by a fresh read.

***

### stateEra

> `readonly` **stateEra**: `"v8"` \| `"v9"`

The era the fetched state's own envelope was written by.
