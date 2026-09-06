---
title: SharedTableDiscipline
---

# Shared table discipline

Almost every era-keyed decision in `@midnight-ntwrk/midnight-js-protocol` is a
table rather than a chain of comparisons, and every one of those tables is built
the same way: a null prototype where it is indexed by a value, frozen, typed so
that a missing entry is a build failure, and guarded at runtime anyway. This
document holds the reasoning behind that shape, so the tables themselves and the
symbols above them do not have to repeat it.

## Frozen shared constants and tables

The rule is that anything this package hands out — or memoises and hands to
every caller in the process — is frozen.

`LEDGER_VERSIONS` (`packages/protocol/src/lib/shared/ledger-version.ts`) is
frozen, not merely `as const`: it is a public exported constant, and an unfrozen
array is one a downstream package can mutate for every other consumer in the
process. Nothing reads the value at runtime to dispatch on — the era tables are
typed by `LedgerVersion` and built independently — so the freeze guards the
export, not the dispatch.

`PROTOCOL_ERROR_CODES` (`packages/protocol/src/errors.ts`) applies the same
discipline to its own registry: frozen so a downstream package cannot mutate the
shared registry object at runtime.

`ENVELOPE_DECODERS` (`packages/protocol/src/lib/era/envelope.ts`) is the one
table whose mutation would reroute contract-state bytes to the wrong era's
codec, and it should not be the one left writable.

Both era arms handed out by `loadLedgerEra`
(`packages/protocol/src/lib/era/load-era.ts`) are frozen for the matching
reason: a memoised era is one object shared by every caller in the process, so
an unfrozen one lets any consumer reassign `composeCallTx` for all the others.

The same construction — `Object.freeze` over an `Object.assign` onto
`Object.create(null)` — is used for `KNOWN_AXES`
(`packages/protocol/src/lib/v8/instance-guard.ts`) and for
`AXIS_BARE_PACKAGE_NAMES` in `packages/protocol/src/errors.ts`, and
`PUBLISHED_SCOPES` in the same module is frozen as a plain array for the reason
`LEDGER_VERSIONS` is.

## Null-prototype lookup tables

A table that is *indexed by a value* gets a null prototype as well as a freeze.
Both matter, for different reasons, and the null prototype is the one that
prevents a wrong answer rather than a mutation.

`ENVELOPE_DECODERS` is indexed by a value that is only type-checked for
TypeScript callers, and a plain object literal resolves an unexpected key
through `Object.prototype`. Two inherited members are directly reachable, and
neither of them fails:

- `'constructor'` would hand the caller's own raw bytes straight back.
- `'toString'` would return `'[object Undefined]'`. The inherited method is read
  into a local and called bare, so its `this` is `undefined` under ESM strict
  mode, not the table.

Both are typed as an `EncodedStateValue`, and neither throws. That is the whole
argument: the failure mode of a plain object literal here is not an exception,
it is a plausible-looking value flowing on as if a decode had happened.

`KNOWN_AXES` in `packages/protocol/src/lib/v8/instance-guard.ts` is
null-prototype and frozen for the reason `ENVELOPE_DECODERS` is: the value
indexing it is only type-checked for TypeScript callers, and a plain object
literal answers `true` for every `Object.prototype` member.

The same exposure is why `UnknownLedgerVersionError`
(`packages/protocol/src/errors.ts`) exists at all. TypeScript callers cannot
produce it, because `version` is typed as `LedgerVersion`; it exists for the
untyped JavaScript consumers this package also serves, where an unvalidated era
string threaded from an indexer response would otherwise reach an era-keyed
decision — and, where that decision is a lookup table rather than a `switch`,
could resolve an inherited `Object.prototype` member and yield a
plausible-looking non-era.

There is a second closed union this package validates at a boundary for the same
reason, the ledger-8 instance axis. Its own argument — why the axis is not only
a label — belongs with the guard that uses it; see [DualInstantiationGuard](./dual-instantiation-guard.md).

## Own-property lookups where a null prototype is not available

Two places index an object this package did not build, so they cannot give it a
null prototype and use an own-property lookup instead.

`executeCircuit` (`packages/protocol/src/lib/v8/execute.ts`) resolves a circuit
by own property: `impureCircuits` is a plain object literal on every compiled
contract, so a bare index would resolve `toString` or `constructor` off the
prototype chain and dispatch into it.

The structural comparison in
`packages/protocol/src/lib/v8/down-convert.ts` is explicitly a partial guard,
not a total one: the object it tests with `in` is a plain object, so `in` also
succeeds for every `Object.prototype` member. Keys in the pinned algebra are
only `tag`/`content`/`value`/`alignment`/`length`, none of them inherited, so
the hole is unreachable today — but `Object.hasOwn` would close it outright and
is the right move the moment that helper is used on anything wider.

## Compile-time exhaustiveness

Every era-keyed table in the package is total by construction, and the
totality is checked by the type system rather than by review.

`_allLedgerVersionsAreMapped` in `packages/protocol/src/version.ts` is the
canonical form and the one the other sites name. It is a compile-time-only
guard: if `LEDGER_VERSIONS` ever grows without a matching entry being added to
`NODE_MAJOR_TO_LEDGER`, the assignment stops type-checking, because the
conditional type resolves to `never`.

`loadLedgerEra` (`packages/protocol/src/lib/era/load-era.ts`) does the same in a
`switch`, in the style of `version.ts`'s `_allLedgerVersionsAreMapped` and the
Merkle walk in `packages/protocol/src/lib/v8/down-convert.ts`: a new member of
`LEDGER_VERSIONS` stops the `const unhandled: never = version` assignment
type-checking, so the omission is a build failure rather than a review miss.

The Merkle rehash walk in `packages/protocol/src/lib/v8/down-convert.ts` uses
the same `const unhandled: never` form against the vendor's `StateValue`
variants, in the style of `version.ts`'s `_allLedgerVersionsAreMapped`: a vendor
bump that adds a variant stops the assignment type-checking, so the omission is
a build failure rather than a review miss.

`KNOWN_AXES` and `AXIS_BARE_PACKAGE_NAMES` reach the same property through
`satisfies` rather than an assignment: the duplication of the one axis literal
is checked, not trusted — `satisfies` fails to compile if `Ledger8InstanceAxis`
gains a member the table does not name.

## Why the runtime guard is not redundant with it

The compile-time guard and the runtime guard answer different threats, so
neither replaces the other.

In `loadLedgerEra`, the runtime rejection is not redundant with the
`never` assignment, because `version` reaches the function from untyped callers
too. A TypeScript caller cannot produce an `UnknownLedgerVersionError` there; it
exists for the untyped JavaScript consumers this package also serves, where an
era string threaded from an indexer response would otherwise fall through to a
plausible-looking non-era. The shape of the dispatch decides how much the
runtime guard has to do: `packages/protocol/src/lib/era/envelope.ts` defends the
same input against resolving an inherited `Object.prototype` member, because its
dispatch is a lookup table, while `loadLedgerEra` is a closed `switch`, where no
string can resolve to anything but a case or the default.

`extractEncodedStateValue` (`packages/protocol/src/lib/era/envelope.ts`)
validates `version` before it is used, rather than trusting it from the type
signature. That guard is what keeps `stage` inside its closed union: `stage` is
built from `version`, so an unvalidated string would otherwise reach a field
whose whole contract is that consumers can `switch` on it.

In the Merkle rehash walk, the runtime throw is not redundant with the
`never` assignment either. The `StateValue` reaching that walk comes from a
caller-injected runtime, whose WASM can emit a tag the pinned `.d.ts` does not
declare — and those declarations are known to be unfaithful. Returning `void` on
an unrecognised variant would skip every Merkle tree nested inside it without a
word, which is the exact silent-wrong-data outcome that module exists to
prevent.

## A Record rather than a ternary or an if-chain

`ENVELOPE_DECODERS` holds one decoder per `LedgerVersion` as a `Record` rather
than a ternary, so that adding a member to `LEDGER_VERSIONS` fails to compile
there instead of silently routing the new era's bytes to the pre-fork decoder —
the same discipline `packages/protocol/src/version.ts` applies to its own
mapping tables.

`ComposeFailedError.MESSAGES` (`packages/protocol/src/errors.ts`) is a total
`Record` rather than an if-chain, for the same reason `ENVELOPE_DECODERS` is
one: adding a stage without its message fails to compile there, instead of
silently shipping whichever message the fallthrough happened to reach. Every
entry takes the era rather than naming one, so the same table serves both axes;
an entry that hardcoded an era would report a v9 failure as a v8 one, which is
worse than saying nothing, because the two eras' remediations differ.

`ComposeOptionError.MESSAGES` (`packages/protocol/src/errors.ts`) is a total
`Record` for exactly the reason `ComposeFailedError.MESSAGES` is one: adding an
option without its message fails to compile there. This one was measured rather
than assumed. As an if-chain it fell through to the `'ttl'` text, so a seventh
option would have told a caller their time-to-live was invalid while `option`
named something else — an error contradicting its own field.

## The node-major mapping table

The `protocolVersion` integer encodes the *node* version as
`major * 1_000_000 + minor * 1_000 + patch`, so a whole node major occupies a
`1_000_000`-wide range. That encoding is the one used by
midnightntwrk/midnight-indexer
(`indexer-common/src/domain/protocol_version.rs`).

`NODE_MAJOR_TO_LEDGER` in `packages/protocol/src/version.ts` is deliberately
narrower than the indexer's table: only majors `1` and `2` are mapped.
midnight-js ships against node 1.x and 2.x, so a 0.x `protocolVersion` — which
the indexer does map — is treated here as an unknown version rather than a
supported era. This is a fail-closed choice, not a mirror.

`lookupLedger` in the same module is kept as a small typed function, rather than
indexing the `as const` table directly, because a `number`-typed key cannot
index an object type with only numeric literal properties. The
`Partial<Record<number, LedgerVersion>>` parameter type is what makes the
`=== undefined` guard in `protocolVersionToLedger` type-driven instead of
relying on a cast.

## How much of the envelope dispatch is reachable

The era dispatch in `packages/protocol/src/lib/era/envelope.ts` is more general
than its current callers need, and that is a known state rather than an
oversight. No production caller passes anything but a literal today, and
`extractEncodedStateValue` is not reachable from any subpath export. See the
note on collapsing this dispatch in `packages/protocol/README.md` for what that
would cost.

## Related documents

- [DualInstantiationGuard](./dual-instantiation-guard.md) — the ledger-8 instance axis, and why
  `onchain-runtime-v3` is the only one asserted.
- [FailClosedDecoding](./fail-closed-decoding.md) — what the decode guarantees once a decoder has been
  selected, and how the failure classes divide the work between them.
- [ModuleGraphAndLazyLoading](./module-graph-and-lazy-loading.md) — why `LEDGER_VERSIONS` lives in a leaf module,
  and which modules are build entries.
- [EraSeam](./era-seam.md) — why the era arms are memoised per era and what crosses the seam.
