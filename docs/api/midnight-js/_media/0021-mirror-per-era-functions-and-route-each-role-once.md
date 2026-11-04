# 0021. Mirror the functions of each ledger era, and route each role through one unprefixed function

- Status: Accepted
- Date: 2026-10-30
- Deciders: Szymon Paluchowski
- Related: #1527, #1524, #1526, #1528, #1533, #1539, #1563, #1574, #1576, #1581

## Context

Ledger 10 is coming. At its fork ledger 9 becomes the retained era, and later ledger 8 is removed.
We need a written rule for how the public contracts API is laid out per era, so that the next fork
adds an era and removes an old one without changing the meaning of names that stay.

Today the layout is mixed:

- The high level takes both eras through overloads: `deployContract`, `findDeployedContract`,
  `submitCallTx`, `submitCallTxAsync`, the governance functions, `createCallTxOptions` and
  `createCircuitCallTxInterface`.
- The high-level types follow [ADR-0018](./0018-name-single-ledger-code-after-its-ledger.md): a
  `Ledger8` / `Ledger9` prefix means bound to one ledger, and no prefix means valid for every era.
- The ledger 9 low level still has names without the ledger number (`createUnprovenCallTx`,
  `createUnprovenDeployTx`, `submitDeployTx`, `withContractScopedTransaction`, ...). Ledger 8 has
  no public low level yet. Only the high level has ledger 8 overloads.
- There is no `Ledger8` namespace any more. #1563 moved the ledger 8 types to flat `Ledger8*` names,
  and #1576 removed the namespace; the ledger 8 errors left are flat `Ledger8*Error` names
  ([ADR-0013](./0013-publish-the-retained-era-as-one-namespace.md), amendment of 2026-10-29).

Facts that shape the choice:

- A transaction or a finalized record carries its era as data
  ([ADR-0019](./0019-carry-transactions-as-opaque-era-carrying-handles.md),
  [ADR-0006](./0006-version-tagged-payloads-at-provider-seams.md)). After the fork, a ledger 8
  call produces a ledger 9 keep-state transaction, and the handle says so. So a function that
  takes either era can still have an honest result type. Earlier drafts of this decision (in
  #1527) kept ledger 8 overloads off the low-level functions because a raw transaction result
  would have lied about its era; the handle removes that reason.
- The era of an artifact is read from what the artifact declares
  ([ADR-0012](./0012-read-the-artifact-era-from-what-the-artifact-declares.md)), through
  `resolveArtifactEra`. Today it reads the declared runtime version only for a retained-shape
  artifact; a ledger 9 `CompiledContract` container is placed by its shape (#1526 adds the read).
  It returns a bare `LedgerVersion`, which has no link to the options the caller passed in.
- Some entry points are synchronous (`createCallTxOptions`, `createCircuitCallTxInterface`, the
  governance interface factories). They cannot await `resolveArtifactEra`, and they tell the eras
  apart by the contract's shape (`hasLedger8ContractShape`).

## Decision

### 1. Two layers: a mirror of per-era functions, and one router per role

- **Per-era functions.** Each era has flat functions with the ledger number in the name, in the
  form `verbLedgerNNoun`: `createLedger8UnprovenCallTx`, `createLedger9UnprovenCallTx`,
  `submitLedger8DeployTx`, `submitLedger9DeployTx`, ... There are no namespaces. Each era carries
  only the functions that work for it, and their signatures use only that era's types.
- **Routers.** Each role has one function **without** a ledger prefix: `createUnprovenCallTx`,
  `submitDeployTx`, `deployContract`, `submitCallTx`, ... A router finds the era of its input,
  calls that era's function, and refuses input of an era it does not serve. The refusal is
  `EraMismatchError` with a reason that names the fault
  ([ADR-0017](./0017-error-codes-are-the-contract.md)); #1581 adds the reason
  `'contract-era-unsupported'`.
- An unprefixed name never means "the current era". It means "every era this router serves". So
  it does not change meaning at a fork. This is the same rule ADR-0018 gives for types: no prefix
  means valid for every era.
- dApps use the routers. Era-aware code and tests use the `LedgerN*` functions.

ADR-0018 says, in its amendment of 2026-10-28, that low-level functions serve one era each. After
this decision that holds for the `LedgerN*` functions; the unprefixed low-level names are routers.

### 2. The eras mirror each other

Every era has the same set of functions with the same roles. A user who knows one era's API finds
the other by changing the number. The high level of each era is built from that era's own
low-level functions. What differs between the eras lives only in the per-era functions and the
wrappers around them (#1524): keep-state after the fork, refused deploys, signing-key handling,
scoped transactions.

### 3. What a router routes on

| The router routes on | Functions |
|---|---|
| the artifact era (`resolveArtifactEra`) | the builders (`createUnprovenCallTx`, `createUnprovenDeployTx`, ...), `submitDeployTx`, `deployContract`, `findDeployedContract`, `submitCallTx`, `submitCallTxAsync`, `submitInsertVerifierKeyTx`, `submitRemoveVerifierKeyTx`, `submitReplaceAuthorityTx` |
| the contract's shape (`hasLedger8ContractShape`), synchronously | `createCallTxOptions`, `createCircuitCallTxInterface`, `createCircuitMaintenanceTxInterface`, `createCircuitMaintenanceTxInterfaces`, `createContractMaintenanceTxInterface` |
| the head era, from one head read | `withContractScopedTransaction` |
| the era carried by the input (a transaction handle), checked against one head read | `submitTx`, `submitTxAsync` |
| nothing: one structural check serves every era | `verifyContractState` (the goal; today it is typed to the ledger 9 `ContractState`, and the ledger 8 path uses its own `assertSnapshotVerifierKey`) |

The shape check is enough for the synchronous entry points because they do not pick an era's
pipeline; they only build options or interfaces whose type the artifact already fixes. The work
they lead to goes through a router that reads the artifact era.

A router's declared result is honest because results carry their era.

### 4. Types

As ADR-0018 and its amendments say: `LedgerN*` for one era. An unprefixed type with a contract
parameter picks the era from the contract. An unprefixed type without one is the union of all
eras.

### 5. Inside a router

Every public router, high level and low level, has the same shape: a `switch` on the era closed by
`assertNever` from `utils`, with one flow per era. #1528 does this for the high level, #1574 (#1581)
and #1524 for the low level.

- **A router that serves more than one era: first a typed era request, then the `switch`.**
  Switching on the bare `LedgerVersion` from `resolveArtifactEra` does not narrow `options`. So
  the router first builds a discriminated request,
  `{ era: 'v8'; options: <ledger 8 options> } | { era: 'v9'; options: <ledger 9 options> }` (for
  governance, the same with the compiled contract), and then switches on `request.era`. That
  narrows without casts. The request builder is one small function per input shape, not a general
  flow framework.
- **A router typed for one era switches on the era directly.** While its options are typed for one
  era only, a request narrows nothing, and building one needs an unreachable branch or a cast. The
  low-level routers of #1581 switch on `resolveArtifactEra` (or on the head era for the scoped
  transaction) directly, until #1524 adds the ledger 8 overloads and the request builder.
- **A `switch`, not a table.** A `Record<LedgerVersion, Flow>` cannot give each flow its own option
  type without casts.
- **Where a router may refuse.** Only after the reads that decide the era and before any other
  work. The reads are the artifact runtime version from `zkConfigProvider`, or the one head read of
  `withContractScopedTransaction` or `submitTx` / `submitTxAsync`. The other work is execution,
  proving, private-state or signing-key access, and submission. The era the router read is passed
  on and never read again.
- **Flows are keyed by artifact era only**, as the artifact declares it (#1526).
- **The retained flow takes the head era as a parameter.** It decides keep-state itself. Today that
  is a ledger 8 artifact on a ledger 9 head; at ledger 10 it is a ledger 9 artifact on a ledger 10
  head. There is one flow per artifact era, never one per (artifact era, head era) pair. A flow
  refuses a head era it was not written for: whether a ledger 8 artifact can still run on a
  ledger 10 head is decided when ledger 10 is added, not assumed.
- **A flow calls its era's low-level functions directly, never another router.** So the era is
  resolved once per operation.
- **One head read per operation**
  ([ADR-0007](./0007-never-latch-the-network-head-version.md)). Today the current-era call, deploy
  and builder paths read no head, to save one round trip per call; `submitTx`, `submitTxAsync` and
  `withContractScopedTransaction` do. Whether the other current-era paths should read the head is
  a separate decision.
- **Flows are imported statically.** The retained era's runtime stays lazy inside `protocol`
  ([ADR-0004](./0004-lazy-v8-era-access-via-protocol-subpath.md)); the current era's runtime is
  loaded statically.
- **Cost:** one overload per era (times the private-state variants) on every router. We accept it
  for the single entry point it gives dApps.

### 6. Adding an era

No existing name changes. The steps (the full checklist is #1539):

1. The `LedgerN*` mirror functions and the `LedgerN*` types.
2. The new entry in `RUNTIME_VERSION_TO_ERA`.
3. A `case` in every router, and the request builders' new branch.
4. The flow of the era that was current becomes the retained flow, parametrised by the head era.
5. A handler for the new era in each provider factory
   ([ADR-0014](./0014-build-provider-seams-from-per-era-handlers.md)).
6. The new overloads on the routers, and a new branch in every era-picking type alias.
7. The docs.

### 7. Removing an era

No remaining name changes meaning. The steps (the full checklist is #1539):

1. Delete the era's `LedgerN*` functions and types.
2. Delete its `case` in every router, and its flow.
3. Delete its overloads and its branch in every era-picking type alias.
4. Delete its pipeline and its runtime loader in `protocol`.

An era is removed when contracts deployed before the fork no longer need to be called, not on the
day of the fork.

### 8. Overloads still change by hand, and they have a limit

The router makes the runtime side compiler-checked. It does not remove the per-era overloads, so
the public overload types still change by hand at each fork.

**The limit.** If a ledger 10 artifact has the same TypeScript type as a ledger 9 one (both a
`CompiledContract`), no overload can tell them apart. The router still routes correctly at run
time, but its declared result becomes the union of both eras. The same holds for the shape check:
`hasLedger8ContractShape` cannot tell a ledger 9 container from a ledger 10 one. This is the
trigger: once two eras share an artifact type, the routers can no longer give the exact result
type for them, and code that needs it calls the `LedgerN*` function.

### Names bound to ledger 9 outside the contracts layout

Some public names have no ledger number and are bound to ledger 9. Under point 1 an unprefixed
name cannot mean "the current era", so #1574 (#1581) settles each of them before 5.0.0:

- The provider factories in `types` (each passes `v8: undefined, v9: impl`) get `Ledger9*` names:
  `createLedger9ProofProvider`, `createLedger9WalletProvider`, `createLedger9MidnightProvider`.
- The deserializers in `utils` (their return types come from `protocol/v9`) get `Ledger9*` names:
  `deserializeLedger9ContractState`, `deserializeLedger9CompactContractState`,
  `deserializeLedger9ZswapChainState`, `deserializeLedger9Parameters`.
- `CompiledContract`, `ContractExecutable` and `Contract`, re-exported by `midnight-js` from
  `protocol/v9`, keep their names and move to the era-named subpath `./protocol/v9`. The era is in
  the path, as ADR-0018 (amendment of 2026-10-29) requires for subpaths.
- The low-level `contracts` types that ADR-0018 lists as "Not yet under the rule" (`CallResult`,
  `CallOptions`, `DeployTxOptions`, ...) get `Ledger9*` names.

## Consequences

- **Positive:** an unprefixed name keeps its meaning at every fork. Adding an era adds names and
  removing one deletes names; neither renames.
- **Positive:** a dApp has one entry point per role, at the high level and the low level, and the
  two levels have the same shape.
- **Positive:** the era-specific behaviour lives in one place per era. A new era's flow is a new
  `case`, and `assertNever` makes a forgotten one a build error.
- **Negative:** every router carries one overload per era (times the private-state variants), and
  those overloads change by hand at each fork.
- **Negative:** when two eras share an artifact type, the router's declared result is their union,
  and a caller who needs the exact type has to name the era.
- **Negative:** each era adds one more copy of every low-level function name, next to the router.
- **Follow-ups:** #1574 (ledger 9 names and the low-level routers with a ledger 9 case, in #1581),
  #1524 (the ledger 8 low level, its `case` and the request builder), #1528 (the high-level
  routers), #1526 (read the declared runtime version for ledger 9 artifacts), #1539 (the add-era
  and remove-era checklists).

## Alternatives considered

- **Per-era functions only, no low-level routers.** Rejected: a dApp would have to pick the era
  itself for every low-level call, and the low level would have a different shape from the high
  level.
- **Per-era namespaces (`Ledger8.*`, `Ledger9.*`) with flat names aliasing the current era.**
  Rejected: the flat names would change meaning at every fork, which is a breaking change on
  permanent names. #1563 already moved the types away from namespaces, because a type reachable
  only through a namespace fails declaration emit (TS4023).
- **Era-scoped subpaths (`contracts/ledger8`, `contracts/ledger9`).** ADR-0013 names `./ledger8` as
  the eventual shape for the retained era; this alternative applies it to every era. Removing an
  era would be one folder and one `exports` entry. Rejected: every import of a shared entry point
  would then need to know the era, and `protocol` already keeps the retained era's runtime lazy
  (ADR-0004), so the bundle gain is small.
