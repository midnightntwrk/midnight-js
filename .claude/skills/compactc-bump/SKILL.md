---
name: compactc-bump
description: Bump the Compact toolchain (compactc compiler, compact-runtime, compact-js) in midnight-js and recompile every contract. Use when asked to bump, upgrade or update compactc, the Compact compiler, compact-runtime or compact-js, or to switch to a compactc dev or RC build.
---

# Bump the Compact toolchain

## Steps

1. **`.envrc`**: set `COMPACTC_VERSION`. It drives the prebuilt binary download in
   `packages/compact/src/fetch-compact.mts`.
   - Release or RC build (for example `0.37.0-rc.0`): keep `COMPACT_TAG_PREFIX=compactc-v`
     and `COMPACT_ASSET_PREFIX=compactc_v`.
   - Dev build: `COMPACT_TAG_PREFIX=compactc-dev-`, `COMPACT_ASSET_PREFIX=compactc_dev-`,
     and the version is the commit hash.
   - `COMPACT_REPO=LFDT-Minokawa/compact`. The download needs `GITHUB_TOKEN`
     (`export GITHUB_TOKEN=$(gh auth token)`).
2. **Runtime and compact-js versions**: root `package.json` `resolutions`
   (`@midnight-ntwrk/compact-runtime`, `@midnight-ntwrk/compact-js`) and the
   `packages/protocol/package.json` dependency must name the same version. Then `yarn install`.
3. **New runtime minor only**: replace the old minor's row in `RUNTIME_VERSION_TO_ERA`
   (`packages/contracts/src/internal/era.ts`). Unit tests mock the runtime version, so
   nothing local catches a missing row: only e2e and the Hard fork lane fail, with
   `EraMismatchError`.
4. **Recompile everything**: `yarn turbo compact` in the repository root. It runs the
   `compact` task in `packages/contracts`, `packages/http-client-proof-provider` and
   `testkit-js/testkit-js-e2e`, and regenerates every `compiled/` directory.
5. **Golden fixture**: in `packages/contracts`, run
   `UPDATE_GOLDEN=1 yarn test src/test/non-regression-golden.test.ts` and check in the diff
   that only input hashes moved.
6. **Verify**: `yarn build`, `yarn test`, then the e2e suite (see the `run-e2e` skill).
   Commit as `build(deps): ...`.

## Known hazards

- **Corrupt download on a cold cache**: the three `compact` tasks download the same zip in
  parallel and can corrupt it (`invalid compressed data to inflate`). Run
  `yarn fetch-compactc` once in `packages/contracts` first, then `yarn turbo compact`.
- **Recompile all contracts together**: the e2e `@/contract` barrel constructs every
  contract at import, so a mix of compiler versions fails at load.
- **compact-js must match the runtime**: if it targets another `createCircuitContext`
  signature, `packages/contracts/src/test/utils/ledger-utils.test.ts` fails typecheck and the
  deploy path breaks.
- **Hard-fork fixtures are not regenerated** by `yarn turbo compact`. They stay pinned to
  older toolchains on purpose. Follow "Regenerating" in
  `testkit-js/testkit-js/src/fixtures/hf/README.md`, and never edit their `.compact` sources.
- **A green build can hide type errors**: rollup reports TypeScript errors as warnings and
  `yarn build` still exits 0. Search the build log for `plugin typescript` and run
  `npx tsc --noEmit -p tsconfig.json` in the packages you touched.
- **Prover keys live in Git LFS** (`testkit-js/testkit-js-e2e/src/contract/compiled/**/*.prover`).
  Recompiled keys can exceed GitHub's 100 MB limit, so make sure they are committed as LFS
  pointers (`git lfs status`).
