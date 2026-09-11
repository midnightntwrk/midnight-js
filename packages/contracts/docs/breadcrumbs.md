---
title: Breadcrumbs
---

# What an operator can see about era dispatch

Across a hard fork the same call can take three different routes depending on
one integer read from the network, and when it takes the wrong one the symptom
appears far from the decision. Breadcrumbs put the decision itself in the log —
at DEBUG level, as STRUCTURED fields rather than interpolated prose, so an
operator can filter on them.

The code is `packages/contracts/src/internal/breadcrumbs.ts`. What the decisions
themselves are is [EraDispatch](./era-dispatch.md).

## What is breadcrumbed, and what deliberately is not

Three decisions get a breadcrumb, and they are the three this package makes:
`HeadResolutionBreadcrumb`, `PipelineSelectionBreadcrumb` and
`EncodingBreadcrumb`.

Several era decisions a reader might expect are REFUSALS rather than choices,
and are not breadcrumbed a second time. Each already throws a registered,
remediation-carrying error, which is a stronger signal than a debug line:

- the retained-era deploy arm refuses;
- a scoped transaction on a pre-fork head refuses;
- a provider answering on the other era's arm refuses;
- a fetched state whose envelope disagrees with the head refuses.

The head reading each of those refusals rests on IS breadcrumbed, because that
reading is what an operator has to see to know whether the refusal was correct.

There is no verifier-key breadcrumb. Which key version the chain holds is not
observable from here: both ledgers' read APIs expose only the latest available
version of a verifier key, so there is no key-generation decision to record —
see [VerificationPath](./verification-path.md).

There is no breadcrumb for a latched or cached era reading, because there is no
latch: an era reading is taken per operation and threaded down as a value
(`docs/adr/0008-never-latch-the-network-head-version.md`).

## Every head read in this package is breadcrumbed

There are FOUR, and `HeadReadingProvenance` names which is which:

| reading | provenance |
| --- | --- |
| the one an operation takes at its start | `'operation-start'` |
| the one a scope takes at its start | `'operation-start'` |
| the re-read that adjudicates a head/state era disagreement | `'disagreement-re-read'` |
| the re-read taken after a submitted transaction was rejected | `'post-rejection-re-read'` |

A head read that reported nothing would be the one an operator could not
account for, so **a new head read has to add a provenance member**.

The distinction matters in the fork window. An operation takes ONE reading at
its asynchronous start and takes a second, fresh one only when something forces
it. The two are different observations of the network, and a log that could not
tell them apart would read as one operation contradicting itself.

`'post-rejection-re-read'` is the most diagnostic head reading in the stack: it
decides between reporting a fork crossing with a re-run remediation and
reporting a rejection nothing could diagnose, and it is the only reading taken
after bytes were already on the wire. See
[StaleHeadRemediation](./stale-head-remediation.md).

## What each breadcrumb carries, and why

### Head resolution

The raw head integer is carried BESIDE the era name rather than instead of it.
The era deliberately collapses node minor versions, so two operations can report
the same era while having read different nodes, and only the integer says which.

### Pipeline selection

Emitted AFTER the era gate, never before: a breadcrumb written before the gate
would claim a pipeline for an operation that was then refused.

Which ROUTE the pairing runs is the `(path, version)` pair itself and is not
restated as a third field — `path: 'ledger8'` with `version: 'v9'` is the
keep-state route, with `version: 'v8'` the retained-native one. A derived route
name could disagree with the pair it was derived from, which is the same reason
the era gate itself returns nothing.

`source` has one value today, because a pipeline is selected in exactly one way:
from the shape of the compiled contract the caller passed. It is carried anyway,
because a second selection input is exactly the change that would need to show
up in a log.

`contractAddress` is present exactly when the operation names one, and ABSENT
otherwise rather than empty. A deploy has no address until its composition mints
one, and an empty string would read as a deployment at the zero address. The
field is spread in rather than assigned, so an operation with no address leaves
it out rather than present-and-undefined.

### Encoding

This is the byte-level answer, and it is not the same claim as
`RawContractState.version`, which is derived from the record's own
`protocolVersion` and is explicitly not a verified statement about the envelope.

It carries no head integer and no reading provenance, because dating an envelope
is not a head reading. When the era it reports disagrees with the head, the
re-read that follows is reported as its own head-resolution breadcrumb.

## Privacy

A breadcrumb may carry version integers, era names, decision names and a
contract address — all of them public identifiers. It must **never** carry key
bytes, decoded contract state, private state or a raw transaction payload.

That is why every field is a bounded string literal or a number, and why the
emitters take the individual facts rather than an options bag they could pass
through wholesale. `packages/contracts/src/test/breadcrumbs.test.ts` asserts it
over the serialized breadcrumb.

## The sink, and the one thing that is swallowed

`BreadcrumbSink` is declared as its own narrow shape rather than as
`Pick<LoggerProvider, 'debug'>`, so the payload parameter is typed as a
`DispatchBreadcrumb` instead of pino's `unknown`-first `LogFn` — which is what
lets a test read the emitted fields without a cast. A real `LoggerProvider`
satisfies it, so nothing at a call site changes.

Every breadcrumb is written under one fixed message with nothing interpolated
into it, so the fields stay the only thing an operator has to read and a log
aggregator can group the three decisions without parsing prose.

The emission calls `sink.debug.call(sink, ...)` rather than invoking it bare,
because a `LoggerProvider` may be a pino instance, whose log functions read the
logger as `this`.

### The swallowed fault

The emission is wrapped in a `try/catch` that swallows **a fault thrown by the
configured logger, and nothing else.**

`loggerProvider` is a public interface a consumer implements, with every level
optional, so `debug` is arbitrary third-party code. Without the guard it sits on
the success path of every retained-era call, deploy, attach and scoped
transaction, able to fail an operation that otherwise succeeded.

A breadcrumb is a side effect with no bearing on the outcome, so a fault in it
must not change the outcome: observability must never be able to break
execution. This is not the never-swallow rule's subject — that rule stops US
from hiding OUR OWN failures, and a logger's fault is not the operation's fault.

**Do not widen the guard.** It wraps the emission and nothing else. Nothing that
computes a value, reads the network or decides an era may be moved inside it: a
swallowed fault there would hide a real failure, which is exactly what the
never-swallow rule exists to prevent.

Re-reporting the fault is not an option either — the only channel for it is the
logger that just failed. `breadcrumbs.test.ts` states the intended behaviour in
both directions: the operation does not fail, and its result is unchanged.
