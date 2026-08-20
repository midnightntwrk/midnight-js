# 0004. Access the v8 ledger era lazily via a protocol subpath and loadLedger8()

- Status: Accepted
- Date: 2026-08-20
- Deciders: Szymon Paluchowski

## Context

The Midnight node hard fork introduces a v9 ledger era while transactions and
state from the v8 era must remain readable. Both ledger WASM packages
(`@midnightntwrk/ledger-v8` and `@midnightntwrk/ledger-v9`) therefore need to
be co-installed in `@midnight-ntwrk/midnight-js-protocol`.

Each ledger package carries a multi-megabyte WASM artifact that is compiled
and instantiated at module load. Most sessions after the fork are v9-only:
they must not pay the v8 WASM cost (load time, memory) just because the
protocol package supports reading the previous era. Loading two copies of the
same ledger WASM is also a known hazard (`instanceof` fails across copies), so
however v8 is exposed, there must be exactly one way to reach it.

Two properties of the current build shape the mechanism. Every `exports`
subpath is built as its own entry, enforced by the export-surface gate that
requires one subpath per top-level module under `src/`. And all entries are
emitted by a single bundler pass into a directory, so a module reached by more
than one entry is emitted once and imported by relative path rather than
inlined into each bundle.

## Decision

We will expose the v8 era through a dedicated `./v8` subpath export of the
protocol package (`export * from '@midnightntwrk/ledger-v8'`) and a single
lazy accessor in the barrel:

```typescript
export const loadLedger8 = (): Promise<ProtocolV8> =>
  (v8ModulePromise ??= import('./v8.js').catch((error: unknown) => {
    v8ModulePromise = undefined;
    throw new Ledger8RuntimeMissingError(error);
  }));
```

Specifically:

- **Relative dynamic import of the sibling entry.** `./v8` is an `exports`
  subpath, so the build emits `dist/v8.js` as its own entry chunk and leaves
  the dynamic import in `dist/index.js` verbatim. The v8 module is therefore
  never part of the eagerly-loaded index bundle, and the specifier resolves
  within the installed copy of the package — no name resolution, no exports
  map, no second copy.
- **Memoisation with retry.** The module promise is memoised so concurrent and
  repeated callers share one load. A failed load is *not* memoised: the
  rejection is wrapped in `Ledger8RuntimeMissingError` (code
  `MIDNIGHT_JS_P_LEDGER8_RUNTIME_MISSING`, original error as `cause`) and the
  next call retries. This keeps fail-fast semantics without letting one
  transient WASM-instantiation failure poison the process.
- **One sanctioned path, enforced three ways.**
  1. ESLint blocks runtime imports of the `/v8` subpath outside
     `packages/protocol/src/`. Static imports are barred by
     `@typescript-eslint/no-restricted-imports` (its own rule id, type-only
     imports allowed); dynamic imports by `no-restricted-syntax` selectors.
     Because flat config replaces a rule's options wholesale, the
     `no-restricted-syntax` scopes are mutually exclusive blocks that each
     spell out every selector list applying to them, and the protocol
     exemption is expressed with `ignores` — never as
     `'no-restricted-syntax': 'off'`, which would silently drop the unsafe-cast
     gate sharing that rule.
  2. A source-scan test (`v8-surface.test.ts`) asserts `load-v8.ts` is the only
     module in the protocol package that references the subpath.
  3. A dist gate (`dist-laziness.test.ts`) inspects the built bundles: no
     static linkage of `ledger-v8` or of the v8 entry may appear in the index
     bundle, the lazy dynamic import must survive the build, and the artifacts
     the `./v8` exports entry points at must exist.
- **The laziness is a build invariant, and it fails loudly.** Laziness holds
  because the build emits one chunk per entry and preserves dynamic imports.
  A build that bundled each entry into a single file instead cannot silently
  re-inline v8: rollup rejects a second chunk under a single-file output
  outright (`when building multiple chunks, the "output.dir" option must be
  used`). The dist gate covers the remaining case, a bundler that chooses to
  inline rather than refuse.

## Consequences

- **Positive:** v9-only sessions never load the v8 WASM; there is exactly one
  runtime path to v8, resolved inside the installed copy, so a second WASM
  copy cannot appear through this package; consumers get a typed, actionable
  error when the v8 runtime is missing; nothing in the publish pipeline has to
  rewrite specifiers inside built JS or declarations; the laziness property is
  pinned by tests rather than convention.
- **Negative:** v8 access is async (`await loadLedger8()`), which shapes every
  downstream API that touches the previous era; correctness is coupled to the
  build emitting `./v8` as its own chunk, so a bundler swap has to keep the
  dist gate green; tests that exercise `loadLedger8()` require a built `dist/`
  and are skipped without one.
- **Follow-ups:** downstream read-path code (era detection, deserialisation of
  v8 records) builds on `loadLedger8()`; when the next fork retires v8, the
  subpath and accessor are removed in a major release.

## Alternatives considered

- **Static re-export of both eras from the barrel** — rejected: every consumer
  pays both WASM loads eagerly; this is the exact cost the fork migration must
  avoid.
- **Package self-reference (`import('@midnight-ntwrk/midnight-js-protocol/v8')`)**
  — rejected: it buys nothing the relative import does not already give, and
  costs two things. The specifier would have to be rewritten inside built JS
  and declarations whenever the package is published under a different scope,
  since a self-reference only resolves under the published name. And in a tree
  holding two installed copies of the protocol package it can resolve to the
  *other* copy, instantiating a second v8 WASM — the one outcome the
  single-path rule exists to prevent.
- **Separate npm package for the v8 era** — rejected: another publish surface
  and version to coordinate, and it invites direct installs that bypass the
  single-path guarantee.
- **Consumer-side dynamic import of `@midnightntwrk/ledger-v8`** — rejected:
  scatters era-loading across packages, breaks the one-copy guarantee, and
  couples consumers to the versioned ledger package name the protocol package
  exists to hide.
