# Retained-era coverage outside the fork lane

Covers `testkit-js/testkit-js-e2e/test/retained-call.v8era.it.test.ts`, the twin artifacts under
`testkit-js/testkit-js-e2e/src/contract/compiled-retained/`, the build step that finishes them
(`testkit-js/testkit-js-e2e/scripts/rewrite-retained-runtime.mjs`), and the ledger instance
`testkit-js/testkit-js/src/wallet/wallet-transaction.ts` deserializes retained payloads with.

## Purpose

Exercise the retained-era call pipeline against a live pre-fork chain from the default testkit
suite, rather than only from the `Hard fork` lane in `consumer-e2e`.

The fork lane is sharded, outside the default matrix and minutes per shard. That cost shapes what
happens when it goes red: #1345 was a real defect in the retained pipeline, it did turn that lane
red, and the failing assertion was removed in favour of a write-based workaround rather than
debugged. Coverage that is cheap to run and cheap to read changes that incentive.

## Which contracts earn a twin

A retained twin says something only where the retained pipeline **reconstructs** state the current
pipeline receives intact — the `QueryContext` the 0.16 glue builds from `.data` plus the contract
address, and the `CallContext` hanging off it. Anything a circuit computes from its own arguments
and its own ledger fields is era-independent and already pinned by unit goldens, so a retained
`counter` or `simple` adds nothing.

Two twins are built:

| twin | field it reads | what it is for |
|---|---|---|
| `unshielded` | `CallContext.balance` (slot 5) | the field #1345 was about, and the only one this framework carries |
| `block-time` | `CallContext.secondsSinceEpoch` (slot 2) | a second artifact set through deploy, prove, balance and admission |

**Only `balance` is carried by this framework.** `packages/protocol/src/lib/v8/execute.ts` calls
`createCircuitContext` without the optional `time` argument, and `compact-runtime@0.16`'s
`createInitialQueryContext` then stamps `secondsSinceEpoch: BigInt(time ?? Date.now() / 1000)` from
its own clock while leaving `balance` an empty map for a `ChargedState` input. That asymmetry *is*
#1345.

So `block-time` is not a second reading of the same plumbing. It is a smoke test for a second
retained artifact set, and it exercises the circuit-`assert` rejection path. It still earns its
place — a single twin cannot distinguish "this contract works" from "retained contracts work" — but
no pipeline regression can move the field it reads.

`shielded`, `shielded-fallible` and `fee-mint` are deliberately deferred: they add `comIndices`,
the transcript partition and the heaviest effects shape, at 31 MiB, 73 MiB and 146 MiB of prover
keys respectively. `events` can never have a retained twin — `emit` is not a language-0.23 form.

### What the assertions have to be

Circuit **return values**, not admission alone. A retained pipeline that hands the circuit the wrong
state produces a transcript the node re-runs and disagrees with, so the failure surfaces as an
opaque submit rejection. The value a circuit hands back is what distinguishes "the pipeline lied"
from "the network refused".

Measured, both against a live node 1.0.0 chain:

- with the balance carried (`#1349`), the whole file is 11/11;
- with `block.balance` reverted to an empty map, exactly one test fails —
  `SubmissionError` in 2 s on the balance read — and the rest stay green.

The unheld-colour control passes in **both** runs, and that is the point of keeping it: a colour the
contract never held is absent from the real balance map too, so it agrees with the node whether or
not the pipeline carried anything. It says nothing about #1345 — but it is the only assertion that
kills a balance map whose keys collapse, which would answer `MINT_AMOUNT` for every colour.

The same trap applies to the over-send control. An unshielded send of more than the contract holds
is **accepted** when the recipient is the contract itself — nothing moves outward, so nothing makes
the ledger compare the amount against the standing balance. The assertion names the wallet as
recipient for that reason.

That control is still only half a pair. A pipeline where *every* retained send failed would refuse
the oversized one too, for the wrong reason, and stay green — so the file also sends a part of the
balance successfully and reads the remainder back. The retained result carries no `unshielded`
movement summary (a current-era member), so the balance delta is what shows the send reached the
chain rather than merely being accepted.

The refusal is pinned to the **`submitTx`** seam exactly, not to an alternation. Measured: the wallet
funds the fee and balances an oversized send happily, and the node refuses it at apply time. So every
wallet-local fault — a failed ledger import, an unfunded wallet, a balancer fault — surfaces one seam
earlier and no longer satisfies the assertion. The provider's own reason is not usable for this: it
reaches `cause` as a generic `SubmissionError: Transaction submission error`, with no balance text to
match on.

## Why the twins are committed, and held apart from `compiled/`

Compiled contract artifacts are committed in this repository (383 MiB under
`testkit-js/testkit-js-e2e/src/contract/compiled/`), so committing 11 MiB of twins follows the
house pattern and needs no CI change — every job checks the repository out.

They live in a **sibling** directory rather than under `compiled/` because the build job uploads
`src/contract/compiled` as the `e2e-tests-contracts` artifact, which all 26 shards of the default
matrix download, and `testkit-js/*/dist/` as `testkit-dist`. Twins in either path would be paid for
by every shard that will never read them. For the same reason the retained `zkConfigPath` points at
`src/`, not at `dist/`.

`yarn compact-retained` rebuilds them with `compactc` 0.31.1 (language 0.23, Compact runtime
0.16.0). The framework reads the era from `compiler/contract-info.json`, so a twin built with the
current toolchain would be routed to the current-era pipeline and pass while proving nothing; the
build step refuses an artifact set whose declared `runtime-version` is not `0.16.0`, and the test
file asserts the same thing on the committed artifacts.

## Why the emitted module's runtime import is rewritten

`compactc` emits the bare specifier:

```js
import * as __compactRuntime from '@midnight-ntwrk/compact-runtime';
__compactRuntime.checkRuntimeVersion('0.16.0');
```

The root `resolutions` pin that specifier to the current runtime for every workspace, so a twin left
alone throws the moment it is imported. Unit tests work around this with a per-file
`vi.mock(... => import('compact-runtime-ledger8'))`, but in an e2e file that mock also redirects the
framework's own imports — `packages/protocol` re-exports the current runtime from its barrel and
from the `/compact-runtime` subpath, which the e2e suite uses.

So the redirection is done in the **artifact**, at build time, to `compact-runtime-ledger8` — this
repository's alias for the retained runtime, and the same one-line rewrite already applied to the
committed `counter-016` fixture's declaration file. The twin is then self-contained: no mock, and
the current runtime keeps resolving normally in the same module graph.

## Which ledger-v8 instance the wallet seam uses

`ledger-v8` is installed **twice**, under both npm scopes: `@midnightntwrk/ledger-v8`, which
`packages/protocol` pins, and `@midnight-ntwrk/ledger-v8`, which the wallet SDK reaches for. Same
version, byte-identical WASM. The root `resolutions` alias collapses the download to one archive but
**not** the runtime instances: the node-modules linker materialises a directory per package *name*,
so two names are two module URLs, two WASM instantiations, and two sets of classes that refuse each
other.

```
(await import('@midnightntwrk/ledger-v8')).Transaction
  !== (await import('@midnight-ntwrk/ledger-v8')).Transaction
```

`adoptVersionedUnbound` and `adoptVersionedFinalized` inflate the retained payload's bytes and hand
the result straight to the wallet SDK. Built with protocol's copy, that object dies inside the SDK's
balancer:

```
Ledger8SeamFailedError: balanceTx rejected a retained-era transaction (circuit 'initialState')
Caused by: expected instance of LedgerParameters
  at _assertClass  @midnightntwrk/ledger-v8/midnight_ledger_wasm_bg.js
  at Transaction.feesWithMargin
  at TransactingCapabilityImplementation.calculateFee
```

This is not a fork defect and not specific to the pre-fork lane. It is reached by any retained
deploy or call made from inside the workspace, on either side of the boundary, and it had never been
observed because nothing in the workspace had ever made one. The `Hard fork` lane is not a
counter-example: `consumer-e2e` personas install outside the repository under an isolated linker,
where the same alias *does* collapse the two names. `consumer-e2e/personas.mjs` documents the alias
and why it is needed; the isolated linker is what the lane actually runs under.

The rule the fix follows: **an ADR-0006 seam carries bytes so that the receiver inflates them with
its own module.** Everything these two functions build is for the wallet SDK, so they load the SDK's
copy, through the SDK's own `./ledger/v8` subpath — by definition whichever copy the installed SDK
uses, so it cannot drift if the SDK finishes the scope migration. `packages/protocol`'s copy stays
where it belongs: retained execution, which never hands a handle across this seam.

Repointing protocol's `v8` re-export at the SDK's copy took the retained e2e file from every deploy
refused to fully green, which is what identified the cause; the shipped fix is the narrower one
above.

A unit test pins the module identity, because the two copies are structurally identical and no
existing test loaded both.
