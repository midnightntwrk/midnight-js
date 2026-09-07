# Hard-fork fixtures

Fixtures for the ledger v8/v9 hard-fork migration work. Every fixture is a
well-formed `ContractState`-shaped byte blob, committed as lower-case hex
text, for the **`counter` contract** — the smallest contract in the
upstream hard-fork prototype (a single `round: Counter` ledger cell, one
nullary circuit `increment()`), chosen for minimal size (repo precedent:
WASM-fixture coverage timeouts on large fixtures). Every fixture deserializes
as a `ContractState` on at least one ledger version — none of them fail at
the envelope-tag check by design; where a fixture exists to probe a failure,
that failure is pushed as deep as the fixture's construction allows (a
version-tag mismatch, a corrupted payload, or — for the mis-dispatch
negative — a foreign key inside an otherwise-valid operation slot, deferring
the failure to execution).

Source of truth for every claim below is `generators/*.mjs` (mint scripts,
runnable) plus throwaway, not-committed `generators/.probe*.mjs` scripts used
while authoring this fixture set to verify every deserialize outcome quoted
here against the real `@midnightntwrk/ledger-v8@8.1.1` /
`@midnightntwrk/ledger-v9@1.0.0-rc.3` packages — nothing below is guessed.

> **On provenance paths.** Where a fixture is described as ported from
> `spike-dapp-hf/…`, that is an internal hard-fork prototype repository, not a
> public one: the paths record *where the bytes came from* so the port can be
> audited internally, and are not resolvable from outside the project. Every
> behavioural claim in this file is reproducible from the committed bytes and
> the two ledger packages named above, without access to that repository.

## Consuming these fixtures

The whole tree below `src/fixtures/hf/` is **published** with
`@midnight-ntwrk/testkit-js`. The build copies it verbatim into
`dist/fixtures/hf/`, and `src/fixtures-hf.ts` resolves it relative to its own
module URL, so the same accessors work from source inside this repo and from
the installed package outside it:

```ts
import {
  HF_FIXTURE_NAMES,
  hfFixturePath,
  hfFixturesManifest,
  readHfFixture
} from '@midnight-ntwrk/testkit-js/fixtures-hf';

const bytes = readHfFixture('state-v8.hex');                    // Uint8Array
const era = hfFixturesManifest['state-v8.hex'].protocolVersion; // 1000000
const source = hfFixturePath('twin-contract/counter.compact');  // absolute path
```

`readHfFixture` covers the nine `.hex` states. Everything else — both compiled
contracts, `increment-transcript.golden.json`, `fixtures.json`, this README —
is reached by path through `hfFixturePath`. Both accessors throw rather than
returning a placeholder: an unknown fixture name, a path that climbs out of the
fixture directory, a missing file and a hex file that is not whole hex are all
errors. `hfFixturesManifest` is validated against `HF_FIXTURE_NAMES` at import,
so a manifest that has drifted fails immediately instead of at first lookup.

Two things to know about what ships:

- **`generators/` is deliberately excluded.** The mint scripts import the
  `ledger-v8`/`ledger-v9` devDependencies, which a consumer of the published
  package does not get. They stay a repo-only tool; see
  [Regenerating](#regenerating).
- **The compiled contract files are data, not modules.** In particular
  `counter-016/compiled/contract/index.js` expects
  `@midnight-ntwrk/compact-runtime@0.16`, which nothing in this repo installs
  (see [Version pin note](#version-pin-note-deviation-from-the-brief-with-evidence)).
  Read these files, do not `import` them.

## Fixtures

| File | protocolVersion | Mint path | What it is |
|---|---|---|---|
| `state-v8.hex` | 1000000 | mint (npm, cheap) | `state-v8-v6-envelope.hex` bridged through `ledger-v8`'s `ContractState` (`LedgerContractStateV8.deserialize(bytes).serialize()`), the same bridge `assemble.ts:59-60` uses. **Finding:** byte-identical to its input — ledger-v8's codec accepts the v6-tagged envelope unchanged. |
| `state-v8-v6-envelope.hex` | 1000000 | golden (ported) | Raw `compact-runtime-0.16` `ContractState.serialize()` output. Tag `contract-state[v6]`. Ported verbatim from `spike-dapp-hf/island-3/driver/tests/builder/fixtures/downcast-v8.hex` (byte-identical across islands 1/2/3 and `ts-downcast/`). |
| `state-migrated-v9.hex` | 2000000 | golden (ported) | A real ledger-8→9 migrated contract state. Tag `contract-state[v8]`. Ported verbatim from `spike-dapp-hf/island-3/driver/tests/builder/fixtures/migrated-v9.hex`. Produced upstream by the prototype's Rust simulator's `migrate-8-to-9` state translation. |
| `state-migrated-v9-merkle.hex` | 2000000 | mint (npm, cheap) | Synthetic (not a real migration): a hand-built, rehashed `StateBoundedMerkleTree` wrapped in a `ContractState`, built only from `@midnightntwrk/ledger-v9`'s public API. Deserializes cleanly with `ledger-v9`. |
| `state-tampered-keyset-v8to9.hex` | 2000000 (claimed) / 1000000 (actual payload) | derive | `state-v8-v6-envelope.hex` with only the tag's version digit flipped `'6'→'8'`. |
| `state-tampered-keyset-v9to8.hex` | 1000000 (claimed) / 2000000 (actual payload) | derive | `state-migrated-v9.hex` with only the tag's version digit flipped `'8'→'6'`. |
| `state-tampered-bytes.hex` | 2000000 | derive | `state-migrated-v9.hex` with one payload byte bit-flipped past the header. |
| `state-both-keys.hex` | null (ambiguous by design) | derive | `state-v8-v6-envelope.hex` ++ `state-migrated-v9.hex` concatenated — both envelope tags in one blob. |
| `state-co-v2-only-foreign.hex` | 2000000 | mint (npm, cheap) | Mis-dispatch negative: a full, well-formed `ContractState` (deserializes cleanly on `ledger-v9`) whose `increment` operation slot carries a FOREIGN verifier key — borrowed from the golden `state-migrated-v9.hex`'s real `post` operation (a different, real migrated circuit, not built from the retained counter artifacts). Fails later, at execution, not at decode. |

`fixtures.json` repeats this table machine-readably, plus the exact envelope
tag / claimed-vs-actual era for each, plus `status` (`ok` / `synthetic` /
`tampered`).

### protocolVersion scheme

Scheme: `node-major * 1_000_000 + node-minor * 1_000`. v8-era fixtures use
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
| `state-co-v2-only-foreign.hex` | THROW (tag `v8` != `v6` — this fixture is v9-era only) | **ACCEPT** (shape-positive — see "The mis-dispatch fixture" below) |

**Every fixture that is meant to fail at decode does fail closed, on both
decoders — no silent-accept was found among them.** `state-both-keys.hex` in
particular shows `ledger-v8`'s deserializer validates full-buffer consumption
(it does not silently stop after the first complete message and ignore
trailing bytes). `state-co-v2-only-foreign.hex` is the one fixture in this
table that is SUPPOSED to accept on `ledger-v9` — see below for why, and
where its failure actually lives. This is the strongest empirical
evidence this fixture set provides about how the two deserializers behave
across the fork boundary.

### The mis-dispatch fixture (`state-co-v2-only-foreign.hex`)

Minted (`generators/mint-co-v2-foreign.mjs`) as: a fresh, blank
`ContractState` (`StateValue.newNull()` data — the ledger payload doesn't
matter for this fixture's purpose) with one operation registered under the
counter's own circuit name, `increment` — but the `ContractOperation`
object registered there is not built from anything in `twin-contract/`. It
is the REAL `post` operation `ContractState.deserialize('state-migrated-v9.hex').operation('post')`
returns: bboard's own, genuinely migrated, pre-fork-compiled verifier key
(the single-slot `op.v2` shape, migrated via
`source.v2 -> op.v2`; `ContractOperation`'s plain `verifierKey` getter is
documented as exposing "only the latest available version"). Verified
(`generators/mint-co-v2-foreign.mjs`'s own self-check, run at mint time, plus
the smoke test): the result deserializes cleanly with `ledger-v9`
(`operations()` returns `['increment']`), and its `verifierKey` bytes are
confirmed to differ from `twin-contract/compiled/keys/increment.verifier` —
genuinely foreign, not just relabeled.

This is deliberate: `downcastV9StateForExecution` (`downcast.ts`) reads
*only* `.data` (the `StateValue`), never `.operations()` — so this fixture
cannot and does not fail at down-convert. Nor does the mere presence check
`assemble.ts` uses (`state.operation(circuitId) === undefined ? throw :
...`) catch it — the slot IS populated. The mismatch is only observable at
the next step: attempting to actually prove/verify a real `increment` call
against this state's `increment` slot, which is keyed for a completely
different circuit. That later, deterministic, typed failure (a verifier-key
mismatch at proof-verification time) is the engine-level test this fixture
feeds; minting it is out of scope here (it needs a real proof-server round
trip), so this fixture supplies only the well-formed-but-booby-trapped STATE
input for that test to consume.

## Tampered fixtures

The byte-level offsets `generators/mint-tampered-and-derived.mjs` uses,
spelled out (all four are reproducible, documented byte surgery on a real
golden — see the file itself for the exact code):

- **`state-tampered-keyset-v8to9.hex`**: `state-v8-v6-envelope.hex` with only
  the tag's single ASCII version digit flipped, `'6' -> '8'`, at the offset
  found by `indexOf('[v') + 2` (offset 25 for this golden). Everything else
  is untouched.
- **`state-tampered-keyset-v9to8.hex`**: `state-migrated-v9.hex`, same
  technique, digit flipped `'8' -> '6'` (offset 25).
- **`state-tampered-bytes.hex`**: `state-migrated-v9.hex` with one payload
  byte XORed with `0xff` at `headerLen + 32` (offset 57), tag left intact.
- **`state-both-keys.hex`**: `state-v8-v6-envelope.hex` bytes followed
  immediately by `state-migrated-v9.hex` bytes, concatenated — no offset
  math, just `Buffer.concat`.

None of these four are states a real chain could ever produce; each probes
exactly one failure mode (schema-tag lie, payload corruption, or envelope
over-read). See "Verified decode matrix" above for what actually happens
when each is fed to both ledgers' `ContractState.deserialize`.

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

`twin-contract/compiled/` is that same source **recompiled with a v9-era
toolchain** — a one-off snapshot taken with `compactc 0.33.0-rc.2` (fetched via
`yarn fetch-compactc` per `packages/compact`), reporting
`compiler-version: 0.33.0`, `language-version: 0.25.0`,
`runtime-version: 0.18.0-rc.1`, `ledger-version: ledger-9.1.0.0-rc.3`. It is
not regenerated by `yarn turbo compact`, so it stays pinned to those versions
while the repo's own toolchain moves on (`.envrc` now pins
`COMPACTC_VERSION=0.34.0-rc.0`, and root `resolutions` pins
`@midnight-ntwrk/compact-runtime` to `0.19.0-rc.0` — see "Version pin note"
below). Its `checkRuntimeVersion('0.18.0-rc.1')` guard therefore rejects the
repo's current runtime: tests read only its paths and `keys/`, never the module
itself. Contrast the spike's own artifacts (compiler `0.31.1`, runtime
`0.16.0`, pre-fork).

**PS-schema identity confirmed**: `twin-contract/compiled/compiler/
contract-info.json`'s `ledger`/`circuits` sections are structurally identical
to the spike's own compiled counter (`island-3/tests/tester/fixtures/counter/
out/compiler/contract-info.json`) — same single ledger field
(`round`, index `0`, exported, storage `Counter`), same single circuit
(`increment`, impure, proof, no arguments, empty tuple result). Only the
compiler/language/runtime version numbers differ, as expected for a "compiled
under the current toolchain" twin.

`twin-contract/compiled/keys/increment.verifier` is used as the KNOWN-GOOD
key in the smoke test, to confirm `state-co-v2-only-foreign.hex`'s embedded
key is genuinely foreign (see "The mis-dispatch fixture" above) — that
fixture is NOT keyed with it.

## `counter-016/`

`counter-016/compiled/contract/index.js` is the spike's own `counter.compact` recompiled
with the spike's **original, pre-fork toolchain** (`compiler-version: 0.31.1`,
`language-version: 0.23.0`, `runtime-version: 0.16.0` — from the spike's own
`island-3/tests/tester/fixtures/counter/out/compiler/contract-info.json`), as
opposed to `twin-contract/compiled/`, which is the SAME source recompiled with
a v9-era toolchain (`compactc 0.33.0-rc.2`, `runtime-version:
0.18.0-rc.1`). The two are not interchangeable: `twin-contract/compiled/` emits
0.18-era (async) codegen and cannot run against a `compact-runtime@0.16`
instance; `counter-016/` emits the sync codegen the retained pre-fork engine
(`packages/protocol/src/lib/v8/execute.ts`) actually exercises, and is the
fixture `v8-execute.test.ts` runs `increment` against.

Ported verbatim (byte-for-byte, only source-map generation trimmed — same
"drop the map, keep the module minimal" precedent as `twin-contract/`) from
`spike-dapp-hf/island-3/tests/tester/fixtures/counter/out/contract/index.js`
(git blob `405a68179e4cfb3fb6307486461df7879ab508f3`). The contract source
itself is unchanged from `../twin-contract/counter.compact` — a single
`round: Counter` ledger cell with one nullary circuit `increment()` — so it is
not duplicated here.

Only the compiled contract module is ported — no `.d.ts`, no
`compiler/contract-info.json`, no `keys/`, no `zkir/`. None of those are read
at import time; the module's only own-time dependency is a bare
`@midnight-ntwrk/compact-runtime` import, satisfied in tests by redirecting
that specifier (module-registry-scoped to the one test file that imports this
fixture) to this repo's own `compact-runtime-ledger8` — the same retained
`@midnight-ntwrk/compact-runtime@0.16.0`, installed under an alias so it can
coexist with the root's `0.19.0-rc.0` pin (see
`packages/protocol/package.json`).

The `compiled/` path segment (mirroring `twin-contract/compiled/`) is not
cosmetic: `.licenserc.yaml`'s `paths-ignore` excludes `**/compiled/**` from
the Apache-2.0 license-header check, which this ported-verbatim upstream
artifact — same as `twin-contract/compiled/contract/index.js` — must not
carry.

`counter-016/increment-transcript.golden.json` is a golden regression
reference for the transcript `executeCircuit` (`lib/v8/execute.ts`) produces
when running `increment()` against this contract's freshly-constructed
initial state (`round: 0`). The spike carries no recorded transcript fixture
of its own to port, so this one was minted once, directly from
`v8-execute.test.ts`'s own real execution against this ported artifact
(no proving involved — circuit execution through `compact-runtime@0.16` is
fully deterministic), and is committed as JSON with bigints written as
`` `${n}n` ``-suffixed strings and byte arrays as lower-case hex (the two
value kinds an `AlignedValue`/`Op` tree carries that JSON has no native
encoding for). `preContractState`/`postContractState`/`privateStateAfter` are
excluded from the golden — they carry live `ChargedState` WASM objects, not
plain data — the transcript's post-state is instead asserted directly in the
same test via the contract's own `ledger()` projector (`round` goes `0n` →
`1n`).

## `coin-receiver-016/`

The one thing `counter-016/` cannot exercise: a circuit that **receives a
shielded coin in-contract**. Twelve lines of Compact
(`coin-receiver.compact`) — `receiveShielded(coin)` followed by
`pot.writeCoin(coin, kernel.self())` into a `QualifiedShieldedCoinInfo` cell.

That shape is the point, not the contract. Receiving registers the coin's
commitment with the runtime; writing it back has to *qualify* the coin, which
needs the INDEX that commitment was recorded at. So a transcript from this
circuit **cannot be partitioned** unless the commitment indices the runtime
recorded travel with the call — which is what
`packages/protocol/src/test/era-partition-received-coin.test.ts` asserts, in
both directions, on both eras. `counter-016` moves no coins and reaches none
of it.

Deliberately NOT the spike's `micro-dao` (`island-3/driver/src/contracts/micro-dao/`),
which has the same receive path inside a 239 KB, 11-circuit artifact with
witnesses, a Merkle tree, minting and voting phases — none of which this
tests. This fixture is 26 KB and its source is readable in one screen.

**Compiled in this repo, not ported** — the one provenance difference from
`counter-016/`. The `compact` toolchain manager offers the same compiler the
spike used, so there was nothing to port:

```
compact compile --skip-zk \
  testkit-js/testkit-js/src/fixtures/hf/coin-receiver-016/coin-receiver.compact \
  <tmpdir>
```

with `compact` on version **0.31.1**, which reports `language-version 0.23.0`
and `runtime-version 0.16.0` — the same toolchain triple as `counter-016/`
(and as the spike's own DAO artifact). Only `contract/index.js` and
`compiler/contract-info.json` are committed: no `.d.ts` (the consuming test
declares the slice it drives), no `keys/`, no `zkir/` (nothing here proves,
and the call's key location hashes whichever registered key the test supplies
— `twin-contract`'s `increment.verifier`).

`compiler/contract-info.json` is committed **as a gate, not as decoration**:
the test asserts `runtime-version: 0.16.0` and `compiler-version: 0.31.1` on
it, so a recompile with the repo's own pinned `compactc` (0.34.x → runtime
0.19, async codegen) fails loudly instead of silently producing an artifact
that never reaches the seam under test.

The artifact is committed byte-verbatim, including its trailing
`//# sourceMappingURL=index.js.map` line with no `.js.map` beside it — same as
`counter-016/`, so a recompile can be diffed against it directly. Vitest prints
one harmless "could not read map file" line per run because of it.

The `compiled/` path segment matters for the same reason it does under
`counter-016/`: `.licenserc.yaml`'s `paths-ignore` excludes `**/compiled/**`
from the Apache-2.0 header check, which generated code must not carry.

### The three recorded `coin-receiver-016` fixtures

Three fixtures were added beside the compiled artifact so that a **coin-moving
call can be driven without a retained runtime**. They are minted, and on every
run re-verified against a live execution, by
`packages/protocol/src/test/era-record-coin-receiver.test.ts` — the same
provenance pattern as `counter-016/increment-transcript.golden.json`, which was
itself minted from `v8-execute.test.ts`'s own real execution.

| File | What it is |
|---|---|
| `coin-receiver-016/receive-coin-transcript.recording.json` | The `TranscriptPojo` the real `compact-runtime@0.16` runtime produces for `receive_coin`, with the state it ran against. Values are TAGGED — `{"__bigint"}`, `{"__bytes"}` (lower-case hex), `{"__map"}` — because unlike the counter golden this recording is *decoded* and fed back to a real ledger, and `partitionContext.block.parentBlockHash` is a genuine hex string sitting beside genuine byte arrays. |
| `coin-receiver-016/state-v6-envelope.hex` | A real retained-era `ContractState` (`contract-state[v6]`) whose `.data` is the state that same constructor built, with `receive_coin` registered. The state a pre-fork call is dispatched against. |
| `coin-receiver-016/state-v9.hex` | The same primary state as a current-era `ContractState` (`contract-state[v8]`), with `receive_coin` registered. The state a post-fork keep-state call is dispatched against. |

Neither `.hex` is reachable through `readHfFixture` — that accessor covers the
nine top-level state fixtures. Reach these by path, through `hfFixturePath`.

> **The recording substitutes exactly two values, and nothing else.**
> `partitionContext.block.secondsSinceEpoch` and `.lastBlockTime` carry the wall
> clock the glue stamps when a circuit context is built, and `executeCircuit`
> takes no clock — so a recording that kept them would be a different file on
> every run. They are frozen to `1700000000n` and `0n`. Every other member is
> the runtime's own output, and the minting suite asserts both halves of that:
> that the recording matches a live execution everywhere else, and that the
> frozen recording still composes on **both** eras, so the substitution is not
> load-bearing.

> **THE VERIFIER KEY IN BOTH ENVELOPES IS A STAND-IN, AND IT IS NOT THE COIN
> RECEIVER'S KEY.** `coin-receiver-016` ships no `keys/` — nothing in this repo
> proves against it — so both envelopes register
> `twin-contract/compiled/keys/increment.verifier` under `receive_coin`. That
> key belongs to a **different circuit**. It is used only because a
> `ContractOperation`'s setter validates a real, tagged verifier-key blob and
> rejects arbitrary bytes, so the slot cannot be filled with a placeholder. Any
> pre-proving key check driven off these fixtures therefore passes **only
> because both sides of the comparison use the same stand-in**: it exercises the
> check as wiring and says nothing about this circuit's real key. Do not read
> these envelopes as carrying a genuine `receive_coin` key, and do not use them
> to argue anything about key provenance. Contrast
> `state-co-v2-only-foreign.hex`, which wears a foreign key deliberately in
> order to FAIL.

## Regenerating

```
node testkit-js/testkit-js/src/fixtures/hf/generators/generate-all.mjs
```

To regenerate the three recorded `coin-receiver-016` fixtures (they are minted
from a real execution inside a test, not by a generator script — see their
section above):

```
MINT_HF_FIXTURES=1 yarn --cwd packages/protocol vitest run src/test/era-record-coin-receiver.test.ts
```

runs every mint/derive script and overwrites the seven non-golden `.hex`
files in place. `state-v8-v6-envelope.hex` and `state-migrated-v9.hex` have no
generator (there is nothing to regenerate — they are golden ports); to update
them, re-copy from a newer spike checkout and re-run
`generate-all.mjs` (the tamper/derive scripts read the goldens back in, so
they stay consistent automatically).

To recompile `coin-receiver-016/` (needs the retained-era compiler — see its
section above for why the version is not negotiable):

```
compact list                      # 0.31.1 must be installed
compact compile --skip-zk testkit-js/testkit-js/src/fixtures/hf/coin-receiver-016/coin-receiver.compact /tmp/coin-receiver-out
cp /tmp/coin-receiver-out/contract/index.js            testkit-js/testkit-js/src/fixtures/hf/coin-receiver-016/compiled/contract/
cp /tmp/coin-receiver-out/compiler/contract-info.json  testkit-js/testkit-js/src/fixtures/hf/coin-receiver-016/compiled/compiler/
```

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
already pins `@midnight-ntwrk/compact-runtime` to `0.19.0-rc.0` repo-wide —
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
