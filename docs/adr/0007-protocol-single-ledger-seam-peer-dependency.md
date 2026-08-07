# 0007. Keep `protocol` the single seam for the ledger implementation; satellite packages consume it as a peerDependency

- Status: Accepted
- Date: 2026-08-07
- Deciders: Szymon Paluchowski
- Related: [HF design spec v3.9](https://github.com/midnightntwrk/midnight-js/blob/docs/superpowers-specs/docs/superpowers/specs/2026-07-09-ledger-v8-v9-dual-support-design.md) (D2, D3), [#1052](https://github.com/midnightntwrk/midnight-js/issues/1052) (WASM dual instantiation), ADR 0005

## Context

`@midnight-ntwrk/midnight-js-protocol` re-exports the current ledger WASM
packages, and every core package imports ledger symbols through it. WASM
modules make module identity load-bearing: two copies of the same ledger
package in one process produce objects that fail `instanceof` checks across
the copy boundary (#1052) — failures surface far from their cause, e.g. as
proof errors minutes into an operation. Any new package that needs current
ledger types (such as a per-fork compat package, ADR 0005) could declare its
own direct ledger dependency, which would open a second instantiation axis
and couple it to ledger RC pin churn.

## Decision

We will keep `protocol` the **only** package that depends on the current
ledger implementation directly. Any satellite package needing current-ledger
symbols:

- declares `@midnight-ntwrk/midnight-js-protocol` as a **peerDependency**
  (range = the framework major; workspace devDependency for local
  build/tests) and imports every ledger symbol through `protocol`'s
  subpaths;
- declares **no direct dependency** on the ledger packages — enforced by a
  packaging lint;
- when it hands ledger-native objects across a package boundary at runtime,
  exposes an **instance-identity check** performed at configuration time:
  both sides reference the same constructor exported from
  `protocol/ledger`, compared by reference equality, with a typed error on
  mismatch (bundler misconfiguration can defeat module resolution even
  when packaging is correct).

Existing `protocol` subpath exports stay as-is across fork work: nothing is
re-pointed because nothing moves.

## Consequences

- **Positive:** exactly one current-ledger WASM instance per process by
  construction; objects produced by satellite packages pass `instanceof`
  in the core pipeline; satellite packages are decoupled from ledger RC
  pin churn (they follow whatever the host app's `protocol` resolves).
- **Negative:** peerDependencies push an installation obligation onto the
  dApp; the identity check adds one config-time step for packages that
  hand over runtime objects.
- **Follow-ups:** CI dependency-graph gate asserting satellite packages
  resolve no direct ledger dependency; the typed mismatch error links the
  dual-instantiation troubleshooting guide.

## Alternatives considered

- **Direct ledger dependency in each package that needs it:** rejected —
  reopens #1052 per package and multiplies RC-pin maintenance.
- **Runtime injection of ledger handles instead of peer resolution:**
  rejected as the primary mechanism — moves a packaging invariant into
  every call site; kept only where the dApp legitimately owns the instance
  (the retained previous-version stack in keep-state).
- **Trusting module resolution without an identity check:** rejected —
  bundler misconfiguration produces two module contexts with correct
  packaging; a one-`===` config-time check converts a mysterious late
  proof failure into an immediate typed error.
