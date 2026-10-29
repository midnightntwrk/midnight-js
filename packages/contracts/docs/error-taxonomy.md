---
title: ErrorTaxonomy
---

# The error taxonomy

This package raises errors from two ledger eras, across a pipeline that spends
real money before it finishes. Which class a failure arrives as, whether it
carries a registered code, and where in the pipeline it is raised are all
decisions rather than accidents. This document records those decisions in one
place, so a docstring can state what an error means and leave why it is shaped
that way here.

The code is `packages/contracts/src/errors.ts`. The remediation an error asks
for is a separate thread — see [ForkCrossedRemediation](./stale-head-remediation.md).
The order a retained-era operation runs in, which fixes where each refusal can
sit, is [KeepStatePipeline](./keep-state-pipeline.md).

## One class per fault

Each fault is one class. A field on it says which case it was: `operation`,
`reason` or `stage`. Classes are merged only inside one category (ADR 0017), so
a caller never has to read the field to learn what to do about the fault. The
field only tells it which case it is in.

A wrong-era fault stays split by who is at fault:

| Class | Category | Who is at fault |
|---|---|---|
| `EraMismatchError` | USAGE | The caller passed a value of the wrong era. |
| `EraInvariantViolationError` | INTERNAL | A provider or the framework broke the era rule. |
| `PublicStatesEraMismatchError`, `IndexerInconsistencyError` | INTEGRITY | The data served does not agree with itself. |
| `UnknownLedgerVersionError` | ENVIRONMENT | The provider or midnight-js is too old for the value. |

## One class to catch for a failed transaction

`TxFailedError` is the class to catch for "this framework submitted a
transaction and the chain recorded it as something other than success", in
either era. A v4-style `catch (e) { if (e instanceof TxFailedError) ... }`
around a ledger 8 call catches it.

Its constructor is `TxFailedError(operation, record, details)`:

- `operation` is `'call'`, `'deploy'`, `'insert-verifier-key'`,
  `'remove-verifier-key'` or `'replace-authority'`.
- `record` is the era-tagged `FinalizedTxRead` the chain reported. Narrow on
  `record.era` before `record.tx` is touched. The status and the
  `segmentStatusMap` are read from `record`; the message does not repeat them.
- `contractAddress`, `circuitId` and `signingKey` are optional. Each operation
  sets the ones it has. A call scoped over several contracts has no single
  `contractAddress`, and `circuitId` is then a list.

### Why the shared code sits on the class

The code is the contract (ADR 0017); `instanceof` is a convenience. It is
identity-based: with two copies of this package resolved in one process it
returns `false`, and a failed transaction walks past a correctly written handler.
`TxFailedError.code` is the branch that always works.

One code, `TX_FAILED`, covers every operation. What a caller needs to
distinguish is WHICH operation failed, which `operation` already answers, not a
finer code.

## Which errors carry a registered code, and which do not

Every class here carries a registered code (ADR 0017). The ledger 8 classes
that remain carry one each, and they describe what the caller must do next, not
the record:

- `Ledger8SigningKeyError` (`LEDGER8_SIGNING_KEY`, USAGE), `reason` `'unusable'`
  or `'unavailable'`.
- `Ledger8UnconfirmedError` (`LEDGER8_UNCONFIRMED`, UNCERTAIN), `operation`
  `'deploy'` or `'replace-authority'`. It is `UNCERTAIN` because the deployment
  or the replacement may still land.
- `Ledger8NotStoredError` (`LEDGER8_NOT_STORED`, ENVIRONMENT), `operation`
  `'deploy'` or `'replace-authority'`, and `stage` `'signing-key'` or
  `'private-state'`.
- `Ledger8CallUnsupportedError` (`LEDGER8_CALL_UNSUPPORTED`, USAGE), `reason`
  `'shielded-spend'` or `'unmappable-recipient'`.
- `Ledger8AmbiguousEntryPointError` (`LEDGER8_AMBIGUOUS_ENTRY_POINT`,
  INTEGRITY).

The four reason and stage types are exported flat, next to the classes:
`Ledger8SigningKeyReason`, `Ledger8KeyedOperation`, `Ledger8NotStoredStage` and
`Ledger8CallUnsupportedReason`. There is no `Ledger8` namespace
([ADR 0013](../../../docs/adr/0013-publish-the-retained-era-as-one-namespace.md)).

Every refusal for a value of the wrong era is one `EraMismatchError`
(`ERA_MISMATCH`), and its `reason` says which. Where the old classes carried a
typed field the merged class cannot hold (`networkVersion`, `circuitId`,
`received`, `contractAddress`, `operation`), the value is in the message,
through `detail`.
`SubmitRejectionUndiagnosedError` is the exception that proves the rule: it has
its own code, and **the code of the rejection it carries must not be copied onto
it**. The two name different things — one is what the network did, the other is
that no diagnosis of it could be made.

## Refuse before the caller pays

Four refusals exist to convert a late, paid-for failure into an early, free
one. Each replaced a real failure mode, and the placement is the point.

### `LedgerParametersUnservedError`

`queryContractState` returns a `ContractStateAndParametersRead`, whose
`ledgerParameters` is required, and the bundled indexer provider refuses a block
that carries none. A provider written in JavaScript is out of reach of the
types, though, and this pipeline has just read the chain, so an absent parameter
set *here* is a provider that did not serve them, not a caller with no read
surface.

Only parameters that are absent (`undefined` or `null`) are taken as unserved.
Parameters served in a shape that is not a `LedgerState` are refused with
`UnknownLedgerVersionError` instead, because the provider did serve something, in
the shape of a pre-5.0.0 provider. Taking that as absent would blame the wrong
fault.

It is raised instead of substituting the ledger's initial parameters, which is
what happened before and is the failure this class exists to replace: the
partitioner drew the guaranteed/fallible boundary from a cost model the chain
does not run, the caller paid to prove the result, and the node then refused the
guaranteed segment with `Transcript(Execution(OutOfGas))`. Nothing in that path
named the cost model, so the diagnosis was unreachable from the error.

The compatibility path still exists for a caller that genuinely cannot read the
chain, but it has to be selected by name — `INITIAL_LEDGER_PARAMETERS` in
`midnight-js-protocol`.

### `PublicStatesEraMismatchError`

A call is built from the contract state, the ledger parameters and the zswap
chain state of one read. A `PublicStatesRead` is typed as one era, but a
provider written in JavaScript can serve parameters or a zswap state of another
era, or none. The v8 pipeline composes for the head's era, and checks the era of
the parameters it read against that era the same way, with `expected` the head. Decoding those would
fail inside the runtime with a message that tells the dApp to pass a decoder it
never passes. So the era of each state is checked before anything is decoded,
and the refusal names the state and the provider as the fault.

Before that check each state is rebuilt with `LedgerState.fromBytes` from its
`era`, `kind` and `serialize()`. `LedgerState.isLedgerState` answers `false` for
a state made by a second installed copy of `@midnight-ntwrk/midnight-js-types`,
and a dApp can end up with two copies the same way it ends up with two runtimes.
Refusing such a state would name a provider fault where there is none. The
rebuild checks the tag again, so forged bytes and a state of another kind are
still refused, with `InvalidLedgerStateError` (`tag-mismatch`). A state that is
present but names no known era is not "missing": it is refused with
`UnknownLedgerVersionError`. Its `requestedVersion` is `'undefined'` when the
value carried no era at all, and the message points to an outdated provider. A
state with a known era but no `serialize()` still gives `InvalidLedgerStateError`.

A framework decoder that fails on the bytes after a valid tag throws its own
`DeserializationError` (`MIDNIGHT_JS_U_DESERIALIZATION_FAILED`, INTEGRITY).
`LedgerState.deserialize` rethrows it unchanged, so the error does not tell the
dApp to pass a decoder it never passed.

### `Ledger8CallUnsupportedError`, reason `'shielded-spend'`

Building a transaction's Zswap offer for a spend of a coin the contract already
holds on chain needs the contract's Zswap CHAIN state, to locate the coin's
commitment in the chain's Merkle tree. The retained-era pipeline does not read
one. A coin the same call produced needs no chain state — it is paired with its
own output as a transient — which is why only spends of previously held coins
are refused. The other reason, `'unmappable-recipient'`, refuses a shielded
payment to a recipient whose encryption key cannot be resolved.

Raised BEFORE the offer is built rather than left to fail deeper. Without it the
condition surfaced as a bare assertion inside the offer builder, naming neither
the era nor the circuit, which told a caller nothing about why its call could not
be composed.

The fix is to supply the retained-era path with a Zswap chain state, tracked
separately. Until then this refuses in the caller's own test run rather than in
production.

### `EraMismatchError`, reason `'scope-on-ledger8-network'`

The pre-fork era composes exactly one call per transaction and refuses a longer
list, which leaves a pre-fork scope nothing to batch into.

It is raised when the scope is CREATED, and from the head READING alone — before
that era's runtime is acquired. Both placements are load-bearing and must not
move later. The message names both ways forward, because the caller's batching
intent cannot be honoured either way and it has to choose.

## After submission, the signing key rides along

The retained-era deploy path has a region that begins the moment a deployment is
submitted. Inside it, a deployment may exist on chain under a maintenance
authority whose key this process is the only holder of. Every error raised in
that region carries the key.

### The two post-submission classes

`Ledger8UnconfirmedError` with `operation` `'deploy'` covers the window where the chain's answer is
unknown: the read surface rejecting, a record whose version tag is missing or
unrecognised, and a record arriving from an era the head this deployment composed
on cannot have recorded. One class over all of them, because the caller's action
is the same in each — the transaction may still finalize, this error holds the
only copy of the signing key, and the address has to be checked before deploying
again. One class does not mean one message: the wording states which condition
was hit.

It wraps the underlying failure on `cause` rather than replacing it. The reason
the deployment is unconfirmed — an unreachable indexer, a timeout, an untagged
payload, an era violation — is what a caller branches on, and this class adds the
one fact that failure cannot carry, the key the submitted deployment was built
with. An era violation reaching `cause` unchanged is what keeps
`cause instanceof EraInvariantViolationError`, its method and its registered code
reachable.

`Ledger8NotStoredError` with `operation` `'deploy'` is the case where the answer arrived and it was
success, but the private-state provider refused to record it locally. The
contract exists, its maintenance authority is built from this error's key, and
deploying again is the one thing a caller must not do.

It carries the signing key over BOTH of its writes even though only one of them
can strand it. One class over the whole after-success region is what makes the
region's guarantee checkable: no `await` in it may reject without the key riding
along.

`Ledger8UnconfirmedError` is reachable only AFTER submission. Every refusal
ahead of it is raised with no key having been sampled.

### The key is named, never rendered

`TxFailedError.signingKey` (after a failed deploy or replacement),
`Ledger8UnconfirmedError.signingKey` and `Ledger8NotStoredError.signingKey` are
referenced in their classes' documentation but never interpolated into a
message. An error message reaches logs and issue trackers, and each may be the
only copy of the authority over a deployment or a replacement that landed.

The key is an enumerable property. A logger that serializes the properties of an
error writes it out. This was true for ledger 8 and is now true for ledger 9
too, so do not pass these errors whole to a logger that ships its output
anywhere.

## Why a failed deploy is not a failed call

A failed deploy and a failed call are the same class, `TxFailedError`, but the
remediation in the message differs by `operation` — the same reason
`ForkCrossedDuringOperationError` writes a deploy's remediation separately. A failed call can simply be run again. A failed deploy
cannot be retried blindly: a deploy mints a fresh nonce, so a second attempt
lands at a DIFFERENT address, and repeating one that in fact finalized leaves two
copies of the contract on chain.

## Messages state the consequence per status

`TxFailedError` states the local-versus-chain consequence per STATUS, because the
two differ.

With the whole transaction rejected, nothing landed. With a fallible-phase
failure, every guaranteed effect is kept — and this pipeline places every
movement it makes in the guaranteed segment, so the chain moved while the private
state was not stored.

For a deploy the difference *is* the remediation. A `ContractDeploy` sits in the
Intent, which is the guaranteed part, so on `FailFallible` the contract DID land,
under the maintenance authority built from the error's signing key. A single
message saying nothing local refers to the address would let that caller conclude
nothing happened, and never go looking for a deployment it owns and cannot
maintain.

## When no diagnosis can be made

`SubmitRejectionUndiagnosedError` reports that a submission was rejected and that
whether the network crossed the ledger fork under it could not be established.

It is a `MidnightJsError` that carries an `errors` list because nothing may be
dropped: the submission rejection is what happened to the transaction, and
`reason` is why no diagnosis could be made. `cause` names the proximate failure, so a consumer walking only
cause chains still lands somewhere useful. The rejection is always the FIRST
entry of `errors`.

The two undiagnosable conditions and what each asks of a caller are in
[ForkCrossedRemediation](./stale-head-remediation.md).

## Related reading

`packages/protocol/docs/compose-refusal-order.md` covers the order in which the
composer's own refusals are checked, and why that order is fixed.
`packages/protocol/docs/fail-closed-decoding.md` covers the three classes a read
of contract-state bytes can fail with, and why they are three rather than one.
