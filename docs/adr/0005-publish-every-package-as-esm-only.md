# 0005. Publish every package as ESM-only

- Status: Accepted
- Date: 2026-08-20

## Context

Up to 4.x every published package shipped two formats per entry: an ESM bundle (`.mjs`,
`.d.mts`) and a CommonJS bundle (`.cjs`, `.d.cts`), chosen by conditional `exports`. The dual
build existed because Node could not `require()` an ES module.

Two platform changes removed that limit. Node 22.12 enables `require(esm)` without a flag, so a
CommonJS consumer can `require()` an ESM-only package. TypeScript models this interop with
`module: node20` (TypeScript 5.9 and later) and `nodenext`.

The dual build cost more than it gave once the limit was gone. Every entry was built four times
instead of twice. Nothing in the repo exercised the CJS half, yet it could break silently,
because the published CJS bundles `require()` their sibling packages. Build configuration had
drifted per package: each `rollup.config.mjs` restated a hand-written list of entries that had to
match the package's `exports` map, and `protocol` carried its own config for one extra scope in
`external`.

## Decision

We will publish every package as ESM-only, all in one release, and delete the dual-format build.

- **One format, one manifest shape.** Every published package is `"type": "module"` and ships
  `dist/<name>.js`, `dist/<name>.js.map` and `dist/<name>.d.ts` per entry, plus shared chunks
  under `dist/shared/`. There is no `main`, no `module`, and no `.cjs`, `.d.cts` or `.d.mts`.
  Each `exports` value is `{ "types": ..., "default": ... }`, with no conditions.
- **The format change moves no subpath key.** The break is in the format and the platform floor.
- **`engines.node` is `>=22.12`.** CommonJS consumers load the framework through `require(esm)`.
  TypeScript consumers need 5.8 or later with `module: nodenext`, or `module: preserve` with
  `moduleResolution: bundler`; a CommonJS project needs 5.9 or later with `module: node20`. Older
  module settings (`node16`, `node18`) reject the import with `TS1479`. The v5.0.0 release docs
  (`docs/releases/v5.0.0/breaking-changes.md`) spell this out for consumers.
- **One build factory.** `build-tools/rollup.config.factory.mjs` exports exactly one function,
  `createRollupConfig`. No dual-format function sits beside it, so no package can opt back in.
  - **Entries come from the `exports` map**, not from a per-package list. The published surface is
    the single source of truth. Subpath keys may differ from file names
    (`./platform-js/effect/Configuration` maps to `dist/platform-effect-configuration.js`). A
    malformed `exports` entry fails the build instead of silently dropping a subpath.
  - **`external` is a syntactic rule**: any specifier that is neither relative nor absolute is a
    runtime import. Nothing from `node_modules` is bundled, so consumers dedupe and patch
    dependencies themselves. This rule only holds while no package resolves its own modules
    through a `tsconfig` path alias, so `testkit-js` and `testkit-js-e2e` have none.
  - **Declarations come from `rollup-plugin-dts` only.** The TypeScript plugin runs with
    `declaration: false` and `declarationMap: false`, so `dist` holds no per-module `.d.ts` files
    that the `exports` map never exposes.
- **No dual-format producer stays in the repo**, including the private `testkit-js-e2e`. One
  remaining CJS producer would be a template to copy.
- **`packages/compact` is the one deliberate exception.** It is `"type": "module"` but has no
  `exports` map and is built with `tsc`, and its `run-compactc` bin points at
  `dist/run-compactc.cjs`. Changing either is a public-surface change to a tool package and is not
  decided here. That `.cjs` bin is needed; it is not dual-build residue.

## Consequences

- **Positive:** one artifact per entry, so what CI builds is what consumers load, with no
  untested second format. The `exports` map is the only place entries are declared. Build
  configuration is one factory with no package-specific variants. Published `testkit-js`
  declarations carry no unresolvable `@/...` specifiers.
- **Negative:** consumers below Node 22.12, or on an older TypeScript or `module` setting, cannot
  upgrade. This forced a major release, and reversing it would mean restoring the deleted build
  and another major.
- **Negative:** the `external` rule depends on the absence of `tsconfig` path aliases. Adding one
  to a published package breaks bundling instead of failing loudly.
- **Follow-ups:**
  - `rollup` is planned for removal. This ADR fixes the published artifact shape (one ESM bundle
    and declarations per `exports` entry, entries derived from `exports`). A replacement bundler
    must reproduce that shape; which bundler belongs in its own ADR.
  - `contracts` passes `define: { __DEBUG__: JSON.stringify(process.env.CI !== 'true') }`, so the
    code it publishes depends on whether the build ran in CI. This needs its own decision.
  - `packages/compact` still needs a decision on an `exports` map and on how its
    `run-compactc.cjs` bin is invoked.

## Alternatives considered

- **Keep the dual-format build.** Rejected: its only reason was that CommonJS consumers had no
  other way in, and `require(esm)` removes that.
- **Switch package by package over several releases.** Rejected: published CJS bundles
  `require()` their siblings, so making one package ESM-only breaks the already published CJS
  bundles of the packages that depend on it, which announced no break. One release announces the
  break once.
- **Ship only `.mjs` without `"type": "module"`.** Rejected: same consumer floor as ESM-only, while
  keeping the package unclear about its own format.
- **An ESM package with a hand-written CJS shim.** Rejected: a shim cannot re-export named
  bindings of an ES module synchronously, so it would expose a promise or a reduced surface.
