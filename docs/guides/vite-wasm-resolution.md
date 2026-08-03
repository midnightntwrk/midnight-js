# Vite + WASM Resolution in Midnight dApps

When building a browser dApp with Midnight JS in a Vite monorepo,
`@midnight-ntwrk/compact-runtime` and its underlying WASM layer
(`@midnight-ntwrk/onchain-runtime-v3`) can be instantiated multiple times
across package boundaries. Because wasm-bindgen ties class identity to the
specific WASM instance that created an object, cross-instance `instanceof`
checks silently return `false`, causing opaque circuit-execution failures
that only surface in the browser — CLI and test paths pass because they use
a single resolution tree.

> **Status — interim workaround.** The root cause (instance-scoped WASM
> class identity in wasm-bindgen) is being tracked upstream:
> [LFDT-Minokawa/compact#611](https://github.com/LFDT-Minokawa/compact/issues/611)
> and [midnightntwrk/midnight-ledger#644](https://github.com/midnightntwrk/midnight-ledger/issues/644).
> The guidance below reflects the best known consumer-side mitigation until
> upstream reaches a conclusion. See
> [#1052](https://github.com/midnightntwrk/midnight-js/issues/1052) for
> the full discovery write-up.

## Symptoms

- Circuit calls fail with `ContractRuntimeError: Error executing circuit '<id>'`
- `instanceof` checks on Midnight JS objects (`ChargedState`, `QueryContext`)
  return `false` unexpectedly
- Errors appear only in browser / Vite builds, not in CLI or test runs

## Workaround: `resolve.dedupe`

Add the following to your `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import wasm from 'vite-plugin-wasm'

export default defineConfig({
  plugins: [wasm()],
  resolve: {
    dedupe: [
      '@midnight-ntwrk/compact-runtime',
      '@midnight-ntwrk/onchain-runtime-v3',
    ],
  },
})
```

This forces Vite to resolve these packages to a single instance across
all monorepo boundaries, preventing dual-instantiation.

**Verified set:** `compact-runtime` is the confirmed failing package
(`ChargedState` / `QueryContext` types); `onchain-runtime-v3` is the
underlying WASM layer and is included as a same-class risk. Both were
validated on a production mainnet deployment.

**Note on `vite-plugin-top-level-await`:** This plugin requires the
`rollup` package and cannot load under Vite 8 / rolldown. It is not
needed for the `resolve.dedupe` fix.

## References

- Issue [#1052](https://github.com/midnightntwrk/midnight-js/issues/1052):
  WASM dual-instantiation in Vite monorepo — full discovery write-up
- Upstream: [LFDT-Minokawa/compact#611](https://github.com/LFDT-Minokawa/compact/issues/611),
  [midnightntwrk/midnight-ledger#644](https://github.com/midnightntwrk/midnight-ledger/issues/644)
- [Midnight Private Auction](https://github.com/pplmaverick/midnight-private-auction):
  production dApp on Midnight Mainnet where this workaround was first validated
