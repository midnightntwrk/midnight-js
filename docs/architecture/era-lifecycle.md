# Adding and removing a ledger era

Two checklists: one for a hard fork that brings a new ledger, one for dropping an old ledger.
Each step names the file and says what catches a missed step.

| Enforced by | Meaning |
|---|---|
| **compiler** | A missed step fails `tsc -p <package>/tsconfig.json`. Test files count: `yarn build` does not type-check them. |
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

Adding the era without making it current fails the check next to `RETAINED_LEDGER_ERAS`: every era
that is not current counts as older. This check goes away with that export (step 10 of
[Remove an era](#remove-an-era)).

### What the compiler does not tell you

Adding the era makes the compiler list every era table (below). Making it current on top of that
adds no type errors in production source, only in tests. The code that treats the previous current
era as current is bound to its ledger by name (`Ledger9*` functions, the eager `./v9` subpath, guards
such as `requireLedger9Contract` and `resolveScopeEra`) and still type-checks.

So the main work of a fork is a decision, not a table: what the previous current era's pipeline does
under the new head. Ledger 8 answers it today with its own pipeline (`contracts/src/internal/ledger8-*.ts`)
that reads the head and runs keep-state. Make this decision before the code work starts, and decide
at the same time whether the oldest era stays.

### Checklist

| # | Step | Where | Enforced by |
|---|---|---|---|
| 1 | Era constants (see above) | `protocol/src/lib/shared/ledger-version.ts` | manual; the older-era list: compiler |
| 2 | Ledger, on-chain runtime and `compact-runtime` packages of the new era; keep the previous era's packages | `packages/protocol/package.json`, `testkit-js/testkit-js/package.json`, `testkit-js/testkit-js-e2e/package.json`, root `package.json` `resolutions`; run `yarn constraints` | manual |
| 3 | Era module and its subpaths (`./vN`, `./vN/compact-js`, `./vN/compact-js/effect`, `./vN/compact-js/effect/Contract`, `./vN/compact-runtime`, `./vN/onchain-runtime`); rollup builds one entry per `exports` key | `protocol/src/lib/vN/`, `protocol/src/vN*.ts`, `protocol/package.json` `exports` | manual |
| 4 | Previous current era becomes lazy: a slot in its loader, a row in the bundle laziness table, and no static import left | `protocol/src/lib/era/load-era.ts`, `protocol/src/test/dist-laziness.test.ts` | compiler for the slot and the row; test (`dist-laziness`) for the laziness |
| 5 | Node major → era | `NODE_MAJOR_TO_LEDGER`, `protocol/src/version.ts` | compiler |
| 6 | State tags (contract state, ledger parameters, zswap state). The state readers in `types` and `utils` loop over this table and need no edit | `protocol/src/lib/shared/state-tags.ts` | compiler |
| 7 | Transaction tags and per-stage decoders | `protocol/src/lib/shared/transaction-tags.ts`, `protocol/src/lib/shared/ledger-transaction.ts` | compiler |
| 8 | State decoders | `protocol/src/lib/era/envelope.ts` | compiler |
| 9 | "Supported eras" lists in error messages | `protocol/src/errors.ts` | test (`protocol/src/test/errors.test.ts`) |
| 10 | Era-keyed records in `types`: error messages, era entries, and a read variant per era | `types/src/errors.ts`, `types/src/internal/read-era-entries.ts`, `types/src/midnight-types.ts` (checked in `versioned.ts`) | compiler |
| 11 | Typed state readers of the new era (`deserializeLedger9*` today) | `utils/src/deserialization/typed-wrappers.ts` | manual |
| 12 | Compact runtime version → era | `RUNTIME_VERSION_TO_ERA`, `contracts/src/internal/era.ts` | compiler |
| 13 | Artifact/head pairing table | `ERA_PAIRING`, `contracts/src/internal/era.ts` | compiler |
| 14 | A `case` in every router and era request builder | every `contracts/src` file with a `switch` closed by `assertNever` (`rg -l assertNever packages/contracts/src`), and `era-results.ts` | compiler |
| 15 | `LedgerN*` functions and types for the new era | `contracts/src/` | manual |
| 16 | Router overloads, one per era, and a branch in every era-picking type alias | `contracts/src/`, `contracts/src/era-aliases.ts` (see [ADR 0021](../adr/0021-mirror-per-era-functions-and-route-each-role-once.md)) | manual |
| 17 | Published-name checks: the `V8` / `V9` spelling rule and `unprefixedLedger9Types` name the eras in regexes | `build-tools/published-names.mjs` | manual |
| 18 | Era-literal guards: decide what each one does once its era is older. Lint stops new comparisons, but every existing one already carries an `eslint-disable`, so lint reports nothing at a fork | `rg -n --glob '!**/test/**' --glob '!**/*.test*.ts' "eslint-disable.*no-restricted-syntax" packages/*/src testkit-js/*/src` (some hits are the unsafe-cast rule) | manual |
| 19 | Error reasons and messages written for the 8 → 9 fork (every `'ledger8-*'` and `'ledger9-*'` reason, `'unrecognised-result-era'`, `'contract-era-unsupported'`) | `contracts/src/errors.ts` | manual |
| 20 | Provider handlers per era | `types/src/proof-provider.ts`, `wallet-provider.ts`, `midnight-provider.ts`, `http-client-proof-provider`, `dapp-connector-proof-provider`, `indexer-public-data-provider/src/codec.ts`, `testkit-js/testkit-js/src/wallet/` | compiler |
| 21 | ESLint import gates: the previous era's subpath gets the same gate `./v8` has today; the "Import from …/v9" messages name the new era | `eslint.config.mjs` | manual |
| 22 | Barrel subpath of the current era (`./protocol/v9` today) | `packages/midnight-js/src/protocol/`, `packages/midnight-js/package.json` `exports` | manual |
| 23 | Compact toolchain of the new era | `.envrc` `COMPACTC_VERSION`, then `yarn turbo compact` | manual |
| 24 | Fixtures and twins compiled with the previous era's toolchain (today `counter-016`, `coin-receiver-016`, `private-counter-016`) | `testkit-js/testkit-js/src/fixtures/hf/`, `consumer-e2e/build-ledger8-twins.mjs`, `consumer-e2e/personas.mjs` | manual |
| 25 | Test environment of the previous era: images, compose wiring, CI lane and the `.v8era.` test files it selects by name | `testkit-js/env/v8era.env`, `testkit-js/compose.yml`, `.github/workflows/ci-testkit-js.yml`, `.github/workflows/ci-testkit-js-build.yml` | manual |
| 26 | Fork-crossing stack and lane | `testkit-js/compose-fork.yml`, `.github/workflows/ci-hardfork.yml`, `consumer-e2e/fork-matrix-smoke.mjs`, `consumer-e2e/fork-crossing-entry.mjs`, [fork-e2e-environment.md](./fork-e2e-environment.md) | manual |
| 27 | Docs that name the current era: README (glossary, providers, dependency table), ADRs, package docs, release notes, `breaking-changes.md`, migration guide, `llms.txt` "Ledger Eras and the Fork Window" | `README.md`, `docs/adr/`, `docs/architecture/`, `packages/*/docs/`, `docs/releases/`, `llms.txt` | manual |

## Remove an era

Remove an era in a major release, when contracts deployed before its fork no longer need to be
called. Not on the day of the fork.

| # | Step | Where | Enforced by |
|---|---|---|---|
| 1 | Remove the era from `LEDGER_ERAS` | `protocol/src/lib/shared/ledger-version.ts` | manual (starts the compiler list) |
| 2 | Delete its row in every era table from the add checklist (steps 4–8, 10, 12–14 and 20) | as above | compiler |
| 3 | Delete it from the "Supported eras" lists (add step 9) | `protocol/src/errors.ts` | test |
| 4 | Delete its pipeline, flows, `LedgerN*` functions and types, router overloads and alias branches | `contracts/src/internal/ledger8-*.ts`, `contracts/src/ledger8-contract.ts` (for ledger 8), `contracts/src/era-aliases.ts` | compiler for the `case`s; manual for the rest |
| 5 | Delete its era module, loader and subpaths | `protocol/src/lib/vN/`, its entry files in `protocol/src/` (for ledger 8 also `engine.ts` and `compact-js-v8-effect.ts`), `protocol/package.json` `exports` | manual |
| 6 | Delete its packages and `resolutions` entries; run `yarn constraints` | the files of add step 2 | manual |
| 7 | Delete its ESLint import gate | `eslint.config.mjs` | manual |
| 8 | Update the name checks, era-literal guards and error reasons that name it (add steps 17–19) | as above | manual |
| 9 | Delete its fixtures, twins, env file, compose wiring, CI lane and `.vNera.` e2e tests | the files of add steps 24 and 25 | manual |
| 10 | Remove the deprecated `RetainedLedgerEra` / `RETAINED_LEDGER_ERAS` exports (first major release after [ADR 0026](../adr/0026-drop-the-retained-era-term.md)). Then rewrite the add section: its older-era check goes with them | `protocol/src/lib/shared/ledger-version.ts`, `protocol/src/version.ts`, `contracts/src/errors.ts`, this document | compiler for the uses; manual for this document |
| 11 | Delete or rework the fork lane | the files of add step 26 | manual |
| 12 | Docs: breaking changes, migration guide, and the docs of add step 27 | as above | manual |

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

The dry run for ledger 10 on `main` at `a5f75da2b` gave 140 type errors, 66 of them in production
source, all in the "compiler" rows above. Details are in the
[dry-run comment on #1539](https://github.com/midnightntwrk/midnight-js/issues/1539#issuecomment-7197465365).
