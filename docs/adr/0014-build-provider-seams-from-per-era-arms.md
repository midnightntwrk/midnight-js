# 0014. Build the provider seams from per-era arms, and declare what they serve

- Status: Accepted
- Date: 2026-09-11
- Deciders: Szymon Paluchowski
- Related: amends [0006](./0006-version-tagged-payloads-at-provider-seams.md); issue #1004

## Context

ADR 0006 made every payload crossing `proveTx`, `balanceTx` and `submitTx` a
`version`-discriminated union, and its amendment of 2026-09-05 recorded what
shipping the retained arm actually produced:

> a retained-era transaction wired through the `create*` adapters now proves
> successfully and is refused at `balanceTx`, so the refusal lands after a full
> proving cycle rather than at the first seam it meets.

That is the problem this ADR addresses. It has two halves, and they are
independent:

1. **Nothing can be asked what it serves.** `ProofProvider`, `WalletProvider`
   and `MidnightProvider` expose only their methods. Whether an instance handles
   the retained arm is discoverable only by sending it one and seeing whether it
   throws — which, at `balanceTx`, is after the proof has been paid for. Two
   proof providers (`httpClientProofProvider`, `dappConnectorProofProvider`) do
   serve both eras; the three `create*Provider` adapters permanently do not; a
   third-party implementation is anyone's guess.

2. **Every dual-era implementation re-writes the same routing.** Both proof
   providers had grown the same shape by hand: read `payload?.version`, branch,
   call the retained path with bytes, call the current path with the live
   object, tag each answer to match, and keep `unwrapV9` on the fall-through so
   an untagged payload still reports a coded error. Roughly forty lines each, and
   every line of it is a chance to answer in the wrong arm — which strands a
   submit mid-flight, because callers narrow the response and reject the other
   era.

Constraints shaping the decision:

- Capability is STATIC per instance. No provider in the tree discovers at run
  time what it can serve: `dappConnectorProofProvider` deserializes and proves
  the retained arm unconditionally rather than asking the wallet. So a plain
  readonly field is sufficient and an asynchronous probe is not needed.
- `PROVIDER_ERROR_CODES.ERA_UNSUPPORTED` already exists but belongs to the READ
  surface — it means "this record cannot be decoded", raised while decoding.
  Reusing it for "this provider states it does not serve that era" would merge
  two different faults with two different remedies.
- This is a 5.0.0 major. A required field on the three interfaces is affordable
  now and expensive later.
- `packages/types` may depend on `packages/protocol` and on nothing else
  internal (ADR 0006, point 8). Whatever names "the current era" has to come
  from `protocol` or be re-declared, and re-declaring it is the drift this ADR
  is partly about.

## Decision

We will describe a provider by the eras it serves, and build it from one
handler per era.

1. **`protocol` names the current era.** `CURRENT_LEDGER_VERSION` and its type
   `CurrentLedgerVersion` join `LEDGER_VERSIONS` in
   `lib/shared/ledger-version.ts`, re-exported from `./version`, with
   `RetainedLedgerVersion = Exclude<LedgerVersion, CurrentLedgerVersion>` and a
   `RETAINED_LEDGER_VERSIONS` value list gated at build time against that
   complement. Which era is current is a protocol fact — it is the era whose
   objects `./ledger` hands out live — so no package downstream restates it.

2. **Each of the three seams declares `readonly supportedEras: readonly
   LedgerVersion[]`.** REQUIRED, not optional: the same release already changes
   these interfaces, and a required member is what tells an implementer through
   the compiler. An optional one says nothing and defaults to a lie.

3. **Providers are assembled from arms.** `createProofProviderFromArms`,
   `createWalletProviderFromArms` and `createMidnightProviderFromArms` each take
   a required `currentEra` handler plus an optional `retainedEras` record, and
   return the tagged interface. The factory does the routing, the tagging and
   the refusal of an arm it was not given; an arm never writes a `version` tag
   and cannot answer in the wrong era.

4. **`RetainedEraHandlers<H>` excludes the current era from its key set.**
   `Partial<Readonly<Record<RetainedLedgerVersion, H>>>`, where
   `RetainedLedgerVersion` is `Exclude<LedgerVersion, CurrentLedgerVersion>`.
   Registering a retained handler for the current era is a build failure, not a
   convention — the current era crosses as a live object, so such a handler has
   the wrong signature and serves a request that can never arrive. When the
   network moves on and today's current era becomes retained, it becomes
   registrable on its own, with no change to the type.

5. **`supportedEras` is COMPUTED from the arms, never written beside them.**
   `erasServedBy(retainedEras)` returns the current era plus each retained era
   with a handler, frozen. A hand-written list is a second statement of the same
   fact and drifts the first time an arm moves.

6. **The tagged interface may still be implemented directly.** A class, a test
   double, or a provider that routes internally writes `supportedEras` itself.
   The testkit's `MidnightWalletProvider` does exactly that: the wallet SDK
   adopts a transaction AT a protocol version, so both eras genuinely run through
   one call, and splitting that into arms would duplicate the
   balance/sign/finalize sequence to no purpose.

7. **The declarations are checked before an operation starts.**
   `assertSeamsSupportEra(era, seams)` reads all three in pipeline order and
   throws `SeamEraUnsupportedError` (new code
   `MIDNIGHT_JS_PR_SEAM_ERA_UNSUPPORTED`) naming the first seam that does not
   list the era. `packages/contracts` calls it in exactly two places — once per
   pipeline — so a third entry point cannot forget it:
   `acquireLedger8Runtime`, the single funnel every retained-era operation takes,
   and `submitTxCore`. The era passed is the one the operation's PAYLOADS will
   carry, which on the retained pipeline is the head era rather than the
   artifact's: keep-state runs a retained-era artifact against a post-fork head
   and composes on the current era, so its payloads cross the seams as
   `{ version: 'v9', tx }`. Checking the artifact's era there would refuse every
   keep-state operation whose wallet serves only the current era — the ordinary
   post-fork wallet.

8. **A declaration that is absent or malformed reads as "serves nothing".** Not
   as "serves everything". A provider built against an older `midnight-js-types`,
   or supplied from JavaScript, has never heard of this field; treating its
   silence as consent would let exactly the un-migrated provider through.

9. **The per-seam narrowing stays, unchanged.** `V8PayloadUnsupportedError` is
   not retired and `unwrapV9` is not removed. A declaration is a claim by an
   implementation and nothing verifies it, so the seams remain the enforcement
   and the pre-flight check is only about WHERE a knowable refusal lands.

10. **The simple adapters keep their signatures.** `createProofProvider(pp,
    costModel)`, `createWalletProvider(impl)` and `createMidnightProvider(fn)`
    are unchanged for callers; each is now one line over its arms factory and
    declares exactly the current era. A dApp with a v9-only wallet migrates by
    adding nothing.

## Consequences

- **Positive.** A provider set that cannot carry a transaction end to end is
  refused before the proof is paid for, and the error names the seam and the
  remedy. Both proof providers lose their hand-written routing — the
  dapp-connector one drops from a twenty-line `proveTx` to two arms — and with
  it the class of bug where a seam answers in the arm it was not asked in.
  "A retained handler for the current era" and "an era outside the vocabulary"
  are both build failures. A third ledger era adds a member to
  `LEDGER_VERSIONS` and becomes registrable everywhere at once, without editing
  `RetainedEraHandlers`, `assertSeamsSupportEra` or any factory.

- **Negative.** `supportedEras` is a required member on three interfaces, so
  every external implementation and every test double must add it — a breaking
  change on top of the one ADR 0006 already made. The field is trusted, not
  verified: a provider that lists an era it cannot serve now fails later than it
  would have, because the pre-flight check waves it through and the seam refuses
  it afterwards. That is why point 9 keeps the narrowing rather than replacing
  it. The check also covers only the two funnels named in point 7; other
  current-era paths that reach a seam without passing through `submitTxCore`
  still fail at the seam, as they did before.

  Two eras are now named in more than one vocabulary —`LedgerVersion` in
  `protocol`, `PipelineEra` in `contracts` — and this ADR adds a third pairing
  (operation era against declared eras) on top of the artifact/head pairing that
  `assertEraCompatible` already rules. They are documented together in
  `packages/contracts/docs/era-dispatch.md`; nothing binds them mechanically.

- **Follow-ups.**
  - The retained arms of `balanceTx` and `submitTx` have no framework-supplied
    implementation. `RetainedEraBalancer` and `RetainedEraSubmitter` are declared
    and routed, and the testkit wallet serves both eras, but a consumer wanting
    them outside the testkit still writes them. ADR 0006's "provider-side v8
    support, which retires `V8PayloadUnsupportedError`" remains partly done.
  - The stage-erasure risk ADR 0006's amendment records is untouched:
    `V8TxBytes` is still identical across the three seams, so an unproven
    retained payload is still assignable where a finalized one is expected. The
    arms narrow what an IMPLEMENTATION sees, not what the union expresses.

## Alternatives considered

**An optional `supportedEras?`, defaulting to the current era when absent.**
Rejected. It reads as compatibility and buys nothing: the release breaks these
interfaces regardless, so the only thing optionality preserves is the ability to
leave the field out — which is precisely the provider whose capability nobody can
establish. A required member says so through the compiler; an optional one is a
doc comment.

**An `EVERY_ERA` constant a provider can declare.** Rejected. It makes "I serve
everything" a statement that keeps holding as eras are added, so a provider
written before a third era silently claims to serve it. Every declaration is an
explicit list of literals.

**An asynchronous `supportsEra(era)` probe.** Rejected as unnecessary today:
no provider in the tree discovers its capability at run time, so the probe would
be a constant behind a promise, and it would force every call site that wants to
fail fast to become asynchronous. Revisit if a provider appears whose capability
really is a property of a live connection.

**Reusing `PROVIDER_ERROR_CODES.ERA_UNSUPPORTED`.** Rejected. That code is the
read surface's, and it means a record could not be decoded. This one is raised
from a declaration before any payload exists, and its remedy is different: wire a
different provider, rather than upgrade or check the indexer. Merging them would
make `hasErrorCode` unable to tell a wiring mistake from a decode failure.

**Replacing `createProofProvider` with the arms factory.** Rejected. The two-
argument form is the easy path for the common case — a dApp with a
`ProvingProvider` and no retained-era ambitions — and keeping it means that dApp
migrates by changing nothing. Both forms exist; the arms factory is what the
documentation points a dual-era implementer at.

**Splitting the testkit's `MidnightWalletProvider` into arms for uniformity.**
Rejected on inspection. Its `balanceTx` runs both eras through one wallet-SDK
call because the SDK adopts a transaction at a protocol version — the era branch
lives below it, in `adoptVersionedUnbound`/`unwrapVersionedFinalized`. Splitting
would duplicate the balance/sign/finalize sequence to express a branch that is
not there. Point 6 exists so that this is a supported shape rather than an
exception.

**Checking the declarations at `findDeployedContract`, before a contract is
attached.** Deferred, not rejected — it would fail even earlier. The attach path
does not receive the write seams today, so it is a signature change in its own
right, and it would leave the two funnels needing the check anyway for callers
that never attach.
