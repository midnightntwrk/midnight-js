[**Midnight.js API Reference v5.0.0-beta.8**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../README.md) / OverloadTyping

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
previous runtime, and nothing outside that runtime may inspect them. Unchanged by
ADR-0010, which publishes handles a caller RECEIVES: these are values the
framework builds and hands the runtime, and a caller has no way to construct one.
The same reasoning is
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

Adding a last arm carrying `NEITHER_ERA_CONTRACT_MESSAGE` would have made every
mistyped current-era call report that the caller's perfectly ordinary contract
"is neither a retained-era nor a current-era generated contract" — a false
statement on the common path. An arm that is NOT last never renders at all, so placing one
earlier would only distort `ReturnType` and `Parameters`.

`NEITHER_ERA_CONTRACT_MESSAGE` is consumed by `EraArtifactMismatchError`, which
`resolveArtifactEra` raises when it is handed an object belonging to neither era. A
thrown error can carry full remediation text where a compiler diagnostic cannot,
which is why the text is not wired into an overload arm.

`NeitherContractShape` and `NeitherEraContractOptions` are the named shapes that
error reports against. Neither is constructed by anything; they exist so a
refusal has a name whose own definition says what went wrong.

The message is a runtime `const` rather than a bare literal inside
`NeitherContractShape` so the text is written ONCE and can be read by a runtime
consumer — the error above, and any test asserting on one — while `typeof` still
gives the type a string LITERAL member. It is not re-exported from the package
index: the error that carries it, `EraArtifactMismatchError`, is the consumer
surface, and that error IS exported — so a consumer narrows on the error rather
than comparing against the message. `overloads.test-d.ts` pins the wording
verbatim, and pins that a neither-era object really is refused by
`NeitherEraContractOptions` — the assignability fact the overloads rely on,
whether or not any arm spells it out.

## The runtime decision lives elsewhere

This file declares no era predicate. Telling the two eras apart at runtime is
`resolveArtifactEra` in `packages/contracts/src/internal/era.ts`, and it is the only
one — see [EraDispatch](../../midnight-js/documents/EraDispatch.md) for which answer each era carries, why
the era may not be inferred from generated code at all, why the check that
remains must not be "improved" to test the vendor's `CompiledContract` brand,
and what it refuses.

An earlier, provisional check tested for `impureCircuits` alone. It lived here,
answered `true` for a raw current-era contract instance, and could not close that
blind spot; `resolveArtifactEra` replaced it.

## Why a retained-era result is version-tagged

`Ledger8FinalizedCallTxData.txData` is a `VersionedFinalizedTxData` rather than
a single-era record: the same retained-era contract is called as a v8
transaction before the fork and as a v9 keep-state transaction after it, so the
record it finalizes as carries the era that produced it. Providers sit at that
same version-tagged seam and serve both eras, which is why
`Ledger8ContractProviders` is the ordinary provider set keyed by a retained-era
circuit id, and why there is no separate retained-era provider surface. Both
follow from `docs/adr/0006-version-tagged-payloads-at-provider-seams.md`.
