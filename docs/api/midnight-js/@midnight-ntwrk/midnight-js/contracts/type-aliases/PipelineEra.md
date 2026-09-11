[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / PipelineEra

# Type Alias: PipelineEra

> **PipelineEra** = `"ledger8"` \| `"ledger9"`

Which execution pipeline an operation takes, and so which toolchain produced
the objects in its result.

Each member names the LEDGER ERA the pipeline executes against — `'ledger8'`
runs against ledger 8, `'ledger9'` against ledger 9 — never a toolchain
version, and never which era is the newest. A further ledger era ADDS a
member instead of renaming one.

Read off the compiled ARTIFACT, never off a transaction record. The two are
different facts and they disagree after the fork: a retained-era call is
recorded as a keep-state transaction with `version: 'v9'` while every object
in its result comes from `onchain-runtime-v3`. Branching on the record would
send a caller to the wrong module.

Not a statement about the network either — the pairing with the head era is
what decides whether an operation can run at all.
