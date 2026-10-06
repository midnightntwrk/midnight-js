[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / EraArtifactMismatchOptions

# Interface: EraArtifactMismatchOptions

Options for [EraArtifactMismatchError](../classes/EraArtifactMismatchError.md).

## Extends

- `ErrorOptions`

## Properties

### detail?

> `readonly` `optional` **detail?**: `string`

A sentence appended to the settled wording for this reason, naming the value that was actually
seen. Kept OUT of the reason's own message so every instance of a reason reads identically up to
the fact that varies.
