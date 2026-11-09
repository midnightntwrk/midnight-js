# 0018. Name code bound to one ledger after that ledger, and leave code valid for every era unprefixed

- Status: Accepted
- Date: 2026-10-16
- Related: [ADR 0017](./0017-error-codes-are-the-contract.md),
  [ADR 0021](./0021-mirror-per-era-functions-and-route-each-role-once.md)

## Context

"Current" and "retained" describe a ledger relative to now: today the current era is ledger 9 and
the retained era is ledger 8. At the next hard fork ledger 9 becomes retained. A name such as
`CurrentEraProver` whose signature uses ledger 9 types would then point at a different ledger than
the one it was written for. An import path such as `protocol/ledger`, or an unprefixed result type
such as `FoundContract` that means "ledger 9", has the same problem: it silently changes meaning at
every fork.

A reader must also be able to tell from a name alone whether it is bound to one ledger or works for
every era.

Two TypeScript facts limit the options. A type reachable only through a namespace re-export cannot
be named in emitted declarations (TS4023), so a dApp built with `declaration: true` cannot export a
value inferred from it. And a `@deprecated` alias on a module path does not warn.

## Decision

Each public name answers one question: is the code behind it bound to one ledger, or valid for every
era?

1. **Bound to one ledger: the `Ledger8` / `Ledger9` prefix.** This covers types, interfaces, classes
   and functions in `contracts`, `types`, `utils`, `protocol` and the `midnight-js` barrel. A type is
   bound to ledger 9 when it is constrained to `Contract.Any`, holds a ledger 9 object, or is
   re-exported from `protocol/v9`. Examples: `Ledger9FoundContract`, `Ledger8FoundContract`,
   `Ledger9CallResult`, `createLedger9UnprovenCallTx`, `createLedger9ProofProvider`,
   `deserializeLedger9ContractState`, `Ledger8SigningKeyError`. The era is always spelled `Ledger8` /
   `Ledger9`, never `V8` / `V9`, and it is a prefix, never a suffix.
2. **All names are flat exports.** There is no `Ledger8` or `Ledger9` namespace, because a namespace
   member cannot be named in emitted declarations (TS4023).
3. **No prefix: valid for every era.** With a contract parameter, the name is a conditional alias
   that picks the era from the contract, testing `Ledger8Contract` first (a ledger 8 artifact also
   satisfies `Contract.Any`): `FoundContract<C>`, `DeployedContract<C>`, `FinalizedCallTxData<C, PCK>`,
   `SubmitTxProviders<C, PCK>`, `ContractProviders<C, PCK>`. Without a contract parameter, it is the
   union of every era: `FinalizedMaintenanceTxData`, `FoundDeployTxPublicData`, `FinalizedTxRead`.
   The conditional aliases and `FinalizedMaintenanceTxData` live in
   `packages/contracts/src/era-aliases.ts`, `FoundDeployTxPublicData` in
   `packages/contracts/src/tx-model.ts` and `FinalizedTxRead` in `packages/types/src/versioned.ts`.
   A new ledger adds one branch to each.
4. **`Any` means any contract and any circuit**, never "any era" by itself. `AnyContract` is the
   constraint `Ledger8Contract | Ledger9Contract`. A call of any contract in either era is
   `AnyFinalizedCallTxData` / `AnySubmittedCallTx`: a weaker type whose `result` and
   `nextPrivateState` are `unknown`, because the widest ledger 9 instantiation would type them `any`
   and turn off checking. `AnyLedger8FinalizedCallTxData` is any ledger 8 call. `AnyProvableCircuitId`
   and `AnyPrivateState` in `types` stay unprefixed; they reduce to `string` and `any`.
5. **Functions follow the same rule.** A low-level function exists once per era with the prefix
   (`createLedger9UnprovenCallTx`) and once as an unprefixed router (`createUnprovenCallTx`) that
   serves every era. [ADR 0021](./0021-mirror-per-era-functions-and-route-each-role-once.md) describes
   the layout and the routers.
6. **Import paths name the era.** `protocol` publishes `./v8` and `./v9`, with `./v9/compact-runtime`,
   `./v9/compact-js`, `./v9/compact-js/effect`, `./v9/compact-js/effect/Contract` and
   `./v9/onchain-runtime`. A new ledger adds `./v10` and `./v10/*`. There is no unnamed subpath that
   means "the current era". The `midnight-js` barrel publishes the ledger 9 runtime names under
   `./protocol/v9` and the namespace `ledger9Protocol`. `protocol` keeps `./compact-js/v8/effect`.
7. **Era-generic code may say "current" and "retained"** only when its type follows the era table
   (`CurrentLedgerEra`, `RetainedLedgerEra`, `CURRENT_LEDGER_ERA`, `RETAINED_LEDGER_ERAS`), so it stays
   true after the next fork. The README glossary defines both terms.
8. **Strings name the ledger too.** Error messages say "the ledger 8 (pre-fork) Compact toolchain",
   never only "retained" or "current". Reason strings name the ledger: `EraMismatchError` reasons such
   as `'ledger8-deploy-on-ledger9-network'` and `'ledger9-artifact-on-ledger8-network'`.
9. **Tests enforce it.** The `published-names.test.ts` of each published package uses
   `build-tools/published-names.mjs`:
   - `namingViolations` flags a published name that spells the era `V8` / `V9`, a type or class name
     that ends with the era, and a name containing `seam` or the word `arm` / `arms`.
   - `unprefixedLedger9Types` (run for `types` and `contracts`) flags an exported type alias or
     interface with a type parameter constrained to `Contract.Any` or `Ledger9Contract` that has no
     ledger prefix and is declared outside `era-aliases.ts`.

## Consequences

- **Positive:** a name never changes meaning at a fork. Adding an era adds names and alias branches;
  removing one deletes names. No name is renamed.
- **Positive:** a reader can tell from the name alone whether code is bound to one ledger.
- **Positive:** every type a dApp infers can be named in its emitted declarations.
- **Negative:** each era adds a copy of every per-era name, and every era-picking alias changes by
  hand at each fork.
- **Negative:** inside a generic function `C` is unknown, so an era-picking alias stays unresolved;
  generic code names the era.
- **Negative:** the `unprefixedLedger9Types` test matches the constraint by its source text. A type
  bound to ledger 9 only through a member is not seen, and review has to catch it.

## Alternatives considered

- **Name single-ledger code "current" / "retained".** Rejected. The name would point at a different
  ledger after every fork.
- **Unprefixed names mean the current era.** Rejected for the same reason: a permanent name would
  change meaning at each fork.
- **Per-era namespaces (`Ledger8.X`).** Rejected. A type reachable only through a namespace re-export
  cannot be named in emitted declarations (TS4023).
- **An `AnyEra` prefix for types valid in every era.** Rejected. Two styles for one meaning made it
  impossible to tell a union from a single-era name; no prefix is shorter and means one thing.
- **Keep the unnamed `protocol` subpaths as `@deprecated` aliases.** Rejected. Their objects change
  between eras, so an alias keeps the name but not the meaning, and a deprecated module path does not
  warn.
