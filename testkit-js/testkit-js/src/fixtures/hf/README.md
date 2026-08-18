# OQ9 hard-fork fixtures

Fixtures for the HF v8/v9 protocol work (MJS-01, task 0.2). Every fixture is a
`ContractState`-shaped (or, for one negative, a deliberately-foreign
`ContractOperation`-shaped) byte blob, committed as lower-case hex text, for
the **spike's `counter` contract** — the smallest contract in
`spike-dapp-hf` (a single `round: Counter` ledger cell, one nullary circuit
`increment()`), per the plan's minimal-size mandate (repo precedent:
WASM-fixture coverage timeouts on large fixtures).

Source of truth for every claim below is `generators/*.mjs` (mint scripts,
runnable) plus a throwaway, not-committed `generators/.probe.mjs` used while
authoring this fixture set to verify every deserialize outcome quoted here
against the real `@midnightntwrk/ledger-v8@8.1.1` /
`@midnightntwrk/ledger-v9@1.0.0-rc.3` packages — nothing below is guessed.

## Fixtures

| File | protocolVersion | Mint path | What it is |
|---|---|---|---|
| `state-v8.hex` | 1000000 | mint (npm, cheap) | `state-v8-v6-envelope.hex` bridged through `ledger-v8`'s `ContractState` (`LedgerContractStateV8.deserialize(bytes).serialize()`), the same bridge `assemble.ts:59-60` uses. **Finding:** byte-identical to its input — ledger-v8's codec accepts the v6-tagged envelope unchanged. |
| `state-v8-v6-envelope.hex` | 1000000 | golden (ported) | Raw `compact-runtime-0.16` `ContractState.serialize()` output. Tag `contract-state[v6]`. Ported verbatim from `spike-dapp-hf/island-3/driver/tests/builder/fixtures/downcast-v8.hex` (byte-identical across islands 1/2/3 and `ts-downcast/`). |
| `state-migrated-v9.hex` | 2000000 | golden (ported) | A real ledger-8→9 migrated contract state. Tag `contract-state[v8]`. Ported verbatim from `spike-dapp-hf/island-3/driver/tests/builder/fixtures/migrated-v9.hex`. Produced upstream by the spike's Rust simulator's `migrate-8-to-9` (tkerber's `v8-to-v9-state-translation`) — see `DECISIONS.md`/`ISLANDS.md` in the spike. |
| `state-migrated-v9-merkle.hex` | 2000000 | mint (npm, cheap) | Synthetic (not a real migration): a hand-built, rehashed `StateBoundedMerkleTree` wrapped in a `ContractState`, built only from `@midnightntwrk/ledger-v9`'s public API. Deserializes cleanly with `ledger-v9`. |
| `state-tampered-keyset-v8to9.hex` | 2000000 (claimed) / 1000000 (actual payload) | derive | `state-v8-v6-envelope.hex` with only the tag's version digit flipped `'6'→'8'`. |
| `state-tampered-keyset-v9to8.hex` | 1000000 (claimed) / 2000000 (actual payload) | derive | `state-migrated-v9.hex` with only the tag's version digit flipped `'8'→'6'`. |
| `state-tampered-bytes.hex` | 2000000 | derive | `state-migrated-v9.hex` with one payload byte bit-flipped past the header. |
| `state-both-keys.hex` | null (ambiguous by design) | derive | `state-v8-v6-envelope.hex` ++ `state-migrated-v9.hex` concatenated — both envelope tags in one blob. |
| `state-co-v2-only-foreign.hex` | 1000000 | mint (npm, cheap) | A5 mis-dispatch negative: a `ledger-v8` `ContractOperation` (a different top-level schema entirely), not a `ContractState`. |

`fixtures.json` repeats this table machine-readably, plus the exact envelope
tag / claimed-vs-actual era for each, plus `status` (`ok` / `synthetic` /
`tampered`).

### protocolVersion scheme

Per OQ2: `node-major * 1_000_000 + node-minor * 1_000`. v8-era fixtures use
`1_000_000` (node 1.x, pre-fork); v9-era fixtures use `2_000_000` (node 2.x,
post-fork). `state-both-keys.hex` has no single valid value by construction
(it wears both tags) and is recorded as `null`.

## Verified decode matrix

Every fixture was actually fed to both `@midnightntwrk/ledger-v8`'s and
`@midnightntwrk/ledger-v9`'s `ContractState.deserialize` while authoring this
set. All nine outcomes:

| Fixture | `ledger-v8.ContractState.deserialize` | `ledger-v9.ContractState.deserialize` |
|---|---|---|
| `state-v8.hex` | ACCEPT | THROW (tag `v6` != `v8`) |
| `state-v8-v6-envelope.hex` | ACCEPT | THROW (tag `v6` != `v8`) |
| `state-migrated-v9.hex` | THROW (tag `v8` != `v6`) | ACCEPT |
| `state-migrated-v9-merkle.hex` | THROW (tag `v8` != `v6`) | ACCEPT |
| `state-tampered-keyset-v8to9.hex` | THROW (tag `v8` != `v6`) | THROW ("failed to fill whole buffer" — the v6 payload is not a valid v8 payload) |
| `state-tampered-keyset-v9to8.hex` | THROW ("deserialized storage graph not in normal form") | THROW (tag `v6` != `v8`) |
| `state-tampered-bytes.hex` | THROW (tag `v8` != `v6`) | THROW ("out of range for u64") |
| `state-both-keys.hex` | THROW ("Not all bytes read...4692 bytes remaining") | THROW (tag mismatch at offset 0) |
| `state-co-v2-only-foreign.hex` | THROW (tag `contract-operation[` != `contract-state[`) | THROW (tag `contract-operation[` != `contract-state[`) |

**Every negative fixture fails closed on both decoders — no silent-accept was
found.** `state-both-keys.hex` in particular shows `ledger-v8`'s deserializer
validates full-buffer consumption (it does not silently stop after the first
complete message and ignore trailing bytes). This is the strongest empirical
input this task produced for the OQ9 harness-gating decision — see the task
report's "OQ9 inputs" section for the full write-up.

## Mint-path decisions (per the brief's (a)/(b)/(c) order)

For the two "hard" fixtures (`state-migrated-v9.hex`,
`state-migrated-v9-merkle.hex`), the brief mandated checking, in order:

- **(a) Does `ledger-v9` expose a migration entry point?** Checked
  `node_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts` for
  `migrate`/`from_v8`/`upgrade`. Only hit: `upgradeFromTransient(transient:
  Value): Value` — an unrelated Zswap-value helper, not a state migration.
  **(a) FAILED** for both fixtures.
- **(b) Does the spike already have committed golden migrated-state hex?**
  `find . -iname '*.hex'` across `spike-dapp-hf` found exactly two hex
  fixtures, present identically in all of islands 1/2/3 and `ts-downcast/`:
  `downcast-v8.hex` (tag `v6`) and `migrated-v9.hex` (tag `v8`) — see
  `island-3/driver/tests/builder/downcast.test.ts`, which uses them exactly as
  this task needs (a real migrated state, and a v6-envelope negative).
  **(b) SUCCEEDED for `state-migrated-v9.hex`** (and, as a bonus, for
  `state-v8-v6-envelope.hex`, which the brief also needed). **(b) FAILED for
  `state-migrated-v9-merkle.hex`** — no small tree-bearing golden exists (only
  the large `bboard`/`shielded-hf` fixtures carry a Merkle tree, and copying
  one would violate the minimal-size mandate).
- **(c) Build the spike's Rust simulator.** Not attempted: (b) already
  supplied `state-migrated-v9.hex`, and `state-migrated-v9-merkle.hex`'s actual
  requirement — a `ContractState` whose `StateValue` contains a
  `BoundedMerkleTree` that deserializes cleanly with `ledger-v9` — turned out
  to be mintable directly from `ledger-v9`'s public `StateBoundedMerkleTree`/
  `StateValue` API (see `generators/mint-migrated-v9-merkle.mjs`), with no
  dependency on any specific contract's compiled ledger schema (the
  down-convert's rehash step is contract-agnostic — it recurses the generic
  `StateValue` algebra). (c) was therefore never time-boxed or attempted.

## `twin-contract/`

`twin-contract/counter.compact` is the spike's counter contract, copied
verbatim from
`spike-dapp-hf/island-3/tests/tester/fixtures/counter/counter.compact`.

`twin-contract/compiled/` is that same source **recompiled with this repo's
own toolchain** (`compactc 0.33.0-rc.2`, fetched via `yarn fetch-compactc` per
`packages/compact`; `.envrc` pins `COMPACTC_VERSION=0.33.0-rc.2`), which
reports `compiler-version: 0.33.0`, `language-version: 0.25.0`,
`runtime-version: 0.18.0-rc.1`, `ledger-version: ledger-9.1.0.0-rc.3` (matches
this repo's root `resolutions` pin for `@midnightntwrk/ledger-v9` and
`@midnight-ntwrk/compact-runtime` — see "Version pin note" below) — the
current v9-era compiler, as opposed to the spike's own artifacts (compiler
`0.31.1`, runtime `0.16.0`, pre-fork).

**PS-schema identity confirmed**: `twin-contract/compiled/compiler/
contract-info.json`'s `ledger`/`circuits` sections are structurally identical
to the spike's own compiled counter (`island-3/tests/tester/fixtures/counter/
out/compiler/contract-info.json`) — same single ledger field
(`round`, index `0`, exported, storage `Counter`), same single circuit
(`increment`, impure, proof, no arguments, empty tuple result). Only the
compiler/language/runtime version numbers differ, as expected for a "compiled
under the current toolchain" twin.

`state-co-v2-only-foreign.hex` (see above) is keyed with
`twin-contract/compiled/keys/increment.verifier` — the twin's own freshly
generated verifier key, not imported from the spike.

## Regenerating

```
node testkit-js/testkit-js/src/fixtures/hf/generators/generate-all.mjs
```

runs every mint/derive script and overwrites the seven non-golden `.hex`
files in place. `state-v8-v6-envelope.hex` and `state-migrated-v9.hex` have no
generator (there is nothing to regenerate — they are golden ports); to update
them, re-copy from a newer spike checkout and re-run
`generate-all.mjs` (the tamper/derive scripts read the goldens back in, so
they stay consistent automatically).

To recompile `twin-contract/`:

```
yarn fetch-compactc   # from packages/contracts/, once, if packages/compact isn't built yet — run `yarn turbo run build --filter=@midnight-ntwrk/midnight-js-compact` first
node packages/compact/dist/run-compactc.cjs testkit-js/testkit-js/src/fixtures/hf/twin-contract/counter.compact testkit-js/testkit-js/src/fixtures/hf/twin-contract/compiled
rm testkit-js/testkit-js/src/fixtures/hf/twin-contract/compiled/contract/index.js.map   # trim: not needed, keeps the fixture minimal
```

## Version pin note (deviation from the brief, with evidence)

The brief asked for `@midnightntwrk/ledger-v8` **and**
`@midnight-ntwrk/onchain-runtime-v3`/`compact-runtime@0.16.0` as
`testkit-js/testkit-js` devDependencies, to mint the v6/v8-envelope fixtures
directly on the 0.16 stack. This repo's root `package.json` `resolutions`
already pins `@midnight-ntwrk/compact-runtime` to `0.18.0-rc.1` repo-wide —
installing `0.16.0` alongside it would be silently overridden by Yarn's
resolution, not actually give a 0.16 runtime. Since mint-path (b) already
supplied both fixtures that would have needed the 0.16 stack (as goldens),
`compact-runtime@0.16.0` / `onchain-runtime-v3` were never added as
dependencies here — only `@midnightntwrk/ledger-v8@8.1.1` and
`@midnightntwrk/ledger-v9@1.0.0-rc.3` (the latter already pinned by the root
`resolutions`) were added, and both are the only packages any generator here
actually imports.

## npm/registry note

The user's global `~/.npmrc` routes `@midnight-ntwrk` and `@midnightntwrk` to
GitHub Packages with tokens that may not resolve public npm packages. This
repo uses **Yarn Berry** (`nodeLinker: node-modules`), which ignores
`~/.npmrc` entirely and uses `.yarnrc.yml`'s `npmScopes` instead.
`.yarnrc.yml` already pins `midnight-ntwrk` (hyphenated) to GitHub Packages,
but has **no entry for `midnightntwrk`** (no hyphen) — so `@midnightntwrk/*`
packages (`ledger-v8`, `ledger-v9`) fell through to the default public
registry and resolved without any `.npmrc`/`.yarnrc.yml` change. Both
`yarn install` runs in this task (root install, and after adding the two new
devDependencies) completed with no 401s. No registry fix was needed or made.
