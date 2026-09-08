# Packaging: the framework as a consumer installs it

Everything here runs **outside** the workspace. Inside the monorepo every package
resolves through one hoisted tree, which cannot represent the situation these
harnesses exist to test: a dApp holding contracts from two ledger eras, each
demanding its own Compact runtime.

| Script | What it does |
|---|---|
| `pack-framework.mjs` | Packs every publishable workspace into `.tarballs/` and writes a manifest |
| `linker-smoke.mjs` | Installs each persona from those tarballs under an isolated linker and runs it |
| `ac0-smoke.mjs` | Drives the AC0 fork-crossing scenario against a live fork chain |

```bash
yarn build
node packaging/pack-framework.mjs
node packaging/linker-smoke.mjs            # every persona x linker
node packaging/linker-smoke.mjs pnp retained
node packaging/ac0-smoke.mjs pnp           # needs Docker
```

## The personas

`retained` and `current` each pin one Compact runtime and prove the framework
installs and resolves correctly beside it. `fork-crossing` is the dApp AC0
describes: it pins **no** runtime of its own, and instead depends on two little
generated packages that each wrap one contract and declare the runtime its
codegen demands. That is what a consumer's tree looks like once a retained
contract is packaged rather than pasted in, and it is the only arrangement in
which one process can execute a pre-fork contract and a current one.

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

## How far AC0 gets, and where it stops

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
   carry no `args` at all. `.mjs` means `tsc` never looked.
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

Two AC0 legs are additionally out of reach at this tier, by design of the shipped
code rather than by anything here: `deployContract`'s retained arm refuses
unconditionally before any head is read, and the working pipeline lives in
`contracts/src/internal` where a consumer cannot reach it. So the retained
contract is deployed through protocol's era facade instead, standing in for the
pre-fork dApp that would already have deployed it, and the deploy-branch
stale-head remediation cannot be provoked from an entry point at all.
