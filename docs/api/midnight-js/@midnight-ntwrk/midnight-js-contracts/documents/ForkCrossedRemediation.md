[**Midnight.js API Reference v5.0.0**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../README.md) / ForkCrossedRemediation

# When the network crosses the fork under an operation

An operation resolves the head era at its asynchronous start and then spends
real time composing, proving and balancing before anything is submitted. During
the fork window the head can move inside that gap, and when it does the node
rejects a transaction that was correct when it was built.

This document records how that rejection is told apart from an ordinary one,
what a caller is told to do about it, and which scope a contract-scoped
transaction runs on each side of the fork.

The code is `packages/contracts/src/internal/stale-head.ts`, the scope half of
`packages/contracts/src/internal/transaction.ts`, and
`packages/contracts/src/internal/ledger8-scope.ts`. How the head era is read in
the first place is [EraDispatch](../../midnight-js/documents/EraDispatch.md).

## Why a submit rejection is diagnosed rather than propagated

A node rejects a transaction for many reasons, and during the fork window one of
them is that the transaction belongs to the era the network has just left.
Nothing in the node's own rejection distinguishes that case — it is an ordinary
rejection — and the era the operation started from cannot report itself as
stale, because nothing in a head reading announces that it has fallen behind.
That is the rule in `docs/adr/0007-never-latch-the-network-head-version.md`.

So the head is read once more and ERAS are compared. Never the raw
protocol-version integers: two readings one node minor release apart
(2_000_000 and 2_001_000) are different integers and the same ledger era, and an
integer comparison would report that ordinary node upgrade as a fork.

### The re-read really is a second reading of the network

`queryLatestProtocolVersion` takes no argument and offers no freshness flag,
deliberately. Implementations may only serve it from a cache that expires by
itself on a bound short relative to block time, so every answer is at most one
bound old and there is nothing for a caller to opt out of. That is why the
module simply asks again — see ADR 0007 and the method's own documentation in
`packages/types/src/public-data-provider.ts`.

`latestNetworkLedgerVersion` is what the module calls: one round trip, the same
`'construct'` era mapping, and only the era back. The raw head integer is
deliberately not carried past the read, because the verdict is an era
comparison and nothing downstream of it compares integers.

## The four outcomes

`handleSubmitRejection` returns `Promise<never>` — there is no outcome in which
a rejected submission becomes a success, so it is the whole of the failure path
rather than a step in it, and a caller writes
`return handleSubmitRejection(...)` inside its `catch`.

| what a fresh head read reports | thrown |
| ------------------------------ | ------ |
| a LATER era than the operation started against | `ForkCrossedDuringOperationError`, with the two-step remediation |
| the SAME era | the rejection, unchanged |
| an EARLIER era | `SubmitRejectionUndiagnosedError`, reason `'network-version-went-backwards'` |
| nothing — the read itself rejects | `SubmitRejectionUndiagnosedError`, reason `'network-version-read-failed'` |

The fork verdict is FORWARD-ONLY. An era only ever moves forward on a real
chain, so a reading that has gone backwards — an indexer rolled back to an
earlier snapshot, a provider repointed at a different network — is not a fork
crossing, and a message saying the network crossed the fork would be simply
false. Inequality alone cannot tell those two apart, so the positions on the
timeline are compared rather than the values.

The timeline order is read off `LEDGER_ERAS`, which is declared oldest-first,
rather than restated — a second ordering could disagree with it. The order is
pinned by `packages/contracts/src/test/scoped-era.test.ts`, so an era inserted
out of order fails a test instead of silently inverting the direction test.

### One rejection never reaches the head read

This framework's OWN coded refusals are re-thrown untouched, and the network is
not asked about them. A provider that does not serve the pre-fork payload variant refuses on
the way IN, before anything is submitted, and a caller narrowing on that refusal
has to keep seeing it.

`ProviderFailedError` is the one exception: it IS the sanitized external
rejection, so it is the input this diagnosis is written for.

### The module does not sanitize

The rejection reaches it already rebuilt as `ProviderFailedError`, with the
provider's failure redacted onto `cause` by the provider-call wrapper in
`submit-payload.ts` — one sanitizer, at the boundary the external failure
crosses, rather than a second one here that could redact differently. See
[KeepStatePipeline](../../midnight-js/documents/KeepStatePipeline.md) for what that redaction removes.

## What a caller is told to do

`ForkCrossedDuringOperationError` carries a two-step remediation, and the order matters. First,
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
- **A maintenance update** cannot be re-run either: the retained toolchain has
  no maintenance after the fork. First check whether the contract's verifier
  key for the circuit, or its maintenance authority, already reflects the
  update. Then recompile with the current Compact toolchain and run the same
  maintenance function with that artifact. An authority replacement arrives
  wrapped in `Ledger8UnconfirmedError` (`operation` `'replace-authority'`), which carries the new
  key, because the replacement may have landed.
- **A transaction** submitted with `submitTx` or `submitTxAsync` is built again for the era
  the network now reports. The caller built it, so the error names no contract
  (`contractAddress` is `undefined`); the first step checks the transaction's own effects.

## Why `SubmitRejectionUndiagnosedError` carries a code of its own

Without one it would arrive as an uncoded error, and a caller branching
on `hasErrorCode(e, PROVIDER_FAILED)` to decide retry-or-escalate would
escalate INTERMITTENTLY for one and the same node rejection — depending on
whether the read surface happened to answer. Both failures here are the same
network, so they correlate: they coincide more often than independence would
suggest.

The code is its OWN rather than copied from the rejection it carries, because
copying would make one error report two different codes depending on which of
the two failures came first.

It is a `MidnightJsError` that carries an `errors` list (the submission
rejection first, then the failed head read when there was one) because nothing
may be dropped: the submission rejection is what happened to the transaction,
and the reason on `.reason` is why no diagnosis could be made. `cause` names the proximate failure so a
consumer walking only cause chains still lands somewhere useful.

A head integer that cannot be placed on the era timeline arrives on the
`'network-version-read-failed'` case, carried on `networkVersionReadFailure`: the read is what failed,
whether the transport or the mapping refused it.

## Contract-scoped transactions

A scope batches several circuit calls into ONE transaction, and it resolves the
one era reading it runs under when it is CREATED, then threads it down as a
value — the same discipline it already applies to the block it pins. A scope is
a single chain snapshot, and a second head reading could answer differently
mid-scope and leave the batched transaction composed half against each era.
Nothing is cached ACROSS scopes.

### A scope runs on the era of the head

`withContractScopedTransaction` reads the head once and runs the scope of that
era: the ledger 8 scope before the fork, the ledger 9 scope after it.

The ledger 8 scope composes each call as its own ledger 8 transaction and merges
them with `Transaction.merge()` of the framework's ledger 8 copy, as 4.1.1 did.
This is not a call tree: `composeCallTx` still composes exactly one call per
ledger 8 transaction (see `packages/protocol/docs/era-boundary.md`). A scope
merges whole transactions, which the ledger 8 ledger accepts.

The scope reads the head and acquires the ledger 8 runtime once, before its
function runs. The first call added to the scope reads the contract state and the
stored private state, and fixes the contract and private state the scope runs
against. Every later call runs on the contract state and private state the call
before it ended on. `createUnprovenCallTx` builds against the same states and adds
nothing to the scope, so it fixes nothing either. Three limits hold in both eras:

- The contract's balance stays as the first call read it.
- The ledger does not keep the order of merged calls. A circuit whose transcript
  depends on another call of the same scope running first can fail on chain.
- A scope calls one contract with one private state;
  `ScopedTransactionIdentityMismatchError` refuses a second.

### Why a scope function of one era is refused on a head of the other

`withLedger8ContractScopedTransaction` serves only a ledger 8 head and
`withLedger9ContractScopedTransaction` only a ledger 9 head. On a head of the
other era each raises `EraMismatchError` with reason `'scope-era-mismatch'`,
naming the function and the head era. Two properties of WHERE it is raised are
load-bearing:

1. **Before the scope body runs**, so no circuit is executed and no private
   state is touched on a batch that could never be submitted.
2. **From the head READING alone, before that era's runtime is acquired.** A
   caller that only ever uses the current toolchain must not be made to
   instantiate the pre-fork ledger to be told its scope cannot run, and must not
   receive an acquisition failure in place of this refusal when that lazy
   subpath cannot be loaded at all
   (`docs/adr/0004-lazy-v8-era-access-via-protocol-subpath.md`).

The message points at `withContractScopedTransaction`, which follows the head.

### Why a retained-era call cannot join a ledger 9 scope

After the fork a scope is a ledger 9 one, and its calls are composed by the
current toolchain's pipeline, which keeps a cache of decoded ledger 9 states. A
retained-era call is composed by the retained pipeline and submitted on its own,
so a ledger 9 scope has no way to run it against the scope's states.

A typed caller reaches it with a scope function typed for ledger 8 that runs
after the fork. It is checked on every path a call can take — `submitCallTx`,
`createUnprovenCallTx` and `callTx.<circuit>` — because the alternative is what it
replaces: the retained-era path accepted the scope
context and quietly ran outside it, returning a transaction the caller believed
had been batched with the rest. The reverse — a ledger 9 contract called with a
ledger 8 scope — is refused with reason `'ledger9-artifact-on-ledger8-network'`,
because that contract cannot run before the fork at all.

The outcomes are kept apart on purpose:

- **No third argument** is the normal case.
- **A ledger 8 scope** is joined.
- **A ledger 9 scope** is the mixed-era refusal, `EraMismatchError` with reason `'ledger8-call-in-scope'`.
- **A scope context of an unknown era, or a ledger 8 one made by another copy of
  the package**, gets an `InvalidArgumentError`: the era it names cannot be trusted.
- **Anything else** — `null`, or a stray value a JavaScript caller passed by
  mistake — is a malformed argument and gets an `InvalidArgumentError`
  (`MIDNIGHT_JS_G_INVALID_ARGUMENT`, category `USAGE`). Reporting it as
  "this circuit cannot join a scope" would name a scope the caller never had and
  send it looking for batching it never asked for. It is coded because every
  midnight-js error is: a caller recognises it with `hasErrorCode` or
  `errorCategory`, and `USAGE` says it is a mistake to fix rather than a state to
  handle. See [ADR 0017](../../../_media/0017-error-codes-are-the-contract.md).
