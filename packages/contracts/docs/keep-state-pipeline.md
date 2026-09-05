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

Three members of the engine's result are dropped, for two different reasons.

`preContractState` and `postContractState` carry live retained-runtime handles,
which may not cross this package boundary at all. Nothing is lost: the pre-call
state the composition needs is the one `LedgerEra.extractState` already
returned, and the down-convert refuses to return unless its decoding re-encodes
to exactly that value, so reading it off the transcript would only be a second
route to the same bytes.

`result` is plain data and could be carried. It is dropped because nothing reads
it — the retained-era result types report the next private state and the
finalized record, never the circuit's own return value. It belongs in the
narrowed type the day one of them does.

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
binding twice. Its result could not be handed on anyway: it is a live ledger
handle, and only bytes and plain data may cross this package boundary
(`docs/adr/0007-cross-the-era-boundary-with-plain-data-only.md`,
`packages/protocol/docs/era-seam.md`).

## The order one call runs in

`runLedger8CallPipeline` exists to fix this order: fetch the one snapshot, date
it, check the key, extract the state, down-convert it, execute the circuit,
compose the transaction.

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

The pairing test is the offer builder's OWN one, reusing its serializers rather
than restating it, so the two cannot answer differently about the same state.

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
REFUSED here where the current era would consult the caller's mappings, and the
refusal names what to supply. Widening the retained options to accept mappings is
additive and belongs with the first contract that needs it — a refusal is the
correct answer until then, and is the one answer that cannot lose a recipient's
coin.

## Reading the private state, and why an empty id is an error

`readLedger8PrivateState` distinguishes two cases, and only one of them is
`undefined`:

- **No id at all.** Not an error. A contract with no private state is the normal
  case for the retained-era fixtures, and an absent id is the caller saying the
  circuit reads none.
- **An id, with nothing stored under it.** An ERROR, and the same one the
  current era raises at `get-states.ts`. Naming an id is the caller saying there
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

`sanitizeSeamCause` rebuilds an external failure as a plain `Error` carrying only
its class name and a redacted message. Each omission is deliberate: a provider's
own ENUMERABLE PROPERTIES are where HTTP clients keep the response body — and
therefore the echoed request — and its own `cause` chain is where the unredacted
original would otherwise survive. Neither is carried.

Redaction matches by SHAPE rather than by a particular provider's message
format, because the set of providers is open and there is no format to
enumerate. The two shapes transaction and witness material takes inside a message
are a long run of hex or a long run of base64. Thirty-two characters is the
shortest run worth redacting — a 16-byte hex value — and is short enough that no
ordinary English word or identifier reaches it, so the redaction does not eat
diagnostic text.

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

## Why a retained-era deploy is refused

`deployContract`'s retained-era arm refuses, and the reason was measured rather
than assumed: **the contract would be permanently unmaintainable.**

Neither half of the retained deploy path accepts a maintenance authority. The
retained constructor context is built by
`createConstructorContext(initialPrivateState, coinPublicKey)` — two parameters,
no key — and the era facade's deploy composition takes
`{ contractState, verifierKeys, networkId, ttl }`, also no key. So the authority
a retained-era deployment carries is whatever the retained constructor left
behind.

What it leaves behind is an EMPTY committee with a threshold of ONE
(`committee: []`, `threshold: 1`, `counter: 0n`), on both the constructor's own
state and the state the deploy derives its address from. A rule change on such a
contract needs one signature from a set of zero keys, which nothing can ever
satisfy. No verifier key could ever be inserted, removed or replaced on it, and
the authority itself could never be updated either, because updating it is a rule
change. The contract would be permanently unmaintainable by anyone, including
its deployer.

`packages/protocol/src/test/v8-deploy.test.ts` pins that measurement, and is the
test that will say so if a future retained runtime or era seam gains an authority
— at which point the refusal can be lifted.

The current era does not have this problem because its constructor registers the
signing key it is given, which is what makes its `DeployedContract.signingKey` a
true statement about who can maintain the deployment. On the retained era the
same key would be registered nowhere, so reporting one is not an option either.

The retained era's purpose is to keep contracts deployed BEFORE the fork
callable, and those already carry the authority their own deployment registered.
A new retained-era deployment has no such history — the same reason a retained-era
deploy is refused outright on a post-fork head.

`runLedger8Deploy` itself is complete and correct, and is exercised directly by
`packages/contracts/src/test/v8-native.test.ts`. No entry point calls it, so
wiring one is a one-line change the moment the era seam carries an authority.
