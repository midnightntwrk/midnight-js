---
title: ComposeRefusalOrder
---

# The composition contract: refusal order

Both era arms of this package compose the same two transaction kinds — a
contract call and a contract deploy — from the same facade options. This
document records the contract the two arms hold in common: the order in which
they refuse a caller's options, the one ordering difference that survives on
purpose, what each arm accepts rather than refuses, and why every caller-caused
failure leaves as a coded error rather than as a raw WASM failure. The
verifier-key rules a deploy is validated against are a separate thread — see
[VerifierKeys](./verifier-keys.md).

The legs described here are `composeEraV8CallTx` / `composeEraV8DeployTx`
(`packages/protocol/src/lib/v8/adapt.ts`), `composeV8CallTx`
(`packages/protocol/src/lib/v8/compose.ts`), `composeV8DeployTx`
(`packages/protocol/src/lib/v8/deploy.ts`), `composeV9CallTx` /
`composeV9DeployTx` (`packages/protocol/src/lib/v9/compose.ts`), and the shared
pieces under `packages/protocol/src/lib/shared/`.

`composeV8CallTx` is the "same-era" leg: both the circuit's execution and the
call it produces are bound entirely on the ledger-v8 axis, as opposed to
`wrapKeepStateCall` (`packages/protocol/src/lib/v9/wrap.ts`), which binds a
retained-execution transcript natively onto the current ledger-v9 axis instead.

## Refusal order on both era arms

Both arms refuse a caller's options in the SAME order: the envelope, then the
call list, then the offers, then the era's own limits, then the state. A caller
handing both an empty network id and unreadable offer bytes has one defect to
fix per era, not a different one per era.

Holding that order is why the v8 era arm checks the envelope and the call list
itself rather than leaving either to the inner v8 leg it delegates to. The inner
leg checks the envelope again; the check is idempotent, and leaving it there is
what keeps `composeV8CallTx` and `composeV8DeployTx` safe to call directly.

Both offers are read before anything is composed, so a caller handed bad offer
bytes learns that instead of paying for a full assembly first. On the v9 call
leg the transaction-wide options are all checked up front in the same way, while
each call's own contract state is read as that call is assembled — so a bad
state late in a call tree is reported after the earlier calls have already been
built. Nothing is emitted either way: the throw discards the whole intent.

## The one deliberate ordering difference

Both deploy legs check the envelope first and the offer second, but the v9 leg
reads the state before it looks at `verifierKeys`, and the v8 era arm cannot:
the state is read by the leg it delegates to, and reading it in the arm as well
would deserialize the same bytes twice.

So a deploy that is BOTH unreadable and missing its key map reports
`'contractState'` on v9 and `'verifierKeys'` on v8. Both name a real defect in
the same call, and closing the gap costs a redundant deserialization of every
deploy in order to reorder a diagnosis for a caller who has two things to fix
either way.

## Envelope options: well-formedness, never policy

`assertComposeEnvelope` (`packages/protocol/src/lib/shared/compose-options.ts`)
rejects the two envelope options the ledger accepts but should not: an empty
`networkId`, and a `ttl` that is not a valid instant. Both are silently absorbed
by the WASM — an empty network id is baked into the transaction, and an Invalid
Date is recorded as the Unix epoch, yielding a transaction that has already
expired the moment it is composed. Neither surfaces until submission, so both
are refused here.

This validates well-formedness only, never policy: which network a deployment
targets and how long a transaction should live remain the caller's decisions.

## Zswap offers are carried on both eras

A Zswap offer is not refused on either era. The retained era executes
coin-moving circuits and hands their post-call Zswap local state back on the
transcript, which is what a caller turns into the offer it passes here
(`zswapStateToSegmentedOffer`,
`packages/contracts/src/utils/zswap-utils.ts`). Refusing the offer on the
retained era would take away the only way to attach those coin movements to the
transaction that carries the call.

An absent offer is the normal shape of a call that moved no shielded coins, and
stays absent. Bytes an era cannot decode are reported as `ComposeOptionError`
with option `'zswapOffer'` — the same wrapping the other arm applies to the
identical call. The same symmetry holds for the contract state: both arms wrap a
rejected state as `ComposeOptionError` with option `'contractState'` rather than
letting a raw decoder failure escape.

That option error is deliberately not the class `extractEncodedStateValue`
(`packages/protocol/src/lib/era/envelope.ts`) raises for its own decode: a state
that cannot be READ is a different fault from an option that cannot be USED, and
the two carry different remediations.

Inside a v8-native leg the offers are v8-native offer HANDLES rather than bytes:
that leg runs inside the retained era with the module already in hand, so the
era arm that read the caller's offer bytes hands the decoded offer straight
over — exactly as it already does for `contractState`.

## One call per v8 transaction

One shape the facade allows is not expressible on the retained era and is
refused rather than silently narrowed: a call tree with more than one entry. A
cross-contract call is a ledger-9-only feature that a pre-fork contract cannot
emit at all, so this era has no call tree to compose, and composing only the
first entry would drop the rest without a word.

## Unshielded payouts fail closed

`extractUserAddressedOutputs`
(`packages/protocol/src/lib/shared/unshielded.ts`) reads the UTXO outputs a
call's transcript claims on behalf of USERS.

A contract-addressed claimed spend is skipped, and cross-contract calls make
that a normal, expected case rather than an oddity. It is safe to skip because a
cross-contract transfer is never materialized as a UTXO: the ledger settles it
against the callee's own balance update, under the `real_unshielded_spends`
superset check, and `UtxoOutput.owner` takes a user address in the first place.
Emitting an output for one would add a payout the transaction cannot cover.

A user-addressed spend this seam cannot pay out is REFUSED, not skipped. That is
a different case from a contract-addressed spend, which is not a UTXO payout at
all: this one is a payout the transaction has no way to make. Dropping it
silently composes a transaction that tells the user they were paid and pays them
nothing, so it leaves as a coded failure at composition time instead. Two token
types reach that refusal — dust, which carries no raw token type to pay out in
(`'call-dust-payout'`), and a shielded type, whose value moves through a Zswap
offer rather than a UTXO (`'call-unsupported-payout'`).

The check is on the ONE type this seam can pay out rather than on a list of the
ones it cannot. `TokenType` is a vendor union, and a shielded type carries a
`raw` field exactly as an unshielded one does, so an
exclude-what-we-know-about test emits a plausible-looking `UtxoOutput` for
everything it has not heard of. A fourth member added by a vendor bump has to
fail closed here, not compose a payout nothing can settle.

An absent transcript is the normal shape of a call with no fallible half, not an
error, so it yields no outputs rather than throwing.

`aggregateUnshieldedOffers` builds the one offer each segment carries from EVERY
call in the tree. A user-addressed output can be produced by any call, not just
the root, and a transaction has a single guaranteed and a single fallible offer.
Assembling either from the root call alone would drop a cross-contract callee's
payout and leave the transaction unbalanced — rejected on submission, with
nothing having reported a problem at composition time. A segment with nothing to
pay out gets no offer at all rather than an empty one: the ledger expects the
field left unset, not a declared offer paying out nothing.

Both era legs read the partitioned pairs back off the intent rather than
re-deriving them: those are the exact transcripts the transaction now carries,
so the offers cannot describe a different partition than the calls do. A
user-addressed payout has to be attached on BOTH eras, or a call that pays one
out composes into an unbalanced transaction the node rejects on submission, with
nothing having reported a problem at composition time.

## Resolving a call's transcript pair

A partitioned source is passed through untouched — the whole point of the shape.
Re-partitioning it would need a query context the caller no longer has, to redo
work compact-js already did. Only the CALLER-supplied pair is checked for
emptiness: an empty pair coming back from the module's own partitioner is that
module's answer for the program it was handed, and this seam does not overrule
it. A partitioned source carrying neither half is different — it is a caller
with nothing to compose, and a prototype built from it would claim a circuit ran
while recording no operations, the same silent no-op `'call-empty'` refuses one
level up.

An unpartitioned source is bridged into the module's own `QueryContext` and
split there, in two steps: the state crosses as an envelope, then the context
the call recorded is written onto it. Constructing a `QueryContext` restores the
STATE and nothing else, so a context carrying only the state would partition the
program against one the circuit never ran on. `bridgePartitionContext` performs
the step compact-js's own v9 leg performs before it partitions
(`ContractExecutable.js`: `asLedgerQueryContext` sets `block` and `effects`,
`partitionAllTranscripts` folds the commitment indices), in that same order —
set the two members, then fold. `insertCommitment` returns a new context
carrying whatever was already set, so the fold's result is what everything
downstream uses, never the context it started from.

The state crossing is safe, not a lossy re-encode: the `EncodedStateValue`
algebra is structurally identical between onchain-runtime-v3 and both ledger
modules (compile-time drift gate in `v8-down-convert.test.ts`). Every member of
the recorded context is caller data the runtime validates itself, from inside
wasm, so the caller wraps the bridge in its own coded stage.

## Coded failures, and the one that is not

Every failure a caller can cause on this seam is coded. On the call path an
empty call list is refused with `ComposeFailedError` at stage `'call-empty'`,
and an unreadable contract state, Zswap offer, network id or ttl with
`ComposeOptionError`; the shared assembler contributes `'call-operation'`,
`'call-verifier-key'`, `'call-contract-state'`, `'call-transcript-empty'`,
`'call-partition-context'`, `'call-partition'` and `'call-prototype'`, and a
payout the transaction cannot settle surfaces as `'call-dust-payout'` or
`'call-unsupported-payout'`.

Three of those stages exist because the raw failure underneath them starts
inside wasm. The public transcript is caller data in the ledger's own declared
algebra, and nothing type-checks an op's operand into range, so the partitioner
rejects a hand-built or re-encoded sequence with a raw runtime error; coding it
means a caller catches the same shape it catches for every other caller fault
here. The prototype construction is wrapped as ONE step rather than per
argument: the constructor re-reads the transcript pair, the private outputs and
the input/output values, all of which are caller data that nothing
range-checks, and the failure a caller needs to act on is the same whichever
field the runtime tripped over — the runtime's own message on `cause` names it.
A partitioned pair is the sharpest case there, having never passed through this
process's own partitioner.

Which stage names a failed operation lookup is the CALLER's choice, passed in as
`stage` and narrowed to `CallResolutionStage`: the assembler only ever resolves
a call's operation, so a caller cannot ask it to report a deploy stage. Every
other stage the assembler can raise it chooses itself. `'call-verifier-key'` in
particular is not a caller choice, because the diagnosis does not differ by leg:
an operation without a key is unusable on either ledger axis, and composing the
call anyway would produce one no ledger could verify.

The prototype carries the canonical, contract-qualified key location this
framework's provers resolve artifacts by (see `encodeContractKeyLocation` and
`ZKConfigRegistry`). A bare circuit id is ambiguous across contracts and
`parseContractKeyLocation` rejects it, so a call carrying one cannot be proven
through the registry or the DApp-connector path.

There is exactly one deliberate exception to the coding rule:
`partitionTranscripts` returning nothing for the single call submitted is an
internal invariant of the ledger module, not a caller error, so that one throws
a plain `Error` and deliberately carries no protocol error code.

## One stage union across both eras

`ComposeStage` (`packages/protocol/src/errors.ts`) is a single union covering
both arms rather than one union per era, and the era a failure happened on is
carried separately, on the error's `version` field. Every stage but
`'wrap-call'` is reachable on both eras, so folding the era into the stage would
nearly double the union without adding a distinction any caller wants to
`switch` on. `'wrap-call'` is the exception because the operation it names is
itself fork-crossing: it binds a pre-fork transcript onto a v9 state, so it is
only ever raised for `'v9'`.

## Segment ids: fixed for deploys, randomized for calls

Both eras' call legs use `Transaction.fromPartsRandomized`, so the intent lands
at a random segment id and stays mergeable with other calls — matching the v9
call path in `packages/contracts/src/utils/ledger-utils.ts`. Both deploy legs
use `Transaction.fromParts` instead, so the intent lands at a fixed segment id,
matching `createUnprovenLedgerDeployTx` in the same file, which the v9 deploy
path already does. Only calls randomize their segment, and only to stay
mergeable.

## Composition never proves

No leg here proves the transaction it returns: the bytes are an UNPROVEN,
tag-prefixed serialization, exactly what `Transaction.serialize()` produces
before `.prove()` is ever called. Proving needs a proving provider and a running
proof server, neither of which this seam has. That holds for the deploy legs
too, including the constructor execution that feeds them — a constructor
produces state, never a proof.

## Injected era seams

The slices these legs take by injection — `CallAssemblyLedger`,
`PartitionableQueryContext`, `CallOperationRegistry`, `UnshieldedOfferLedger`
and the v8 deploy seam's two — are narrowed, and each narrowing is a different
trade. How they are typed, and what each trade buys, is in
[InjectedVendorSlices](./injected-vendor-slices.md).
