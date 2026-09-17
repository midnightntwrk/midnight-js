[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / EraArtifactMismatchReason

# Type Alias: EraArtifactMismatchReason

> **EraArtifactMismatchReason** = `"unwrapped-current-era-contract"` \| `"unrecognised-contract-shape"` \| `"current-era-artifact-on-pre-fork-head"` \| `"artifact-era-undeclared"` \| `"provider-cannot-declare-era"` \| `"unknown-artifact-runtime-version"`

Why an object was refused as belonging to the wrong era, or to neither.

One error class over every reason rather than a class per reason: a caller catches "this operation
cannot be placed on a ledger era" as one condition, and the reason is what tells it which mistake
it made. Two of the reasons are about the CALLER's contract object and two are about the artifact
set its ZK config provider serves, which is one condition from the caller's side: something in the
bundle it passed does not belong to the era it is being run against.
