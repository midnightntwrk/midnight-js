# 0018. Name code bound to one ledger after that ledger; keep "current" and "retained" for era-generic code

- Status: Accepted
- Date: 2026-10-16
- Deciders: Szymon Paluchowski
- Related: #1490, #1489, #1533, #1536, #1566

## Context

"Current" and "retained" describe a ledger relative to now: today "current" is ledger 9 and "retained"
is ledger 8. At the next hard fork ledger 9 becomes retained. A name such as `CurrentEraProver`, whose
signature uses ledger-v9 types, would then point at a different ledger than the one it was written for.
Error messages that say "the retained toolchain" have the same problem, and the README never defined
either term.

## Decision

For each name, we ask: is the code behind it bound to one ledger, or does it follow
`CurrentLedgerVersion` / `RetainedLedgerVersion`?

- Bound to one ledger: name it with the `Ledger8*` / `Ledger9*` prefix, as `Ledger8DeployOnLedger9Error`
  already does. String values name the ledger too (`ledger9-artifact-on-ledger8-network`,
  `unwrapped-ledger9-contract`). This applies even when the code fills an era-generic slot:
  `Ledger9Prover` fills `currentEra` and its signature uses ledger-v9 types. At the next fork the slot
  takes a new ledger-named type; `Ledger9Prover` keeps its meaning.
- Era-generic: keep "current" / "retained". Its type comes from `CurrentLedgerVersion` /
  `RetainedLedgerVersion`, so it stays true after the next fork. Examples: `currentEra` / `retainedEras`,
  `RetainedEraEntries`, `RetainedEraProver`.

Error messages name the ledger ("the ledger 8 (pre-fork) Compact toolchain"), never only "retained" or
"current".

## Consequences

- A name bound to one ledger never changes meaning at a fork. At the next fork, only era-generic names
  move, and they move by design.
- The pre-release names were renamed before 5.0.0 final; see section 15 of
  `docs/releases/v5.0.0/breaking-changes.md`.
- "Current era" and "retained era" are defined in the README glossary and on `CURRENT_LEDGER_VERSION` /
  `RetainedLedgerVersion`.

## Amendment — the era-generic handler names are gone (2026-10-26)

Issue #1533. The examples above (`currentEra` / `retainedEras`, `RetainedEraEntries`,
`RetainedEraProver`, and `Ledger9Prover` filling `currentEra`) no longer exist: the provider
factories take one handler per ledger era, keyed `v8` / `v9`
([ADR-0019](./0019-carry-transactions-as-opaque-era-carrying-handles.md)). The rule itself stands.

## Amendment — the rule reaches the protocol subpaths (2026-10-29)

Issue #1536. The rule above covered names; one level down, the import paths did not follow it.
`@midnight-ntwrk/midnight-js-protocol/ledger` and its siblings meant "the current era": in 4.x they
served ledger 8, in 5.0.0 ledger 9, and after the next fork they would serve ledger 10. A type imported
through them changes meaning at every fork.

- Ledger 9 gets era-named subpaths symmetric with `./v8`: `./v9`, `./v9/compact-runtime`,
  `./v9/compact-js`, `./v9/compact-js/effect`, `./v9/compact-js/effect/Contract` and
  `./v9/onchain-runtime`. The scheme is `./vN`, because `./v8` already exists. Ledger 10 adds `./v10`
  and `./v10/*`.
- 5.0.0 removes the unnamed subpaths (`./ledger`, `./compact-runtime`, `./compact-js`,
  `./compact-js/effect`, `./compact-js/effect/Contract`, `./onchain-runtime`) and the root namespaces
  `ledger`, `compactRuntime`, `compactJs` and `onchainRuntime`. Their meaning already changes between
  4.x and 5.0.0, so an alias would keep the name but not the objects behind it; a build error tells the
  consumer to pick a ledger. A `@deprecated` alias would also not warn: the declaration bundler drops
  module-level JSDoc, and TypeScript does not flag a deprecated module path.
- `./compact-js/v8/effect` keeps its path: renaming it would break consumers for no gain.

## Amendment — era-generic type names pick the era from the contract (2026-10-28)

Issue #1536, part B. A ledger 9 result type without a prefix (`FoundContract`, `FinalizedTxData`)
broke the rule above: at the next fork it would have meant ledger 10. Two rules now apply:

- High-level types: the flat name is era-generic. With a contract parameter it is a conditional
  alias over the `Ledger8` / `Ledger9` variants, so it keeps its meaning at a fork; ledger 10 adds a
  branch. Without one it does not exist, and only the `Ledger9*` name remains (replaced by the
  #1566 amendment below).
- Low-level functions serve one era each, so they are named after it (#1527).


## Amendment — a name without a prefix is valid for every era (2026-10-29)

Issue #1566. Types for both eras used two styles: an `AnyEra` prefix (`AnyEraFoundContract`,
`AnyEraTxFailedError`) and no prefix (`FinalizedTxRead`, `FoundDeployTxPublicData`). A reader could
not tell from the name which one was a union. One rule now applies to the high-level result and
handle types of `contracts` and to the recorded-failure classes:

> A `Ledger8` / `Ledger9` prefix means bound to one ledger. No prefix means valid for every era: with
> a contract parameter it picks the era from the contract; without one it is the union of all eras.

This replaces "without one it does not exist" in the amendment above: a ledger 9 type without a
contract keeps its `Ledger9*` name, and the flat name, where it exists, is the union.

- No exported name carries the `AnyEra` prefix. `AnyEraContract` is `AnyContract`;
  `AnyEraMaintenanceTxData` is `FinalizedMaintenanceTxData`; `AnyEraFoundContract<C, L8>` and
  `AnyEraDeployedContract<C, L8>` are `FoundContract<C | L8>` and `DeployedContract<C | L8>`.
- `FinalizedCallTxData<C, PCK>` and `SubmittedCallTx<C, PCK>` keep both type arguments required, as in
  4.x. A call of any contract in either era is `AnyFinalizedCallTxData` / `AnySubmittedCallTx`: it is a
  weaker type, not the same one for every era, because without a contract `result` and
  `nextPrivateState` are `unknown` (the widest ledger 9 instantiation would type them `any`, which
  turns off checking in exactly the handlers that receive either era). A default type argument would
  have given one name three meanings: one era, every circuit of one contract, and any call.
- The `Any` prefix keeps the meaning it already has in `AnyLedger8FinalizedCallTxData`: any contract
  and any circuit. It says nothing about the era by itself. `AnyProvableCircuitId` and
  `AnyPrivateState` (`types`) are still built on the ledger 9 `Contract.Any`.
- `AnyContract` is a constraint. Instantiated with itself, a flat name types the circuit values as
  `any`, because the widest ledger 9 contract is `Contract<any>`; a value of any contract is an
  `Any*` type.
- `ContractProviders` requires its contract. A provider set serves one contract, so a union of the
  eras' sets has no use, and a ledger 9 default would break the rule.
- `TxFailedError` is the base of every recorded-failure class, in both eras. The ledger 9 classes take
  the prefix: `Ledger9TxFailedError`, `Ledger9CallTxFailedError`, `Ledger9DeployTxFailedError`,
  `Ledger9InsertVerifierKeyTxFailedError`, `Ledger9RemoveVerifierKeyTxFailedError`,
  `Ledger9ReplaceMaintenanceAuthorityTxFailedError`. The ledger 8 classes stay in the `Ledger8`
  namespace.
- `AnyContract`, after the `Any` convention and compact-js's `Contract.Any`, rather than `Contract`,
  which a dApp also imports as a namespace from compact-js. Structurally it is `Contract.Any`: the
  compact-js interface accepts a ledger 8 artifact too, and the flat aliases tell the eras apart by
  testing `Ledger8Contract` first. The name is ours because an era-neutral name must not come from a
  `/v9/` import path.
- `FoundDeployTxPublicData` keeps its pair `Ledger8FoundDeployTxPublicData` |
  `Ledger9FinalizedDeployTxPublicData`. The two shapes differ: the ledger 8 record is read from chain
  and carries no `initialContractState`, so `Found` names it correctly.

The lower-level names this change left without a prefix are under the rule since the
2026-10-30 amendment below.

The renames are listed in section 24 of `docs/releases/v5.0.0/breaking-changes.md`.

## Amendment — the example class is a reason now (2026-10-29)

`Ledger8DeployOnLedger9Error`, the example in the decision, is removed. The same fault is
`EraMismatchError` with reason `'ledger8-deploy-on-ledger9-network'`, and the rule holds for the reason
string. See the 2026-10-29 amendment of [ADR 0017](./0017-error-codes-are-the-contract.md).

The `Ledger9*TxFailedError` classes named in the amendment above are gone too: every failed
transaction, in either era, is one `TxFailedError` with an `operation`, and no class has a
`Ledger8` or `Ledger9` failure subclass. The naming rule is unchanged.

## Amendment — every public name bound to ledger 9 (2026-10-30)

The rule now covers the whole public surface of `contracts`, `types`, `utils` and the
`midnight-js` barrel (#1574):

- A type bound to ledger 9 has the `Ledger9` prefix: one constrained to `Contract.Any`, one that
  holds a ledger 9 object, or one re-exported from `protocol/v9`. The build-tools check
  `unprefixedLedger9Types` flags an exported type alias or interface with a type parameter
  constrained to `Contract.Any` that has no ledger prefix and is declared outside `era-aliases.ts`.
- A low-level function exists once per era, named after it (`createLedger9UnprovenCallTx`), and once
  as an unprefixed router per role (`createUnprovenCallTx`). The router reads the era once (the
  artifact's declared runtime, or the network head for a scoped transaction), runs the function of
  that era, and refuses an era it cannot serve with `EraMismatchError` before any other work. Its
  `switch` is closed by `assertNever`, so a new ledger version fails the build at every router.
  Internal pipelines call the per-era function, never the router, so the era is still read once per
  operation.
- A provider set is `MidnightProviders` in both eras. `SubmitTxProviders<C, PCK>` picks the era from
  its contract. `submitTx` and `submitTxAsync` take a transaction of either era, so they take a
  provider set of either era and no contract type parameter: TypeScript cannot infer a contract
  from a conditional type, and per-era overloads would make `flag ? submitTx : submitTxAsync`
  uncallable.
- The barrel publishes the ledger 9 runtime names under `./protocol/v9` and the namespace
  `ledger9Protocol`, as the `protocol` package names its subpaths.

Without a prefix stay `AnyProvableCircuitId` and `AnyPrivateState` (they reduce to `string` and
`any`, pinned by a type test), the every-era bases in `types`, and era-neutral names that have no
contract parameter and hold no ledger object. `UnsubmittedDeployTxPublicData` holds a live ledger 9
`ContractState` and is left for the follow-up of ADR 0020.

The renames are listed in section 26 of `docs/releases/v5.0.0/breaking-changes.md`.
