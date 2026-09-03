---
title: DualInstantiationGuard
---

# The dual-instantiation guard

`assertSharedLedger8Instance` (`packages/protocol/src/lib/v8/instance-guard.ts`)
fails fast on a dual-instantiation of a WASM package the down-convert engine
depends on, along one named `axis`. This document records what a
dual-instantiation actually does to a running process, why the guard is a
correctness requirement rather than a diagnostics improvement, and why each
detail of its shape — reference equality, a shared binding, two acquisition
paths, a nullish check ahead of the comparison, a validated axis — is the way it
is.

## What a duplicate install actually produces

A duplicate install resolves to two physically distinct module instances — same
shape, different WASM linear memory, different classes. What happens when they
mix depends on which position the foreign object is in, and only one of the two
is checked.

## Argument position: wasm-bindgen throws

As an **argument** to a wasm-bound function, wasm-bindgen emits `_assertClass`,
which throws `expected instance of <Class>`. Loud, though deep inside a decode
and naming neither the package nor the duplicate install.

That is the whole reason `Ledger8InstanceMismatchError` exists. Mixing copies
does not corrupt results silently in this direction: wasm-bindgen emits an
`_assertClass` check on every object handed across a class boundary, so a
cross-copy handoff throws `expected instance of <Class>`. That failure is loud
but opaque — it names neither the package nor the duplicate install. The error
replaces it with one that does, at the point the two copies are first observed
rather than deep inside a down-convert.

## Receiver position: nothing is checked

As the **receiver** of a wasm-bound method, nothing is checked. The glue reads
`this.__wbg_ptr` and calls into its own linear memory with a pointer that
belongs to the other copy's heap. Measured on the pinned version, that returns a
plausible, wrong value: a cell built in one copy read back through the other's
`encode()` yields different bytes with no error, and `type()` still reports the
correct variant. Whether it happens to come back right depends on how the two
heaps line up, so it is not reliably reproducible — and a test that passes proves
nothing about production.

## Why the guard is a correctness requirement, not a diagnostics improvement

So this guard is not only a diagnosis-improver. For the receiver direction it is
the only thing standing between a duplicate install and silently wrong contract
state, which is why it must run before any state crosses the bridge rather than
being treated as optional belt-and-braces.

## Reference equality is the probe

Reference equality is the probe: two references to the *same* physical copy are
always `===`; two sourced from different physical copies never are, even at the
same package version.

## Pass a shared binding, never a module namespace object

Pass a **shared binding** — a class the package exports, such as `ChargedState`
or `StateValue` — never a module namespace object. A namespace is per-module, so
a re-export produces a different one even when there is exactly one physical
copy behind it; comparing namespaces would report a mismatch on a healthy
install and send the user hunting a duplicate that does not exist. A re-export
preserves the identity of the binding itself, which is why the binding is the
sound probe and the namespace is not.

## Two acquisition paths, and why the caller owns that

Both probes are compared symmetrically — there is no expected side — so the two
arguments are interchangeable. What matters is that they are obtained from **two
different acquisition paths** (two distinct import specifiers, or an import
versus a caller-supplied module). Passing the same binding twice satisfies the
check trivially and proves nothing; the caller owns that, because nothing in the
signature can enforce it.

## A nullish probe is rejected before the comparison

A nullish probe (`null`/`undefined`) on either side is rejected before the `===`
comparison runs, rather than compared directly: two nullish values are always
`===` to each other, so a caller that optional-chained a missing export on both
sides (or simply forgot to pass a probe) would otherwise pass this fail-fast
safety net by accident instead of failing it.

It is reported as `Ledger8RuntimeInvalidError`, not as a mismatch: a missing
probe is a binding the caller did not hand over, which is the same fault the
envelope seam reports under that code. Calling it a dual-instantiation would
assert two physical copies exist and send the reader to `npm why` after a
duplicate that is not there.

## The axis is validated before either probe is looked at

`axis` is validated against the closed union before either probe is looked at,
for the same reason `extractEncodedStateValue` validates `version`: it is only
type-checked for TypeScript callers, and it selects the package names the
remediation hint tells the reader to trace.

`UnknownLedger8AxisError` is the counterpart of `UnknownLedgerVersionError` on
the other closed union this package validates at a boundary, and it exists for
the same untyped JavaScript consumers. The axis is not only a label: it selects
the package names `Ledger8InstanceMismatchError` tells the reader to trace, so
an unvalidated string would put an `Object.prototype` member where a package
name belongs, and would land in an `axis` field consumers are told they can
`switch` on.

`requestedAxis` carries the offending value; like `requestedVersion` it is kept
out of the message, because caller-supplied text is the one thing these errors
never render.

## Why `onchain-runtime-v3` is the only asserted axis

An axis earns an assertion only when the package genuinely reaches this process
through two acquisition paths.

`'onchain-runtime-v3'` is the only member of `Ledger8InstanceAxis` because it is
the only retained pre-fork package this one both depends on directly and can
receive from a consumer's own resolution — a `compact-runtime` build that
re-exports it, a bundler that failed to dedupe it, or the same version installed
under both npm scopes while the scope migration runs. A new axis joins only when
it gains a comparable second acquisition path.

No other WASM package the engine module acquires has a comparable second
acquisition path, so no other axis is asserted.

## What the mismatch error carries, and what it does not

`Ledger8InstanceMismatchError` is thrown when the same-named WASM package
resolved to two physically distinct copies in this process (a
dual-instantiation).

`axis` names the package the check ran on. This is a direct assertion failure (a
reference-equality mismatch), not a wrapped lower-level exception, so unlike
`DownConvertFailedError` there is no `cause` to carry.

The remediation names every mainstream package manager rather than the one this
repo happens to use, because this package is consumed by dApps installed with
all of them.

## Naming both published npm scopes in the remediation hint

`PUBLISHED_SCOPES` in `packages/protocol/src/errors.ts` holds the npm scopes
this package and its retained pre-fork runtimes are published under, while the
scope migration runs. The scope is held apart from the `/` on purpose, and
joined only at `axisPackageNames`. The dual-publish
(`.github/scripts/publish-public-npm.mjs`) rewrites the old scope to the new one
inside built `.js`/`.d.ts` files as well as in `package.json`, matching on the
scope *with* its trailing slash. A scoped package name written as one literal
would therefore ship rewritten, collapsing the two names into one and turning a
hint that names both scopes into one that names a single scope twice. Splitting
the scope from the slash leaves the rewrite nothing to match; `errors.test.ts`
holds that line.

`AXIS_BARE_PACKAGE_NAMES` carries the unscoped npm name of each axis. Both
published copies of an axis carry this same name under a different scope, so
naming only one scope would point every consumer installed from the other at a
package not in their tree.

## Where the guard runs, and the mixed runtime it makes sound

`createLedger8Engine` (`packages/protocol/src/lib/v8/engine.ts`) runs
`assertSharedLedger8Instance` exactly once, on the `onchain-runtime-v3` axis: it
compares this package's own copy against the copy the 0.16 glue resolves for its
own dependency (a genuine second acquisition path — a duplicate install would
resolve these differently), so a dual-instantiation fails loudly before any
contract execution can silently corrupt on a physical-instance mismatch. Any
acquisition failure surfaces through the facade
(`packages/protocol/src/lib/v8/load-engine.ts`) as
`Ledger8RuntimeMissingError`.

The runtime object assembled immediately after that assertion takes
`ContractState` from ocrt3 while the other two members come from the glue. That
is sound only because the assertion above has already established the two are
one physical copy: had they been distinct, it would have thrown rather than let
a mixed runtime be assembled there.
