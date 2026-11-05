# 0021. Mirror the functions of each ledger era, and route each role through one unprefixed function

- Status: Accepted
- Date: 2026-10-30
- Related: [ADR 0004](./0004-lazy-v8-era-access-via-protocol-subpath.md),
  [ADR 0007](./0007-never-latch-the-network-head-version.md),
  [ADR 0012](./0012-read-the-artifact-era-from-what-the-artifact-declares.md),
  [ADR 0014](./0014-build-provider-seams-from-per-era-handlers.md),
  [ADR 0017](./0017-error-codes-are-the-contract.md),
  [ADR 0018](./0018-name-single-ledger-code-after-its-ledger.md),
  [ADR 0024](./0024-hold-transactions-as-bytes-decoded-by-the-callers-ledger.md)

## Context

`contracts` serves two ledger eras through one public API. At the next fork a new ledger joins, and
later ledger 8 is removed. The public layout must let a fork add an era and remove an old one without
changing the meaning of any name that stays.

Facts that shape the layout:

- A transaction handle and a finalized record carry their era as data
  ([ADR 0024](./0024-hold-transactions-as-bytes-decoded-by-the-callers-ledger.md)). So a function that
  takes either era still has an honest result type.
- The era of an artifact is read from what the artifact declares: `resolveArtifactEra` reads the
  declared `compact-runtime` version through `RUNTIME_VERSION_TO_ERA`, for both artifact shapes, and
  refuses a shape that disagrees with the declared era
  ([ADR 0012](./0012-read-the-artifact-era-from-what-the-artifact-declares.md)). It returns a bare
  `LedgerEra`, which TypeScript cannot link to the options the caller passed in.
- Some entry points are synchronous and cannot await an artifact read.

## Decision

### Two layers

- **Per-era functions** carry the ledger number, in the form `verbLedgerNNoun`:
  `createLedger8UnprovenCallTx`, `createLedger9UnprovenCallTx`,
  `createLedger8UnprovenCallTxFromInitialStates`, `createLedger8UnprovenDeployTx`,
  `createLedger8UnprovenDeployTxFromVerifierKeys` (and their `Ledger9` twins),
  `submitLedger8DeployTx`, `submitLedger9DeployTx`, `withLedger9ContractScopedTransaction`. They are
  flat exports, never namespaces. Each era carries only the functions that work for it, and their
  signatures use only that era's types. A per-era function checks positively that the artifacts
  declare its own era, and refuses any other with `EraMismatchError`, reason
  `'contract-era-unsupported'`. So it keeps refusing correctly when an era is added.
- **Routers** carry no prefix, one per role: `createUnprovenCallTx`, `createUnprovenDeployTx`,
  `submitDeployTx`, `deployContract`, `submitCallTx`, ... An unprefixed name never means "the current
  era"; it means "every era". This is the naming rule of
  [ADR 0018](./0018-name-single-ledger-code-after-its-ledger.md) applied to functions.
- dApps use the routers. Era-aware code and tests use the per-era functions.

### What a router routes on

| Routes on | Routers |
|---|---|
| the artifact era (`resolveArtifactEra`) | `createUnprovenCallTx`, `createUnprovenCallTxFromInitialStates`, `createUnprovenDeployTx`, `createUnprovenDeployTxFromVerifierKeys`, `submitDeployTx`, `deployContract`, `findDeployedContract`, `submitCallTx`, `submitCallTxAsync`, `submitInsertVerifierKeyTx`, `submitRemoveVerifierKeyTx`, `submitReplaceAuthorityTx` |
| the contract's shape (`hasLedger8ContractShape`), synchronously | `createCallTxOptions`, `createCircuitCallTxInterface`, `createCircuitMaintenanceTxInterface`, `createCircuitMaintenanceTxInterfaces`, `createContractMaintenanceTxInterface` |
| the head era, from one head read | `withContractScopedTransaction` (a ledger 8 head is refused with `'scope-on-ledger8-network'`) |
| the era of the transaction handle, checked against one head read | `submitTx`, `submitTxAsync` |
| the era of the state; one check serves both eras | `verifyContractState` |

The shape check is enough for the synchronous entry points because they do not pick a pipeline; they
only build options or interfaces whose type the artifact already fixes. The work they lead to goes
through a router that reads the artifact era.

### Inside a router

- **A `switch` on the era, closed by `assertNever(x, '<router name>')` from `utils`.** A new ledger
  era fails the build at every router that lacks its `case`. A `Record<LedgerEra, Flow>` table is not
  used: it cannot give each flow its own option type without casts.
- **First a typed era request, then the `switch`.** Switching on the bare `LedgerEra` does not narrow
  the options. So the router calls `resolveEraRequest` (options with a `compiledContract`) or
  `resolveContractEraRequest` (the governance functions, which take the contract as an argument).
  Each returns `{ era: 'v8'; options } | { era: 'v9'; options }`, and the `switch` on `request.era`
  narrows without a cast. A compile-time check makes a new era add a variant to both request types.
- **A router refuses only after the reads that decide the era, and before any other work.** The
  reads are the artifact runtime version from `zkConfigProvider`, or the one head read of
  `withContractScopedTransaction`, `submitTx` or `submitTxAsync`. The other work is execution,
  proving, private-state or signing-key access, and submission.
- **The era is read once per operation.** A flow calls its era's functions directly, never another
  router, and the era the router read is passed on, never read again. An operation reads the network
  head at most once ([ADR 0007](./0007-never-latch-the-network-head-version.md)).
- **One flow per artifact era**, never one per (artifact era, head era) pair. The retained flow reads
  the head itself and decides keep-state: today a ledger 8 artifact on a ledger 9 head. A flow refuses
  a head era it was not written for; whether a ledger 8 artifact can run on a later head is decided
  when that ledger is added.
- **Flows are imported statically.** The retained era's runtime stays lazy inside `protocol`
  ([ADR 0004](./0004-lazy-v8-era-access-via-protocol-subpath.md)).

### Adding and removing an era

Adding an era changes no existing name: add the `LedgerN*` functions and types, a row in
`RUNTIME_VERSION_TO_ERA`, a `case` in every router and request builder, a branch in every era-picking
type alias, the router overloads, and a handler key in each provider factory
([ADR 0014](./0014-build-provider-seams-from-per-era-handlers.md)). The flow of the era that was
current becomes the retained flow.

Removing an era changes no remaining name's meaning: delete its `LedgerN*` functions and types, its
`case` and flow in every router, its overloads and alias branches, and its pipeline and runtime loader
in `protocol`. An era is removed when contracts deployed before the fork no longer need to be called,
not on the day of the fork.

## Consequences

- **Positive:** an unprefixed name keeps its meaning at every fork. Adding an era adds names and
  removing one deletes names; neither renames.
- **Positive:** a dApp has one entry point per role, at the high and the low level, with the same
  shape at both.
- **Positive:** era-specific behaviour lives in one flow per era, and a forgotten `case` is a build
  error.
- **Negative:** every router carries one overload per era (times the private-state variants), and
  those overloads change by hand at each fork.
- **Negative:** if a new ledger's artifact has the same TypeScript type as ledger 9's (both a
  `CompiledContract`), no overload can tell them apart, and `hasLedger8ContractShape` cannot either.
  The router still routes correctly at run time, but its declared result becomes the union of both
  eras, and a caller who needs the exact type calls the `LedgerN*` function.
- **Negative:** each era adds one more copy of every low-level function name, next to the router.
- **Follow-ups:** the full add-era and remove-era checklists (#1539).

## Alternatives considered

- **Per-era functions only, no low-level routers.** Rejected. A dApp would have to pick the era for
  every low-level call, and the low level would have a different shape from the high level.
- **Per-era namespaces with flat names aliasing the current era.** Rejected. The flat names would
  change meaning at every fork, and a type reachable only through a namespace cannot be named in
  emitted declarations (TS4023).
- **Era-scoped subpaths (`contracts/ledger8`, `contracts/ledger9`).** Rejected. Every import of a
  shared entry point would need to know the era, and `protocol` already keeps the retained runtime
  lazy, so the bundle gain is small.
