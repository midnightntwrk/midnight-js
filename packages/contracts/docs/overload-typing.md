---
title: OverloadTyping
---

# Typing the retained-era contract overloads

The four entry points of this package — `deployContract`,
`findDeployedContract`, `submitCallTx` and the call-transaction builder — accept
contracts from two Compact toolchains. The current one
(`compact-runtime@0.19`) hands over a `CompiledContract` container; the retained
one (`compact-runtime@0.16`) hands over a raw contract instance. Both are
accepted through an ADDITIVE overload: a retained-era arm is declared alongside
the current-era arms rather than replacing them.

This document records why the retained-era declarations are hand-written, what
discriminates the two eras at the type level, how the family expresses openness
without `any`, and why the ORDER of the overload arms is load-bearing. The
declarations themselves live in `packages/contracts/src/ledger8-contract.ts`.

## Why the retained-era types are hand-written

The retained toolchain emits `contract/index.js` with **no `index.d.ts`** beside
it, so there is no declaration file to import a type from — unlike the current
toolchain, whose output ships one. Every retained-era declaration is therefore
written from the real generated JavaScript, and is only as true as that reading.

That is why the declarations are paired with a RUNTIME test,
`packages/contracts/src/test/ledger8-contract.test.ts`, which loads the real
generated artifact and asserts the structural facts the declarations encode. The
two halves are one unit:

- the compile assertions in
  `packages/contracts/src/test/typecheck/overloads.test-d.ts` prove the overloads
  discriminate the two eras;
- the runtime test proves the type they discriminate on is the shape the real
  artifact actually has.

Without the runtime half the family is an unverified guess, and the compile
assertions prove nothing about a real contract.

## What separates the two eras at the type level

Three things do, and they are listed in the order the COMPILER reaches them —
which is not the order of importance, and was measured rather than assumed:

1. **The circuit context**, and this is the one that actually fires for a real
   contract. `Ledger8Circuit` takes a `Ledger8CircuitContext<never>`, which has
   none of the members of the current runtime's much larger `CircuitContext`
   (`callContext`, `queryContexts`, `gasCosts`, `zswapLocalStates`, and more),
   so a current-era circuit is not assignable to it on a CONTRAVARIANT
   PARAMETER mismatch. The reverse fails the same way.
2. **Sync versus async.** Retained-era circuit members and `initialState`
   return plain objects; the current era's return `Promise`s. A
   `Promise<CircuitResults<...>>` has none of the four members
   `Ledger8CircuitResult` declares. This is the discriminator the declarations
   are DESIGNED around and the one the runtime predicate uses, but at the type
   level it is second in queue — it only gets a chance once the contexts agree.
   `overloads.test-d.ts` anchors it separately, in both directions, so
   relaxing `Ledger8CircuitContext` cannot quietly leave nothing holding the
   line.
3. **`impureCircuits` against the vendor top type.** The vendor's `Contract`
   interface declares only `witnesses`, `circuits`, `provableCircuits` and
   `initialState` — no `impureCircuits` — so `Contract.Any` fails
   `Ledger8Contract` on a missing member alone. Note this is a fact about the
   vendor INTERFACE, not about generated code: a real generated current-era
   contract does install `impureCircuits`, which is why it cannot be used as a
   runtime discriminator.

**The container** is what the current-era arms take, and it is what keeps a raw
current-era instance from reaching them: a `CompiledContract` carries a `tag`
and a branded property that a plain object does not have.

`provableCircuits` deliberately does NOT discriminate. The real retained-era
artifact sets BOTH `impureCircuits` and `provableCircuits`, so its presence says
nothing about which toolchain produced the contract.

## Openness without `any`

The vendor family reaches for `any` to get a "top" contract type that every
concrete contract satisfies. That is not available here, so the openness is
expressed by variance instead:

- parameter positions widen to `never`, which is assignable to anything, so
  contravariance always holds;
- every result position the private state does not flow through widens to
  `unknown`, to which everything is assignable, so covariance always holds.

The result is a genuine top type for the retained era that still excludes the
current era's shape, because a `Promise` has none of the members the retained
results declare.

`Ledger8Circuit` and `Ledger8Witness` both widen their arguments to `never`.
What `Ledger8Circuit` does differently is declare its leading context
EXPLICITLY instead of folding it into the rest parameter, and two independent
decisions are at work in that signature:

1. **The explicit leading context** is what keeps `Parameters<T>` tuple-shaped,
   which is what lets `Ledger8CircuitParameters` destructure it as
   `[Head, ...infer Tail]`. A bare `(...args: never[])` makes `Parameters<T>`
   just `never[]`, which matches no such pattern — the era top type's `args`
   collapses to `never` and `AnyLedger8CallTxOptions` becomes uninhabitable.
2. **The argument TAIL is `never[]`, not `unknown[]`.** The circuit collections
   are function-typed `Record`s, so under `strictFunctionTypes` their parameters
   are checked CONTRAVARIANTLY. An `unknown[]` tail would require `unknown` to
   be assignable to the concrete argument type, so a real circuit such as
   `(context, coin: ShieldedCoinInfo)` would fail the `Ledger8Contract`
   constraint outright and its contract could not select the retained-era
   overload at all. `never` is assignable to every type, so every real circuit
   satisfies it.

The two are independent: the tuple shape comes from (1), NOT from widening the
tail. Widening the tail to `unknown[]` for readability costs the feature its
argument-taking contracts. `overloads.test-d.ts` pins both directions against a
real zero-argument fixture and a real argument-taking one.

**Declare your retained-era collections as type ALIASES, not interfaces.**
`Readonly<Record<string, Ledger8Circuit>>` requires an implicit index
signature, and TypeScript gives one to an object type alias but not to an
interface. A consumer who writes `interface MyCircuits { ... }` gets
`Index signature for type 'string' is missing`, which mentions nothing about
eras — and because the failure is on the CONSTRAINT, the call then falls
through to the current-era arms and reports something about `CompiledContract`
instead. Generated Compact declarations are written as aliases already, so this
matches real generated code; the fixtures in
`packages/contracts/src/test/ledger8-fixture-types.ts` follow the same rule.

The context is `Ledger8CircuitContext<never>` for the same contravariance
reason: `never` is assignable to every private state, so a concrete circuit
declared over a real one satisfies this, and the context gives the family a
second, independent reason to reject a current-era contract.

The two era-internal members of `Ledger8CircuitContext` — `currentQueryContext`
and `currentZswapLocalState` — are `unknown` because they are live values of the
previous runtime, and nothing outside that runtime may inspect them. That is the
transport rule recorded in
`docs/adr/0007-cross-the-era-boundary-with-plain-data-only.md`. The same rule is
why `Ledger8CircuitParameters` strips the leading context: handing the caller
the raw `Parameters<...>` would oblige it to construct a live value of the
previous runtime. The current era's `Contract.CircuitParameters` strips its own
leading `CircuitContext` for the matching reason — the context is built by the
framework from provider data, never passed in by the caller.

## Overload order is load-bearing, and the last arm is left alone

Three separate things resolve from an overloaded function's LAST signature, and
all three were measured against this code rather than assumed:

1. `ReturnType<typeof f>`;
2. `Parameters<typeof f>`;
3. the error TypeScript prints when NO arm matches a call.

So every entry point declares its retained-era arm FIRST — where it cannot be
shadowed by a current-era arm — and leaves the arm that was already last exactly
where it was. Nothing is appended. `ReturnType` and `Parameters` therefore
report what they reported before the retained-era family existed, and a call
that matches nothing is still reported against a real current-era arm, which
names a real cause: a typo'd circuit id, a private state of the wrong type.

That last point is the one worth protecting, because a mistyped CURRENT-era call
is the common case and a retained-era call is the rare one.

`overloads.test-d.ts` pins it: that each retained-era arm is REACHABLE (a
retained-era call resolves to the retained-era result type, not merely
compiles), and that `ReturnType` AND `Parameters` on all four entry points still
report exactly what they reported at the base commit. Those two are what read
from the LAST signature, so an arm appended to the end of any of these lists
fails them. The diagnostic a failed call prints resolves from that same last
signature, and so moves only when they do; its exact wording is TypeScript's to
choose and is deliberately not pinned.

## There is no catch-all arm

Adding a last arm whose parameter type named a "neither era" shape would have
made every mistyped current-era call report that the caller's perfectly
ordinary contract belonged to neither era — a false statement on the common
path. An arm that is NOT last never renders at all, so placing one earlier
would only distort `ReturnType` and `Parameters`.

The guidance belongs in a thrown, typed error instead, which can carry full
remediation text where a compiler diagnostic cannot. That is
`Ledger8PipelineNotWiredError` today: it names the entry point that refused the
call and the toolchain version that produced the contract, and it is exported
so a consumer can branch on it with `instanceof` rather than matching a
message.

An earlier revision of this work also carried a `NEITHER_ERA_CONTRACT_MESSAGE`
constant and two phantom types to hold its wording ahead of that error. They
were removed: nothing consumed them, the wording they froze named the wrong
toolchain version, and a test pinned it verbatim — so the placeholder was
harder to fix than to write correctly at the point of use.

## The runtime predicate

`isLedger8Options` tells the two eras apart at runtime so each entry point's
implementation can refuse a retained-era request before touching the
current-era pipeline.

It tests the **sync/async split** — discriminator 2 above — because that is the
only one of the three that is available at runtime and actually separates the
eras:

- `impureCircuits` does NOT discriminate. The predicate checks it, but only to
  establish that the value is a contract at all. A real generated CURRENT-era
  contract installs `impureCircuits` too, exactly as it installs
  `provableCircuits`.
- A retained-era `initialState` is a plain function; the current toolchain's is
  `async`. `Function` versus `AsyncFunction` is the same fact the type family
  is built on, so the runtime check and the types agree by construction rather
  than by coincidence.

**Why not the container's brand.** An earlier version of this document proposed
testing the registered brand, `Symbol.for('compact-js/CompiledContract')`, and
called it the duplicate-install-safe answer. That does not work, and the reason
is worth recording so it is not proposed again: `CompiledContract.make` installs
the brand on the PROTOTYPE (`Object.create(CompiledContractProto)`), and every
combinator — `withWitnesses`, `withVacantWitnesses`, `withCompiledFileAssets` —
returns `{ ...self }`, which copies own properties only. Measured against the
installed package:

| value | brand present |
|---|---|
| `make(tag, ctor)` | yes |
| `.pipe(withVacantWitnesses)` | **no** |
| `.pipe(withWitnesses(w), withCompiledFileAssets(p))` | **no** |

Every container a caller actually builds goes through those combinators, so a
brand-PRESENCE test would classify every real current-era contract as
retained-era and make every current-era call throw.

**What this predicate gets right that a structural `impureCircuits` test did
not.** A caller who passes the raw current-era contract instance instead of its
container is making a one-line mistake at the call site. The types catch it, but
plain JavaScript does not, and `impureCircuits` alone reported such a value as
retained-era — so the framework told them their contract came from the previous
toolchain and that this release cannot run it. Both halves were false. Testing
`initialState` reports it as current era, so it fails against the current-era
pipeline, where the cause actually lies.

The predicate's type parameter is named explicitly at each call site rather
than inferred, so the narrowing removes exactly the retained-era arm of that
entry point's parameter union and leaves the current-era arm the rest of the
body is written against.

## Why a retained-era result is version-tagged

`Ledger8FinalizedCallTxData.txData` is a `VersionedFinalizedTxData` rather than
a single-era record: the same retained-era contract is called as a v8
transaction before the fork and as a v9 keep-state transaction after it, so the
record it finalizes as carries the era that produced it. Providers sit at that
same version-tagged seam and serve both eras, which is why
`Ledger8ContractProviders` is the ordinary provider set keyed by a retained-era
circuit id, and why there is no separate retained-era provider surface. Both
follow from `docs/adr/0006-version-tagged-payloads-at-provider-seams.md`.
