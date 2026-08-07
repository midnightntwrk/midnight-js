# 0005. Ship cross-fork compatibility as a per-fork transitional package named for the version it retires with

- Status: Accepted
- Date: 2026-08-07
- Deciders: Szymon Paluchowski
- Related: [HF design spec v3.9](https://github.com/midnightntwrk/midnight-js/blob/docs/superpowers-specs/docs/superpowers/specs/2026-07-09-ledger-v8-v9-dual-support-design.md) (D11), ADR 0004

## Context

Under the current + previous support window (ADR 0004), each hard fork needs
previous-version capability somewhere: decoders for historical records and —
when the fork's spike shows it is needed — a keep-state execution bridge for
contracts compiled against the previous toolchain. Placing that capability in
core packages would force every consumer to carry a second WASM stack, widen
the supply-chain surface of the whole tree, and make removal at the next fork
a breaking `exports`-map change on `protocol`. The capability is inherently
**one-fork-scoped**: it solves exactly one (previous, current) pair, and the
next fork's needs are unknown until its own spike runs.

## Decision

We will ship all previous-version capability in a **dedicated transitional
package, one per fork window, named for the version it retires with** — for
the v8→v9 fork: `@midnight-ntwrk/midnight-js-ledger-v8-compat`.

- The package is a **leaf**: consumed only by dApps and injected inward
  (config object / codec import). No core package may depend on it —
  CI-gated.
- Entry points split the cost: the root entry carries keep-state; a separate
  `./codec` entry carries the previous-version decoders and is the **only
  place in the tree** with a direct previous-ledger dependency. Importing
  `./codec` instantiates that WASM — the import itself is the opt-in.
- Retirement at the next fork is a package deprecation (`npm deprecate`),
  pre-announced in the package README from day one — not a change to any
  core package. Whether the next fork needs its own compat package is
  decided by that fork's spike, never assumed.

## Consequences

- **Positive:** bundle isolation is structural (don't install it, don't pay
  for it); the previous-version supply-chain surface is confined to one
  `package.json`; deletion is non-breaking for everyone who never installed
  it; the version-in-name makes the lifecycle self-documenting.
- **Negative:** one more published package to version and release (it
  versions independently and fast during the window); transition-window
  dApps must add a dependency and wire a config object.
- **Follow-ups:** CI dependency-graph gates (no core package resolves the
  previous ledger or the compat package); supply-chain checklist scoped to
  this package's tree (two near-identical npm scopes exist — exact pins,
  lockfile integrity, scope/version gate).

## Alternatives considered

- **A `protocol/v8` subpath:** rejected — removal becomes a breaking
  `exports`-map change on a core package, and every `protocol` consumer
  inherits the v8 supply-chain surface.
- **A permanent multi-version core:** rejected — contradicts ADR 0004 and
  ADR 0006; pays an N-version cost for N ≤ 2.
- **dApp-side copy-paste (no package):** rejected — keep-state's
  down-convert/rehash/wrap logic is too subtle to duplicate per dApp, and
  instance-identity requirements (ADR 0007) need a controlled dependency
  shape.
