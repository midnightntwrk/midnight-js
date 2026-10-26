---
title: DualInstantiationGuard
---

# The dual-instantiation guard

A dual-instantiation is the same WASM package resolved to two physically
distinct copies in one process. This document records what that does to a
running process, why it is a correctness problem rather than a tidiness one,
what checks it today, and what no longer does.

**The runtime guard is gone.** `assertSharedLedger8Instance`
(`lib/v8/instance-guard.ts`) compared two bindings this package acquired by two
different paths, and ran once inside `createLedger8Engine`. It retired with the
hand-maintained execution layer
(`docs/adr/0015-retained-era-execution-on-compact-js.md`): compact-js owns both
acquisitions now, so the check had no second path left to compare and no
subject. What replaced it is an install-time check, narrower on both axes —
see *What checks this today* below. Its error class and
that error's code have been removed too.
For transactions, the check is back at run time as `isFrameworkLedgerTransaction`
— see *The transaction guard* below.

## What a duplicate install actually produces

A duplicate install resolves to two physically distinct module instances — same
shape, different WASM linear memory, different classes. What happens when they
mix depends on which position the foreign object is in, and only one of the two
is checked.

## Argument position: wasm-bindgen throws

As an **argument** to a wasm-bound function, wasm-bindgen emits `_assertClass`
on every object handed across a class boundary, so a cross-copy handoff throws
`expected instance of <Class>`. Results are not corrupted silently in this
direction.

The failure is loud but opaque: it names neither the package nor the duplicate
install, and it surfaces deep inside a decode. For transactions,
`isFrameworkLedgerTransaction` reports the same fault before any WASM call
sees the object.

## Receiver position: nothing is checked

As the **receiver** of a wasm-bound method, nothing is checked. The glue reads
`this.__wbg_ptr` and calls into its own linear memory with a pointer that
belongs to the other copy's heap. Measured on the pinned version, that returns a
plausible, wrong value: a cell built in one copy read back through the other's
`encode()` yields different bytes with no error, and `type()` still reports the
correct variant. Whether it happens to come back right depends on how the two
heaps line up, so it is not reliably reproducible — and a test that passes proves
nothing about production.

## Why this is a correctness requirement, not a diagnostics improvement

For the receiver direction, a check is the only thing standing between a
duplicate install and silently wrong contract state. That is why the retired
guard ran before any state crossed the bridge rather than being treated as
optional belt-and-braces, and it is why losing it is a loss rather than a
simplification.

## The transaction guard

`isFrameworkLedgerTransaction(era, value)` (`lib/shared/ledger-transaction.ts`,
published at the `./transaction` subpath) answers, synchronously, whether a
transaction object belongs to the ledger copy this framework loaded. It is an
`instanceof` check against that copy's `Transaction` class:

- `'own'` — the value is an instance of the framework's class;
- `'foreign-instance'` — it is not: another physical copy of the same package
  (for v8, typically the `@midnight-ntwrk/ledger-v8` copy wallet-sdk installs),
  or not a transaction at all;
- `'ledger8-not-loaded'` — the era is v8 and `loadLedger8Protocol()` has not
  resolved yet, so the framework's class does not exist and no answer is
  possible. The check never imports v8 itself, because it must stay
  synchronous and must not load the v8 WASM.

It guards both positions described above: a foreign object is refused before it
can be an argument or a receiver. `LedgerTransaction.seal` in `types` turns a
non-`'own'` answer into `ForeignLedgerTransactionError`, with the answer as its
`reason`. Every handle is made by `seal`, so no transaction handle can hold a
foreign object (`docs/adr/0019-carry-transactions-as-opaque-era-carrying-handles.md`).

## What checks this today

`single-instance.test.ts` reads the resolved version set out of `yarn info -R
--all` and fails when a line this repo pins resolves to more than one version.
Both flags are load-bearing: the duplicate it exists to catch is by
construction a TRANSITIVE resolution of compact-js, never a workspace's own
descriptor, so without `-R` the assertion would stay green whatever the tree
held. The expected versions are read from the manifests that pin them rather
than restated, so a legitimate bump reads as "one copy per line, still".

**It is narrower than the guard it replaced, in two ways.** It runs at install
time against THIS repo's lockfile, so a consumer's own duplicate — a bundler
that failed to dedupe, or a tree that reaches the same package under both npm
scopes while the migration runs — is not caught at all, where the runtime probe
would have caught it in the consumer's process. And it answers on package
versions rather than on physical instance identity, which is the thing that
actually matters: two entries resolving to one version are usually one copy,
but that is an inference, not the `===` the probe performed.

## The retired probe's design

Recorded because `UnknownLedger8AxisError` still ships and only makes sense
against it.

Reference equality was the probe: two references to the same physical copy are
always `===`, two from different copies never are, even at the same version.
What was compared was a shared **binding** — a class the package exports, such
as `ChargedState` — never a module namespace object, because a namespace is
per-module and a re-export produces a different one even when exactly one
physical copy sits behind it. Comparing namespaces would have reported a
mismatch on a healthy install.

The two probes had to come from two DIFFERENT acquisition paths; passing the
same binding twice satisfied the check trivially. Nothing in the signature could
enforce that, so the caller owned it. A nullish probe on either side was
rejected BEFORE the comparison, because two nullish values are always `===` and
a caller that optional-chained a missing export on both sides would otherwise
have passed a fail-fast net by accident. That case reported
`Ledger8RuntimeInvalidError` rather than a mismatch: a missing binding is not
two physical copies, and calling it one would send the reader to `npm why`
after a duplicate that is not there.

`axis` was validated against the closed union before either probe was read, for
the same reason `extractEncodedStateValue` validates `version`: it is only
type-checked for TypeScript callers, and it selected the package names the
remediation hint told the reader to trace. That is what
`UnknownLedger8AxisError` exists for; `requestedAxis` carries the offending
value and is kept out of the message, because caller-supplied text is the one
thing these errors never render.

`'onchain-runtime-v3'` was the only member of `Ledger8InstanceAxis`, because it
was the only retained pre-fork package this one both depended on directly and
could receive from a consumer's own resolution. No other WASM package the engine
acquired had a comparable second acquisition path.

## Where the mixing still happens

`lib/v8/executable.ts` takes `StateValue`, `ChargedState` and `ContractState`
from ONE module — the retained glue under this package's own alias — precisely
so no mixed runtime is assembled. Deliberate: compact-js's `CompactRuntime`
re-exports none of the three as a value, and reaching for ledger-v8's own
same-named classes instead would BE the dual instantiation this era must not
perform. Any acquisition failure surfaces through the facade
(`lib/v8/load-engine.ts`) as `Ledger8RuntimeMissingError`.

Taking all three from one module is what the retired assertion used to make
sound by checking. It is now a property of the import list, which a reviewer
can read but no test asserts.

## The one crossing this cannot affect

A crossing that passes BYTES rather than a handle is immune by construction, so
the blast radius is the crossings that pass handles. The deploy path is the byte
case — `.serialize()` on the constructor's state handle is what every deploy leg
takes — and how the result types are typed is in
[InjectedVendorSlices](./injected-vendor-slices.md).
