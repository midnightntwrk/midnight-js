# 0016. Carry the network id and the transaction TTL on the provider set

- Status: Accepted
- Date: 2026-10-07

## Context

A transaction needs two settings: the network it is built for, and how long its intents stay
valid (the TTL).

A network id kept in module-level state, set once by the dApp and read by every builder, fails
only at run time when the dApp forgets to set it or sets it too late. One process cannot serve
two networks, and tests must reset the global between runs. A TTL fixed by the framework (one hour
for every deploy, call and governance intent) cannot be changed by a dApp.

5.0.0 already breaks the public API, so every dApp migrates in this release anyway.

## Decision

We will carry both settings on the provider set, as one required object:

```ts
interface MidnightConfig {
  readonly networkId: NetworkId; // NetworkId = string, declared in types
  readonly ttlSeconds: number;
}

interface MidnightProviders {
  readonly config: MidnightConfig;
}
```

- `config`, `config.networkId` and `config.ttlSeconds` are required, with no defaults, so a dApp
  that has not migrated fails to compile.
- There is no global network id and no fallback to one. The package that held it,
  `@midnight-ntwrk/midnight-js-network-id`, and the `./network-id` subpath of
  `@midnight-ntwrk/midnight-js` are removed in 5.0.0. Code that still calls `setNetworkId()` fails
  to compile instead of being silently ignored.
- `ttlSeconds` is a duration, not a date or a date factory. The framework adds it to the current
  time when it starts building a transaction, and again when balancing starts; it passes the
  second expiry to `walletProvider.balanceTx` as its `ttl` argument. The intent the wallet adds
  therefore lives as long as the framework's own, counted from a slightly later moment.
- `assertValidMidnightConfig` from `utils` checks the config at the start of every entry point
  that builds a transaction, before chain state is read and before the circuit or constructor
  runs. A missing config (`undefined` or `null`) is a `ConfigurationError`. A `networkId` that is
  not a non-empty string without surrounding whitespace is an `InvalidArgumentError`, and so is a
  `ttlSeconds` that is not a positive whole number or that overflows a `Date`. The function is
  public so a dApp can check its own config early. There is no upper bound on the TTL: the node
  enforces the network's own limit.
- Low-level functions that do not receive `providers` take the config explicitly:
  `Ledger9CallOptionsProviderDataDependencies.config`, and the last argument of
  `createLedger9UnprovenDeployTxFromVerifierKeys` and `createUnprovenDeployTxFromVerifierKeys`.
- The Zswap Merkle-root retention window (`ZSWAP_MERKLE_ROOT_RETENTION_SECONDS`) stays an internal
  constant. It controls how many past roots are kept when the framework rehashes a chain state; it
  does not change the transaction, so there is no user need to configure it.

## Consequences

- **Positive:** the settings are typed and found in one place. Each provider set carries its own
  network, so one process can serve several. A missing network id is a compile error for
  TypeScript callers and a coded error before any work otherwise. The TTL is configurable.
- **Negative:** every provider literal, every caller of the low-level builders, and every caller
  of the removed network-id package must change in 5.0.0.
- **Negative:** a `WalletProvider` that ignores the `ttl` argument still gives its balancing
  intent its own TTL; the framework cannot enforce it.

## Alternatives considered

- **TTL in 5.0.0, network id later.** Rejected: dApps would migrate twice for one concern.
- **Keep the network-id package, deprecated and ignored by the framework.** Rejected: a setting
  that compiles but has no effect fails silently, and every dApp already changes where it builds
  its providers.
- **A root object `{ providers, config }` passed to every entry point.** Rejected: it changes the
  first argument of every call (`deployContract`, `findDeployedContract`, `submitCallTx`, ...)
  instead of one provider literal, and every `Pick<MidnightProviders, ...>` the API is built on
  would become nested. It fixes no bug the flat field allows.
- **Optional `config` with a fallback to a global network id.** Rejected: an incomplete migration
  would keep working on the wrong value with no signal.
- **`ttl: () => Date`.** Rejected: harder to use, and a caller can return a date that has already
  passed.
- **Per-call TTL on the call and deploy options.** Not needed yet; the provider-level value covers
  the known use.
