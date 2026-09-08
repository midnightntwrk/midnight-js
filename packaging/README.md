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

## AC0 is blocked on the wallet-sdk pin, and does not pretend otherwise

`ac0-smoke.mjs` is complete and runnable, and it **does not pass on this branch**.
It stands the chain up, installs the dApp, and gets as far as the wallet, which
then fails to sync:

```
Wallet.Sync -> Failed to decode ledger event payload
Error: Wallet sync timeout after 90000ms
```

**The cause is the pinned wallet-sdk version, not the ledger era.** This tree
pins `@midnightntwrk/wallet-sdk@2.0.0-beta.2`. **`2.0.0-beta.3` is the hard-fork
release** -- a wallet on it runs ledger-v8 below the chain's fork version and
ledger-v9 from it. Probed directly against a live ledger-v8 chain
(`protocolVersion: 1000000`) using the `build/wallet-sdk-200-beta3` tree:

```
Wallet synced state emission (synced=true): { shielded=true, unshielded=true, dust=true }
```

So the wallet crosses the fork today, on beta.3. AC0 needs that bump landed
underneath it; the branch exists and carries the testkit wallet-layer migration
the bump requires, which is more than a version string.

How the diagnosis went wrong, recorded because the wrong answer was plausible and
took three runs to reach. Holding the persona constant and varying the chain
gave:

| Chain | Node | Indexer | Genesis | Wallet (beta.2) |
|---|---|---|---|---|
| devnet | 2.0.0-rc.3 | 4.4.0-pre-alpha.16 | ledger-v9 | syncs |
| fork-stack images, ordinary genesis | 2.1.0-beta.1 | 4.4.0-rc.5 | ledger-v9 | syncs |
| fork stack | 2.1.0-beta.1 | rc.5 *and* pre-alpha.16 | **ledger-v8** | **fails** |

That correctly isolates the ledger-v8 history as the trigger, and it is why the
failure was first read as the OQ7 dependency (`migrateState` is a stub; FR0 holds
end to end only if the wallet crosses). What the matrix could not show is that
the *wallet version* was the free variable all along -- every row used beta.2.
The lesson: varying the chain under a fixed install is necessary but not
sufficient; the dependency versions are part of the install.

Two further candidates were ruled out along the way. Enacting the fork *before*
the dApp starts is not an era control at all -- a wallet syncs from genesis, so
the pre-fork blocks stay on its path whatever the head is. And
`SIDECHAIN_BLOCK_BENEFICIARY`, which the fork node was missing relative to
`compose.yml`, is now set for consistency and because funded transactions will
need it, but it changed nothing.

The lane is deliberately **not** wired into CI as a blocking gate until the
beta.3 bump lands beneath it.

Two AC0 legs are additionally out of reach at this tier, by design of the shipped
code rather than by anything here: `deployContract`'s retained arm refuses
unconditionally before any head is read, and the working pipeline lives in
`contracts/src/internal` where a consumer cannot reach it. So the retained
contract is deployed through protocol's era facade instead, standing in for the
pre-fork dApp that would already have deployed it, and the deploy-branch
stale-head remediation cannot be provoked from an entry point at all.
