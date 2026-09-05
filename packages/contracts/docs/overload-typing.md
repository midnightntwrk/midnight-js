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

Only two things do:

1. **The container.** The current era's contract arrives inside a
   `CompiledContract` carrying a `tag` and a `unique symbol` property that a
   plain object cannot forge. A retained-era contract is passed as the raw
   contract instance, with no container.
2. **Sync versus async.** Retained-era circuit members return a plain object and
   `initialState` returns a plain object; the current era's return `Promise`s.
   This is the discriminator the declarations are built on — a current-era
   circuit's `Promise<CircuitResults<...>>` has none of the four members
   `Ledger8CircuitResult` declares, so it is not assignable to it.

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

`overloads.test-d.ts` pins all of it: that each retained-era arm is REACHABLE (a
retained-era call resolves to the retained-era result type, not merely
compiles), and that `ReturnType` AND `Parameters` on all four entry points still
report exactly what they reported at the base commit.
`packages/contracts/src/test/current-era-diagnostic.test.ts` runs the compiler
itself and pins the third one: that a mistyped current-era call still names its
real cause.

## There is no catch-all arm

Adding a last arm carrying `NEITHER_ERA_CONTRACT_MESSAGE` would have made every
mistyped current-era call report that the caller's perfectly ordinary contract
"is neither a 0.16- nor a 0.18-generated contract" — a false statement on the
common path. An arm that is NOT last never renders at all, so placing one
earlier would only distort `ReturnType` and `Parameters`.

The guidance belongs in a thrown, typed error instead, which can carry full
remediation text where a compiler diagnostic cannot.

## The neither-era vocabulary is retained unused

`NEITHER_ERA_CONTRACT_MESSAGE`, `NeitherContractShape` and
`NeitherEraContractOptions` have no consumer yet, and that is expected. Their
destination is the typed error era resolution raises when it is handed an object
belonging to neither era. The wording is written down now so it is settled and
reviewed once, rather than invented at the point of use.

The message is a runtime `const` rather than a bare literal inside
`NeitherContractShape` so the text is written ONCE and can be read by a runtime
consumer — a thrown error, and any test asserting on one — while `typeof` still
gives the type a string LITERAL member. It is not re-exported from the package
index: it is not a runtime API today, and publishing it would commit us to it
before the error that carries it exists. `overloads.test-d.ts` pins the wording
verbatim, and pins that a neither-era object really is refused by
`NeitherEraContractOptions` — the assignability fact the overloads rely on,
whether or not any arm spells it out.

## The runtime predicate is provisional

`isLedger8Options` tells the two eras apart at runtime so each entry point's
implementation can refuse a retained-era request before touching the current-era
pipeline. It is a PROVISIONAL structural check, and deliberately not the era
predicate this framework will ship: it tests for the member the retained-era
artifact installs and the current era's container does not, which is enough to
fork a body whose retained-era branch only throws.

The shipped predicate tests the container's registered brand
(`Symbol.for('compact-js/CompiledContract')`) instead, which is what a
duplicate-install-safe answer needs; it arrives with the pipeline that needs it.

**Known blind spot, and why it is tolerable here.** A raw CURRENT-era contract
instance also carries `impureCircuits`, so the structural check returns `true`
for one. It cannot be reached through these entry points, because the
current-era arms take the `CompiledContract` CONTAINER and a raw instance is not
one, so nothing that type-checks gets there holding a bare current-era contract.
The brand test in the shipped predicate closes it properly.

The predicate's type parameter is named explicitly at each call site rather than
inferred, so the narrowing removes exactly the retained-era arm of that entry
point's parameter union and leaves the current-era arm the rest of the body is
written against.

## Why a retained-era result is version-tagged

`Ledger8FinalizedCallTxData.txData` is a `VersionedFinalizedTxData` rather than
a single-era record: the same retained-era contract is called as a v8
transaction before the fork and as a v9 keep-state transaction after it, so the
record it finalizes as carries the era that produced it. Providers sit at that
same version-tagged seam and serve both eras, which is why
`Ledger8ContractProviders` is the ordinary provider set keyed by a retained-era
circuit id, and why there is no separate retained-era provider surface. Both
follow from `docs/adr/0006-version-tagged-payloads-at-provider-seams.md`.
