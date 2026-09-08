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

`ac0-smoke.mjs` is complete and runnable, and it **does not pass yet**. What it
reaches, on wallet-sdk 2.0.0-beta.3:

| Leg | Result |
|---|---|
| pre-fork head era | **v8** |
| wallet sync on a ledger-v8 chain | **full** (`shielded`, `unshielded`, `dust`, `synced=true`) |
| retained deploy: constructor, compose, prove | **succeeds** — 1700 bytes of proven v8 transaction |
| retained deploy: `balanceTx` | **refused** |
| fork enactment | **ok** |

The stop is precise:

```
balanceTx received a v8-era transaction payload (serialized bytes, 1700 bytes),
which this provider does not serve.
```

`MidnightWalletProvider.balanceTx` narrows with `unwrapV9`, so **the retained-era
arm is implemented for proving but not for balancing or submitting**. That is the
remaining half of the tx-flow seam work: the proving seams took the union, the
wallet seam still refuses it. wallet-sdk beta.3 can balance a retained-era
transaction — it is the hard-fork release — so implementing that arm is now
possible rather than blocked on anything external.

The lane is deliberately **not** wired into CI as a blocking gate until it does.

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
