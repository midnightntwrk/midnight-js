# 0011. Tag every result with the pipeline that produced it

- Status: Accepted
- Date: 2026-09-10
- Deciders: Szymon Paluchowski

## Context

ADR-0010 put live era handles on the framework's result types. A caller now
holds objects whose runtime module matters: a `Ledger8ChargedState` belongs to
`onchain-runtime-v3` and is meaningless to `ledger-v9`, and the two eras'
encoded forms, while identical in shape, are produced by different toolchains.
Deciding what to do with a result therefore starts with knowing which pipeline
produced it.

Nothing on the result answered that question. What a caller could reach was
`public.version` on the finalized record, or `deployTxData.version` on a
contract handle — and those answer a DIFFERENT question: which ledger recorded
the transaction. The two disagree exactly where it matters. After the fork a
retained-era call is composed as a keep-state transaction and recorded as
`version: 'v9'`, while every object in its result came from
`onchain-runtime-v3`. A caller branching on the record reaches for the wrong
module and gets either a `wasm-bindgen` argument-position throw or, worse, a
plausible wrong value from a receiver position.

The fact itself was already computed. `pipelineEraOf` reads it off the compiled
artifact when an entry point routes a call, and the whole era dispatch turns on
it. It just never left `src/internal`, which is hidden from consumers.

## Decision

We will publish `era` at the TOP LEVEL of every result type, under the same
name and at the same path on both eras' arms: `CallResult`,
`ContractConstructorResult`, `SubmittedCallTx`, `FinalizedCallTxData`,
`FinalizedDeployTxData`, `FoundContract`, `DeployedContract` and their four
retained-era counterparts.

Three rules make it usable:

1. **The source is the compiled artifact, never a transaction record.** The
   value equals what `pipelineEraOf` reports for the artifact the caller
   supplied, and tests assert that equality on both arms.
2. **Each arm declares its own literal**, `CurrentPipelineEra` (`'ledger9'`) or
   `RetainedPipelineEra` (`'ledger8'`), rather than the whole `PipelineEra`
   union. This is what makes it a real discriminator: a union of the two eras'
   results narrows on `result.era` alone. Declaring the union on both arms
   would type-check and narrow nothing.
3. **The vocabulary moves to the public surface.** `PipelineEra` is declared in
   `packages/contracts/src/era.ts` and re-exported into `src/internal/era.ts`,
   rather than the other way round: a published member whose type a consumer
   cannot name is a member they cannot write a signature against.

## Consequences

- **Positive:** era-generic code branches on one member, at one path, and the
  compiler narrows the whole result with it — including the members that differ
  per era, such as `private.txBytes`.
- **Positive:** the answer cannot silently disagree with the objects in the
  result, because it is read off the same artifact that selected the pipeline.
- **Negative:** every result type grew a member, so a strict `toEqual` over a
  whole result had to be updated. That is the assertion working.
- **Negative:** `ContractConstructorResult` carries the tag and still has no
  producer — it is exported and constructed by nothing. Tagging it keeps the
  set uniform; whether it should exist at all is a separate question.

## Alternatives considered

- **Derive it from `public.version` / `deployTxData.version`.** Rejected, and
  this is the decision's whole point: those record which ledger accepted the
  transaction, and after the fork a retained-era call is recorded as `'v9'`.
- **Declare `era: PipelineEra` on both arms.** Rejected: it reads the same and
  discriminates nothing, which would leave callers writing `instanceof`-style
  probes against members instead.
- **Leave it internal and let callers infer the era from which overload they
  called.** Rejected: it works only while the call site and the handling code
  are the same code. A result passed to a helper, stored, or handled by a
  shared error path carries no such context.

## Amendment — one set of era values (2026-10-14)

Issue #1489. The decision stands: every result is tagged with the pipeline that
produced it, read off the compiled artifact. What changes is the value set.

`result.era` used `'ledger8' | 'ledger9'`, while `error.era`, `supportedEras`
and a payload's `version` used `'v8' | 'v9'`. One concept spelt two ways sent a
reader to this ADR to learn why. `result.era` is now a `LedgerVersion`,
`'v8' | 'v9'`.

- Rule 2 holds with new literals: a current-era result declares
  `CurrentLedgerVersion` (`'v9'`), a `Ledger8` result declares `'v8'`, so
  `result.era` still discriminates. The `Ledger8` results take the literal
  rather than `RetainedLedgerVersion`, because that type widens when a further
  era is retained, and the `Ledger8` pipeline is v8 for good.
- Rule 3 is withdrawn. `PipelineEra`, `CurrentPipelineEra`,
  `RetainedPipelineEra`, `CURRENT_PIPELINE_ERA` and `RETAINED_PIPELINE_ERA` are
  removed, and `packages/contracts/src/era.ts` with them. The vocabulary a
  consumer names is the `LedgerVersion` family from
  `@midnight-ntwrk/midnight-js-protocol`.
- The reason the two spellings existed — a retained-era call after the fork has
  `era: 'v8'` and `version: 'v9'` — is now carried by the field names alone. The
  two fields name different facts; they do not need different alphabets.
- What the shared alphabet gives up: a value in the wrong field still type-checks.
  A caller comparing `result.era` where it meant `public.version` is no longer
  stopped by the compiler, and inside the package `assertEraCompatible(pipeline,
  head, kind)` no longer refuses its two era arguments passed the other way round.
  Both call sites pass the literal `'v8'` first, and tests of their behaviour on
  a post-fork head pin the order.

The sections above keep the names that were current when they were written.
