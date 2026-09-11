---
title: FailClosedDecoding
---

# Fail-closed decoding

Reading a contract state is the one place in `@midnightntwrk/midnight-js-protocol`
where bytes of unknown provenance meet a WASM codec that will happily answer a
question it was never asked. This document records the discipline that keeps
that seam honest: what the decoders treat as authoritative, why no read is
allowed to return a plausible-looking empty answer, and why the three failures
this seam can raise are three distinct classes rather than one.

## The envelope is the only authority over the bytes

There are two envelope shapes, and each era reads only its own:

- `v9` — a post-fork `contract-state[v8]`-tagged envelope, read via
  `@midnightntwrk/ledger-v9`.
- `v8` — a pre-fork `contract-state[v6]`-tagged envelope, read via
  onchain-runtime-v3, the same codec that produced it.

A reported protocol version selects which of those decoders is used; it does
not establish what the bytes are. The same bytes are a valid state on one axis
and refuse to decode on the other, which is why the era whose decoder rejected
an envelope is the first thing a reader of `StateDecodeFailedError` needs: an
era-less message would send a caller to audit bytes that are fine. Derive the
era with `protocolVersionToLedger` (`packages/protocol/src/version.ts`) rather
than constructing the string by hand, and let the decoder have the final word.

`extractEncodedStateValue` (`packages/protocol/src/lib/era/envelope.ts`)
therefore validates `version` at runtime before selecting a decoder with it;
why that guard is not redundant with the type signature, and how much of the
era dispatch is reachable today, belong with the package-wide table discipline
— see [SharedTableDiscipline](./shared-table-discipline.md).

## A decode never returns a partial or empty state

`extractEncodedStateValue` never returns a silently empty or partial state: any
deserialization failure (malformed bytes, a truncated or over-long payload, or
an envelope tagged for the other ledger version) is wrapped in a
`DownConvertFailedError` with `{ cause }`, so failures propagate loudly instead
of producing a misleading result. The wrapped cause carries the runtime's own
diagnosis, which distinguishes a tag mismatch from truncated, trailing, or
empty bytes.

`decodeContractStateWith`
(`packages/protocol/src/lib/shared/contract-state.ts`) holds the same line one
level up: the whole read is covered, not just the deserialization, so no raw
runtime error escapes this seam uncoded.

That is why the per-entry-point lookup inside it does not use `?.`. The entry
point came from `operations()` on that same object, so a state that cannot
resolve it is internally inconsistent, not a state with a blank slot. Optional
chaining collapsed the two into the same answer, and `verifierKey: undefined`
has a specific documented meaning — never deployed. A whole contract reading as
never-deployed would send a caller comparing key hashes hunting a deployment
bug that does not exist, so this leaves as `StateDecodeFailedError` like every
other read failure here.

The same refusal to repair quietly governs the Merkle assertion further down
the pipeline. A bounded Merkle tree only has a readable root once every node
hash has been computed; the vendor documents `root()` as returning `undefined`
until then, and `rehash()` as necessary "because the onchain runtime does not
automatically rehash trees". `downConvertForExecution` asserts this on every
tree it decodes, failing fast with `MerkleNotRehashedError` instead of silently
repairing.

## Three failures, three remediations

The seam raises three coded failures, and folding any two of them together
would misdescribe the fix.

| Error | Reports |
|---|---|
| `StateDecodeFailedError` | the envelope was never readable at all by the era it was requested for |
| `DownConvertFailedError` | a raw envelope, or an already-extracted `EncodedStateValue`, could not be turned into an executable pre-fork state |
| `Ledger8RuntimeInvalidError` | the injected pre-fork runtime cannot be used — nothing is wrong with the input |

`StateDecodeFailedError` is distinct from `DownConvertFailedError`, which
reports a failure to bridge an already-extracted state into the pre-fork
execution algebra: the first reports the envelope never having been readable at
all. `version` names the era whose decoder rejected it.

`Ledger8RuntimeInvalidError` is separate from `DownConvertFailedError` because
the remediation is unrelated: nothing is wrong with the caller's input. Folding
this into a down-convert failure would name an extraction stage and tell the
caller to read a cause describing tag mismatches and truncation, sending them
to audit data that is perfectly good. It is also distinct from
`Ledger8RuntimeMissingError`, which reports a *failed acquisition* of the v8
chunk; this one reports a runtime that was acquired, or assembled by hand, and
then handed over incomplete.

Checking the injected runtime up front is what buys that distinction. It turns
the omission into `Ledger8RuntimeInvalidError` instead of a `TypeError` wrapped
as a `DownConvertFailedError` — which would name an extraction stage and point
the caller at input bytes that are not the problem.

Down-convert is version-agnostic — it consumes an already-extracted
`EncodedStateValue` whichever era it came from — so its stage carries no
version, unlike the two extraction stages (`'v8 envelope extraction'` and
`'v9 envelope extraction'`, against `'state down-convert'`).

## Why the facade's two read methods fail the same way

`extractStateWith` (`packages/protocol/src/lib/shared/contract-state.ts`)
exists so the facade's two read methods fail the SAME way. Underneath, the
extractors raise `DownConvertFailedError` naming an extraction stage — a class
with no `version` field, and a diagnosis phrased around down-converting a state
for execution, which is not what a caller asking to read a state was doing. A
caller handed one era's bytes on the other era's object should learn that from
`extractState` and `decodeContractState` alike, not have to know which of the
two it called. The extractor's own diagnosis stays on `cause`.

## Wrapped exactly once, and the stage is checked

`extractV9EncodedStateValue` owns the same wrapping the dispatching entry
applies: a rejected envelope (malformed, truncated, over-long, or tagged for
the other era) leaves as a `DownConvertFailedError` at stage
`'v9 envelope extraction'`, carrying the runtime's own diagnosis on `cause`.
The dispatching entry delegates here rather than decoding again, so a failure
is wrapped exactly once. The `v9` slot of the decoder table is a reference to
that standalone decoder, not a second copy of the same read: the two must not
be able to drift apart, and the wrapping it already owns is why the dispatch
re-wraps nothing it raises.

Re-wrapping is skipped on an identity check over the *stage*, not just the
class. A decoder is injectable, so one that wrapped its failure at a different
stage would otherwise pass straight through and tell a caller who asked for one
era that the other era's codec rejected their bytes. Re-wrapping an
already-correct failure would bury the runtime's diagnosis one level deeper for
no gain.

## The pre-fork runtime is required for every era

`extractEncodedStateValue` takes `ledger8ContractState` for every `version`,
not just `'v8'`. Requiring it unconditionally costs nobody a runtime they would
not otherwise hold. This seam is reached only from `createV8Era`
(`lib/era/load-era.ts`), which has already awaited `loadLedger8()` and hands
that module's `ContractState` in; the `'v9'` decoder is here so that the
*bridge* can read a post-fork envelope before down-converting it, not to serve
a caller who has no pre-fork runtime at all. Such a caller reads ledger-v9
directly and never reaches this function. Note this is a statement about the
call graph, not about bundling — the separate reason the pre-fork types are
imported with `import type` is unaffected either way.

`Ledger8ContractState` is declared as a `Pick` of the onchain-runtime-v3 class,
which reads as though the engine's assembled runtime were the argument. It is
not: the only production caller passes ledger-v8's `ContractState`, and the
`Pick` holds because the two agree on `deserialize`. The engine's own factory
never calls this function at all.

That is what makes the unconditional form the cheaper one: a single guard
covering both eras, with no era-conditional branch to keep correct and no
optional parameter weakening the one call that genuinely needs the argument. It
stops being free the moment this function is surfaced beyond the v8 era facade —
if a v9-only path ever calls it, move the check into the `'v8'` decoder and make
the parameter optional there.

The standalone `extractV9EncodedStateValue` is the release valve that keeps
that requirement from spreading. It was split out of
`extractEncodedStateValue`'s decoder table so the v9 read is reachable without
a pre-fork runtime. The dispatching entry requires that runtime for every
version on purpose — it is what stops a v9 caller drifting into a v8 read with
nothing to decode it — but that requirement is not the v9 decode's own, and a
v9-only consumer should not have to instantiate multi-megabyte pre-fork WASM to
read a state its own era wrote.

## These errors never render caller-supplied text

`DownConvertStage` is a closed union rather than a free-form string for two
reasons: a consumer can `switch` on `stage` exhaustively, and no call site can
interpolate input-derived text into the error message, which is what keeps the
"never renders state contents" guarantee a property of this class rather than
of every caller's discipline.

`DownConvertFailedError` therefore names which step failed and nothing more, so
the message stays useful without ever including the input bytes themselves —
this class never renders raw hex or decoded state contents, only the stage name
and the wrapped `cause`. The underlying runtime distinguishes tag-mismatch,
truncated, trailing-bytes and empty input in its own message; that detail is
preserved on `cause`. `StateDecodeFailedError` likewise renders no hex and no
byte dump of its own, and preserves the decoder's own diagnosis — which
distinguishes a tag mismatch from truncated, trailing or empty input — on
`cause`.

The property has to hold on the two errors that carry an offending value, or it
is not worth having:

- `UnknownLedgerVersionError` carries the offending era string on
  `requestedVersion` for programmatic use, deliberately kept out of the
  message: this is the one input on the seam that comes straight from an
  untrusted caller, and the down-convert errors' "never renders caller-supplied
  text" property is only worth having if it holds here too. For the same reason
  that class names no `version` field — there is no valid era to name.
- `Ledger8RuntimeInvalidError` exposes `missingMember`. Like
  `UnknownLedgerVersionError`, a TypeScript caller cannot produce this error —
  it exists for the untyped JavaScript consumers this package also serves — and
  `missingMember` names the absent binding from `errors.ts`'s own literals
  rather than caller-supplied text, so exposing it leaks nothing.

## The shape of a decoded state

The decoded result is a `ContractStatePojo`, and three of its shape decisions
are deliberate refusals rather than conveniences.

**`verifierKey` and `verifierKeyHash` are absent, not empty.** Both are absent
for a blank slot — the shape a constructor-built state has before a deploy
fills it in. They are absent rather than zero-length or a hash of nothing on
purpose: hashing an empty key yields a real-looking digest that a caller
comparing hashes would match against a contract that was never deployed.

**`entryPoints` is an ARRAY, not a map keyed by circuit id.** A contract state
can declare two distinct byte entry points that decode to the same name (bytes
that are not valid UTF-8 both resolve to the replacement character), and a
name-keyed result would silently drop one of them. An array leaves both visible
to a caller that has to reconcile them.

**`maintenanceAuthority` and `balance` are deliberately absent** from
`DecodableContractState`, the slice of a ledger `ContractState` this decoder
reads: nothing in this framework reads them off a decoded state, and a field
carried "in case" becomes a field a caller depends on.
