# 0005. Publish every package as ESM-only

- Status: Accepted
- Date: 2026-08-20
- Deciders: Szymon Paluchowski

## Context

Until v5.0.0 every published package shipped two formats per entry: an ESM
bundle (`.mjs`, `.d.mts`) and a CommonJS bundle (`.cjs`, `.d.cts`), selected by
conditional `exports`. The dual build existed because Node could not `require()`
an ES module, so a CommonJS consumer had no way to reach an ESM-only package.

Two platform changes removed that constraint. Node 22.12 enables `require(esm)`
unflagged, so a CommonJS consumer can `require()` an ESM-only package directly.
TypeScript 5.8 added `module: node20` to model that interop, so the same import
also type-checks from a CommonJS compilation.

The dual build carried costs that were not paid back once the constraint lifted.
Every entry was built four times instead of twice. The CJS half was the format
nothing in the repo exercised, yet it was the half that could break silently:
the published CJS bundles `require()` their siblings, so
`contracts/dist/index.cjs` reached `network-id`, `types` and `utils`, and
`midnight-js/dist/index.cjs` reached `contracts` on top of those. Build
configuration had drifted per package — `protocol` carried a bespoke rollup
config whose only difference from the shared one was an extra scope in
`external`, and each `rollup.config.mjs` restated a hand-written list of entries
that had to stay in step with the package's `exports` map.

The framework's own packages were already `"type": "module"`; only the published
artifacts were dual.

## Decision

We will publish every package as ESM-only, in one release, and delete the
dual-format build.

- **One format, one manifest shape.** Every published package is
  `"type": "module"` and ships exactly `dist/<name>.js`, `dist/<name>.js.map`
  and `dist/<name>.d.ts` per entry. `main`, `module`, and all `.cjs`, `.d.cts`
  and `.d.mts` outputs are gone. Each `exports` value is
  `{ "types": ..., "default": ... }` — no conditional branches.
- **`exports` subpath keys do not move.** The break is in the format and the
  platform floor, not in any import specifier. No consumer rewrites an import.
- **`engines.node` is `>=22.12`.** CommonJS consumers load the framework through
  Node's `require(esm)`, which is where that works unflagged. Consumers
  compiling with TypeScript additionally need >= 5.8 with `module`
  `node20`/`nodenext` or `moduleResolution: bundler`; older module settings
  reject the import at compile time with `TS1479`. Both requirements are
  documented in `docs/releases/v5.0.0/{breaking-changes,migration-guide}.md`.
- **One build factory, in one place.** `build-tools/rollup.config.factory.mjs`
  exports exactly one function, `createRollupConfig`. There is deliberately no
  dual-format function left beside it, so no package can opt back into two
  formats by picking a different import.
  - **Entries are derived from the `exports` map**, not from a per-package list.
    The published surface is the single source of truth. This matters most for
    `protocol`, whose subpath keys intentionally differ from their file names
    (`./platform-js/effect/Configuration` →
    `dist/platform-effect-configuration.js`); there is no parallel list left to
    drift. A malformed `exports` entry throws rather than silently dropping a
    subpath from the build.
  - **`external` is a syntactic rule**, not a list: a specifier that is neither
    relative nor absolute is a runtime import. Nothing is bundled from
    `node_modules`, so consumers dedupe and patch dependencies themselves, and
    `resolve()`/`commonjs()` are dropped because they had nothing to do. This
    rule is what removed `protocol`'s bespoke config. It holds only while no
    package resolves its own modules through a `tsconfig` path alias, so the
    `@/*` aliases in `testkit-js` and `testkit-js-e2e` were removed as part of
    the same move.
  - **Declarations come from `rollup-plugin-dts` only.** `tsc` runs with
    `declaration: false` and `declarationMap: false`, so `dist` no longer
    collects per-module `.d.ts`/`.d.ts.map` files that the `exports` map never
    exposed.
- **No dual-format producer is left in the repo**, including the private
  `testkit-js-e2e`. A single remaining CJS producer would keep the deleted
  configuration alive as a template to copy.
- **`packages/compact` is the one exception, and it is deliberate.** It is
  already `"type": "module"` but has no `exports` map at all, and its `bin`
  points at `dist/run-compactc.cjs`. Both would be public-surface changes to a
  tool package, so they are excluded here rather than decided in passing. That
  `.cjs` bin is load-bearing — it is not dual-build residue to clean up.

## Consequences

- **Positive:** one artifact per entry, so what CI builds is what consumers
  load, and there is no unexercised second format to break silently; the
  `exports` map is the only place entries are declared; per-package build
  configuration collapses into one factory with no bespoke variants; the build
  emits no rollup warnings and no unexported stray declarations; the published
  `testkit-js` declarations stop shipping unresolvable `@/...` specifiers, which
  had been broken for every consumer.
- **Negative:** consumers below Node 22.12, or on TypeScript below 5.8 or on an
  older `module` setting, cannot upgrade — this forced a major release; the
  decision is expensive to reverse, since restoring dual format means
  reinstating the deleted build path and cutting another major; the `external`
  rule silently depends on the absence of `tsconfig` path aliases, so
  reintroducing one in any published package breaks bundling rather than
  failing loudly.
- **Follow-ups:**
  - `rollup` is slated for removal from the toolchain. This ADR fixes the
    *published artifact shape* — one ESM bundle plus declarations per `exports`
    entry, entries derived from `exports` — and that contract is what a
    replacement bundler must reproduce. Which bundler produces it is not decided
    here and belongs in its own ADR.
  - `contracts` uses `createRollupConfig`'s `define` option to publish
    `__DEBUG__: JSON.stringify(process.env.CI !== 'true')`, so the code it ships
    to npm differs depending on whether the build ran in CI. This behaviour
    predates the move and was preserved exactly; it needs its own decision.
  - `packages/compact` still needs a call on an `exports` map and on how its
    `run-compactc.cjs` bin is invoked.

## Alternatives considered

- **Keep the dual-format build** — rejected: the only reason it existed was that
  CommonJS consumers had no other way in, and `require(esm)` on Node >= 22.12
  removes that. It would mean maintaining, and majoring on, a format no test in
  the repo exercises.
- **Roll out per package, over several releases** — rejected: the published CJS
  bundles `require()` their siblings, so flipping one package leaks the break
  sideways. The moment `network-id` is ESM-only, the already-published CJS
  artifact of `contracts` is `require()`ing an ESM-only package while
  `contracts` itself announced no break. Moving together announces the break
  once and leaves no intermediate state in which a consumer can land.
- **Ship only `.mjs` without `"type": "module"`** — rejected: it hits the same
  consumer floor as ESM-only, since the loader treatment is identical, while
  keeping the package ambiguous about its own format and keeping the extension
  bookkeeping the dual build required.
- **Publish an ESM package with a thin hand-written CJS shim** — rejected: a
  shim cannot re-export named bindings from an ESM module synchronously, so it
  would either expose a promise or a reduced surface. Both are worse for a
  consumer than the `require(esm)` path Node already provides.
