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

## AC0 is blocked, and does not pretend otherwise

`ac0-smoke.mjs` is complete and runnable, and it **does not pass today**. It
stands the chain up, installs the dApp, and gets as far as the wallet, which then
fails to sync:

```
Wallet.Sync -> Failed to decode ledger event payload
Error: Wallet sync timeout after 90000ms
```

Observed on a chain carrying ledger-v8 history, independently of the indexer tag
(reproduced on `4.4.0-rc.5` and on devnet's `4.4.0-pre-alpha.16`) and
independently of whether the fork has already been enacted. A wallet syncs from
genesis, so enacting the fork first does **not** remove the pre-fork blocks from
its path — an early reading here that treated "fork first" as an era control was
wrong. The same wallet syncs normally against devnet, which is ledger-v9 from
genesis, on every CI run of the e2e suite.

That is the OQ7 dependency the spec names: FR0 holds end to end only if the
wallet crosses the fork, `migrateState` is a stub, and the wallet test shim is a
named work item precisely so this lane never silently degrades to `test.skip`.
It does not skip. It fails, loudly, with the cause named — and it is deliberately
**not** wired into CI as a blocking gate while that is true.

Two AC0 legs are additionally out of reach at this tier, by design of the shipped
code rather than by anything here: `deployContract`'s retained arm refuses
unconditionally before any head is read, and the working pipeline lives in
`contracts/src/internal` where a consumer cannot reach it. So the retained
contract is deployed through protocol's era facade instead, standing in for the
pre-fork dApp that would already have deployed it, and the deploy-branch
stale-head remediation cannot be provoked from an entry point at all.
