# AC0 across the rest of the contract surface — run report

**Date:** 2026-09-08 / 2026-09-09
**Branch:** `test/1006-ac0-contract-matrix`, off `feat/1006-hardening` at `5bc06ee9`
**Harness:** `node packaging/ac0-smoke.mjs pnp`
**Host:** macOS, Apple silicon, Docker Desktop; every image served from the local cache

## What was run

The AC0 scenario on this branch is `packaging/ac0-smoke.mjs`: it stands up the
fork stack, installs the `fork-crossing` dApp persona from packed tarballs under
Yarn PnP, and drives `packaging/ac0-entry.mjs` as a separate process, enacting
the fork mid-session. Its only contract was `counter-016` — the single pre-fork
fixture this repository ships — so AC0's question had never been asked of
anything but a counter.

It is now asked of six more. `packaging/build-retained-twins.mjs` fetches
`compactc` 0.31.1 through the repository's own fetcher and recompiles the e2e
suite's **unmodified** `.compact` sources with it, producing genuine retained-era
artifacts (language 0.23, Compact runtime 0.16.0, `checkRuntimeVersion('0.16.0')`
in the codegen). Those are wrapped as persona packages beside their current-era
namesakes, so one install holds both toolchains' output for the same contract.

Each retained twin is therefore put through the real AC0 shape:

> deployed on the ledger-8 chain → called there → **called again after the fork,
> through the same call site**, which is the keep-state path.

The current-era matrix from the earlier run is kept alongside it: the same
contracts deployed *after* the boundary, which is a different question (does the
surface work on a chain with pre-fork history) and answers it separately.

Generated, not committed: the retained set is ~262 MB of prover keys, against
`counter-016`'s 128 KB. `packaging/.retained/` is gitignored and rebuilt on
demand.

Image set (compose defaults, unchanged): genesis node 1.0.1, running node
2.1.0-beta.1, indexer 4.4.0-rc.5, proof servers 8.1.2 (pre-fork) and 9.0.0-rc.7
(post-fork), toolkit 2.1.0-beta.1.

## One contract has no retained twin at all

`events.compact` does not compile with the pre-fork toolchain:

```
Exception: events.compact line 54 char 3:
  unbound identifier emit
```

Contract events are MIP-0002; `emit` is not a language-0.23 form. There is no
such thing as a pre-fork events contract, so "does it survive the fork" is not a
question that can be posed for it. The other six compile from unmodified source.

## Result

Everything in this section is **the branch as it stands** (`5bc06ee9`), from runs
3 and 4, which were identical: **4 failures**, exit 1. Run 4 differs only in that
the harness now prints the `cause` chain.

Finding 1 carries a prototype that flips all four to passing; run 5's numbers are
kept there rather than folded in here, so the measured defect and the proposed
fix stay separable.

### Retained era — the real AC0 legs

| Contract | pre-fork deploy | pre-fork call | post-fork keep-state call | envelope after that call |
|---|---|---|---|---|
| counter-016 (baseline) | ok | ok | **ok** | — |
| simple | ok | `noop` SucceedEntirely | **`noop` SucceedEntirely** | `[v8]` |
| unshielded | ok | `mintUnshieldedToSelfTest` SucceedEntirely | **SucceedEntirely** | `[v8]` |
| shielded | ok | `mintShieldedTokens` SucceedEntirely | **SucceedEntirely** | `[v8]` |
| block-time | ok | `testBlockTimeGte` SucceedEntirely | **SucceedEntirely** | `[v8]` |
| shielded-fallible | ok | **FAILED** `balanceTx rejected` | **FAILED** (same cause) | — |
| fee-mint | ok | **FAILED** `balanceTx rejected` | **FAILED** (same cause) | — |

Every retained twin **deployed** on the ledger-8 chain and was indexed carrying
`midnight:contract-state[v6]:`. Four of six then crossed the boundary and were
called again through the same call site. Two cannot be called at all — on either
side of the fork — until the finding-1 prototype is applied, after which all six
pass both legs.

### Current era — deployed after the boundary

All seven pass, unchanged from the earlier run: `simple`, `unshielded` (3
circuits), `shielded` (2), `shielded-fallible`, `fee-mint`, `events` (2),
`block-time`. Including `shielded-fallible` and `fee-mint`, which is the
contrast that makes finding 1 sharp.

## Findings

### 1. The retained call path never feeds the #877 segment router its partition

`shielded-fallible/heavyCheckpointMintAndSend` (#876's regression contract) and
`fee-mint/mintWithUnshieldedFee` (#731 / #877's) both fail, identically, in both
runs, on **both sides of the fork**:

```
Ledger8SeamFailedError: balanceTx rejected a retained-era transaction
  (circuit 'mintWithUnshieldedFee')
  at atSeam -> submitLedger8TxOnRetainedEra -> runLedger8Call -> submitLedger8CallTx
Caused by: Error: (FiberFailure) Wallet.InsufficientFunds: Insufficient funds
  at @midnightntwrk/wallet-sdk-shielded -> TransactingCapabilityImplementation
```

The deploy succeeds, the circuit executes, the proof is generated. **Balancing**
refuses — and `Wallet.InsufficientFunds` against a wallet holding 250 trillion
NIGHT and three shielded token types.

**This is not a missing fix.** #877's segment router,
`zswapStateToSegmentedOffer` in `packages/contracts/src/utils/zswap-utils.ts`, is
shared by both eras and is correct. It takes the partition as its fourth
argument:

```ts
zswapStateToSegmentedOffer(
  zswapLocalState,
  encryptionPublicKeyOrResolver,
  addressAndChainStateTuple?,
  partitionedTranscript: PartitionedTranscript = [undefined, undefined]
)
```

Two call sites, side by side:

| | call site | fourth argument |
|---|---|---|
| current era | `utils/ledger-utils.ts:198` | `rootCall.public.partitionedTranscript` |
| retained era | `internal/ledger8-pipeline.ts:474` | **not passed** |

With the default, `segmentForMatch` takes its *"No segment information available
(no-transcript callers) — place in guaranteed"* branch and every movement lands
in segment 0. For a circuit whose transcript is wholly fallible (heavy prefix +
`kernel.checkpoint()` + mint) the minted output sits in the segment the effects
do not use, and the balancer cannot match it. Checked across every branch in the
repository: all of them pass two arguments there.

Worth recording what the L8 work did do. `6cc60bbc` *"carry Zswap coin movements
on the retained era"* laid the plumbing — the v8 arm reads
`guaranteedZswapOffer` / `fallibleZswapOffer` exactly as v9 does, and
`Ledger8ZswapUnsupportedError` is gone. The fallible pipe exists. Nothing routes
into it.

**The helper's own guard cannot fire here.** It throws on exactly this mistake —
*"Silent fall-through to segment 0 would re-introduce the exact failure mode this
helper exists to fix"* — but only when **both** halves are supplied. From the
retained call site both are `undefined`, so the guard is unreachable and the code
silently does the thing the guard exists to prevent.

**Why the argument could not simply be passed.** The retained execution leg
(compact-runtime 0.16) emits one *unpartitioned* op sequence, and the
guaranteed/fallible split is computed by `ledger.partitionTranscripts` **inside**
`composeCallTx` (`shared/assemble-call.ts:247`) — after the offer has already
been handed over as an option. The `LedgerEra` facade exposed no way to partition
on its own, so the pipeline had nothing to pass. That ordering is what the
pipeline's own comment at `ledger8-pipeline.ts:460` describes.

#### Fixed and verified: routing the offer fixes both, on both sides

Landed as `f290e05b`:

- `shared/assemble-call.ts` — export `partitionCallTranscript`, a thin wrapper on
  the existing `resolvePartition`. No new logic; `assembleCallPrototype`
  delegates to the same code, so there is no second copy to drift.
- `shared/compose-types.ts` — `EraPartitionCallOptions`, `PartitionedCallTranscript`.
- `era/era.ts`, `era/load-era.ts` — the seam on the `LedgerEra` facade, wired for
  both eras.
- `internal/ledger8-pipeline.ts` — resolve the partition **before** building the
  offer and pass it as the fourth argument, exactly as `ledger-utils.ts:198` does.

Result, against runs 3 and 4, which differ only in the framework:

| Leg | runs 3–4 | run 5 (prototype) |
|---|---|---|
| pre-fork retained `shielded-fallible` | FAILED | **SucceedEntirely** |
| pre-fork retained `fee-mint` | FAILED | **SucceedEntirely** |
| post-fork keep-state `shielded-fallible` | FAILED | **SucceedEntirely** |
| post-fork keep-state `fee-mint` | FAILED | **SucceedEntirely** |
| everything else | pass | pass — 23/23 circuit calls |

`failures: []`, exit 0. Both contracts' envelopes moved to
`midnight:contract-state[v8]:` after their keep-state call, like the four that
already worked. No regression anywhere else; 532 protocol unit tests pass.

**Partitioned once.** The first cut resolved the split in the pipeline and let
`composeCallTx` resolve it again from the same inputs — correct only because the
operation is deterministic, and a divergence between the two would have gone
unnoticed. The pipeline now hands the composer that same pair as an
already-partitioned transcript, so the work happens once.
`resolvePartition` returns a caller-supplied pair untouched, which is what makes
one enough.

**Tests, each verified red against its own regression:**

| Test | Pins | Without the fix |
|---|---|---|
| `routes a coin the partition places in the fallible half…` (contracts) | the coin reaches the fallible offer, asserted both ways so neither a both-segments nor a dropped-coin implementation passes | fails |
| `partitions the transcript once and hands the composer the pair…` (contracts) | one `partitionCallTranscript` entry in the orchestration log, and `transcript.kind === 'partitioned'` | fails |
| `resolves the same pair the assembler resolves internally…` (protocol) | the standalone seam and the assembler's internal step agree — the assumption "partition once" rests on | — |

Plus an era-parity case covering both facade arms, and a negative: a parameter
blob the era cannot read is reported as a bad **option**, the way the
composition reports it, not as a failed partition.

**Two things the toolchain caught that a green build did not.** Rollup reported a
real type error — `readonly` versus the mutable tuple `PartitionedTranscript` —
as a plugin *warning*, so `yarn build` exited 0; vitest's typecheck surfaced it
as an unhandled source error, which is why the contracts task failed at exit 1
while printing `497 passed`. And three surface-pinning tests plus two
orchestration-order tests needed updating — the era facade's export discipline
and the pipeline's step-order pin both working as intended.

**Status:** fixed, not merely diagnosed. Lint clean, 536 protocol and 497
contracts unit tests pass, both coverage gates satisfied.

### 2. The state envelope migrates on WRITE, not on the fork

This corrects the picture `packaging/README.md` records. The sampling leg still
shows what it showed before: `midnight:contract-state[v6]:` at all six samples
over 50 seconds after the boundary, with the head at `protocolVersion` 2001000.
So nothing migrates just because the fork happened.

But every retained contract that was **called** after the fork is then served
carrying `midnight:contract-state[v8]:` — measured on all four that got that far.

So migration is driven by a post-fork write, not by the boundary and not by a
read. That is a materially different statement from "the envelope does not
migrate", and it matters for anyone reasoning about how long the retained
envelope survives on a live chain: as long as nobody calls the contract.

### 3. AC0 is now 7/7 for the counter; `packaging/README.md` still says 6/7

The post-fork keep-state call the README records as **refused** by
`assertHeadStateEraAgreement` — "the one remaining failure … a framework defect"
— succeeds, in every run here. No `IndexerInconsistencyError` or
`HeadStateEraMismatchError` appears anywhere.

The README (commit `2f0574d4`, 11:53) predates the fixes: `43b9b0b7` "carry the
chain's ledger parameters across the v8 adapter too" (18:02) and `736d45b4`
"read keep-state against the chain's own state and parameters" (#1276, 18:09),
both on this branch. **Action:** update the table; drop the "one remaining
failure" section; add finding 1 in its place.

### 4. A current-era deploy is never checked against the network head

Deploying `simple` through `deployContract` against a chain that has not forked
yet is not refused by the framework at all. It is constructed, proved, handed to
the wallet, and only then fails:

```
expected instance of LedgerParameters
    at _assertClass                (@midnightntwrk/ledger-v9/…_bg.js:10228)
    at Transaction.feesWithMargin  (@midnightntwrk/ledger-v9/…_bg.js:5724)
    at …calculateFee               (wallet-sdk-dust-wallet/dist/v1/Transacting.js:216)
    at …balanceTransactions        (…/dist/v1/Transacting.js:295)
    at …RunningV1Variant           (…/dist/v1/RunningV1Variant.js:180)
```

The wallet is on its **V1** (pre-fork) variant because the chain is pre-fork, and
its balancer calls ledger-v9's `Transaction.feesWithMargin` with a
`LedgerParameters` that is not a ledger-v9 instance. A wasm-bindgen class assert,
after a full ZK proof was paid for.

There is no guard: `deployContract`'s retained arm refuses unconditionally
*before* any head is read, and every era-pairing check lives in the retained
*read* pipeline. The current-era deploy path never reads the head.

This is the ordinary order of events in the run-up to a fork — a consumer
upgrades their contracts before the chain they target crosses. **Action:** MJS-02,
same footing as finding 1. A named refusal before proving would also separate
this from `Ledger8InstanceMismatchError`, which produces the same wording from a
different cause.

### 5. Retained artifacts still cannot satisfy ZK integrity verification

Confirmed for all seven retained contracts, not just the counter: `compactc`
0.31.1 emits no `compiler/contract-manifest.json`, so every artifact load logs
`no ZK artifact manifest … skipping ZK artifact integrity verification` and the
harness runs on `{ verify: 'warn' }`. `require` is unsatisfiable for any pre-fork
artifact however intact it is.

Already in `packaging/README.md`; now measured across the whole retained set
rather than one fixture. The current-era twins ship a manifest and verify
normally, so the gap is specifically retained artifacts, and it is a question for
the migration guide.

## Harness defects fixed to get these answers

1. **The cause chain was not printed.** Run 3 reported only
   `Ledger8SeamFailedError: balanceTx rejected …`, whose whole message is a
   pointer to `cause`. Four failures said a transaction was refused and none said
   by what. `describeError` now walks `cause` to depth 4, which is what turned
   finding 1 from "two contracts fail" into a named, sourced defect.
2. **The pre-fork probe dropped its stack.** Same class of loss, and it is what
   hid the wallet-SDK frames behind finding 4 on the first run.

## What this still does not cover

- **`events` in any pre-fork form.** Not a gap that can be closed; see above.
- **How common the finding-1 contract shape is in real retained dApps.** That
  decides its severity and this run does not measure it.
- **Wallet-to-wallet transfers across the boundary.** The matrix drives contract
  circuits only. The wallet syncs the crossing chain fully on
  `wallet-sdk@2.0.0-beta.3`, so this is reachable and worth adding.
- **CI hardware.** Everything here was local on a warm image cache.

## Repeatability

| | Run 1 | Run 2 | Run 3 | Run 4 | Run 5 | Run 6 |
|---|---|---|---|---|---|---|
| Scope | current-era matrix | current-era matrix | + retained twins | + cause chains | + routing fix | + partition once |
| Fork applied at | #41 | #40 | #78 | #77 | #83 | #82 |
| Failures | 0 | 0 | **4** | **4** | 0 | 0 |
| Exit code | 0 | 0 | 1 | 1 | 0 | 0 |
| Wall clock | ~15 min | ~15 min | ~25 min | ~25 min | ~25 min | ~25 min |

Runs 1 and 2 were identical to each other; runs 3 and 4 were identical to each
other in every verdict, including which two contracts fail and where. Run 5 is
runs 3-4 with the finding-1 fix and nothing else changed, which is what makes
the four flipped verdicts attributable; run 6 repeats it with the partition
resolved once instead of twice, and is the shape that shipped. No flakiness
observed, and no leg hit the eight-minute per-leg deadline.
