# 0004. Load the v8 ledger era lazily through a protocol subpath and one accessor

- Status: Accepted
- Date: 2026-08-20

## Context

After the hard fork the node runs the v9 ledger era, but transactions and state from the v8 era
must stay readable. So `@midnight-ntwrk/midnight-js-protocol` installs both ledger packages,
`@midnightntwrk/ledger-v8` and `@midnightntwrk/ledger-v9`.

Each ledger package carries a WASM module of several megabytes that is compiled and instantiated
when it loads. Most sessions after the fork use v9 only. They must not pay the v8 load time and
memory just because the package can read the previous era. Loading two copies of the same ledger
WASM is also a known hazard (`instanceof` fails across copies), so there must be exactly one way
to reach v8.

Two properties of the build shape the mechanism. Every `exports` subpath is built as its own
entry, from a top-level module under `src/`. And all entries come out of a single bundler pass, so
a module reached by more than one entry is emitted once and imported by relative path, not inlined
into each bundle.

## Decision

We will expose the v8 era through a dedicated `./v8` subpath of the protocol package
(`src/v8.ts`: `export * from '@midnightntwrk/ledger-v8'`) and one lazy accessor,
`loadLedger8Protocol(): Promise<Ledger8Protocol>`. It lives in `src/lib/v8/load.ts` and the
package root re-exports it.

- **A relative dynamic import of the v8 entry.** The accessor calls `import('../../v8.js')`.
  Because `./v8` is an `exports` subpath, the build emits `dist/v8.js` as its own chunk and keeps
  the dynamic import in `dist/index.js` as written. The v8 module is never part of the eagerly
  loaded root bundle. The specifier resolves inside the installed copy of the package: no name
  lookup, no exports map, no second copy. The accessor is not a published subpath, so it sits
  under `src/lib/` (modules that are not build entries) rather than at the top of `src/`.
- **Memoised, with retry.** Concurrent and repeated callers share one load. A failed load is
  *not* memoised: the rejection is wrapped in `Ledger8RuntimeMissingError` (code
  `MIDNIGHT_JS_P_LEDGER8_RUNTIME_MISSING`, original error on `cause`) and the next call tries
  again. Callers fail fast, and one transient WASM failure does not poison the process.
- **The retained execution engine follows the same pattern.** Its `./v8/engine` subpath is
  reached at run time only through `loadLedger8Engine()` in `src/lib/v8/load-engine.ts`.
- **One sanctioned path, enforced three ways.**
  1. ESLint (`eslint.config.mjs`) blocks runtime imports of the `/v8` and `/v8/engine` subpaths
     outside `packages/protocol/src/`. Static imports are blocked by
     `@typescript-eslint/no-restricted-imports` (type-only imports allowed), dynamic imports by
     `no-restricted-syntax` selectors. Flat config replaces a rule's options as a whole, so each
     `no-restricted-syntax` block lists every selector group that applies to its files, and the
     protocol exemption is written with `ignores`. It is never written as
     `'no-restricted-syntax': 'off'`, which would also drop the unsafe-cast gate that shares the
     rule.
  2. A source-scan test (`packages/protocol/src/test/v8-surface.test.ts`) asserts that
     `lib/v8/load.ts` is the only module that imports the v8 entry at run time, and
     `lib/v8/load-engine.ts` the only one that imports the engine entry. It skips comments and
     type-only imports and re-exports, and resolves each relative specifier against the file that
     names it.
  3. A dist gate (`packages/protocol/src/test/dist-laziness.test.ts`) reads the built bundles: the
     root bundle must not link `ledger-v8`, the v8 chunk or the engine chunk statically, and the
     lazy dynamic imports must survive the build.
- **Laziness is a build invariant that fails loudly.** It holds because the build emits one chunk
  per entry and keeps dynamic imports. A build that tried to put every entry in a single file
  cannot silently inline v8: rollup refuses multiple chunks without `output.dir`. The dist gate
  covers the remaining case, a bundler that inlines instead of refusing.

## Consequences

- **Positive:** v9-only sessions never load the v8 WASM. There is exactly one runtime path to
  v8, resolved inside the installed copy, so this package cannot create a second WASM copy.
  Consumers get a coded, actionable error when the v8 runtime is missing. Nothing in the publish
  pipeline rewrites specifiers in built files. Tests, not convention, pin the laziness.
- **Negative:** v8 access is async (`await loadLedger8Protocol()`), which shapes every API that
  touches the previous era.
- **Negative:** correctness depends on the build emitting `./v8` as its own chunk, so a bundler
  change must keep the dist gate green. The gate reads built output, so it needs a prior
  `yarn build` and is skipped without one.
- **Follow-up:** when a later fork retires v8, the subpath and the accessor are removed in a major
  release.

## Alternatives considered

- **Re-export both eras statically from the root.** Rejected: every consumer pays both WASM loads
  up front, which is exactly the cost to avoid.
- **Package self-reference (`import('@midnight-ntwrk/midnight-js-protocol/v8')`).** Rejected: it
  only resolves under the published name, so it must be rewritten whenever the package is
  published under another scope, and with two installed copies of the package it can resolve to
  the *other* copy and load a second v8 WASM.
- **A separate npm package for the v8 era.** Rejected: another package to publish and version,
  and it invites direct installs that bypass the single path.
- **Consumers import `@midnightntwrk/ledger-v8` themselves.** Rejected: era loading spreads across
  packages, the one-copy guarantee breaks, and consumers depend on the versioned ledger package
  name the protocol package exists to hide.
