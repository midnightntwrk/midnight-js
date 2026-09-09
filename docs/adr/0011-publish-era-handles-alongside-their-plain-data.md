# 0011. Publish era handles alongside their plain data

- Status: Accepted
- Date: 2026-09-09
- Deciders: Szymon Paluchowski

## Context

ADR-0007 let no live WASM handle cross an era boundary, and drew the line so
that a handle produced inside the retained pre-fork pipeline never left it. The
framework's retained-era result types were shaped by that rule: the post-call
contract state is absent from `Ledger8CallResultPublic` altogether, and the
composed transaction is published as `txBytes` rather than as an
`UnprovenTransaction`.

The cost of the rule landed on callers rather than on the framework. A caller
who wants the post-call state has to fetch and decode it again through
`LedgerEra.extractState`, even though the pipeline held the decoded state
moments earlier and threw it away. The same is true of the state each call
binds to, and of the state a retained constructor builds. In each case the
framework holds a usable object, encodes or discards it, and the caller pays to
rebuild something equivalent.

The properties that motivated ADR-0007 have not changed, and are the reason
this ADR does not simply delete the rule:

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
- Each entry of the retained `calls` list carries the state that call bound to,
  as the same kind of handle.
- The retained deploy publishes the constructor's state handle next to the
  serialized bytes it composes from.

Three rules bound this:

1. **Additive, never a replacement.** Every plain-data member ADR-0007
   introduced as a substitute stays exactly where it is — `txBytes` alongside a
   handle, `initialState` bytes alongside the constructor's handle. A caller
   that clones, persists or ships a result keeps a member it can use; nothing
   that works today stops working.
2. **`LedgerEra` still trades only plain data.** That facade's caller is
   era-agnostic by construction — it holds whichever era the network answered
   with — so a handle there would be a value the caller cannot type, compare or
   safely pass on. The `structuredClone` gate in
   `packages/protocol/src/test/era-parity.test.ts` stays, and stays the
   mechanism.
3. **A handle is named as one.** The declaring member says which runtime
   produced it and that it is a live handle, so a reader learns the lifetime
   rule from the type rather than from this document.

## Consequences

- **Positive:** a caller reads what the pipeline computed instead of re-fetching
  and re-decoding it; the retained era's public result stops being a subset of
  the current era's for reasons the caller cannot see; the era key-set parity
  gate's allow-list shrinks to absences that are about the retained toolchain
  itself rather than about transport.
- **Negative:** a result object is no longer uniformly cloneable. Calling
  `structuredClone`, `postMessage` or a JSON/superjson serializer on a whole
  retained result now throws or, worse, records a meaningless `__wbg_ptr`.
  Callers that persist results must pick the plain-data members explicitly.
- **Negative:** a published handle ties that result's usefulness to the module
  instance that produced it. ADR-0004's single-path rule keeps one instance per
  era in this framework, but a consumer that installs a second copy of the
  retained runtime can now reach the dual-instantiation failure through a
  result object, which ADR-0007 made unreachable.
- **Negative:** the two eras' results are less comparable member for member,
  because the handle types differ per era by construction.
- **Follow-ups:** ADR-0007 is marked superseded by this ADR. Its analysis of
  what a handle is remains accurate and is the reason for rule 1 above.
  `Ledger8CallResultPrivate` still publishes only `txBytes` and no live
  `UnprovenTransaction`: deserializing one eagerly would pay ledger-v8
  deserialization on every call for an object most callers never read, and a
  caller who wants it can build it from the bytes through the same public
  loader the framework uses. Publishing it is a decision to take on its own
  evidence, not a gap this ADR leaves open by oversight.

## Alternatives considered

- **Keep ADR-0007 as written.** Rejected by the owner: the rule was costing
  callers access to values the framework already had, and the transport
  concerns it protects against are ones a caller can be told about rather than
  be prevented from reaching.
- **Replace the plain-data members with handles.** Rejected: it would break
  every caller that clones, persists or transfers a result, and would remove
  the only members that work across a worker boundary.
- **Publish handles on `LedgerEra` too.** Rejected: that surface exists to let
  a caller work with a record without knowing its era, and a handle there has
  no type the caller could name for both eras.
