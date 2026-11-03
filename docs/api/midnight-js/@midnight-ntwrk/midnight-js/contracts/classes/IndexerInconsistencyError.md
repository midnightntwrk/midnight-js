[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / IndexerInconsistencyError

# Class: IndexerInconsistencyError

An error indicating that the read surface reported a network ledger version and a contract state whose eras
disagree, and that the disagreement survived a fresh read of the network's ledger version.

Distinct from [NetworkVersionStateMismatchError](NetworkVersionStateMismatchError.md), and the distinction is the point: there the network
version reading was merely stale and re-running fixes it. Here the network version is confirmed, so the served
state and the served network version cannot both describe one chain — which is a fault in the data served, not a
timing artefact the caller can correct. Deliberately NOT reported as a fork in progress: nothing
observed here establishes that one is under way, and telling a caller to wait out a fork that is
not happening is worse than telling it to retry.

## Extends

- [`MidnightJsError`](../../classes/MidnightJsError.md)

## Constructors

### Constructor

> **new IndexerInconsistencyError**(`networkVersion`, `stateEra`): `IndexerInconsistencyError`

#### Parameters

##### networkVersion

`"v8"` \| `"v9"`

The ledger version the network reported, confirmed by a second read.

##### stateEra

`"v8"` \| `"v9"`

The ledger era that wrote the fetched state.

#### Returns

`IndexerInconsistencyError`

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`constructor`](../../classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`category`](../../classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_C_INDEXER_INCONSISTENCY"`

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`code`](../../classes/MidnightJsError.md#code)

***

### networkVersion

> `readonly` **networkVersion**: `"v8"` \| `"v9"`

***

### stateEra

> `readonly` **stateEra**: `"v8"` \| `"v9"`
