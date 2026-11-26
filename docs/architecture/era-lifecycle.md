# Adding and removing a ledger era

Two checklists: one for a hard fork that brings a new ledger, one for dropping an old ledger.
Each step names the file and says what catches a missed step.

| Enforced by | Meaning |
|---|---|
| **compiler** | A missed step fails `tsc`. |
| **lint** | The ESLint `ERA_LITERAL` gate flags it; each known site carries an `eslint-disable` comment. |
| **test** | A unit test fails. |
| **manual** | Nothing catches it. Check it by hand. |

The rules behind the checklists are in [ADR 0021](../adr/0021-mirror-per-era-functions-and-route-each-role-once.md)
(per-era functions and routers), [ADR 0018](../adr/0018-name-single-ledger-code-after-its-ledger.md)
(naming), [ADR 0014](../adr/0014-build-provider-seams-from-per-era-handlers.md) (provider handlers)
and [ADR 0004](../adr/0004-lazy-v8-era-access-via-protocol-subpath.md) (lazy loading of an older era).

## Add an era

A new era is always added as the **current** era: the one `protocol` links eagerly. The era that
was current becomes an older era, loaded lazily. Do the three edits in
`packages/protocol/src/lib/shared/ledger-version.ts` together:

- add the era to `LEDGER_ERAS`;
- set `CURRENT_LEDGER_ERA` to it;
- add the previous current era to the deprecated `RETAINED_LEDGER_ERAS`.

Adding the era without making it current fails the gate in `ledger-version.ts`: every era that is
not current counts as older.

### What the compiler does not tell you

After the three edits the compiler lists every era table (below). It does **not** flag the code that
treats the previous current era as current. That code is bound to its ledger by name (`Ledger9*`
functions, the eager `./v9` subpath, guards such as `requireLedger9Contract` and `resolveScopeEra`)
and still type-checks. In the dry run, setting `CURRENT_LEDGER_ERA = 'v10'` added type errors only
in tests, none in production source.

So the main work of a fork is a decision, not a table: what the previous current era's pipeline does
under the new head. Ledger 8 answers it today with its own pipeline (`ledger8-pipeline.ts`,
`ledger8-entry.ts`, `ledger8-scope.ts`) that reads the head and runs keep-state. Make this decision
before the code work starts, and decide at the same time whether the oldest era stays.

### Checklist

| # | Step | Where | Enforced by |
|---|---|---|---|
| 1 | Era constants (see above) | `protocol/src/lib/shared/ledger-version.ts` | compiler (for the older-era list) |
| 2 | Ledger, on-chain runtime and `compact-runtime` packages of the new era; keep the previous era's packages | `packages/protocol/package.json`, root `package.json` `resolutions`; run `yarn constraints` | manual |
| 3 | Era module and its subpaths (`./vN`, `./vN/compact-js`, `./vN/compact-runtime`, `./vN/onchain-runtime`); rollup builds one entry per `exports` key | `protocol/src/lib/vN/`, `protocol/src/vN*.ts`, `protocol/package.json` `exports` | manual |
| 4 | Previous current era becomes lazy: its loader slot and its row in the bundle laziness test | `protocol/src/lib/era/load-era.ts`, `protocol/src/test/dist-laziness.test.ts` | compiler |
| 5 | Node major → era | `NODE_MAJOR_TO_LEDGER`, `protocol/src/version.ts` | compiler |
| 6 | State tags (contract state, ledger parameters, zswap state) | `protocol/src/lib/shared/state-tags.ts` | compiler |
| 7 | Transaction tags and per-stage decoders | `protocol/src/lib/shared/transaction-tags.ts`, `protocol/src/lib/shared/ledger-transaction.ts` | compiler |
| 8 | State decoders | `protocol/src/lib/era/envelope.ts` | compiler |
| 9 | "Supported eras" lists in error messages | `protocol/src/errors.ts` | test (`protocol/src/test/errors.test.ts`) |
| 10 | Era-keyed records in `types`: error messages, provider handler records, era entries, state tags | `types/src/errors.ts`, `proof-provider.ts`, `wallet-provider.ts`, `midnight-provider.ts`, `internal/read-era-entries.ts`, `serialized-state.ts`, `versioned.ts` | compiler |
| 11 | State version readers in `utils` | `utils/src/contract-state-version.ts`, `utils/src/ledger-parameters-version.ts`, `utils/src/deserialization/typed-wrappers.ts` | compiler |
| 12 | Compact runtime version → era | `RUNTIME_VERSION_TO_ERA`, `contracts/src/internal/era.ts` | compiler |
| 13 | Artifact/head pairing table | `ERA_PAIRING`, `contracts/src/internal/era.ts` | compiler |
| 14 | A `case` in every router and era request builder | `contracts/src/transaction.ts`, `contracts/src/internal/era.ts`, `contracts/src/internal/transaction.ts`, `contracts/src/era-results.ts`, `contracts/src/find-deployed-contract.ts`, `contracts/src/submit-tx.ts` | compiler (`assertNever`) |
| 15 | `LedgerN*` functions and types for the new era | `contracts/src/` | manual |
| 16 | Router overloads, one per era, and a branch in every era-picking type alias | `contracts/src/`, `contracts/src/era-aliases.ts` (see [ADR 0021](../adr/0021-mirror-per-era-functions-and-route-each-role-once.md)) | manual |
| 17 | Published-name checks: the `V8` / `V9` spelling rule and `unprefixedLedger9Types` name the eras in regexes | `build-tools/published-names.mjs` | manual |
| 18 | Era-literal guards: review each one for what it does once its era is older | `rg -n --glob '!**/test/**' --glob '!**/*.test*.ts' "eslint-disable.*no-restricted-syntax" packages/*/src testkit-js/*/src` (some hits are the unsafe-cast gate) | lint (flags the site, not the decision) |
| 19 | Error messages written for two eras: `'unrecognised-result-era'` ("naming neither pipeline") and `'contract-era-unsupported'` ("Ledger8 or Ledger9 … both eras") | `contracts/src/errors.ts` | manual |
| 20 | Provider handlers per era | `http-client-proof-provider`, `dapp-connector-proof-provider`, `indexer-public-data-provider/src/codec.ts`, `testkit-js/testkit-js/src/wallet/` | compiler |
| 21 | ESLint import gates: the previous era's subpath gets the same gate `./v8` has today; the "Import from …/v9" messages name the new era | `eslint.config.mjs` | manual |
| 22 | Barrel subpath of the current era (`./protocol/v9` today) | `packages/midnight-js/package.json` `exports` | manual |
| 23 | Compact toolchain of the new era | `.envrc` `COMPACTC_VERSION`, then `yarn turbo compact` | manual |
| 24 | Fixtures compiled with the previous era's toolchain (today `counter-016`, `coin-receiver-016`, `private-counter-016`) and the twin builder | `testkit-js/testkit-js/src/fixtures/hf/`, `consumer-e2e/build-ledger8-twins.mjs` | manual |
| 25 | Environment of the previous era: node, indexer and proof server images | `testkit-js/env/v8era.env` (one file per older era) | manual |
| 26 | Fork-crossing stack and lane | `testkit-js/compose-fork.yml`, `.github/workflows/ci-hardfork.yml`, [fork-e2e-environment.md](./fork-e2e-environment.md) | manual |
| 27 | Docs: ADRs that name the current era, release notes, `breaking-changes.md`, migration guide, `llms.txt` "Ledger Eras and the Fork Window" | `docs/adr/`, `docs/releases/`, `llms.txt` | manual |

## Remove an era

Remove an era in a major release, when contracts deployed before its fork no longer need to be
called. Not on the day of the fork.

| # | Step | Where | Enforced by |
|---|---|---|---|
| 1 | Remove the era from `LEDGER_ERAS` | `protocol/src/lib/shared/ledger-version.ts` | manual (starts the compiler list) |
| 2 | Delete its row in every era table from the add checklist (steps 4–14 and 20) | as above | compiler |
| 3 | Delete its row in `RUNTIME_VERSION_TO_ERA` | `contracts/src/internal/era.ts` | compiler (since #1620) |
| 4 | Delete its pipeline, flows, `LedgerN*` functions and types, and router overloads | `contracts/src/` (`ledger8-*.ts` for ledger 8) | compiler for the `case`s; manual for the rest |
| 5 | Delete its era module, loader and subpaths | `protocol/src/lib/vN/`, `protocol/src/vN*.ts`, `protocol/package.json` `exports` | manual |
| 6 | Delete its packages and `resolutions` entries; run `yarn constraints` | `packages/protocol/package.json`, root `package.json` | manual |
| 7 | Delete its ESLint import gate | `eslint.config.mjs` | manual |
| 8 | Delete its fixtures, twins, env file and `.vNera` e2e tests | `testkit-js/`, `consumer-e2e/` | manual |
| 9 | Delete or rework the fork lane | `.github/workflows/ci-hardfork.yml`, `testkit-js/compose-fork.yml` | manual |
| 10 | Remove the deprecated `RetainedLedgerEra` / `RETAINED_LEDGER_ERAS` exports (first major release after [ADR 0026](../adr/0026-drop-the-retained-era-term.md)) | `protocol/src/lib/shared/ledger-version.ts` | manual |
| 11 | Docs: breaking changes, migration guide, ADRs and package docs about the era | `docs/`, `packages/*/docs/` | manual |

## Dry run

Do this before a fork to see the real size of the work. Use a throwaway branch.

1. Build everything once, including `testkit-js` (without it `testkit-js-e2e` reports unrelated
   `TS2307` errors): `yarn turbo run build`.
2. Make the three edits from [Add an era](#add-an-era) with a fake era name.
3. Rebuild with `yarn turbo run build --force --filter='./packages/*'`. Downstream packages read
   `protocol/dist/*.d.ts`, not the sources, so `tsc` alone shows nothing downstream.
4. Run `tsc --noEmit --composite false -p <dir>/tsconfig.json` for every `packages/*` and
   `testkit-js/*` directory.

Do not trust the exit code of `yarn build`: rollup prints type errors as warnings and exits 0.

The dry run for ledger 10 (#1539) gave 140 type errors, 66 of them in 29 production files, all in the
"compiler" rows above.
