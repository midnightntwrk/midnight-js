# 0010. Publish era handles alongside their plain data

- Status: Accepted
- Date: 2026-09-09
- Deciders: Szymon Paluchowski

## Context

`@midnight-ntwrk/midnight-js-protocol` co-installs two ledger WASM toolchains —
`@midnightntwrk/ledger-v9` for the current era and `@midnightntwrk/ledger-v8`
for the retained pre-fork one — alongside the retained pre-fork execution
toolchain (`compact-runtime@0.16` and `@midnight-ntwrk/onchain-runtime-v3`).
The package exists to let a caller work with a record from either era without
knowing which era it holds.

The shape this repo first gave that package let no live WASM handle cross an
era boundary at all, and drew the line so that a handle produced inside the
retained pre-fork pipeline never left it. The framework's retained-era result
types were shaped by that rule: the post-call contract state was absent from
`Ledger8CallResultPublic` altogether, and the composed transaction was
published as `txBytes` rather than as an `UnprovenTransaction`.

The cost of that rule landed on callers rather than on the framework. A caller
who wanted the post-call state had to fetch and decode it again through
`LedgerEra.extractState`, even though the pipeline had held the decoded state
moments earlier and thrown it away. The same went for the state each call binds
to, and for the state a retained constructor builds. In each case the framework
held a usable object, encoded or discarded it, and the caller paid to rebuild
something equivalent.

The properties that motivated that rule have not changed, and are the reason
this ADR narrows it rather than deleting it:

- A handle is a pointer into one module instance's linear memory. Passed to a
  different instance it throws where `wasm-bindgen` checks (argument position)
  and silently misbehaves where it does not (receiver position).
- A handle does not survive `structuredClone`, a `postMessage` to a worker, or
  serialization to storage. Anything that walks it sees `__wbg_ptr`, an integer
  that means nothing outside its module.
- Handles from two different eras describe the same concept with two unrelated
  objects, so a caller cannot compare them.

## Decision

We will publish era handles on the framework's ERA-SPECIFIC result types,
**alongside** the plain-data members already there, and let the caller decide
which to use. Concretely, on the retained-era surfaces:

- `Ledger8CallResultPublic.nextContractState` carries the post-call state as
  the retained runtime's own handle.
- Each entry of the retained `calls` list carries BOTH states as handles, under
  names that mean the same thing in both eras. `contractState` is the state the
  call ENDED on, because that is what `compact-js` fills the current era's
  member of that name from; the state the call BOUND to is published beside it
  as `preContractState`, which the current era has no counterpart for.
- The retained deploy publishes the constructor's state handle next to the
  serialized bytes it composes from.

Four rules bound this:

1. **Additive, never a replacement.** Every plain-data member the earlier rule
   introduced as a substitute stays exactly where it is — `txBytes` alongside a
   handle, `initialState` bytes alongside the constructor's handle. A caller
   that clones, persists or ships a result keeps a member it can use; nothing
   that works today stops working.
2. **`LedgerEra` still trades only plain data, in both directions.** That
   facade's caller is era-agnostic by construction — it holds whichever era the
   network answered with — so a handle there would be a value the caller cannot
   type, compare or safely pass on. Every value on that surface is era-crossing
   and is therefore encoded: `extractState` returns an `EncodedStateValue`,
   `decodeContractState` a `ContractStatePojo`, `composeCallTx` a
   `ComposeCallResultPojo` of bytes and the ledger's own declared transcript
   algebra, `composeDeployTx` a `DeployResultPojo` of bytes and a string. Inward too —
   `composeEraV8DeployTx` (`src/lib/v8/adapt.ts`) hands the contract state to
   the v8-native deploy leg as BYTES, which that leg deserializes into its own
   era rather than accepting a handle.

   The `structuredClone` gate in
   `packages/protocol/src/test/era-parity.test.ts` stays, but it DOCUMENTS the
   rule rather than mechanising it: a `wasm-bindgen` instance is a plain object
   with an own `__wbg_ptr` number, so it clones without throwing and the gate
   records a meaningless value instead of failing. Closing that is its own
   change; until then the rule rests on review, not on the gate.
3. **`Ledger8Engine` may hand back pre-fork handles, because it is bound to the
   pre-fork era and says so.** `DownConvertedState.data` is an
   `onchain-runtime-v3` `ChargedState`; `TranscriptPojo` carries two of them;
   `ConstructorResultPojo.contractState` is a pre-fork state handle. These
   circulate within the retained pipeline and never leave it. The one method on
   that surface which does cross, `wrapKeepStateCall`, encodes first —
   `transcript.preContractState.data.state.encode()` (`src/lib/v9/wrap.ts`) —
   so the pre-fork handle never reaches the ledger-v9 module, only the plain
   value it encoded to.
4. **A handle is named as one.** The declaring member says which runtime
   produced it and that it is a live handle, so a reader learns the lifetime
   rule from the type rather than from this document.

None of this is an immutability rule. `readonly` on a result's members freezes
each reference, not the bytes behind it, so a value that survives a
`structuredClone` is not thereby protected from a caller writing through the
arrays it carries. Immutability, where this package needs it, is bought
separately by freezing the object. For the same reason `readonly` and "Pojo" in
a type name are not on their own evidence that a value is plain —
`TranscriptPojo` is `readonly` throughout and still carries handles.

## Consequences

- **Positive:** a caller reads what the pipeline computed instead of re-fetching
  and re-decoding it; the retained era's public result stops being a subset of
  the current era's for reasons the caller cannot see; the era key-set parity
  gate's allow-list shrinks to absences that are about the retained toolchain
  itself rather than about transport.
- **Positive:** the encoded pair is published in BOTH eras. Rule 1 was first
  applied to the retained era alone, which left `nextContractStateEncoded` in
  the parity gate's allow-list under the claim that the current era "publishes
  its post-state as a handle only, so there is nothing on that side for this to
  pair with". `StateValue.encode()` exists, so the pair was available and had
  simply not been built. The current-era result carries it too and the
  allow-list entry is gone, which is what makes the encoded form the member
  era-agnostic code can read without branching -- the point of rule 1, and one
  that did not hold while a single era obeyed it.
- **Negative:** one encode per current-era call, paid whether or not the caller
  reads the member. The retained era already paid its equivalent, and the cost
  buys the branch-free read above.
- **Negative:** a result object is no longer uniformly cloneable. Calling
  `structuredClone`, `postMessage` or a JSON/superjson serializer on a whole
  retained result now throws or, worse, records a meaningless `__wbg_ptr`.
  Callers that persist results must pick the plain-data members explicitly.
- **Negative:** a published handle ties that result's usefulness to the module
  instance that produced it. ADR-0004's single-path rule keeps one instance per
  era in this framework, but a consumer that installs a second copy of the
  retained runtime can now reach the dual-instantiation failure through a
  result object, which the plain-data-only rule made unreachable.
- **Negative:** the two eras' results are less comparable member for member,
  because the handle types differ per era by construction.
- **Follow-ups:** a new operation on `LedgerEra` must return plain data; a new
  one on `Ledger8Engine` may return a pre-fork handle only if it stays inside
  the retained pipeline, and must encode at the point it does not.
  `Ledger8CallResultPrivate` still publishes only `txBytes` and no live
  `UnprovenTransaction`: deserializing one eagerly would pay ledger-v8
  deserialization on every call for an object most callers never read, and a
  caller who wants it can build it from the bytes through the same public
  loader the framework uses. Publishing it is a decision to take on its own
  evidence, not a gap this ADR leaves open by oversight.

## Alternatives considered

- **Keep the plain-data-only rule everywhere, as first written.** Rejected by
  the owner: on the era-specific surfaces it was costing callers access to
  values the framework already had, and the transport concerns it protects
  against are ones a caller can be told about rather than be prevented from
  reaching.
- **Replace the plain-data members with handles.** Rejected: it would break
  every caller that clones, persists or transfers a result, and would remove
  the only members that work across a worker boundary.
- **Publish handles on `LedgerEra` too.** Rejected: that surface exists to let
  a caller work with a record without knowing its era, and a handle there has
  no type the caller could name for both eras. It would also tie a result's
  lifetime to its module and reintroduce, between two eras that are distinct
  modules by design, the cross-copy failure ADR-0004's single-path rule exists
  to prevent.
- **Plain data everywhere, including inside `Ledger8Engine`.** Rejected: the
  retained pipeline is three steps in one era, and encoding between each would
  buy nothing. The cost is real — `downConvertForExecution` already re-encodes
  once for its integrity check — and there is no boundary there to protect.
- **Deep-freeze every result instead of publishing the encoded twin.**
  Rejected: it answers a different question. Freezing stops a caller mutating a
  value; it does nothing about module lifetime, cloneability or cross-era
  comparability, which are what the transport rule is for.

## Amendment — the transport rule is now mechanised, not merely documented (2026-09-23)

The decision above stands unchanged. This note records that the gap point 2
left open has been closed.

Point 2 closed with:

> The `structuredClone` gate in
> `packages/protocol/src/test/era-parity.test.ts` stays, but it DOCUMENTS the
> rule rather than mechanising it: a `wasm-bindgen` instance is a plain object
> with an own `__wbg_ptr` number, so it clones without throwing and the gate
> records a meaningless value instead of failing. Closing that is its own
> change; until then the rule rests on review, not on the gate.

That change has landed. `expectStructuredCloneable`
(`packages/protocol/src/test/clone-assertions.ts`) replaces
`expect(() => structuredClone(x)).not.toThrow()` at every call site — the
`LedgerEra` method sweep in `era-parity.test.ts` and the decoder result in
`shared-contract-state.test.ts`. It walks the value's own structure for an
object carrying an own `__wbg_ptr` and throws naming the path it found one at.
A `wasm-bindgen` instance carries that property whether it is live or has
already collapsed under a clone, so both shapes are rejected.

Three things this does NOT change:

- **`structuredClone` is still called**, and still for its own throw — a
  function or a live proxy genuinely cannot cross a boundary. What is retired
  is treating "did not throw" as evidence that anything crossed intact.
- **The rule itself is unchanged.** Point 2 governs the `LedgerEra` facade, and
  every member it names still carries plain data for the same reasons.
- **The gate is a test, not a type.** It runs on the values these suites
  actually produce; nothing stops a new member from carrying a handle until a
  test exercises it.

What is still NOT mechanised, and still rests on review: the walk reads own
ENUMERABLE properties, plus `Map` and `Set` members and array elements. A
handle behind a non-enumerable own property, or behind a prototype getter of a
containing object, is not reached. The helper's own doc comment states this;
closing it fully is not practical, and the values guarded here are decoded
plain objects whose members are ordinary own enumerable properties.

So point 2's sentence "the rule rests on review, not on the gate" should now be
read as applying only to those unreachable shapes. For everything the walk
reaches, deleting the plain-data guarantee makes a test fail. The walk is itself
guarded: `era-parity.test.ts` asserts it rejects a collapsed-handle shape that
the previous form accepted, and a handle behind a `Set`, behind a `Map` value,
and used as a `Map` key — each with the path in the message, so a dead walk
cannot stay green.

## Amendment — the decoded pojo now carries the contract balance (2026-09-24)

The decision above stands unchanged. This note records a **breaking** addition
to the plain-data side of it, and why the rule permitted it.

`ContractStatePojo` gains a required `balance` member, and
`ExecuteCircuitOptions` — the retained engine's `executeCircuit` option bag,
published from the barrel and from the `./engine` subpath — gains a required
`balance` option. Both are additive in shape and breaking in practice: a
consumer that builds an `ExecuteCircuitOptions` by hand stops compiling, and one
that builds a `ContractStatePojo` by hand does too.

**Why it belongs on the plain-data side.** The balance is a
`ReadonlyMap<TokenType, bigint>` keyed by string-tagged objects. Nothing in it
is a live WASM handle, so it satisfies the transport rule the same way the
encoded state and the entry points do, and it is guarded by the same walk — the
`expectStructuredCloneable` assertion in `shared-contract-state.test.ts` is made
on the balance itself, not only on the pojo containing it.

**Why the option is required rather than defaulted.** An empty balance is a
legitimate value: a contract holding nothing has one. Defaulting would make
"holds nothing" indistinguishable from "the caller did not carry one", and the
second answers every balance read with zero — a transcript the chain refuses,
because it re-runs the read against the balance the contract really holds. That
is the defect this amendment's change fixes (#1345). The same reasoning applies
to the decoder: `decodeContractStateWith` refuses a state that resolves no
usable balance rather than substituting an empty map.

**What this does NOT change.** `maintenanceAuthority` stays absent from
`DecodableContractState` for the reason it always was — nothing reads it off a
decoded state. The addition here is not a general licence to carry ledger fields
"in case"; it is the one field an execution path demonstrably could not run
without.
