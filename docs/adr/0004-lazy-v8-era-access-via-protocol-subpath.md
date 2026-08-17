# 0004. Access the v8 ledger era lazily via a protocol subpath and loadV8()

- Status: Accepted
- Date: 2026-08-17
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

## Decision

We will expose the v8 era through a dedicated `./v8` subpath export of the
protocol package (`export * from '@midnightntwrk/ledger-v8'`) and a single
lazy accessor in the barrel:

```typescript
export const loadV8 = (): Promise<ProtocolV8> =>
  (v8ModulePromise ??= import('@midnight-ntwrk/midnight-js-protocol/v8').catch((error) => {
    v8ModulePromise = undefined;
    throw new Ledger8RuntimeMissingError(error);
  }));
```

Specifically:

- **Package self-reference.** `loadV8()` dynamically imports
  `@midnight-ntwrk/midnight-js-protocol/v8` — the package's own subpath. The
  specifier resolves through the package's exports map to the installed copy,
  and it matches the rollup externals, so the v8 module is never inlined into
  the eagerly-loaded index bundle. A relative `import('./v8.js')` would be
  bundled into the single-file rollup output and defeat the laziness.
- **Memoisation with retry.** The module promise is memoised so concurrent and
  repeated callers share one load. A failed load is *not* memoised: the
  rejection is wrapped in `Ledger8RuntimeMissingError` (code
  `MIDNIGHT_JS_P_LEDGER8_RUNTIME_MISSING`, original error as `cause`) and the
  next call retries. This keeps fail-fast semantics without letting one
  transient WASM-instantiation failure poison the process.
- **One sanctioned path, enforced three ways.**
  1. ESLint blocks runtime imports (static and dynamic) of the `/v8` subpath
     outside `packages/protocol/src/`; type-only imports are allowed.
  2. A source-scan test asserts `load-v8.ts` is the only module in the
     protocol package that references the subpath specifier.
  3. A dist gate inspects the built bundles: no static linkage of
     `ledger-v8` or of the `/v8` subpath may appear in `dist/index.*`, and the
     lazy dynamic import must survive the build verbatim.
- **Publish pipeline constraint.** The dual publish to the public
  `@midnightntwrk` scope rewrites the source scope inside built JS/DTS files
  as well as in `package.json`, because the self-reference specifier is baked
  into the bundles and must match the published package name to resolve.

## Consequences

- **Positive:** v9-only sessions never load the v8 WASM; there is exactly one
  runtime path to v8, so a second WASM copy cannot appear through this
  package; consumers get a typed, actionable error when the v8 runtime is
  missing; the laziness property is pinned by tests rather than convention.
- **Negative:** v8 access is async (`await loadV8()`), which shapes every
  downstream API that touches the previous era; the self-reference couples
  correctness to the exports map and to the publish-time scope rewrite; tests
  that exercise `loadV8()` require a built `dist/` and are skipped without
  one.
- **Follow-ups:** downstream read-path code (era detection, deserialisation of
  v8 records) builds on `loadV8()`; when the next fork retires v8, the subpath
  and accessor are removed in a major release.

## Alternatives considered

- **Static re-export of both eras from the barrel** — rejected: every consumer
  pays both WASM loads eagerly; this is the exact cost the fork migration must
  avoid.
- **Relative dynamic import (`import('./v8.js')`)** — rejected: rollup's
  single-file output inlines relative dynamic imports, silently restoring the
  eager load.
- **Separate npm package for the v8 era** — rejected: another publish surface
  and version to coordinate, and it invites direct installs that bypass the
  single-path guarantee.
- **Consumer-side dynamic import of `@midnightntwrk/ledger-v8`** — rejected:
  scatters era-loading across packages, breaks the one-copy guarantee, and
  couples consumers to the versioned ledger package name the protocol package
  exists to hide.
