# 0006. Carry version-tagged payloads across the provider seams

- Status: Accepted
- Date: 2026-08-28
- Deciders: Szymon Paluchowski

## Context

For the duration of the ledger-fork window midnight-js must be able to talk
about transactions belonging to two ledger eras, v8 and v9. The two ledger
builds are separate WASM instances: an object constructed by one cannot be
handed to the other, and `instanceof` does not hold across them. A raw
`Uint8Array` carries no statement about which runtime produced it, so a
byte array crossing a provider seam is unattributable.

Three provider seams move a transaction between components:

```
UnprovenTransaction -> ProofProvider.proveTx    -> UnboundTransaction
                    -> WalletProvider.balanceTx -> FinalizedTransaction
                    -> MidnightProvider.submitTx -> TransactionId
```

and two read-surface methods report a finalized record back:
`PublicDataProvider.watchForTxData` and `watchForDeployTxData`.

Constraints shaping the decision:

- `packages/types` is the package every other package depends on. It depends on
  `packages/protocol` for ledger types and nothing else internal; the layer
  table in `CLAUDE.md` places `utils` below it, so `types` importing values
  from `utils` would invert the documented order.
- The indexer reports a `protocolVersion` integer per record.
  `@midnight-ntwrk/midnight-js-protocol` already resolves that integer to a
  ledger era (`versionOfRecord`, `protocolVersionToLedger`), mapping node major
  1 to v8 and node major 2 to v9 and failing closed on anything else.
- No v8 deserializer is wired into any provider yet. The read path decodes with
  the v9-only `deserializeLedgerTransaction`.
- This is a 5.0.0 major, so a breaking change to the provider interfaces is
  affordable now and expensive later.

## Decision

We will make every version-divergent payload a closed, `version`-discriminated
union, and we will resolve the discriminant from observed data rather than
asserting it.

1. **Transaction flow.** The three seams carry `VersionedTx<T>` in both
   directions where a transaction crosses: `{ version: 'v9', tx: T }` for a
   live v9 ledger object, `{ version: 'v8', txBytes }` for the v8 era. There is
   deliberately no untagged form, so a bare `Uint8Array` is not assignable at
   any seam. `submitTx` is tagged inbound only; it returns a `TransactionId`,
   which is era-independent.

2. **The v8 arm crosses as serialized bytes.** Because the two ledger runtimes
   are separate WASM instances, a live v8 object cannot safely cross a seam.
   The bytes are the serialized, tag-prefixed form, and `version` states which
   runtime produced them.

3. **Read surface.** `watchForTxData` and `watchForDeployTxData` return
   `VersionedFinalizedTxData` — the closed union of `FinalizedTxData`
   (`version: 'v9'`) and `FinalizedTxDataV8` (`version: 'v8'`). The two arms
   share a `FinalizedTxRecord` base so their common metadata is structurally
   identical rather than kept in step by hand.

4. **The discriminant is derived, never asserted.** A provider that produces a
   finalized record resolves the era with `versionOfRecord(record)` from
   `@midnight-ntwrk/midnight-js-protocol/version`. It does not hardcode a
   literal. If the record resolves to an era the provider cannot decode, it
   throws rather than mislabelling the record.

5. **v9-only components reject the v8 arm loudly.** Providers that speak only
   v9 throw `V8PayloadUnsupportedError`. The v9-only contracts flow rejects a
   v8 payload with `EraInvariantViolationError`, and narrows the read surface at
   its own boundary so `submitTx` and `findDeployedContract` keep their v9
   return types. Both errors carry a stable `code` matching the registry in
   `@midnight-ntwrk/midnight-js-utils` — declared locally, for the reason in
   point 8 — and a closed `seam` identifier.

6. **One narrowing helper, not a switch per seam.** `unwrapV9(payload, seam)`,
   exported from `midnight-js-types`, is the narrowing every v9-only provider
   and consumer uses. It throws `V8PayloadUnsupportedError` for a v8 payload
   and `UntaggedPayloadError` when `version` is missing or unrecognised — the
   latter being the path a pre-5.0.0 caller actually reaches, so it carries a
   `code` rather than surfacing as a bare `TypeError` inside a WASM call. The
   v9-only contracts flow keeps its own `requireV9`/`requireV9Record` for the
   *outbound* direction, where a v8 answer means a broken provider rather than
   an unsupported request.

   Exhaustiveness is enforced two ways: an inline `const unhandled: never`
   assignment in each `default` branch, and the compile-time bridge in point 7,
   which fails the build if the era set and the union arms disagree. Adding an
   era is therefore a compile error, not a runtime surprise.

7. **One era vocabulary.** The discriminant literals are tied to
   `LedgerVersion` in `@midnight-ntwrk/midnight-js-protocol` by type-only
   `Exclude` assertions in `versioned.ts`. The era set is one fact, not two.

8. **`types` stays free of internal runtime dependencies.** The two values the
   package needs — the error-code strings behind its two error classes — are
   declared locally in `packages/types` rather than imported from
   `packages/utils`, preserving the documented layer order. `utils` keeps the
   registry that `hasErrorCode` consults, and its error-codes test pins the same
   literals on that side. `types` depends on `utils` only as a devDependency,
   for tests.

## Consequences

- **Positive.** An era mismatch is a compile error at every seam, or a coded
  runtime error at the one boundary types cannot reach. The read surface can
  report a v8 record without mislabelling it as v9. A caller writes one
  `switch` and is correct for both eras. Deriving the discriminant means the
  field is a statement about observed data, not a hope.

- **Negative.** Every consumer of `proveTx`, `balanceTx`, `submitTx`,
  `watchForTxData` and `watchForDeployTxData` must change — including external
  implementations of `WalletProvider` and `MidnightProvider`, which cannot
  satisfy the new interfaces until they are updated, because the return types
  are covariant. `createWalletProvider` and `createMidnightProvider` are
  provided so an implementation can stay v9-only and never write the tag, which
  also avoids a confusing compiler error: TypeScript reports the parameter
  mismatch before the return-type one, so an un-migrated implementation is told
  that `V8TxBytes` lacks 20-odd ledger methods rather than that it is missing a
  `version` tag. Consumers must narrow on `version` for a v8 arm that no
  provider produces yet, so the narrowing is currently required but unreachable.
  Resolving the discriminant means the read path now throws on networks running
  node 1.x or 0.x instead of silently returning an undecodable record.

  `V8TxBytes` is identical across the three seams, so on the v8 arm the union
  carries no statement about pipeline stage: an unproven v8 payload is
  assignable where a finalized one is expected. The v9 arm keeps its stage
  distinctions. This is accepted for now because nothing produces the v8 arm;
  closing it later means a phantom type parameter, which is itself breaking.

- **Follow-ups.**
  - ~~Dual decode: teach the read path to deserialize the v8 arm so
    `FinalizedTxDataV8` gains a producer. Until then a v8-era record is a
    loud failure, not a value.~~ **Resolved.** Shipped in #1241: the read path
    decodes per record with the era that record's own `protocolVersion`
    selects, covered by
    `packages/indexer-public-data-provider/src/test/dual-decode.test.ts`. A
    v8-era record now arrives as a value on the `'v8'` arm, which is what
    `docs/releases/v5.0.0/breaking-changes.md` tells consumers to expect.
  - Provider-side v8 support, which retires `V8PayloadUnsupportedError`.
  - ~~Era-guarding the contract-state read paths. `queryContractState`,
    `queryDeployContractState`, `queryZSwapAndContractState` and
    `watchForContractState` decode with the v9-only runtime but resolve no era,
    because their GraphQL documents do not select `protocolVersion`. On a v8-era
    network they fail inside the codec — the outcome this ADR exists to remove.
    Closing it needs a query change, so it is deferred rather than
    overlooked.~~ **Resolved.** The query change was made:
    `CONTRACT_STATE_QUERY`, `RAW_CONTRACT_STATE_QUERY`,
    `CONTRACT_AND_ZSWAP_STATE_QUERY` and `CONTRACT_STATE_SUB` all select
    `protocolVersion` as a sibling of the bytes they return
    (`packages/indexer-public-data-provider/src/query-definitions.ts`), so the
    era arrives with the data, per record. ADR-0007 records why that
    per-record answer — and not a head reading — is what dates a read.
  - Branding `V8TxBytes.txBytes` as tag-prefixed bytes behind a smart
    constructor. Free while nothing produces the arm; breaking for every
    producer once v8 support ships.
  - ~~Migration notes in `docs/releases/v5.0.0/breaking-changes.md`.~~
    **Resolved.** That file carries the seam-by-seam narrowing recipe, the
    `unwrapV9` guidance and the v8-arm read surface.
  - ~~`assertNever` is not exported from `midnight-js-utils`.~~ **Resolved.**
    Exported in #1254, which is the change that first needed it: the migration
    guide publishes a narrowing recipe that closes its `switch` with it, so the
    helper is consumer-facing. The framework's own seam narrowings still go
    through `unwrapV9`, and its internal exhaustiveness guards remain inline
    `never` assignments that throw coded errors — `assertNever` is deliberately
    for consumer code, not a replacement for those.

    Two shape decisions came with it. Its `context` parameter is **required**,
    matching `unwrapV9`'s required `seam` rather than the optional `message` of
    its file-neighbours `assertDefined`/`assertUndefined`: the guide instructs
    readers to always pass it, and a required argument is enforced by `tsc` at
    the call site where a documented convention is not. It throws a coded
    `UnhandledUnionMemberError` (`MIDNIGHT_JS_U_UNHANDLED_UNION_MEMBER`) rather
    than a bare `Error`, so a consumer can discriminate it with `hasErrorCode`
    like the rest of the published surface, and so the TROUBLESHOOTING coverage
    gate covers it.

    The thrown message never renders the unhandled value. The arms of these
    unions carry transaction bytes and decoded contract state, so serializing
    the member would copy payloads into every log that catches the error. The
    `context` string carries the diagnostic instead.

## Alternatives considered

**Keep passing bare ledger objects and detect the era by duck-typing.**
Rejected: the two WASM builds expose the same method names, so duck-typing
cannot distinguish them, and `instanceof` does not cross instances.

**Tag with a boolean or a number instead of a string literal union.** Rejected:
a string literal reads correctly at the call site, matches the existing
`LedgerVersion` vocabulary in `protocol`, and extends to a third era without
re-interpreting old values.

**Tie the output era to the input era in the type system**, via conditional
generics or an overload pair on each seam. Rejected for now: the conditional
form cannot be verified inside an implementation body, so every implementer
would need a cast, which this repo forbids; the overload form would force all
provider implementations and every test mock to be restructured. The runtime
check in the contracts flow covers the one caller that matters. Revisit if a
second v9-only flow appears.

**Hardcode `version: 'v9'` on the read path and defer resolution to the dual
decode change.** Rejected: it ships a discriminant that can disagree with the
`protocolVersion` in the same record, which is worse than having no
discriminant — a consumer that narrows on it is actively misled. Resolving now
costs one call per construction site.

**Brand `txBytes` as a nominal `SerializedV8Tx`.** Deferred, not rejected.
Nothing produces the v8 arm yet, so a smart constructor would have no caller.
Recorded here because adding the brand after the arm ships is itself a breaking
change, so it should be a deliberate decision at that point rather than an
oversight.

---

## Amendment — provider-side v8 proving ships (2026-09-05)

The decision above stands unchanged. This note records that one of its accepted
risks rested on a premise that has now expired, and that one follow-up is done.
Nothing in the original text is edited: it remains the record of what was
decided and why, at the time it was decided.

**The accepted stage-erasure risk is now reachable.** The original consequence
notes accept that `V8TxBytes` is identical across the three seams — so an
unproven v8 payload is assignable where a finalized one is expected — and accept
it explicitly "because nothing produces the v8 arm". That premise no longer
holds. `httpClientProofProvider` and `dappConnectorProofProvider` now RETURN the
v8 arm from `proveTx`, so consumer code can hold one and the erasure is
reachable in practice rather than only in principle:

```typescript
const proven = await proofProvider.proveTx({ version: 'v8', txBytes });
if (proven.version === 'v8') {
  await midnightProvider.submitTx(proven); // compiles: balanceTx skipped
}
```

That compiles. On the v9 arm the equivalent does not, because its stage
distinctions survive in the type. The mitigation the original text names —
a phantom type parameter on `V8TxBytes` — is unchanged and is still itself a
breaking change, so it remains a deliberate decision rather than an oversight.
The related deferral recorded under "Brand `txBytes` as a nominal
`SerializedV8Tx`" is affected the same way: it too was deferred on the ground
that nothing produces the arm, and that ground is gone.

Two things currently limit the blast radius, neither of them a type-level
guarantee:

- `createWalletProvider` and `createMidnightProvider` still refuse the v8 arm,
  so the erasure above fails at runtime with `V8PayloadUnsupportedError` rather
  than submitting an unbalanced transaction. A caller supplying its own
  `MidnightProvider` — which is what serving the v8 arm end to end requires —
  loses that accident of protection.
- `packages/contracts` narrows every retained-era response with `requireV8` at
  each seam in order, so the framework's own flow cannot skip a stage.

**Follow-up status.** "Provider-side v8 support, which retires
`V8PayloadUnsupportedError`" is now **partly done**: the two proof providers
implement the v8 arm, so `proveTx` no longer refuses it. The error is NOT
retired, and for the three `create*Provider` adapters the refusal is now
understood as permanent rather than transitional — each lifts a v9-only
implementation into the version-tagged interface, so refusing the v8 arm is the
adapter telling the truth about what it wraps. `balanceTx` and `submitTx` have
no framework-supplied v8 implementation; a consumer needing them implements the
interfaces directly.

One consequence of that split is worth recording because it is invisible from
any type signature: a retained-era transaction wired through the `create*`
adapters now proves successfully and is refused at `balanceTx`, so the refusal
lands after a full proving cycle rather than at the first seam it meets.

---

## Amendment — where the retained proving seam lives (2026-09-07)

Rationale moved out of source comments, per the repo rule that design reasoning
belongs here rather than in the code it describes.

### The seam lives in `packages/protocol`, on a leaf subpath

`proveV8Transaction` is published from `@midnight-ntwrk/midnight-js-protocol/prove`
and `PayloadNotATransactionError` from `.../protocol/errors`.

It was first written into `packages/utils`, which forced three things that the
protocol package does not need:

- `loadLedger8` is exported only from the protocol package ROOT, which also
  re-exports the `ledger`, `compactRuntime`, `compactJs`, `platform` and
  `onchainRuntime` namespaces. Reaching it from another package therefore meant
  either linking all five eagerly or deferring the barrel behind a dynamic
  `import()`.
- That dynamic import is invisible in the source — re-adding a static one would
  restore the cost silently — so it needed a bespoke `dist-laziness` gate in
  `utils` to hold it.
- It added a runtime dependency edge from `dapp-connector-proof-provider` to
  `utils` for one function.

Inside `packages/protocol` the import is an ordinary static one to a sibling
module, the retained runtime still loads only through `loadLedger8`'s own
dynamic `import('../../v8.js')`, and the package's existing laziness gate
already asserts that the v8 chunk is reached from the eager closure *only* by
dynamic import. The bespoke gate was deleted rather than kept.

Publishing it as a LEAF subpath rather than on the root barrel is the same
discipline `./errors` and `./version` follow: a proof provider that needs this
one function should not link the five namespaces the root re-exports.

For the record, one argument originally made for the `utils` placement was
false: `utils` already statically links `.../protocol/ledger` and
`.../protocol/compact-runtime` (see `src/deserialization/typed-wrappers.ts`), so
a static barrel import there would have added `compactJs`, `platform` and
`onchainRuntime` — not, as the comment claimed, everything. A second was also
false: `loadLedger8` is already reached from outside the protocol package by a
static root-barrel import, in `indexer-public-data-provider/src/codec.ts`.

### Bytes on both sides is the contract, not an implementation detail

A retained-era transaction cannot cross a provider boundary as a live object:
the runtime that owns it is loaded lazily and its instances are not
interchangeable with the current era's. Inside the seam the bytes necessarily
become an object — the proof-server protocol is per-CIRCUIT, and it is the
transaction that drives the proving provider one circuit at a time from within
`prove()`.

### The cost model may not come from the caller

The retained ledger ships its own `CostModel` class and its `prove()` checks the
argument against that class across the WASM boundary, so the current era's cost
model is rejected with `expected instance of CostModel`. The seam therefore
takes the cost model from the same `loadLedger8()` result as the transaction
class, and `dappConnectorProofProvider` does not forward its `costModel`
parameter to the retained arm.

A caller *can* construct a retained-era cost model — `./v8` is a published
subpath and `CostModel.initialCostModel()` is a public static — so the reason an
override is not offered is not that it is impossible. It is that pairing the
transaction with its own era's model is the only correct pairing, and an
override would only ever be a way to get it wrong.

### Why a constructor name is bounded and filtered

`PayloadNotATransactionError.notBytes` names the kind of value it refused, and
for a plain object that name is CALLER DATA: `{ constructor: { name: ... } }`
sets it to anything at all, newlines included. Left unbounded it would carry
arbitrary text into an error message and from there into whatever the logger
provider receives. The name is therefore truncated to 32 characters and then
reported only if what remains is a plain identifier — validated AFTER
truncation, so that what is checked is exactly what is emitted.

The same treatment has NOT been applied to `describeVersion` in
`packages/types/src/errors.ts`, which truncates without filtering. That is
pre-existing and tracked separately.

### The proof-server wire envelope is shared across eras, and now measured

`httpClientProvingProvider` builds every `/check` and `/prove` payload with the
current era's `createCheckPayload` / `createProvingPayload` / `parseCheckResult`,
and the retained arm drives the same provider. The retained ledger ships its own
three. `packages/protocol/src/test/era-proving-payload-parity.test.ts` captures a
real proof preimage from each runtime and asserts the two eras' builders emit
byte-identical envelopes for it, in both directions. They do.

That test is the unit-level evidence for reusing the current era's builders. It
is not a substitute for driving a retained-era contract call against a real
proof server, which remains untested.

---

## Amendment — the seams now say what they serve (2026-09-11)

The decision above stands unchanged. This note records that one consequence its
first amendment described has been addressed, by
[ADR-0014](./0014-build-provider-seams-from-per-era-arms.md).

That amendment closed with:

> a retained-era transaction wired through the `create*` adapters now proves
> successfully and is refused at `balanceTx`, so the refusal lands after a full
> proving cycle rather than at the first seam it meets.

It no longer does. The three transaction seams each carry a required
`supportedEras` declaration, and `packages/contracts` reads all three before an
operation starts — so a set whose wallet serves only the current era is refused
with `SeamEraUnsupportedError` before `proveTx` is called at all.

Three points of this ADR are affected, none reversed:

- Point 5, "v9-only components reject the v8 arm loudly", still holds and is
  still the enforcement. `V8PayloadUnsupportedError` is not retired. A
  declaration is a claim by an implementation and nothing verifies it, so the
  narrowing at each seam remains what upholds the arm; the new check only moves
  a KNOWABLE refusal earlier.
- Point 6, "one narrowing helper, not a switch per seam", is extended rather
  than replaced. `unwrapV9` is unchanged and still exported for v9-only
  providers and consumers. `narrowToEraArm` is its generalisation for a provider
  serving more than one era, and it reports the same two errors for the same two
  reasons.
- The `create*Provider` adapters keep their signatures. Each is now a one-line
  call to its arms factory and declares exactly the current era, which is the
  same permanent refusal this ADR's first amendment describes — now stated in
  the type rather than discoverable only by sending a payload.

The stage-erasure risk that amendment records is NOT affected: `V8TxBytes` is
still identical across the three seams. The arms narrow what an implementation
sees, not what the union expresses.
