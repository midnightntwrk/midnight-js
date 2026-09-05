---
title: StaleHeadRemediation
---

# When the network crosses the fork under an operation

An operation resolves the head era at its asynchronous start and then spends
real time composing, proving and balancing before anything is submitted. During
the fork window the head can move inside that gap, and when it does the node
rejects a transaction that was correct when it was built.

This document records how that rejection is told apart from an ordinary one,
what a caller is told to do about it, and why a contract-scoped transaction is
refused outright on a pre-fork head instead of being narrowed.

The code is `packages/contracts/src/internal/stale-head.ts` and the scope half
of `packages/contracts/src/internal/transaction.ts`. How the head era is read in
the first place is [EraDispatch](./era-dispatch.md).

## Why a submit rejection is diagnosed rather than propagated

A node rejects a transaction for many reasons, and during the fork window one of
them is that the transaction belongs to the era the network has just left.
Nothing in the node's own rejection distinguishes that case — it is an ordinary
rejection — and the era the operation started from cannot report itself as
stale, because nothing in a head reading announces that it has fallen behind.
That is the rule in `docs/adr/0008-never-latch-the-network-head-version.md`.

So the head is read once more and ERAS are compared. Never the raw
protocol-version integers: two readings one node minor release apart
(2_000_000 and 2_001_000) are different integers and the same ledger era, and an
integer comparison would report that ordinary node upgrade as a fork.

### The re-read really is a second reading of the network

`queryLatestProtocolVersion` takes no argument and offers no freshness flag,
deliberately. Implementations may only serve it from a cache that expires by
itself on a bound short relative to block time, so every answer is at most one
bound old and there is nothing for a caller to opt out of. That is why the
module simply asks again — see ADR 0008 and the method's own documentation in
`packages/types/src/public-data-provider.ts`.

`readHeadEra` is used rather than `networkHeadVersion`: the same one round trip
and the same `'construct'` era mapping, but it also yields the raw head integer,
which is the value an operator acting on the verdict actually needs and which
the breadcrumb reports.

## The four outcomes

`handleSubmitRejection` returns `Promise<never>` — there is no outcome in which
a rejected submission becomes a success, so it is the whole of the failure path
rather than a step in it, and a caller writes
`return handleSubmitRejection(...)` inside its `catch`.

| what a fresh head read reports | thrown |
| ------------------------------ | ------ |
| a LATER era than the operation started against | `StaleHeadError`, with the two-step remediation |
| the SAME era | the rejection, unchanged |
| an EARLIER era | `SubmitRejectionUndiagnosedError`, reason `'head-moved-backwards'` |
| nothing — the read itself rejects | `SubmitRejectionUndiagnosedError`, reason `'head-read-failed'` |

The fork verdict is FORWARD-ONLY. An era only ever moves forward on a real
chain, so a reading that has gone backwards — an indexer rolled back to an
earlier snapshot, a provider repointed at a different network — is not a fork
crossing, and a message saying the network crossed the fork would be simply
false. Inequality alone cannot tell those two apart, so the positions on the
timeline are compared rather than the values.

The timeline order is read off `LEDGER_VERSIONS`, which is declared oldest-first,
rather than restated — a second ordering could disagree with it. The order is
pinned by `packages/contracts/src/test/scoped-era.test.ts`, so an era inserted
out of order fails a test instead of silently inverting the direction test.

### One rejection never reaches the head read

This framework's OWN coded refusals are re-thrown untouched, and the network is
not asked about them. A provider that does not serve the pre-fork arm refuses on
the way IN, before anything is submitted, and a caller narrowing on that refusal
has to keep seeing it.

`Ledger8SeamFailedError` is the one exception: it IS the sanitized external
rejection, so it is the input this diagnosis is written for.

### The module does not sanitize

The rejection reaches it already rebuilt as `Ledger8SeamFailedError`, with the
provider's failure redacted onto `cause` by the seam wrapper in
`ledger8-entry.ts` — one sanitizer, at the boundary the external failure
crosses, rather than a second one here that could redact differently. See
[KeepStatePipeline](./keep-state-pipeline.md) for what that redaction removes.

### The fresh read is breadcrumbed

It carries its own `'post-rejection-re-read'` provenance. It is the only head
reading taken after bytes were already on the wire, and it is the reading the
verdict rests on, so an operator asked to act on a `StaleHeadError` needs the
integer it returned. It is reported BEFORE the verdict, so the reading is in the
log whichever arm is taken.

## What a caller is told to do

`StaleHeadError` carries a two-step remediation, and the order matters. First,
verify the transaction did not finalize: a submission rejected while the head
was moving can still have been recorded. Only then act.

The second step differs by operation kind:

- **A call** is re-run unchanged. It resolves the network head again and
  executes against the era the network now reports.
- **A deploy** cannot be re-run. A deploy mints a fresh nonce, so a second
  attempt lands at a DIFFERENT address and would leave two copies of the
  contract on chain; and a contract produced by the retained toolchain cannot be
  deployed to a post-fork head at all. The remediation is to recompile with the
  current Compact toolchain and deploy that artifact.

## Why `SubmitRejectionUndiagnosedError` carries a code of its own

Without one it would arrive as a bare `AggregateError`, and a caller branching
on `hasErrorCode(e, LEDGER8_SEAM_FAILED)` to decide retry-or-escalate would
escalate INTERMITTENTLY for one and the same node rejection — depending on
whether the read surface happened to answer. Both failures here are the same
network, so they correlate: they coincide more often than independence would
suggest.

The code is its OWN rather than copied from the rejection it carries, because
copying would make one error report two different codes depending on which of
the two failures came first.

It is an `AggregateError` because nothing may be dropped: the submission
rejection is what happened to the transaction, and the reason on `.reason` is
why no diagnosis could be made. `cause` names the proximate failure so a
consumer walking only cause chains still lands somewhere useful.

A head integer that cannot be placed on the era timeline arrives on the
`'head-read-failed'` arm, carried on `headReadFailure`: the read is what failed,
whether the transport or the mapping refused it.

## Contract-scoped transactions

A scope batches several circuit calls into ONE transaction, and it resolves the
one era reading it runs under when it is CREATED, then threads it down as a
value — the same discipline it already applies to the block it pins. A scope is
a single chain snapshot, and a second head reading could answer differently
mid-scope and leave the batched transaction composed half against each era.
Nothing is cached ACROSS scopes.

### Why a pre-fork scope is refused rather than narrowed

The pre-fork era composes exactly one call per transaction and refuses a longer
list outright — a call tree is a post-fork ledger feature, so that era has no
structure to express a second call in. That leaves a pre-fork scope nothing to
batch into. A contract compiled by the retained toolchain is also single-call by
construction, so a pre-fork scope has little to be atomic about in the first
place.

Two properties of WHERE the refusal is raised are load-bearing:

1. **Before the scope body runs**, so no circuit is executed and no private
   state is touched on a batch that could never be submitted.
2. **From the head READING alone, before that era's runtime is acquired.** A
   caller that only ever uses the current toolchain must not be made to
   instantiate the pre-fork ledger to be told its scope cannot run, and must not
   receive an acquisition failure in place of this refusal when that lazy
   subpath cannot be loaded at all
   (`docs/adr/0004-lazy-v8-era-access-via-protocol-subpath.md`).

Both ways forward are named in the message, because the caller's batching intent
cannot be honoured either way and it needs to choose: give up the batching and
submit each call on its own, or keep the batching and run the scope once the
network head has crossed the fork.

### Why a retained-era call cannot join a scope

The scope's merge is `unprovenTx.merge(...)` on live CURRENT-era transactions,
and a retained-era call never produces one: it is composed against whichever era
the head is on and crosses the provider seams as its own transaction, in that
era's own form. So there is nothing to merge it into, at either head — the scope
would have to hold an era object this package is not allowed to hold
(`docs/adr/0007-cross-the-era-boundary-with-plain-data-only.md`).

This is reachable only from JavaScript today, because the retained-era
`submitCallTx` overload declares no scope parameter. It is still checked,
because the alternative is what it replaces: the retained arm accepted the scope
context and quietly ran outside it, returning a transaction the caller believed
had been batched with the rest.

The three outcomes are kept apart on purpose:

- **No third argument** is the normal case.
- **A real scope** is the mixed-era refusal, `MixedEraScopeError`.
- **Anything else** — `null`, or a stray value a JavaScript caller passed by
  mistake — is a malformed argument and gets a bare `TypeError`. Reporting it as
  "this circuit cannot join a scope" would name a scope the caller never had and
  send it looking for batching it never asked for. A bare `TypeError` rather
  than a registered code, because a registered code is a published consumer
  surface for a condition worth branching on, and "you passed the wrong thing"
  is a mistake to fix, not a state to handle.

The retained-era pipeline runs OUTSIDE the scoped-transaction machinery
entirely: that machinery merges several current-era calls into one transaction,
and the retained era composes exactly one call, so there is nothing for it to
merge with.
