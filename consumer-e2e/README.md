# Consumer E2E: the framework as a consumer installs it

Everything here runs **outside** the workspace. Inside the monorepo every package
resolves through one hoisted tree, which cannot represent the situation these
harnesses exist to test: a dApp holding contracts from two ledger eras, each
demanding its own Compact runtime.

**What belongs here** is decided by one criterion: it has to run outside the
workspace, on packed tarballs. That is why the fork-crossing scenarios live
here and not beside the other tests. They need a tree in which two Compact
runtime majors resolve at once, and only a packed install produces one. A test
that runs correctly inside the monorepo belongs under `packages/` or
`testkit-js/` instead.

| Script | What it does |
|---|---|
| `pack-framework.mjs` | Packs every publishable workspace into `.tarballs/` and writes a manifest |
| `linker-smoke.mjs` | Installs each persona from those tarballs under an isolated linker and runs it |
| `fork-matrix-smoke.mjs` | Drives the fork-crossing scenario against a live fork chain |

```bash
yarn build
node consumer-e2e/pack-framework.mjs
node consumer-e2e/linker-smoke.mjs            # every persona x linker
node consumer-e2e/linker-smoke.mjs pnp retained
node consumer-e2e/fork-matrix-smoke.mjs pnp           # needs Docker
```

## These scripts are typechecked

`yarn typecheck:consumer-e2e` runs `tsc` over every `.mjs` here through
[`tsconfig.json`](./tsconfig.json). CI runs it on the **Consumer E2E** lane,
before the pack — that lane is the one with an unfiltered `yarn build`, and
`fork-matrix-smoke.mjs` imports `@midnight-ntwrk/testkit-js` by name, so a leg
that builds only `packages/*` cannot resolve what the check is checking. It is
also in the pre-push hook, so a push carries it whether or not you remember.

**Why it exists.** This directory is the only place a transaction crosses the
fork, and its call sites are the framework's own public entry points — but until
the check landed, the only static gate on them was ESLint, which does not know
what `submitCallTx` takes. Two defects shipped through that gap and each cost a
13-minute Hard fork shard to find: `contract` written for `compiledContract`, and
an `args` member on a nullary circuit's options.

**The gate catches the first of those, and only that one is verified by mutation
rather than assumed.** Reverting `compiledContract` to `contract` turns the lane
red, as does reading a finalized record off the top level instead of `public`.
The `args` defect it does NOT catch: a retained wrapper's `Contract` is declared
`any` — necessarily, see `generated-personas.d.ts` — so `args: [1]` on a nullary
retained circuit still typechecks. What rules that one out is the convention
below, written at the call sites, not the type system. Do not read the check as
covering it.

**What it does and does not cover.** The framework's types are real, so result
shapes are fully checked on both arms, and so is every member of a current-era
options object. A retained options object is checked for its own members —
`compiledContract` against `contract` is exactly that — but not for `circuitId`
or `args`, which its `any` instance leaves open. The wrapped contracts cannot be
resolved from here at all: they are generated into the persona tree at run time,
so [`generated-personas.d.ts`](./generated-personas.d.ts) declares the shape they
all share. That file carries what each declaration is allowed to assume, why the
retained side is looser than the current one, and why nothing checks the file
itself — read it before widening either.

Two conventions follow from the check, both recorded at their call sites:

- **`args` is always present**, and `[]` for a nullary circuit. Identical at run
  time — every entry point normalises an absent `args` to the empty tuple — and
  it is what lets a helper generic over many circuits typecheck at all.
- **The framework is imported the way a consumer imports it.** Entry points come
  off `@midnight-ntwrk/midnight-js-contracts`; `networkHeadVersion` and
  `CompiledContract` come off the `@midnight-ntwrk/midnight-js` barrel, not
  `protocol`'s root. The single remaining non-consumer import is
  `loadLedgerEra`, and it is a gap in `contracts` rather than a shortcut taken
  here — `readRetainedLedger` explains it.

## The personas

`retained` and `current` each pin one Compact runtime and prove the framework
installs and resolves correctly beside it. `fork-crossing` is the dApp the fork crossing
describes: it pins **no** runtime of its own, and instead depends on two little
generated packages that each wrap one contract and declare the runtime its
codegen demands. That is what a consumer's tree looks like once a retained
contract is packaged rather than pasted in, and it is the only arrangement in
which one process can execute a pre-fork contract and a current one.

## What the fork crossing asks of each contract

Per retained twin, in order: deploy below the boundary, call, cross, call again
through the same call site (keep-state), call a second time, then **find the
contract again** and call through the handle that returns. The last one is what a
restarted dApp does — it holds an address and a store, not the handle its deploy
returned — and it asserts three things the other legs cannot:

- the attach resolves a verifier key for every one of the artifact's **impure**
  circuits -- the set the returned `callTx` is built from -- and refuses if one
  does not match, so a successful find is the chain and the pre-fork artifact
  still agreeing after migration re-versioned the state;
- `signingKey` comes back from the private-state store rather than from the
  chain, so it is the assertion that the maintenance key the retained deploy
  persisted **before** the fork survived it. That key is not on chain and not
  derivable from anything that is: losing it silently leaves a contract nobody
  can ever rotate a verifier key on;
- the handle it hands back is one that **transacts**. A twin declaring an
  `afterFind` call drives it through `found.callTx`, so the row says the
  re-attached handle works rather than merely that it exists. `private-counter`
  is the twin that pays for it: its witness has to read pre-fork private state
  through a provider built after the boundary.

For that to mean anything the private-state store must not be re-keyed at the
boundary, which is why `retainedProvidersFor` names it `fork-retained-${key}`
with **no era in it**. It used to carry one, which gave every twin two stores
and made the signing key and any private state unmeasurable across the fork. A
real dApp has one store and does not re-key it when the chain forks.

### `private-counter`: the only twin with private state

No other contract in either matrix declares a witness — the retained twins are
constructed with an empty witness object, the current-era ones with
`withVacantWitnesses` — so nothing in the run could show private state crossing
the boundary; the round trip would be `{}` in, `{}` out. Continuity was asserted only at unit tier, against a frozen
LevelDB store (`testkit-js/.../cross-window.ut.test.ts`): real, but offline, with
no chain and no fork in it.

`private-counter` declares a witness that reads `step` out of private state and
discloses it to the ledger. `step` is 7 and is written **once**, before the
boundary, so the ledger figure is a statement about what the witness could still
read:

Each call adds `step` to `round` and 1 to the private `calls` counter — four
calls in all, the last through the re-attached handle. `step` is chosen **per
run** rather than fixed, so the ledger figures are reachable only by reading back
what that run wrote: a store answering with a constant, a default or a replayed
initial value would satisfy a hardcoded number and fails here. The expectations
are derived from it in `RETAINED_MATRIX` in `fork-matrix-entry.mjs` and are
deliberately not repeated here; two copies of numbers that must move together is
one copy too many.

A post-fork call that reached a fresh or reset private state cannot reach the
second figure: it would find no `step` to read and fail outright.
The store itself is checked separately and member by member with `===`, which is
what separates the bigint `2n` from the number `2`; `typeof` is reported in the
failure so the row says which it got. A layer that stopped preserving `bigint`
would satisfy the ledger assertion and fail that one, which is the failure mode
private-state storage actually has.

It is **retained-only**, the mirror of `events` being current-only: a current-era
deploy happens after the fork and has no pre-fork state to carry.

Its assertions have a negative control, for the same reason the surviving-balance
one does. `checkPrivateState` reads a single id and compares what comes back, so
it passes if the provider answers the id it was given — and passes just as
happily if the provider answers *any* id with whatever state it last touched. One
leg therefore asks the same provider, at the same address, for an id nothing ever
wrote. The answer has to be nothing.

### The in-flight probe

One more thing runs in the fork window itself: retained calls driven from the
moment enactment starts until the head flips, recording whether any met the
boundary and was refused with `StaleHeadError`.

It is a **probe, not a leg** — losing the race colours nothing. Hitting it means a
call being in exactly the wrong part of a window `enactFork()` takes about 3m41s
to close, which this harness does not control; a coin toss inside a blocking
release gate is the one thing such a gate must not contain. The row distinguishes
four outcomes — `admitted`, `stale-head` (with `kind`, `startEra`, `freshEra` off
the error), `never-returned`, and anything else verbatim. The wallet is itself
mid-crossing in that window, so a refusal from that direction is expected and is
**not** evidence about stale-head handling.

**One thing it does colour, and it is not the race.** If the chain answered
*none* of the calls, the run observed nothing about the boundary at all — a proof
server down, a wallet that never settled, or a `StaleHeadError` that stopped
being raised and now arrives unrecognised. Each produces a row identical to a
healthy miss, and this probe is the only place in the run that can see
`StaleHeadError` on a live chain, so a silent one would be that regression
reaching a release unobserved. A run where at least one call was admitted is
healthy whether or not it met the fork.

Each attempt is bounded on its own. A retained `submitCallTx` waits on
`watchForTxData`, which polls for finalization without a timeout, so a
transaction the chain *drops* rather than rejects never returns — and that is
precisely the case the probe is trying to provoke. Without a per-call ceiling it
would hang until the outer deadline, which is fatal and sits before the `fork
enacted` gate.

### The three legs that do not race

The probe above cannot assert, and the reason is sharper than "it is a race".
Measured on this stack, on two runs that agreed exactly: nine calls admitted,
then eleven refused at `submitTx`, `metTheBoundary: false` both times. Every one
of those eleven was a real refusal -- the node stops taking retained-era bytes at
the boundary -- and not one was diagnosed as a stale head, because the node
refuses them **before the indexer's head flips**. The re-read each refusal
provokes therefore reports the era the operation started on, and
`handleSubmitRejection` re-throws the rejection unchanged, which is exactly
right. So the window in which a live call can observe `StaleHeadError` is not
half the fork window; it is the sliver after the indexer catches up, and the
probe lands in it about as often as never.

Three legs remove the race instead of running it. Each starts a call **before**
the fork, on a real pre-fork head, and really composes, proves and balances it
there. Only the SUBMISSION is held -- at the `midnightProvider.submitTx` seam --
until the head reports `v9`. Then the bytes go to the real wallet and the real
node, are really refused, and the framework re-reads a head that really moved.

| Leg | Real | Injected |
|---|---|---|
| a retained call parked across the fork is refused as STALE | the operation, the refusal, the re-read | when the submission leaves |
| a parked call whose head RE-READ FAILS is reported undiagnosed | the operation, the refusal | when the submission leaves; the re-read throws |
| a submit rejection under a head that moved BACKWARDS | the operation and the post-fork era it starts on | the refusal, and the re-read's answer |

The first reads `kind`, `startEra` and `freshEra` off the `StaleHeadError` -- the
three fields its remediation text is built from. The other two read `reason` off
the `SubmitRejectionUndiagnosedError`, and the second also asserts that the
undiagnosed arm carries **both** failures, since reporting only one of them is
the defect its `AggregateError` shape exists to rule out.

The third is the one arm no chain produces: a head does not move backwards, so
both its rejection and its backwards reading are injected, and the leg says so at
its call site. What the live chain still contributes there is the era the
operation starts on -- `startEra: 'v9'` is asserted, so a leg that had quietly
begun measuring its own injection would fail.

**Verified by mutation.** With `handleSubmitRejection` reduced to
`throw rejection`, all three legs go red and the shard exits 1. Without that, a
leg that asserts on a live chain is only a leg that passes on a live chain.

**Do not replace the holding with a faked head reading on a chain that has
already forked.** Measured: the retained composition refuses the v9-tagged ledger
parameters a post-fork block serves, with `ComposeOptionError`, before anything
is proven -- so that mechanism never reaches the submit seam at all, and a leg
built on it would be asserting on the composer.

They run on **one shard**, gated like the current-era pre-fork probe: the
diagnosis is a property of the framework and not of any contract, so thirteen
copies of it would buy thirteen copies of one measurement and pay for each in
fork-window time.

## Two things that bite

**Path length.** pnpm's content-addressable store encodes a tarball's path into a
store filename. A deep checkout plus this repo's package names overflows
`NAME_MAX`, so tarballs are staged beside the personas under a short root.

**Undeclared upstream dependencies.** Yarn PnP refuses a package that reaches for
something it never declared, where a hoisted tree silently satisfies it. Two
upstream manifests need patching through `packageExtensions`, generated into each
PnP persona's `.yarnrc.yml`:

| Package | Reaches for, without declaring |
|---|---|
| `@midnightntwrk/wallet-sdk-facade` | `@midnightntwrk/wallet-sdk-utilities` |
| `@midnightntwrk/wallet-sdk-node-client` | `@polkadot/api-base` |

Both are defects in those packages, not in this repo, and both should be dropped
here once upstream declares them. They matter because AC6 names Yarn PnP as a
supported consumer linker — any PnP consumer of the wallet SDK hits these.

## How far the fork crossing gets, and where it stops

> **Superseded.** This section records a run from before `43b9b0b7` and
> `736d45b4` (#1276). The keep-state call it reports as refused now succeeds, so
> the fork crossing is 7/7 for the counter, and the matrix has since been widened to six more
> contracts on both eras. The current picture is whatever
> [`.github/workflows/ci-hardfork.yml`](../.github/workflows/ci-hardfork.yml)
> reports on the head being read: it runs this scenario on every PR, one
> contract per shard, and is a blocking gate. The runs that established the
> widened matrix are recorded in #1296. The table and the diagnosis below are
> kept only as a record of what the failure looked like.

Six of seven legs pass. Latest run:

| Leg | Result |
|---|---|
| pre-fork head era | **v8** |
| retained deploy (construct, compose, prove, balance, submit, indexed) | **succeeds** |
| retained call through the unified entry | **succeeds** |
| fork enactment | **ok** |
| post-fork head era | **v9** |
| post-fork keep-state call through the same call site | **refused** |
| reads its own pre-fork history | **v9 / 2001000** |

A retained-era contract really is deployed and called on a ledger-v8 chain, the
chain really crosses the fork mid-session, and the same dApp reads its own
pre-fork history afterwards.

### The one remaining failure looks like a framework defect, not harness plumbing

The post-fork keep-state call is refused by `assertHeadStateEraAgreement`, from
`readLedger8Snapshot`:

```
IndexerInconsistencyError: The read surface reported a 'v9'-era network head
- confirmed by a second, fresh read - while serving a contract state that
carries a 'v8'-era envelope. Those two answers cannot both describe one chain...
Retry the operation, and if it persists check the health of the configured indexer.
```

The check is symmetric — it refuses a disagreement in either direction:

```ts
if (stateEra === head) return;
const fresh = await readHeadEra(pdp);
if (fresh.head !== stateEra) throw new IndexerInconsistencyError(fresh.head, stateEra);
throw new HeadStateEraMismatchError(head, stateEra);
```

The spec's delivered design is **asymmetric**: "the envelope decides, the block
bounds ... the reported `protocolVersion` dates the read and is an upper bound
only ... so **an older envelope under a newer block is the ordinary case**. Only
the reverse is reported."

A pre-fork contract called after the fork has, by construction, a v8 envelope
under a v9 head. That is the ordinary case the spec describes and the exact
situation keep-state exists to serve, and this check refuses it — with a
remediation that blames indexer health, when the indexer is behaving exactly as
the spec says it does.

Left untouched deliberately: whether the asymmetry belongs in this function, or
whether the keep-state read should reach its snapshot another way, is an MJS-02
design question and not a harness one.

### Four harness defects were fixed to get here

Each was hiding the next, which is why they are worth naming.

1. **The report was silently truncated.** `report()` wrote to stdout and then
   called `process.exit`, which discards whatever the pipe still has queued.
   Measured: an 10337-byte payload lost everything past 8192 bytes, including its
   newline, so the driver's line reader dropped the lot and reported "exited (1)
   without reporting a result". Only ever visible on the failure path, because a
   green report is a few txIds. It now exits from the write callback.
2. **The harness transacted while the wallet was mid-crossing.** The three
   sub-wallets cross the fork at different moments; `syncWallet` gated only on
   `isStrictlyComplete()`, which is true throughout that window. Composing then
   mixes an unshielded V1 leg (stamped at version 0) with a dust V2 leg
   (demanding the v9 epoch) and the SDK refuses it. Measured settling: unshielded
   at +27s, shielded at +30s. `syncWallet` now also requires
   `state.protocol._tag === 'Settled'`, which is the reading the SDK documents
   for exactly this hazard.
3. **`submitCallTx` was called with the wrong option names.** The retained arm
   wants `compiledContract`, not `contract`, and a nullary circuit's options
   carry no `args` at all. `.mjs` meant `tsc` never looked — which it now does,
   see [These scripts are typechecked](#these-scripts-are-typechecked). This is
   the defect that check was built against. Reverting the NAME half is the
   mutation that proves the check still works; the `args` half it cannot see,
   for the reason recorded there.
4. **The deploy was not waited for.** The call leg ran before the indexer had
   served the new contract, which reads as `No contract deployed at ...` rather
   than as a race.

### Retained artifacts cannot satisfy ZK integrity verification

`compactc` 0.31.1 emits `compiler/contract-info.json` and **no**
`compiler/contract-manifest.json`; the manifest is what integrity verification
reads, and the framework requires it fail-closed. So `require` is unsatisfiable
for any pre-fork artifact however intact it is. The harness drops to
`{ verify: 'warn' }`, and `ContractConfiguration.zkConfigIntegrity` now exists to
pass that through. **This is a consumer-facing question, not a harness one**: a
retained-era dApp has no way to satisfy the default, and the migration guide
should say what it should do instead.

### The wallet-sdk pin was the first blocker, and it is gone

Worth recording, because the wrong answer was plausible. On **beta.2** the wallet
could not sync a ledger-v8 chain at all, failing with `Failed to decode ledger
event payload`. Holding the dApp install constant and varying the chain (devnet
v9 -> syncs; fork-stack images with a v9 genesis -> syncs; fork stack with a v8
genesis -> fails) correctly isolated ledger-v8 history as the trigger, and read
exactly like the OQ7 `migrateState` dependency.

It was not. Every row held the wallet at beta.2, so the **version was the free
variable all along**. `2.0.0-beta.3` is the hard-fork release — a wallet on it
runs ledger-v8 below the chain's fork version and ledger-v9 from it — and it
syncs the same chain fully. Varying the chain under a fixed install is necessary
but not sufficient: the dependency versions are part of the install.

Two further candidates were ruled out en route: enacting the fork before the dApp
starts is not an era control (a wallet syncs from genesis, so the pre-fork blocks
stay on its path whatever the head is), and `SIDECHAIN_BLOCK_BENEFICIARY`, missing
from the fork node relative to `compose.yml`, changed nothing.

### Pinning the retained runtime is a consumer requirement, not a harness detail

The personas pin `@midnight-ntwrk/onchain-runtime-v3` explicitly. Without it the
deploy fails with `Ledger8InstanceMismatchError`, because
`compact-runtime@0.16` asks for `^3.0.0` while `protocol` pins one exact version
and a resolver satisfies both with two different copies. Note that the error's own
remediation text blames the two npm scopes; here both copies were on the *same*
scope at **3.1.0 and 3.1.1**, so that advice would have sent a reader the wrong
way. This repository pins it in root `resolutions`; a consumer installing the
framework beside a retained contract has to do the same, and the migration guide
should say so.

**Superseded, and recorded because the reasoning was cited elsewhere.** This
paragraph used to say that two fork-crossing legs were out of reach at this
tier: `deployContract`'s retained arm refused unconditionally before any head
was read, so the retained contract had to be deployed through protocol's era
facade, and the stale-head remediation could not be provoked from an entry point
at all.

The first no longer holds: the retained deploy arm was wired, and every retained
twin is now deployed through `deployContract` — the surface a consumer has — so a
regression in that arm is visible to the matrix instead of being measured around.

The second holds **only for the deploy branch**, which is what it was originally
about. The stale-head path is now driven, and asserted, but by calls, so the
error it provokes carries `kind: 'call'`. The deploy branch's remediation still
cannot be reached from any entry point here. See
[The three legs that do not race](#the-three-legs-that-do-not-race) for what is
asserted and what is injected, and [The in-flight probe](#the-in-flight-probe)
for what that probe can and cannot claim.
