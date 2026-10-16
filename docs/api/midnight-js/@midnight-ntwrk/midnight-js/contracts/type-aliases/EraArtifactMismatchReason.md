[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / EraArtifactMismatchReason

# Type Alias: EraArtifactMismatchReason

> **EraArtifactMismatchReason** = `"unwrapped-ledger9-contract"` \| `"unrecognised-contract-shape"` \| `"ledger9-artifact-on-ledger8-head"` \| `"ledger9-transaction-on-ledger8-head"` \| `"ledger8-transaction-on-ledger9-head"` \| `"artifact-era-undeclared"` \| `"provider-cannot-declare-era"` \| `"unknown-artifact-runtime-version"`

Why an object was refused as belonging to the wrong era, or to neither.

One error class over every reason rather than a class per reason: a caller catches "this operation
cannot be placed on a ledger era" as one condition, and the reason is what tells it which mistake
it made. Some reasons are about the CALLER's contract object, some about the artifact set its ZK
config provider serves, and two about a transaction handed to `submitTx`. From the caller's side
that is one condition: something it passed does not belong to the era it is being run against.
