[**Midnight.js API Reference v5.0.0-beta.8**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js](../README.md) / ErrorTaxonomy

# The error taxonomy

This package raises errors from two ledger eras, across a pipeline that spends
real money before it finishes. Which class a failure arrives as, whether it
carries a registered code, and where in the pipeline it is raised are all
decisions rather than accidents. This document records those decisions in one
place, so a docstring can state what an error means and leave why it is shaped
that way here.

The code is `packages/contracts/src/errors.ts`. The remediation an error asks
for is a separate thread — see [StaleHeadRemediation](StaleHeadRemediation.md).
The order a retained-era operation runs in, which fixes where each refusal can
sit, is [KeepStatePipeline](KeepStatePipeline.md).

## One class to catch, two record types underneath

`AnyEraTxFailedError` is the class to catch for "this framework submitted a
transaction and the chain recorded it as something other than success", in
either era.

It exists because the two eras cannot share a record TYPE. The current era
submits and accepts only v9, so its record is `FinalizedTxData`. A retained-era
call is recorded by whichever era the network head is on, so its record is the
version-tagged union `VersionedFinalizedTxData` — which is not assignable to the
v9 arm. Narrowing the current era's member to the union would change a type
consumers already read, so that was not available either. Hence a retained-era
class of its own rather than an extension of `TxFailedError`, and a base that
declares the union.

Each subclass keeps its own historical member — `finalizedTxData` on the current
era's, `txData` on the retained one — so nothing reading those breaks.
`AnyEraTxFailedError.record` is the member to write new code against, and it
needs narrowing on `version` before `tx` is touched.

### Why the shared code sits on the base

`instanceof` is the idiom this hierarchy is built for, but it is identity-based:
with two copies of this package resolved in one process it returns `false`, and
a failed transaction walks past a correctly written handler. `AnyEraTxFailedError.code`
is the branch for a consumer that cannot import these classes, or cannot rely on
there being one copy of them.

Subclasses inherit that code rather than each declaring their own. What a caller
needs to distinguish is WHICH transaction failed — which the class and the
record already answer — not a finer code.

## Which errors carry a registered code, and which do not

A registered code is a published compatibility commitment. The retained era's
recorded-failure and post-submission classes — `Ledger8CallTxFailedError`,
`Ledger8DeployTxFailedError`, `Ledger8DeployUnconfirmedError`,
`Ledger8DeployNotStoredError` — deliberately carry none of their own. That arm's
record type is expected to converge with the current era's, and a code promised
now would outlive the shape it describes.

This is not an omission to be tidied up later by adding codes. A caller branches
on the class, or on the inherited `TX_FAILED` where the class is unreachable, and
reads the record itself off `txData` rather than parsing a message.

`SubmitRejectionUndiagnosedError` is the exception that proves the rule: it has
its own code, and **the code of the rejection it carries must not be copied onto
it**. The two name different things — one is what the network did, the other is
that no diagnosis of it could be made.

## Refuse before the caller pays

Three refusals exist to convert a late, paid-for failure into an early, free
one. Each replaced a real failure mode, and the placement is the point.

### `LedgerParametersUnservedError`

`RawContractState.ledgerParameters` is optional: a provider that cannot serve
them is still a usable provider, and the bundled indexer provider always does
serve them. But this pipeline has just read the chain, so an absent parameter set
*here* is a provider that did not serve them, not a caller with no read surface.

It is raised instead of substituting the ledger's initial parameters, which is
what happened before and is the failure this class exists to replace: the
partitioner drew the guaranteed/fallible boundary from a cost model the chain
does not run, the caller paid to prove the result, and the node then refused the
guaranteed segment with `Transcript(Execution(OutOfGas))`. Nothing in that path
named the cost model, so the diagnosis was unreachable from the error.

The compatibility path still exists for a caller that genuinely cannot read the
chain, but it has to be selected by name — `INITIAL_LEDGER_PARAMETERS` in
`midnight-js-protocol`.

### `Ledger8ShieldedSpendUnsupportedError`

Building a transaction's Zswap offer for a spend of a coin the contract already
holds on chain needs the contract's Zswap CHAIN state, to locate the coin's
commitment in the chain's Merkle tree. The retained-era pipeline does not read
one. A coin the same call produced needs no chain state — it is paired with its
own output as a transient — which is why only spends of previously held coins
are refused.

Raised BEFORE the offer is built rather than left to fail deeper. Without it the
condition surfaced as a bare assertion inside the offer builder, naming neither
the era nor the circuit, which told a caller nothing about why its call could not
be composed.

The fix is to supply the retained arm with a Zswap chain state, tracked
separately. Until then this refuses in the caller's own test run rather than in
production.

### `ScopedTxEraUnsupportedError`

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

`Ledger8DeployUnconfirmedError` covers the window where the chain's answer is
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
`cause instanceof EraInvariantViolationError`, its seam and its registered code
reachable.

`Ledger8DeployNotStoredError` is the case where the answer arrived and it was
success, but the private-state provider refused to record it locally. The
contract exists, its maintenance authority is built from this error's key, and
deploying again is the one thing a caller must not do.

It carries the signing key over BOTH of its writes even though only one of them
can strand it. One class over the whole after-success region is what makes the
region's guarantee checkable: no `await` in it may reject without the key riding
along.

`Ledger8DeployUnconfirmedError` is reachable only AFTER submission. Every refusal
ahead of it is raised with no key having been sampled.

### The key is named, never rendered

`Ledger8DeployTxFailedError.signingKey` and `Ledger8DeployNotStoredError.signingKey`
are referenced in their classes' documentation but never interpolated into a
message. An error message reaches logs and issue trackers, and this is the only
copy of the authority over a deployment that landed.

## Why a failed deploy is not a failed call

`Ledger8DeployTxFailedError` is separate from `Ledger8CallTxFailedError` because
the remediation is — the same reason `StaleHeadError` writes a deploy's
remediation separately. A failed call can simply be run again. A failed deploy
cannot be retried blindly: a deploy mints a fresh nonce, so a second attempt
lands at a DIFFERENT address, and repeating one that in fact finalized leaves two
copies of the contract on chain.

## Messages state the consequence per status

Both retained-era recorded-failure classes state the local-versus-chain
consequence per STATUS, because the two differ.

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

It is an `AggregateError` because nothing may be dropped: the submission
rejection is what happened to the transaction, and `reason` is why no diagnosis
could be made. `cause` names the proximate failure, so a consumer walking only
cause chains still lands somewhere useful. The rejection is always the FIRST
entry of `errors`.

The two undiagnosable conditions and what each asks of a caller are in
[StaleHeadRemediation](StaleHeadRemediation.md).

## Related reading

`packages/protocol/docs/compose-refusal-order.md` covers the order in which the
composer's own refusals are checked, and why that order is fixed.
`packages/protocol/docs/fail-closed-decoding.md` covers the three classes a read
of contract-state bytes can fail with, and why they are three rather than one.
