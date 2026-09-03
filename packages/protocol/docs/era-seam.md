---
title: EraSeam
---

# The era seam

`@midnightntwrk/midnight-js-protocol` puts one boundary between a caller and
the two ledger eras it supports. On one side a caller holds a `LedgerEra`
object, or — for the operations only the retained pre-fork era can perform — a
`Ledger8Engine`. On the other side sit two WASM toolchains that must never be
mixed. This document records why that boundary is shaped the way it is: what
kind of value is allowed to cross it, how the surface is split between the two
objects, and how each side is acquired.

## Only bytes and plain objects cross the seam

Every value crossing the era boundary is plain data: `Uint8Array`s and plain
objects, never a live WASM handle. That is what lets a caller hold a result
without also holding the module that produced it, keeps the two eras' results
comparable, and makes a result safe to send through a `structuredClone` or a
worker boundary.

The same discipline is applied in the inward direction, not only on the way
out. In `composeEraV8DeployTx` the contract state crosses into the v8-native
deploy leg by BYTES, which is what that leg takes: it deserializes into its own
era rather than accepting a handle, so no object is passed between two WASM
copies.

That is a transport guarantee, not an immutability one. `readonly` on a result's
members freezes each reference, not the bytes behind it, so a result that
survives a `structuredClone` is not thereby protected from a caller writing
through the arrays it carries. Where this package does need immutability it
freezes the object itself — see [SharedTableDiscipline](./shared-table-discipline.md).

## One surface, the same on both eras

Both eras expose the SAME methods with the same signatures. Which era a
`LedgerEra` object is bound to is readable from `LedgerEra.version` and nowhere
else — a caller that has resolved the era for a record (see
`protocolVersionToLedger` in `packages/protocol/src/version.ts`) hands that
value to `loadLedgerEra` once and then writes era-agnostic code.

The four operations on `LedgerEra` are the era-symmetric ones:

| Operation | Why it is era-symmetric |
|---|---|
| `extractState` | Both eras read a state envelope they wrote. |
| `decodeContractState` | Both eras decode to the same plain-data shape. |
| `composeCallTx` | Both eras compose a call, with the same inputs. |
| `composeDeployTx` | Both eras compose a deploy, with the same result shape. |

Reading a contract state and composing a call or a deploy are era-symmetric
operations: both eras do them, with the same inputs and the same result shape,
so they belong on the era facade (`packages/protocol/src/lib/era/era.ts`) where
a caller can reach them without knowing which era it holds.

## What sits on `Ledger8Engine` instead

`Ledger8Engine` is scoped to what only the retained era can do. What is left
there after the era-symmetric operations have moved to the facade is the
fork-crossing work:

| Operation | Why it cannot sit on the era facade |
|---|---|
| `downConvertForExecution` | Down-converts a post-fork state for pre-fork execution. |
| `executeCircuit` | Runs a pre-fork circuit. |
| `executeConstructor` | Runs a pre-fork constructor. |
| `wrapKeepStateCall` | Binds a pre-fork transcript natively onto v9. |

`Ledger8Engine` is the public surface `createLedger8Engine` builds: the
retained pre-fork EXECUTION capabilities, with the 0.16 runtime instance
already captured in closure — no method there takes a runtime or module
parameter.

## Why the engine does not acquire the v8 ledger module

`createLedger8Engine` deliberately does NOT acquire the v8 ledger module.
Nothing on its surface needs it — call and deploy composition live on the era
facade (`packages/protocol/src/lib/era/era.ts`), which acquires the module
itself when a caller asks for the v8 era.

A consumer that only executes circuits and binds them onto v9 therefore never
instantiates the multi-megabyte v8 WASM, and never hard-depends on ledger-v8
resolving. That property is gated by `v8-load-engine-laziness.test.ts`.

## One memo slot per era

`loadLedgerEra` is memoised per era, so the retained pre-fork WASM is
instantiated at most once per process. `loadLedger8` and `loadLedger8Engine`
memoise their own imports for the same reason, one slot each.

The memoisation is one slot per era, not one shared slot. A shared slot would
hand the second caller whichever era happened to be asked for first, silently
reading one era's bytes with the other era's runtime — the exact confusion this
facade exists to remove.

## A failed acquisition is deliberately not memoised

A FAILED v8 acquisition is not memoised. In `loadLedgerEra` the rejection
propagates unchanged — already a `Ledger8RuntimeMissingError` carrying the
underlying cause — and the next call retries, so a repaired install does not
stay broken for the life of the process.

The same rule holds one level down, at each accessor:

- In `loadLedger8`, a failed load is not memoised: the rejection propagates as
  `Ledger8RuntimeMissingError` and the next call retries the import.
- In `loadLedger8Engine`, a failed load is not memoised either: the next call
  retries the import.

The shared reason is that a module-resolution or instantiation failure is
usually a property of the install, not of the call. Caching the rejection would
convert a repairable environment problem into a process-lifetime one.

## Acquisition is hoisted, so the era methods stay synchronous

`createV8Era` acquires the retained pre-fork ledger through `loadLedger8` — the
only sanctioned runtime path to it — and binds it into closure, so the era's
own methods stay synchronous.

Hoisting the acquisition there, rather than deferring it into each method, is
what makes the two arms symmetrical. It costs a v9-only consumer nothing:
asking for the v8 era IS the observation of v8, and nothing reaches that
function until someone does.

`Ledger8Engine` is built the same way. Every method on it is synchronous
because the object is handed over only after the retained toolchain has been
acquired, so there is nothing left to await — the acquisition happens once, in
`createLedger8Engine`, and the runtime instance it obtained is captured in
closure.

The v9 arm needs no hoisting to reach the same shape. `createV9Era` is wholly
synchronous: `@midnightntwrk/ledger-v9` is this package's current era and is
already linked by the package root, so there is nothing to acquire and nothing
that can fail there.

The result is that both arms hand back an object whose methods are synchronous,
for two eras whose acquisition costs are not remotely alike.

## `loadLedgerEra` is the entry point

`loadLedgerEra` is the only sanctioned way to reach either era's operations.
Pass the version resolved from a record or from the network head (see
`protocolVersionToLedger` in `packages/protocol/src/version.ts`) rather than a
string chosen by hand.

## The v8 arm composes exactly one call

The two eras are not equivalent in `composeCallTx`, and the difference is
deliberate rather than hidden: the retained pre-fork era composes exactly one
call. One shape the facade allows is not expressible on that era and is refused
rather than silently narrowed — a call tree with more than one entry.

The limit is not a missing feature of this package. A cross-contract call is a
ledger-9-only feature that a pre-fork contract cannot emit at all, so the
retained era has no call tree to compose, and composing only the first entry
would drop the rest without a word. The refusal is raised
(`ComposeOptionError` on `'calls'`), never worked around.

## Unproven output only

`composeCallTx` returns the bytes `Transaction.serialize()` produces before
`.prove()` is ever called. Proving needs a proving provider and a running proof
server, neither of which this seam has.
