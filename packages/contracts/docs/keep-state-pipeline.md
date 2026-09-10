---
title: KeepStatePipeline
---

# Running a retained-era contract

A contract compiled by the previous Compact toolchain keeps working across the
ledger fork. Before the fork its call is composed as a retained-era transaction;
after it, the same call is composed as an ordinary current-era transaction that
carries a retained-era call — the keep-state arm. This document records how that
one operation is ordered, which parts touch the outside world, and the handful
of places where getting it wrong loses money silently rather than raising an
error.

Two modules implement it, and the split is deliberate:

| module | what it owns |
| --- | --- |
| `packages/contracts/src/internal/ledger8-pipeline.ts` | the orchestration ORDER, and nothing else — pure, handed an era and an engine as values |
| `packages/contracts/src/internal/ledger8-entry.ts` | everything that touches the outside world: the two acquisitions, and the provider round trip |

Which pipeline an operation is allowed to take at all is a separate thread — see
[EraDispatch](./era-dispatch.md). The verifier-key check it performs is
[VerificationPath](./verification-path.md).

## No retained-runtime dependency, not even in development

Every era-specific step is a call onto a `LedgerEra` or a
`Ledger8ExecutionEngine`, both of which arrive as values. This package holds no
retained-runtime dependency of any kind, because the engine's own construction
guard exists to detect a SECOND acquisition path for the retained runtime, and
an alias here would create one by construction.

That constraint shapes the engine type. `downConvertForExecution` returns a live
retained-runtime state handle, and nothing in this package may construct one, so
the slice is GENERIC in that state: the pipeline receives the value from
`downConvertForExecution` and hands it straight to `executeCircuit` without
looking inside. The real engine satisfies the slice at
`TState = DownConvertedState`, while a test replaying a committed recording
satisfies it at a plain marker type.

Both members of the slice are declared with method syntax deliberately — their
parameters are then compared bivariantly, which is what lets the real engine
satisfy the slice even though its own request type names the retained runtime's
concrete contract and state shapes.

The transcript is narrowed the same way, to the members the pipeline actually
reads, all of them plain data. That is the same narrowing discipline
`packages/protocol/src/lib/v8/execute.ts` applies to the runtime's own
`QueryContext`.

### What the narrowed transcript leaves out

ONE member of the engine's result is dropped: `preContractState`. Nothing is
lost by it — the pre-call state the composition needs is the one
`LedgerEra.extractState` already returned, and the down-convert refuses to
return unless its decoding re-encodes to exactly that value, so reading it off
the transcript would only be a second route to the same bytes. That same
down-converted handle is what the call entry publishes as `preContractState`.

`postContractState` was dropped for the same reason until ADR-0011 reversed the
rule it rested on. It carries a live retained-runtime handle, and such a handle
may now cross this boundary provided it travels with a plain-data twin — so it
is carried, generically, alongside `postContractStateEncoded`.

`result` used to be a third. It is plain data, and it is now carried: the
retained-era result types report the circuit's own return value on
`private.result`, exactly as the current era does. `zswapLocalState` is carried
for the same reason, and the caller's own new coins are filtered out of it — see
the era-neutral result bases in `midnight-js-types` and ADR-0010 for the rule
that keeps the two eras' surfaces in step.

## The two arms differ only in which era object they are handed

| arm | head | era object | what it produces |
| --- | ---- | ---------- | ---------------- |
| keep-state | `v9` | the current era | a current-era transaction carrying a retained-era call |
| retained-native | `v8` | the retained era | a retained-era transaction |

There is no second composition branch. Both arms end at
`LedgerEra.composeCallTx`, handing it the transcript as `kind: 'unpartitioned'`,
and the era object decides which ledger the call is bound onto.

`wrapKeepStateCall` is deliberately NOT called from here. The current era's
composition performs exactly the binding that wrap performs — both reach the
same assembly step — so calling the wrap first and then composing would do the
binding twice. Its result is a live ledger handle, which the ERA-AGNOSTIC facade
still may not answer with — that half of the transport rule survives
ADR-0011 and is DOCUMENTED by the `structuredClone` gate
(`packages/protocol/docs/era-seam.md`). Documented, not enforced: a
`wasm-bindgen` instance is a plain object carrying an own `__wbg_ptr` number, so
it clones without throwing and the gate records a meaningless value rather than
failing. Treat the gate as a reminder of the rule, not as the thing that holds
it.

## The order one call runs in

`runLedger8CallPipeline` exists to fix this order: fetch the one snapshot, date
it, read the state and the key set off it, check the key, down-convert, execute
the circuit, compose the transaction.

Note that reading and DECODING both precede the key check — `readLedger8Snapshot`
dates the envelope, then extracts the state, then decodes the entry points, and
only then does the pipeline compare a key. The envelope is dated before anything
decodes it; the key is checked after.

A deploy has no snapshot and no head read of its own — there is no deployed
contract to read yet — so `runLedger8DeployPipeline` executes the constructor on
the retained runtime, serializes the state it built, and composes the deploy
against the era. The `(artifact era, head era)` pairing a deploy is allowed on is
settled by the caller before it gets there.

### Both acquisitions happen at the start

The era and the engine are acquired once, before anything else runs, so no step
deeper in the pipeline awaits a runtime and no two steps can end up bound to
different acquisitions. They are independent and are started together: the head
read is a network round trip and the engine load instantiates WASM, and neither
needs the other's answer.

`resolveOperationEra` makes the single head read, and the era it resolves is used
for every era-dependent decision afterwards. The only second head read in the
whole flow is the one `assertHeadStateEraAgreement` makes when the fetched
state's envelope disagrees with that reading — a re-read that exists precisely to
tell a stale reading from an inconsistent one, and which does not happen at all
when the two agree.

### Reading the snapshot

`readLedger8Snapshot` fetches the one contract-state snapshot an operation runs
against and dates it against the head era. The envelope is dated BEFORE anything
decodes it, so a decoder is never handed bytes from the other era.

`extractState` and `decodeContractState` are two separate reads of the same
bytes, and that is deliberate rather than an oversight: the extraction is the
state the circuit executes against and the decode is the key set. They fail
closed at different stages, and collapsing them would make one operation's
execution input depend on the key-set read having succeeded.

The verifier-key check is not part of the snapshot read. It is a per-entry-point
check and the read path checks several against one snapshot, so it is
`assertSnapshotVerifierKey`'s job, run against the snapshot the read returns.
`entryPoints` is an ARRAY and two byte entry points can decode to the same name,
so that check takes the first match by name; a slot that does not hold this
artifact's key is then refused by the byte comparison rather than accepted
because the name lined up.

### Shielded coins the contract already held

`spendsHeldCoin` decides whether the offer can be built at all. An input paired
with an output of the same call is a transient, and the offer builder assembles
it from the pair alone; an input with no such pairing has to be located in the
chain's Merkle tree of commitments, which needs the contract's Zswap CHAIN state
— and the retained-era pipeline reads none. Such a call is refused with
`Ledger8ShieldedSpendUnsupportedError`.

The check shares the offer builder's own SERIALIZERS, so the two agree on coin
identity. The PAIRING itself is not shared: the builder consumes a matched
candidate from its map and this check uses a plain set, so two inputs that
serialize identically would pass here and then reach the builder's own
assertion. That needs a repeated nonce, so it is degenerate rather than
reachable — but the two are "the same test" only up to coin identity, not up to
multiplicity.

## Shielded outputs are encrypted PER RECIPIENT

This is the place where a wrong choice costs a recipient their coin without
anything erroring.

The pipeline is handed a RESOLVER, never a bare encryption key, and the type
says so rather than leaving it to a caller's discretion.
`zswapStateToSegmentedOffer` accepts either and coerces a bare key into the
constant resolver `() => key`. A constant resolver can never refuse, so it
answers with the CALLER'S OWN encryption key for every recipient. An output
paying a third party would then be committed to that party's coin public key
while its ciphertext was encrypted to the sender's, leaving a coin the recipient
owns and cannot discover. Such a transaction proves, balances and submits.
Nothing errors at any stage.

A bare key would also silence `createZswapOutput`'s refusal branch, which is the
only thing standing between an unresolvable recipient and a successfully
submitted mis-encryption. So the bare-key arm is not offered here at all.

Every caller hands a real resolver built by
`createEncryptionPublicKeyResolver` — the same era-independent helper the
current era's `unproven-call-tx.ts` resolves through. The wallet's own coin
public key maps to its encryption key, the well-known burn address maps to
`BURN_ENCRYPTION_PUBLIC_KEY`, and anyone else resolves to `undefined`, which
`createZswapOutput` turns into a refusal.

No additional recipient mappings are passed, because the retained-era call
options carry none: `Ledger8CallTxOptions` has no
`additionalCoinEncPublicKeyMappings` member. So a third-party recipient is
REFUSED here where the current era would consult the caller's mappings.

The refusal is raised BEFORE the offer is built, as
`Ledger8RecipientUnmappableError`, naming the era, the circuit and the
recipient. It deliberately does NOT repeat `createZswapOutput`'s advice to
supply a resolver mapping: that advice points at a field the retained-era
options do not have, so a caller could not act on it. What it says instead is
what is true — this arm resolves the calling wallet's own key and the burn
address, and a third-party recipient needs a current-toolchain contract.

Widening the retained options to accept mappings is additive and belongs with
the first contract that needs it. A refusal is the correct answer until then,
and is the one answer that cannot lose a recipient's coin.

## Reading the private state, and why an empty id is an error

`readLedger8PrivateState` distinguishes two cases, and only one of them is
`undefined`:

- **No id at all.** Not an error. A contract with no private state is the normal
  case for the retained-era fixtures, and an absent id is the caller saying the
  circuit reads none.
- **An id, with nothing stored under it.** An ERROR, and the same one the
  current era raises at `get-states.ts`, with a remediation appended. Naming an id is the caller saying there
  IS a private state to run against, so an empty provider means the state has not
  been written yet, or the id is a typo.

The second case is failed fast rather than passed through, because passing
`undefined` down is silent and expensive. The retained runtime's witnesses would
receive `currentPrivateState: undefined`, and a defensively written witness
(`state?.counter ?? 0n`) produces a perfectly valid proof against a DEFAULT state
instead of the caller's real one. `submitLedger8CallTx` then writes the result
back under that same id — storing a state derived from a phantom starting point,
or, on a typo, creating a state under an id nobody reads while the real one goes
untouched. Nothing errors at any stage.

## Crossing the provider seams

The `version` tag on a provider payload names the ledger runtime that produced
the bytes — NOT the toolchain that produced the contract. A retained-era
contract's call is composed against whichever era the network head is on, so the
two heads hand the providers genuinely different things:

| head | composed by | crosses as | narrowed with |
| ---- | ----------- | ---------- | ------------- |
| `v8` | the retained ledger | `{ version: 'v8', txBytes }` | `requireV8` |
| `v9` | the current ledger | `{ version: 'v9', tx }` | `requireV9` |

On a post-fork head the transaction is an ORDINARY current-era transaction that
happens to carry a retained-era call, so it crosses the seams exactly as every
current-era transaction does — as a live handle, because both sides of the seam
share the current runtime. Tagging it `'v8'` would say the retained runtime
produced it, which is false, and would send a current-era-only provider looking
for a runtime it does not need.

The composition returns bytes either way, so the post-fork arm reads them back
into a live transaction. That is not a re-encode across eras: they are this
package's OWN era's bytes, produced moments earlier by the same runtime that
reads them. The three deserialization markers — signature-enabled, unproven,
unbound — are exactly what `composeCallTx` documents its output as.

A provider that does not serve the pre-fork arm refuses it on the way IN, at the
first seam, with `V8PayloadUnsupportedError` — before anything is proven, which
is the point of leaving that guard in `types` rather than lifting it here.

### Sanitizing a provider's own failure

`atSeam` runs one provider seam call and converts a rejection into
`Ledger8SeamFailedError` with the failure sanitized onto `cause`.

This framework's OWN coded errors pass through UNCHANGED. They carry no external
payload, and a caller narrowing on `V8PayloadUnsupportedError` — the refusal a
current-era-only provider raises on the way in — or on
`EraInvariantViolationError` has to keep seeing them. `hasErrorCode` is the
registry-backed test for that, so a foreign coded error (a Node `ECONNREFUSED`,
say) is still treated as external and sanitized.

`sanitizeSeamCause` rebuilds an external failure as a plain `Error`. Exactly one
thing is DROPPED and the rest is kept REDACTED, and the split is deliberate.

Dropped: the provider's own ENUMERABLE PROPERTIES. That is where HTTP clients
keep the response body, and therefore the echoed request, and there is no
shape-independent way to redact an arbitrary object graph.

Kept, redacted: the class name, the message, the STACK, the `cause` CHAIN, and
an `AggregateError`'s members. Dropping these buys nothing the redaction does not
already buy, and each one is where a real diagnosis lives:

- The cause chain carries the reason. A bare `fetch` failure is
  `Error: fetch failed` with wrong-port, DNS, TLS or connection-refused one or
  two links down; truncating at depth one renders all of them identically.
- `AggregateError.errors` is where `fetch` reports the per-address failures, and
  it is an own property, so it travels with neither the message nor the chain.
- The stack is where a bug in the caller's OWN provider implementation is
  located. A fresh stack points at the sanitizer, which is the one place the
  answer certainly is not. Frames are paths and function names.

The class name falls back to the constructor name, because `name` reads
`'Error'` for any subclass that does not assign it — which third-party provider
errors routinely do not.

### What the redaction catches, and what it does not

Redaction matches by SHAPE, because the set of providers is open and there is no
format to enumerate. Three alternatives, each deliberately narrow:

| shape | floor | why the floor is there |
|---|---|---|
| hex | 24 chars (12 bytes) | A run of hex-alphabet letters can be an ordinary word — `decade`, `defaced`, `facade`. At 24 characters it cannot be. |
| base64 / base64url | 40 chars, and must mix lower case, upper case and a digit | The mixture is what separates an encoded payload from a URL PATH (no upper case) or a long CLASS NAME (no digit). Both are high-value diagnostics: without the mixture requirement the endpoint a misconfiguration names is exactly what disappears. |
| decimal byte list | 13 values | `JSON.stringify(new Uint8Array(...))` and Node's own inspection of a typed array. Commas break the other two alternatives, so without this a payload rendered as numbers passes through untouched. |

This is BEST EFFORT, not a guarantee, and `Ledger8SeamFailedError`'s own message
says so rather than promising more than it delivers. A secret shorter than 12
bytes is under the hex floor. A payload rendered in some shape none of the three
matches is not redacted. The message is also length-capped, so a provider that
renders a whole transaction in an unmatched shape cannot put all of it into
`error.stack` and from there into every log sink the caller has.

## Attaching to a deployed contract

`findLedger8Contract` is a READ path: no composition and no submission. It still
resolves the head era, still dates the fetched state's envelope against it, and
still byte-matches the local verifier key against the slot the chain holds —
exactly the checks that make a later call against this contract safe, done once
at attach time so a mis-dispatch is caught there instead of at the first call.

The deploy record is returned version-tagged rather than narrowed: a retained-era
contract's deployment record belongs to whichever era was current when it was
deployed, and refusing the pre-fork arm here would refuse every contract this
pipeline exists to keep callable.

### Every circuit is checked, and that has a cost

The entry points checked are EVERY circuit the artifact declares, not just one
the caller names. That matches the current era, whose `verifyContractState`
checks every provable circuit id the artifact exposes: attaching is the point at
which a wrong artifact should be caught, and a mismatch on any entry point means
this is not the artifact on chain.

The cost: a contract that had a verifier key REMOVED by a maintenance update can
no longer be attached to at all, because the removed slot now reads as
never-deployed. That is not a retained-era quirk — the current era refuses the
same contract for the same reason — so the two eras behave alike, which is what
makes it the right default here. A caller that must attach to such a contract
needs a narrower check, and that would be a change to both eras rather than to
this arm alone.

The names come off the ARTIFACT rather than off the state, so a circuit the
caller can call but the chain never registered is reported as a blank slot
rather than silently skipped.

## Why a retained-era deploy is refused

`deployContract`'s retained-era arm refuses with
`Ledger8DeployUnmaintainableError`, and the reason was measured rather than
assumed: **the contract this path would create would be permanently
unmaintainable.**

Nothing on this path sets a maintenance authority, so the authority a
retained-era deployment carries is whatever the retained constructor left
behind. What it leaves behind is an EMPTY committee with a threshold of ONE
(`committee: []`, `threshold: 1`, `counter: 0n`), on both the constructor's own
state and the state the deploy derives its address from. A rule change on such a
contract needs one signature from a set of zero keys, which nothing can ever
satisfy. No verifier key could ever be inserted, removed or replaced on it, and
the authority itself could never be updated either, because updating it is a rule
change. `packages/protocol/src/test/v8-deploy.test.ts` pins that measurement.

### The refusal is about this pipeline, NOT about the retained era

This distinction matters, because the obvious reading — that the retained era
cannot express a maintenance authority — is wrong, and acting on it would leave
the refusal in place forever.

The retained runtime exposes everything needed:

- `sampleSigningKey()` and `signatureVerifyingKey(sk)`,
- a public `ContractMaintenanceAuthority(committee, threshold, counter?)`
  constructor, whose own documentation states that `counter` must be `0n` at
  deployment,
- and a MUTABLE `ContractState.maintenanceAuthority`.

An authority written onto the constructor's own state survives serialization,
the bridge into the retained ledger's `ContractState`, and `ContractDeploy` — it
is readable off the composed `initialState` afterwards. The era seam needs no
new field either: `ComposeDeployOptions` already carries the serialized
`contractState`, which is where the authority lives.

So lifting the refusal is not "one line the day the seam carries an authority".
It is three things, and they belong in `packages/protocol`, which is where the
retained runtime is reachable from:

1. decide where the signing key comes from — the current era gets one back from
   compact-js, which the retained path does not use,
2. set the authority on the constructor's state inside the retained execution
   leg, so `packages/contracts` still takes no retained-runtime dependency,
3. return the key, filling in `Ledger8DeployedContract.signingKey`.

A FOURTH thing was missing from this list until it was fixed: the constructor's
own Zswap local state. `executeConstructor` read two of the three members the
artifact returns and dropped `currentZswapLocalState`, so a constructor that
minted a coin composed a deploy carrying an output nothing funded — a
transaction the ledger cannot balance. The constructor runtime slice now carries
the same decoder the execution leg uses, and `runLedger8DeployPipeline` routes
the decoded state into the deploy's guaranteed offer. Nothing about that fix is
observable through `deployContract` while the refusal stands; it is pinned at
the pipeline instead.

The current era does not have this problem because its constructor registers the
signing key it is given, which is what makes its `DeployedContract.signingKey` a
true statement about who can maintain the deployment. Reporting a key the
retained path registered nowhere is not an option, which is why no signing key
is sampled anywhere on this arm today.

### Status of the deploy path

`runLedger8Deploy` and `runLedger8DeployPipeline` are complete and correct as
compositions, and are exercised directly by
`packages/contracts/src/test/v8-native.test.ts`. No entry point calls them.

They are kept rather than deleted because the MJS-02 plan asked for a working
retained-era deploy on a pre-fork head, so this is that deliverable held one
step short of being reachable — not an unimplemented stub, and not dead code
that was never wanted. The refusal is what the measurement above justifies; the
composition below it is what the plan asked for.

One consequence worth stating: because the refusal is unconditional and comes
before the network head is read, `Ledger8DeployOnV9Error` — the era pairing
table's refusal for a retained-era deploy against a post-fork head — is not
reachable through `deployContract` today. It becomes reachable when the deploy
arm is wired.


### Seeding a retained-era private state

This arm has no `initialPrivateState`, on either the find options or the call
options, so there is no API-level way to CREATE a private state for a
retained-era contract. A caller restoring on a new device has nothing stored and
nothing to store it with.

Until the options are widened, the refusal names the way through: write the
state directly with `privateStateProvider.set(privateStateId, state)` before
calling. That is why the message adds a remediation to the sentence the current
era raises — the current era can seed through `findDeployedContract`, and this
arm cannot, so the same first sentence leaves a retained-era caller stuck.
