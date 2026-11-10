# 0011. Tag every result with the pipeline that produced it

- Status: Accepted
- Date: 2026-09-10
- Related: [ADR 0006](./0006-version-tagged-payloads-at-provider-seams.md), [ADR 0010](./0010-publish-era-handles-alongside-their-plain-data.md), [ADR 0012](./0012-read-the-artifact-era-from-what-the-artifact-declares.md), [ADR 0018](./0018-name-single-ledger-code-after-its-ledger.md)

## Context

The `contracts` results hold objects whose runtime matters: an object made by the ledger 8
pipeline is meaningless to the ledger 9 runtime. Deciding what to do with a result starts with
knowing which pipeline produced it.

The finalized record inside a result (`public.era`) answers a different question: which ledger
recorded the transaction. The two disagree exactly where it matters. After the fork, a ledger 8
call is composed as a keep-state transaction and recorded by ledger 9, while every object in its
result came from the ledger 8 pipeline. A caller that branches on the record reaches for the wrong
module and gets a `wasm-bindgen` throw, or worse, a plausible wrong value.

The pipeline is already known: the entry points choose it from the artifact's declared era
(`resolveArtifactEra`, [ADR 0012](./0012-read-the-artifact-era-from-what-the-artifact-declares.md)).

## Decision

Every `contracts` result carries `era` at the top level, under the same name on both eras' types.
This covers `Ledger9CallResult`, `Ledger9ContractConstructorResult`, `Ledger9SubmittedCallTx`,
`Ledger9FinalizedCallTxData`, `Ledger9FinalizedDeployTxData`, `Ledger9FoundContract`,
`Ledger9DeployedContract`, the maintenance results, and their `Ledger8*` counterparts.

- **The value names the pipeline, read from the artifact.** It is the era `resolveArtifactEra`
  resolved for the artifact the caller passed, never the era of a transaction record.
- **Each type declares its own literal.** A `Ledger9*` result declares `era: 'v9'`, a `Ledger8*`
  result `era: 'v8'`. A union of the two narrows on `result.era` alone. Declaring the whole
  `LedgerEra` union on both would type-check and narrow nothing. The `Ledger8*` results use the
  literal, not a "retained era" type, because the ledger 8 pipeline is v8 for good.
- **One alphabet.** `result.era` is a `LedgerEra` (`'v8' | 'v9'`), the same values as a handle's,
  a state's and a record's `era`. The location says which fact it is: `result.era` is the
  pipeline, `result.public.era` is the ledger that recorded the transaction.
- `isLedger8Result` narrows a result to its `Ledger8*` variant from `result.era`.

## Consequences

- Era-generic code branches on one member at one path, and the compiler narrows the whole result.
- The tag cannot disagree with the objects in the result: it comes from the same artifact that
  chose the pipeline.
- Every result type carries one more member, so a strict `toEqual` over a whole result includes it.
- Sharing one alphabet means a value from the wrong field still type-checks: comparing
  `result.era` where `result.public.era` was meant is not a compile error.
- `Ledger9ContractConstructorResult` carries the tag but nothing in the framework constructs one.
  Tagging it keeps the set uniform.

## Alternatives considered

- **Derive the pipeline from the record's era.** Rejected: after the fork a ledger 8 call is
  recorded as `'v9'`.
- **Declare `era: LedgerEra` on both arms.** Rejected: it discriminates nothing.
- **Let callers infer the era from the overload they called.** Rejected: a result passed to a
  helper, stored, or handled by a shared error path carries no such context.
- **A separate value set for pipelines (`'ledger8' | 'ledger9'`).** Rejected: one concept spelt two
  ways sends every reader to look up why; the field location already separates the two facts.
