---
title: BarrelPublishedSurface
---

# What the barrel publishes, and what importing it costs

`@midnight-ntwrk/midnight-js` is the front door: the package a dApp developer
installs first and imports without thinking about layering. Two decisions
follow from that and are recorded here rather than in the source, because both
are arguments rather than instructions — which names qualify for the top level,
and which protocol entry points the barrel is allowed to reach for.

## The four namespaces, plus a named vocabulary

The bulk of the surface is four namespaces — `contracts`, `networkId`, `types`,
`utils` — each a whole package. Alongside them sits one group of *named*
exports: the ledger era vocabulary.

The reason it is named rather than namespaced is not import cost. Measured on
the checkout that introduced it, the barrel took ~148.0 ms to import before the
change, ~147.1 ms after it, and ~148.0 ms with a wholesale
`export * as protocol` instead. Those numbers are indistinguishable, and they
are indistinguishable for a reason worth writing down: protocol's root barrel
is *already* on every barrel consumer's eager path, because
`packages/contracts/src/internal/ledger8-entry.ts` statically imports
`loadLedger8Engine` from it. Importing protocol's root after the barrel costs
~0.11 ms — it is already fully loaded.

So the shape was decided on two other grounds:

- The cost equality is an accident of `contracts` reaching for the root.
  `export * as protocol` would convert that accident into a load-bearing
  constraint, blocking the very optimisation someone will eventually want.
- A wholesale namespace would publish `loadLedger8`, `loadLedger8Engine`,
  `ledger` and `onchainRuntime` from the barrel — the opposite of keeping the
  retained-era runtime off the eager path.

## Which names qualify

A value is published here when a consumer needs it to say which era produced a
payload or a record, or to handle the failure when that resolution has no
answer.

A **type** is published when it is named in the public shape of a value
published here — a parameter of an exported function, its return type, or a
public field of an exported error class. That rule is why
`VersionResolutionPath` is present (the error's `path`) and why
`RetainedEraSubpath`, `ComposeStage` and `ComposeOption` came in with the
classes whose payloads name them.

Two deliberate exclusions:

- **`protocolVersionToLedger`.** Its own documentation says most call sites
  should not call it directly, and its `path` parameter defaults to
  `'construct'`. A consumer holding a record's `protocolVersion` naturally
  writes `protocolVersionToLedger(record.protocolVersion)`, gets an error
  tagged `construct`, and a handler written for the `read` code silently does
  not fire. `versionOfRecord` and `networkHeadVersion` cover both paths and tag
  each one automatically, so the raw resolver adds a footgun and no capability.
- **`ProtocolErrorCode`.** Nothing on this surface names it:
  `UnknownProtocolVersionError.code` is declared as the two-member literal
  union, not the wide alias, so a `switch` over `PROTOCOL_ERROR_CODES` members
  type-checks without it. A consumer who wants the union as a *declaration* can
  reach `utils.MidnightJsErrorCode`, which is already published and is a strict
  superset.

## Error codes travel with their classes

`PROTOCOL_ERROR_CODES` is published whole. That adds no information a consumer
did not already have — `utils.MIDNIGHT_JS_ERROR_CODES` already aggregates every
protocol code, and `utils` is one of the four namespaces — but it gives named
members to discriminate on instead of hand-written strings.

Publishing codes alone was not enough. `contracts` calls into the retained-era
pipeline from public entry points without wrapping what it throws, so these
protocol errors reach a barrel consumer directly:

| Class | Raised from | Payload the consumer needs |
|---|---|---|
| `Ledger8RuntimeMissingError` | `lib/v8/load.ts`, `lib/v8/load-engine.ts`, via `contracts/src/internal/ledger8-entry.ts` | `subpath` — which chunk failed |
| `ComposeFailedError` | `lib/shared/assemble-call.ts` and the era compose legs | `version`, `stage`, `circuitId` |
| `ComposeOptionError` | `lib/shared/compose-options.ts` and the era adapt legs | `version`, `option` |
| `StateDecodeFailedError` | `lib/shared/contract-state.ts` | `version` |
| `UnknownLedgerVersionError` | `contracts/src/internal/era.ts`, `lib/era/load-era.ts` | `requestedVersion` |

`hasErrorCode` narrows only to `Error & { code }`, so without the class a
consumer could detect one of these and then not read the field that decides the
remediation — `Ledger8InstanceMismatchError` builds its whole "run `yarn why`
on these packages" advice out of `axis`. Reading it would have required a cast,
which this repo does not accept. Publishing each class next to its code is what
closes that.

The remaining codes in the table have live throwers too, but deeper inside the
v8 conversion pipeline; their classes stay behind until a consumer has a reason
to branch on one. Note that the comment in `packages/utils/src/error-codes.ts`
claiming `LEDGER8_INSTANCE_MISMATCH`, `DOWN_CONVERT_FAILED` and
`MERKLE_NOT_REHASHED` have no thrower is stale — all three are thrown from
`lib/v8/instance-guard.ts` and `lib/v8/down-convert.ts`.

## Which protocol entry points the barrel may reach for

The vocabulary comes off the `protocol/version` and `protocol/errors` leaf
subpaths. `version` reaches exactly `errors` and the `ledger-version`
declaration the two share, and neither pulls anything further at runtime.
Protocol's root barrel by contrast eagerly pulls the v9 ledger,
onchain-runtime, compact-js, compact-runtime and platform bindings.

Stated plainly, because the distinction is easy to lose: **importing the barrel
is not cheap today.** It loads on the order of a hundred modules and
instantiates the v9 ledger and onchain-runtime WASM artifacts, because
`contracts` pulls protocol's root. What the leaf subpaths buy is that the
*barrel itself* does not add a second, direct pin of that cost — so shaking it
out later stays possible instead of becoming a breaking change.

The retained pre-fork (v8) runtime is a different matter, and the promise there
is absolute: it is absent from the barrel's static closure entirely, reached
only through the loaders that dynamically import it. There is no `protocol/v8`
re-export in any form. The mechanism is decided in
`docs/adr/0004-lazy-v8-era-access-via-protocol-subpath.md`; this document does
not restate it.

Both halves are held by `src/test/dist-laziness.test.ts`, which walks the built
static closure. Without it, repointing the re-exports at protocol's root would
look identical in review, typecheck clean, and leave every other test green.
