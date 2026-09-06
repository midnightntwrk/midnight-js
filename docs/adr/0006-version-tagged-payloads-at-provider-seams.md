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
  - Dual decode: teach the read path to deserialize the v8 arm so
    `FinalizedTxDataV8` gains a producer. Until then a v8-era record is a
    loud failure, not a value.
  - Provider-side v8 support, which retires `V8PayloadUnsupportedError`.
  - Era-guarding the contract-state read paths. `queryContractState`,
    `queryDeployContractState`, `queryZSwapAndContractState` and
    `watchForContractState` decode with the v9-only runtime but resolve no era,
    because their GraphQL documents do not select `protocolVersion`. On a v8-era
    network they fail inside the codec — the outcome this ADR exists to remove.
    Closing it needs a query change, so it is deferred rather than overlooked.
  - Branding `V8TxBytes.txBytes` as tag-prefixed bytes behind a smart
    constructor. Free while nothing produces the arm; breaking for every
    producer once v8 support ships.
  - Migration notes in `docs/releases/v5.0.0/breaking-changes.md`.
  - `assertNever` is not exported from `midnight-js-utils`: the seam
    narrowings go through `unwrapV9` and the exhaustiveness guards are inline
    `never` assignments, so it has no thrower. It was added and removed inside
    this unreleased feature stack, so no released version ever carried it and
    there is nothing for a consumer to migrate. It arrives with the change that
    first needs it.

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
