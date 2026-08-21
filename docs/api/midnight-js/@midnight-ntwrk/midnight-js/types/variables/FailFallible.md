[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / FailFallible

# Variable: FailFallible

> `const` **FailFallible**: `"FailFallible"`

Defined in: packages/types/dist/index.d.ts:115

Indicates that the transaction is valid but the portion of the transcript
that is allowed to fail (the portion after a checkpoint) did fail. All effects
from the guaranteed part of the transaction are kept but the effects from the
fallible part of the transaction are discarded.
