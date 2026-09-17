---
title: VerificationPath
---

# The verifier-key check on the path to proving

Before any proof is generated, an operation checks its local verifier key
against the one the deployed contract holds for the entry point being called.
This document records what that check does, what it deliberately does NOT do,
and why the thing it does not do is currently impossible rather than merely
unimplemented.

The code is `packages/contracts/src/internal/verifier-key.ts`. The era half of
the same admission path is a separate thread — see
[EraDispatch](./era-dispatch.md).

## What the check buys

A proof generated against a key the chain does not hold is rejected on
submission. Checking first turns a paid-for, late failure into a free, immediate
one.

The check is synchronous and consults no provider, which matters: there is no
`await` between it and the proving step that follows, so a proof cannot already
be in flight when it refuses.

A never-deployed slot and a wrong key are reported as separate conditions —
`BlankVerifierKeySlotError` and `VerifierKeyMismatchError` — because they are
different faults with different fixes. Collapsing them would send a caller
looking for a build mismatch that is not there. Every failure names the entry
point, so a dApp calling many circuits can tell which one refused.

The comparison reuses `verifierKeysEqual`, already exported from this package,
rather than reimplementing it, so there is one definition of what makes two
verifier keys equal.

## What the module does NOT do, and why

It does not classify a contract's key set by KEY GENERATION, and it deliberately
holds no generation vocabulary.

A ledger contract operation does hold several verifier keys, one per version of
the proving system, but neither ledger era exposes that set:

- `ContractOperation` carries a single `verifierKey` and states in its own
  documentation that "only the latest available version is exposed to this API";
- `ContractState` offers no per-version accessor;
- the generation vocabulary — `ContractOperationVersion`, `IrInsert` — exists
  only on the WRITE side, as maintenance-update instructions.

**Upstream gap: routing on key generation needs a ledger read API that reports
the generation set, which neither era provides today.**

The key's own serialization tag is not a substitute. It reads
`midnight:verifier-key[v6]` on both eras and under both toolchains, measured
across every state fixture, so it carries no generation signal at all. A `[vN]`
is an object's wire-schema version and never a ledger era.

What is left is the check that carries the security value, and it measures
directly what a generation label would only have been a proxy for: a
mis-dispatched operation — the wrong pipeline, or the wrong contract address —
shows up precisely as a local verifier key that fails to byte-match the on-chain
slot, and that is caught here, before proving.

## On a name you will meet in the fixtures

The `co-v2` wording in the fixture file name `state-co-v2-only-foreign.hex` is
retained: it is checked in and byte-referenced from the fixture manifest. It
names nothing in either ledger's API, and nothing in this package's code, so the
mismatch between that file name and the vocabulary here is expected rather than a
defect.

## Related reading

`packages/protocol/docs/verifier-keys.md` covers registration on a deploy and
why a contract's address cannot be recomputed from its input.
`packages/protocol/docs/fail-closed-decoding.md` covers why a blank slot is
reported as absent rather than as an empty key.
