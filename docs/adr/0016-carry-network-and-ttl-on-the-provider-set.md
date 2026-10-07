# 0016. Carry the network id and the transaction TTL on the provider set

- Status: Accepted
- Date: 2026-10-07
- Deciders: Szymon Paluchowski
- Related: #982, #809 (superseded)

## Context

Up to 4.x the framework took two transaction settings from places a dApp could
not see or control well:

- **Network id.** `setNetworkId()` from `@midnight-ntwrk/midnight-js-network-id`
  stored the value in module-level state, and every transaction builder read it
  with `getNetworkId()`. A dApp had to call `setNetworkId()` before any other
  framework call. Forgetting it, or calling it too late, failed only at runtime.
  One process could not serve two networks, and tests had to reset the global.
- **TTL.** Every deploy, call and governance intent expired one hour after it
  was built (`ttlOneHour()`). A dApp could not change it.

5.0.0 already breaks the public API, so a dApp migrates anyway in this release.

## Decision

We will carry both settings on the provider set, as one required object:

```ts
interface MidnightConfig {
  readonly networkId: NetworkId; // NetworkId = string, declared in types
  readonly ttlSeconds: number;
}

interface MidnightProviders {
  readonly config: MidnightConfig; // required
}
```

- `config`, `config.networkId` and `config.ttlSeconds` are required. There are no
  defaults, so an un-migrated dApp fails to compile.
- The framework does not read the global network id anywhere, and does not fall
  back to it. A silent fallback would hide an incomplete migration.
- `ttlSeconds` is a duration, not a date or a date factory. The framework computes
  the expiry when it builds the intent.
- The values are checked when a transaction is built, before any proof is
  requested: a missing config or an empty network id is a `TypeError`; a
  `ttlSeconds` that is not a positive whole number, or that overflows a `Date`,
  is a `RangeError`.
- Low-level functions that do not receive `providers` take the config explicitly
  (`CallOptionsProviderDataDependencies.config`, the last argument of
  `createUnprovenDeployTxFromVerifierKeys`).
- `NetworkId` moves to `types`. `network-id` re-exports it, so `types` never
  depends on the package being deprecated.
- `@midnight-ntwrk/midnight-js-network-id` is deprecated, not removed. Its
  functions keep working so dApp code still compiles, and their docs say the
  framework ignores them. An ESLint `no-restricted-imports` rule keeps the
  package out of `contracts`, `utils` and the testkit source.

## Consequences

- **Positive:** the settings are typed and discoverable in one place. Each
  provider set carries its own network, so one process can serve several. A
  missing network id is a compile error, not a runtime exception. The TTL is
  configurable.
- **Negative:** every provider literal and every caller of the two low-level
  builders must change in 5.0.0. Code that still calls `setNetworkId()` compiles
  but no longer affects the framework.
- **Follow-ups:** remove `@midnight-ntwrk/midnight-js-network-id` in 6.0.

The Zswap Merkle-root retention window (`ZSWAP_MERKLE_ROOT_RETENTION_SECONDS`)
stays an internal constant. It controls how many past roots are kept when the
framework rehashes a chain state; it does not change the transaction that is
built, so there is no user need to configure it.

## Alternatives considered

- **Split the change: TTL in 5.0.0, network id in 6.0.** Rejected: dApps would
  migrate twice for one concern.
- **Optional `config` with a fallback to the global network id.** Rejected: an
  incomplete migration would keep working on the wrong value without any signal.
- **`ttl: () => Date`.** Rejected: harder to use, and a caller can return a fixed
  date that has already expired.
- **Per-call TTL on `CallOptions` / `DeployOptions`.** Not needed yet; the
  provider-level value covers the known use.
