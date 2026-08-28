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
   return types. Both errors carry a stable `code` from the registry in
   `@midnight-ntwrk/midnight-js-utils` and a closed `seam` identifier.

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
   assignment in each `default` branch, and the compile-time bridge in point 8,
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
  are covariant. Consumers must narrow on `version` for a v8 arm that no
  provider produces yet, so the narrowing is currently required but unreachable.
  Resolving the discriminant means the read path now throws on networks running
  node 1.x or 0.x instead of silently returning an undecodable record.

- **Follow-ups.**
  - Dual decode: teach the read path to deserialize the v8 arm so
    `FinalizedTxDataV8` gains a producer. Until then a v8-era record is a
    loud failure, not a value.
  - Provider-side v8 support, which retires `V8PayloadUnsupportedError`.
  - Migration notes in `docs/releases/v5.0.0/breaking-changes.md`.
  - `assertNever` left `midnight-js-utils` with this change: the seam
    narrowings go through `unwrapV9` and the exhaustiveness guards are inline
    `never` assignments, so it had no thrower. It returns with the change that
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
