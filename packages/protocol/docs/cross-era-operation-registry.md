---
title: CrossEraOperationRegistry
---

# Carrying a retained contract's operations into the current era

The fork does not rewrite a contract's stored state. A contract deployed before
it and dormant across it is served, indefinitely, carrying its retained-era
envelope. The current ledger's composer cannot deserialize those bytes — it
accepts only its own envelope — so a keep-state call had nothing to hand it and
could not be composed at all.

`reexpressOperationsForCurrentEra` (`packages/protocol/src/lib/v9/operations.ts`)
is what closes that gap. This document records what actually crosses the era
boundary there, why it is a faithful re-expression rather than a substitution,
and what it deliberately leaves behind.

The composition this feeds is [ComposeRefusalOrder](./compose-refusal-order.md);
the execution half of the same keep-state path is
[RetainedEraExecution](./retained-era-execution.md).

## What the composer actually wants

The `contractState` a composition takes is NOT the state being proven.

`assembleCallPrototype` uses it for exactly one thing: looking up the
`ContractOperation` for the circuit, to read its verifier key. The state the call
is bound to travels separately, as the transcript's `preState`.

So what has to cross the era boundary is the OPERATION REGISTRY, not the state.
That is the whole of what this function carries, and reading it as a state
conversion is the misunderstanding worth guarding against.

## Why this is faithful, not a substitution

Nothing is minted here. Every verifier key written out is one the chain already
holds:

- The keys come from the chain's own state, read through the retained decoder.
- The caller has already checked its local artifact against them — see
  [VerifierKeys](./verifier-keys.md).
- The current ledger models retained-era operations NATIVELY.
  `ContractOperationVersion` carries a `'v3'` arm precisely for them, so a key
  preserved across the fork is a value this ledger is built to hold.

That last point is the load-bearing one. This is not a shim that dresses an old
key as a new one; it is the current ledger's own representation of an operation
from the previous era.

## The primary state is left at its default

Deliberately. A caller that needed the state itself would be reading it from
`ContractStatePojo.state`, not from this registry.

Filling the primary state here would produce a value that looks authoritative,
travels into a composition that never reads it, and would have to be kept in step
with a state this function is not given.

## The empty registry is a refusal

If no entry point carries a key, the function raises `ComposeOptionError` rather
than returning a registry that answers for nothing.

The refusal belongs here, not one layer down. Left to the composer, the failure
would name a CIRCUIT — the first one looked up and not found — and send a caller
to audit an entry point that is fine. Raised here it names the real condition:
the state carried no keys at all.

## Related reading

`packages/contracts/docs/keep-state-pipeline.md` covers the pipeline this sits
in, and `docs/adr/0004-lazy-v8-era-access-via-protocol-subpath.md` covers why the
retained decoder is reached through a subpath import.
