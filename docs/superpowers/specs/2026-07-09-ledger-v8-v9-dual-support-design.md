# Design Spec — Ledger v8 / v9 Support in Midnight.js (Hard-Fork Transition)

**Status:** Draft v5.0 (clean consolidation — security & QA review rounds pending)
**Date:** 2026-08-17 (v5.0). History: v1 2026-07-09 → v4.3 2026-08-17 in git history of this file; v5.0 is a from-scratch consolidation after the fork-crossing rework (v4.0), two applied review rounds (ARCH, DEV) and the owner rulings that unified the entry API and eliminated the transitional package.
**Author:** Systems architecture (spec workflow)
**Source issues:**
- [#1004 — MJS-01 protocol package: unified v8/v9 dispatch APIs](https://github.com/midnightntwrk/midnight-js/issues/1004) — incl. the [fork-crossing comment](https://github.com/midnightntwrk/midnight-js/issues/1004#issuecomment-5216489608) (@kapke, 2026-08-07)
- [#1005 — MJS-02 contracts package: protocol-version orchestration](https://github.com/midnightntwrk/midnight-js/issues/1005) — incl. the [upstream answers](https://github.com/midnightntwrk/midnight-js/issues/1005#issuecomment-5190024611) and [@tkerber confirmation](https://github.com/midnightntwrk/midnight-js/issues/1005#issuecomment-5202692002)
- [#1006 — MJS-03 provider API updates](https://github.com/midnightntwrk/midnight-js/issues/1006)

Part of the **Ledger v8→v9 Hard Fork Migration** (SOW-Q3-10 / product#119).

---

## 1. Problem & Why

The Midnight blockchain hard-forks from Ledger protocol **v8** to **v9**:

- Historical on-chain records are v8-encoded; blocks past the fork height are v9. One dApp session may read v8 history and submit v9 transactions.
- At the fork the protocol **migrates every deployed contract's on-chain `ContractState` into the ledger-9 envelope**, preserving the pre-fork verifier key (`source.v2 → op.v2`, `v3`/`ir` empty). State *data* and call transcripts are **byte-identical** across versions — only the envelope is re-versioned. These facts are **contractual upstream** (#1005 answer 1).
- A pre-fork contract's compiled artifacts and its executing runtime are pinned to ledger-8 (compact `0.31` / compact-runtime `0.16`). The DApp-HF spike ([`shieldedtech/spike-dapp-hf`](https://github.com/shieldedtech/spike-dapp-hf)) proved recompile-and-upgrade is avoidable: **keep-state** — down-convert the migrated state, execute on the unchanged ledger-8 stack, wrap the transcript in a native ledger-9 transaction with a V2 proof.
- **Migration reality (#1004 comment):** dApp upgrades cannot be coordinated with the fork height. Existing dApps bump midnight-js **before** the fork and must keep operating on the v8 chain; at the fork they must keep working unchanged; afterwards they run on v9. A framework version that operates on only one side of the fork is not adoptable.

Today the framework is hard-pinned to v9: `protocol` re-exports `@midnightntwrk/ledger-v9` / `onchain-runtime-v4` exclusively; there is no runtime version selection anywhere.

**Goal (FR0 — fork-crossing):** one framework major that crosses the fork with **one version-agnostic API**: (a) full operation on the v8 chain pre-fork (calls, deploys, submission), (b) decode of v8 history at any time, (c) unchanged v9-native operation post-fork, (d) keep-state for pre-fork contracts post-fork — the ledger version is resolved at runtime from the network and the contract, never by the developer choosing a different function.

**What this is deliberately not:** a generic multi-version framework. Exactly two versions are ever live (D8); dispatch is a two-case switch at the few places that need it. The v9-native path remains the static default the codebase is written against; v8 is reached through one seam (`protocol`, D13).

---

## 2. Requirements

### Functional
- **FR0 — Fork-crossing.** A single framework major MUST support the full migration sequence with **no dApp code change at the fork and no API change at migration**: bump midnight-js pre-fork, operate normally on v8 (FR8), cross the fork uninterrupted, operate on v9 (native + keep-state). FR0 is the umbrella criterion (AC0) and the primary e2e scenario (OQ14). Hard external dependency: the dApp's wallet must also cross the fork (OQ7).
- **FR1 — Version identity.** `protocol` MUST expose: the closed `LedgerVersion` type, `protocolVersionToLedger(int)` (per-major bounded ranges, fail-fast on unknown major only; major-0 exemption — OQ1), and the sourcing helpers `versionOfRecord(record)` / `networkHeadVersion(source)` (structural parameters — layering, §4.1).
- **FR2 — Explicit version handling.** Helpers take the record/source as arguments; no hidden mutable global (D1).
- **FR3 — Per-operation head resolution.** `contracts` resolves the active protocol version from `publicDataProvider` at operation start, memoised within that operation only. Requires the additive head-version query on `PublicDataProvider` (§4.4).
- **FR4 — Keep-state.** An already-deployed, ledger-8-compiled contract keeps transacting after the fork with **no recompilation and no v9 variant**: down-convert the migrated state, execute on the dApp's retained ledger-8 stack, wrap in a native ledger-9 transaction with a V2 proof (proof version selected by the resolved verifier-key tag, never hardcoded). Reached through the **same unified entries** as every other operation (D7). Applies to calls only; post-fork deploys with ledger-8 artifacts throw.
- **FR5 — Single seam per version.** v8 code (ledger surface **and** the ledger-8 execution engine) lives **only in `protocol`** (D11/D13). No other package resolves `ledger-v8`; core acquires the v8 runtime surface only via `protocol`'s `loadV8()` accessor at an already-async boundary (§4.1); type-only imports of `protocol/v8` are exempt (they erase).
- **FR6 — Dual decode, honest types.** Records decode fully on both versions: v9 through today's static path; v8 provider-side via `loadV8()`. Version-divergent surfaces (`FinalizedTxData`, decoded contract-state results, tx-flow payloads) are **closed `LedgerVersion`-discriminated unions** (D14); narrowing is a compile-time `switch`, never a cast. Fetched contract state decodes per its actual envelope. The raw queries (`queryRawContractState` — bytes + version, both envelopes) remain the execution paths' single-snapshot input.
- **FR7 — v9-native non-regression.** The v9-native flow stays the static default. Existing consumer calls compile unchanged (the unified entries gain an **additive overload** for 0.16 contract objects — D7) and behave unchanged, except two sanctioned, named additions: the per-operation head query (FR3) and the era-mismatch typed reject (FR8). Non-regression coverage required (§8).
- **FR8 — Pre-fork operation.** With a v8 head, the framework MUST construct, prove and submit **v8-native transactions**: circuit execution on the dApp's ledger-8 stack (the same engine as keep-state), v8 envelope work via `protocol/v8`, V2 proving through the configured `proofProvider` (fork-ready server — OQ16), balancing/submission through the version-tagged provider flows (D14). Ledger-8 deploys are allowed pre-fork; **any operation whose artifact era mismatches the head era throws typed** (v9 artifacts on a v8 head; ledger-8 deploys on a v9 head).

### Non-functional
- **NFR1 — Fail fast.** Unknown versions, era/artifact mismatches, instance mismatches, key mismatches: clear, typed, remediation-bearing errors. Never a silent default.
- **NFR2 — Type safety.** No `any`/`unknown` casts. v8 and v9 payloads meet only inside the D14 unions; exhaustiveness enforced via `assertNever` (§4.5).
- **NFR3 — KISS / YAGNI.** Only v8 and v9; no generic N-version layer (D10).
- **NFR4 — Layering preserved.** `types` stays implementation-free and depends on `protocol`; `protocol` is the single seam for **both** ledger eras and must not import from `types`. No transitional package exists (D11) — nothing is injected.
- **NFR5 — Testability.** Every dual-behaviour path (dispatch, record surfacing, pre-fork operation, keep-state) is covered by tests exercising both versions.
- **NFR6 — Single seam + lazy WASM.** The v8 WASM enters the process only via `loadV8()`, and only when a v8 version is actually observed (v8 head, v8-tagged record, or a ledger-8 contract operation) — a post-window v9-only session instantiates exactly today's single stack. The 0.16 runtimes load only on a ledger-8 **operation** — a session that merely decodes v8 history never instantiates them. CI gates in §8.

---

## 3. Scope

### In scope
- **`protocol`** (MJS-01): version-identity exports (FR1); the `./v8` subpath (`@midnight-ntwrk/ledger-v8` as a regular dependency, exposed only there); the root `loadV8()` accessor; the **ledger-8 execution engine** (down-convert, rehash, circuit invocation, envelope extract/wrap — §4.2) with `compact-runtime@^0.16` / `onchain-runtime-v3` as **optional peerDependencies**; existing exports untouched (D3).
- **`types`**: the D14 discriminated unions and the two provider queries. **Consumer-breaking by design** — ships as the new framework major (AC7).
- **`utils`**: `assertNever` and the typed error-code guards; barrel re-exports.
- **`contracts`** (MJS-02): the **unified entries** — existing `submitCallTx`/`deployContract` etc. gain an additive overload for 0.16 contract objects; internal dispatch (artifact era → pipeline; head era → envelope; key-set truth table → verification path); typed era/key/instance fail-fasts; keep-state and v8-native orchestration calling the `protocol` engine via `loadV8()`.
- **`indexer-public-data-provider`** (MJS-03): full v8 record + pre-fork contract-state decode (lazy); union surfacing; `queryRawContractState`; `queryLatestProtocolVersion()`.
- **Wallet/proof/midnight provider interfaces** (`types`): version-tagged transaction flow (D14) — the v8 arm as serialized tag-prefixed bytes, request and response (§4.5).
- Tests across both versions incl. the fork-crossing scenario; migration guide + TROUBLESHOOTING for the new typed errors.

### Out of scope
- v9-compiled variants of pre-fork contracts (superseded by keep-state); deploying new ledger-8 contracts post-fork (typed error).
- Wallet-side state migration **implementation** — Wallet SDK track; a hard FR0 dependency (OQ7); the cross-fork e2e uses a test-only shim until it lands.
- Indexer/GraphQL schema changes (`protocolVersion` exists); zk-config providers (ledger-agnostic; SEC-5-checked); versions beyond v8/v9; proof-server infrastructure (operator requirement — OQ12/OQ16).
- A generic version-dispatch layer of any kind (D10).

---

## 4. Architecture & Components

### 4.1 `protocol` — dual-ledger seam (MJS-01)

Every existing export stays exactly as today (D3). Additions:

1. **Version identity module (FR1).**

```ts
export const LEDGER_VERSIONS = ['v8', 'v9'] as const;
export type LedgerVersion = (typeof LEDGER_VERSIONS)[number];

/** int encodes the NODE version (major·1_000_000 + minor·1_000) — OQ1.
 *  Bounded per-MAJOR ranges (same major ⇒ same era, #1005 answer 6):
 *  22_000 ≤ v < 23_000 (node 0.22) → v8; 1_000_000 ≤ v < 2_000_000 → v8;
 *  2_000_000 ≤ v < 3_000_000 → v9. Fail fast ONLY on an unknown major
 *  (majors can rise faster than eras — no open-ended `>=`). Major 0 is exempt
 *  from the same-major rule (0.x minors are semver-breaking): 23_000 fail-fasts. */
export const protocolVersionToLedger = (protocolVersion: number): LedgerVersion => { ... };

/** Structural parameters — `types` depends on `protocol`, so `protocol` cannot
 *  import provider interfaces. Two syntactically distinct sources: */
export const versionOfRecord = (record: { protocolVersion: number }): LedgerVersion => { ... };  // read paths
export const networkHeadVersion = (
  source: { queryLatestProtocolVersion(): Promise<number> }
): Promise<LedgerVersion> => { ... };                                                            // construct paths
```

`LedgerVersion` is the single compile-time signal downstream code keys on: it widens at a future fork and shrinks on removal (D8) — every D14 switch then fails to compile at exactly the places that must change.

2. **The `./v8` subpath (D13).** Re-exports the v8 ledger surface from `@midnight-ntwrk/ledger-v8` (a **regular dependency** of `protocol` — the only place in the tree): transaction/intent/zswap construction, decoders (`Transaction`, `LedgerParameters`, `ZswapChainState`, `ContractState` — final surface per OQ3), serialization. The subpath instantiates the v8 WASM at import (wasm-bindgen behaviour). Consumers use it for **type-only imports** (erased — the sanctioned way to name v8 union arms); runtime access goes through `loadV8()`. Removal at v10 = dropping the subpath — a breaking `exports` change landing in the next framework major D8 implies anyway. The OQ2 supply-chain checklist applies to `protocol`'s tree.

3. **The `loadV8()` accessor.** `loadV8(): Promise<ProtocolV8>` on the root — the **only** sanctioned runtime path to the v8 era. Internally a **relative** `import('./v8.js')` (resolves inside the already-loaded `protocol` copy — immune to dual-npm-scope specifier mixing; memoised; module-cache idempotent). Purely additive root export (D3 holds); the function body defers the WASM load. **Module acquisition rule:** the handle is acquired only inside already-async boundaries (provider query methods on the first v8-tagged record; operation start at head resolution) and passed down synchronously as a value — synchronous utilities never load v8 themselves. The expected set of surfaces forced sync→async is **empty**; any implementation-discovered exception joins the documented D14 breaking set and the AC7 API report.

4. **The ledger-8 execution engine (D11).** The keep-state/pre-fork execution machinery lives here, behind `loadV8()` (owner ruling — no transitional package): envelope extraction (`extractEncodedStateValue`, version-aware — v8/v6 and migrated-v9 envelopes), down-convert + **rehash** (bounded Merkle trees come back non-rehashed and must be rehashed before any `checkRoot`; down-convert carries only `.data` — blank `.balance`/`.operations` are harmless, the ledger checks claimed spends at apply), circuit invocation against the dApp's contract object, and v8 transaction composition. **0.16 runtime access:** `compact-runtime@^0.16` / `onchain-runtime-v3` are **optional peerDependencies** of `protocol`, resolved to the same instances the dApp's generated contract code imports (ordinary resolution — the same mechanism the v9-native path uses today). They load only on a ledger-8 **operation** (NFR6). Because resolution can be defeated by bundler misconfiguration (#1052 — the repo's Vite WASM guide), an **identity fail-fast** runs on the first ledger-8 operation: constructor-reference-equality probes on both axes (the 0.16 runtime vs the contract object's runtime; the v9 ledger for keep-state wraps) throw a typed `Ledger8InstanceMismatchError` (remediation → dual-instantiation guide) before any fetch or proving. Exact engine internals (createCircuitContext vs compact-js shim; artifact version-tag field) are OQ13 discovery items.

### 4.2 No transitional package (D11, owner ruling)

The v3/v4 `ledger-v8-compat` package is **eliminated**. Rationale, recorded: (a) with unified entries (D7) the engine has no user-facing API — package isolation bought nothing a subpath doesn't; (b) migration DX collapses to **"bump midnight-js, done"** — no extra install, which is FR0's whole point; (c) the engine implements no `types` seam, so the provider-pattern argument for a separate package no longer applies; (d) release-cadence coupling (engine hotfixes = `protocol` releases) is accepted by the owner. Everything v8-era retires from **one place** at v10: drop `./v8` + the engine + the optional 0.16 peers. Convention for future forks is **era-relative**: the current era is native in-framework; the previous era's surface + engine live behind the versioned subpath and retire with it. Whether the (v9,v10) window needs the same shape is decided by that fork's spike (D8) — never assumed.

### 4.3 `contracts` — unified entries & internal dispatch (MJS-02)

**One API, version-agnostic (D7 — restores #1004's original framing).** The existing entries (`submitCallTx`, `deployContract`, …) are the **only** entries. Each gains an **additive overload** accepting a 0.16-generated contract object alongside today's 0.18 signature — existing calls compile unchanged (FR7); args/witness types infer from the contract object either way, no casts.

```ts
// the dApp's entire transition-window experience:
//   yarn up @midnight-ntwrk/midnight-js   (the new major)
await submitCallTx(providers, { contract, contractAddress, circuitId: 'increment', args });
// same call pre-fork (v8-native), at the fork (stale-head → re-run), post-fork (keep-state) —
// and identical in shape to every v9-native call.
```

**Internal dispatch — three orthogonal decisions, all invisible to the caller:**

| Decision | Input | Outcome |
|---|---|---|
| **Pipeline** | artifact/contract-object era tag (what the caller holds; field per OQ13) | 0.18 → v9-native pipeline; 0.16 → ledger-8 engine (`loadV8()`) |
| **Envelope** | network-head era (`networkHeadVersion`, FR3 — one query per operation) | v8 head → native v8 tx (FR8); v9 head → v9 tx (native or keep-state wrap) |
| **Verification path** | on-chain key set of the fetched state (calls on a v9 head only) | truth table below |

Era/artifact mismatches throw typed (FR8): v9 artifacts on a v8 head (the chain cannot verify V3 proofs pre-fork); ledger-8 **deploys** on a v9 head. Pre-fork there is no key-set routing — every deployed contract is ledger-8.

**Key-set truth table (v9-head calls; the shape is an adversarial input, §6.1).** Evaluated once, inside the unified entry: `co.v2`-only ⇒ **keep-state**; `v3`/`ir` present ⇒ **v9-native** (with a dual-key breadcrumb when `co.v2` is also present — post-fork key rotation); **neither** ⇒ typed unsupported-key-set error. Verification-path selection and proof-version selection read the same key tag, so they cannot disagree. A pipeline↔key-set contradiction (0.16 artifacts against a `v3`-bearing state, or 0.18 artifacts against `co.v2`-only) ⇒ the SEC-5-family typed error **before proving**, naming both observed eras **and both plausible causes** of the `co.v2`-only case (a migrated pre-fork contract, or a v9-era ZKIR-v2 deploy — assumption A4, unconfirmed; §6.2).

**The keep-state path** (post-fork call on a pre-fork contract):
1. One `queryRawContractState` fetch per operation (raw bytes + version); routing key-set, the SEC-5 check and the execution input all derive from this **single snapshot** (a second fetch would open an intra-operation TOCTOU). The head resolution SHOULD ride in the same composed GraphQL request (§4.4) so head and state share one indexer snapshot. Deploys fetch no state and keep the standalone head query.
2. Engine (via `loadV8()`): extract POJO → down-convert + rehash in the shared 0.16 instance → execute the circuit against the dApp's contract object → POJO transcript.
3. Wrap into a v9 `ContractCallPrototype`; compose `Intent` → `Transaction` (existing `zswap-utils`) — v9-native binding from the start, no re-bind.
4. Prove **V2** (selected by the key tag). **SEC-5 pre-check:** the locally-resolved verifier key MUST byte-match the fetched state's `co.v2` slot — mismatch throws before proving. The ledger verifies against the preserved slot, replays the transcript, requires effects equality.

**The v8-native path (FR8; pre-fork call/deploy)** differs only in envelope: same single-snapshot fetch (v8/v6 envelope), same engine execution, then **native v8 composition** via `protocol/v8` and **immediate serialization** (tag-prefixed bytes — §4.5); proving (V2 — OQ16: fork-ready server), balancing and submission carry the serialized v8 arm through the configured providers.

State read paths (`get-states`, `tx-model`, `ledger-utils`, `zswap-utils`) decode per FR6 — receiving decoded values or the module handle as parameters (never loading v8 themselves, §4.1).

### 4.4 Providers (MJS-03)

- **`indexer-public-data-provider`:** per-record dispatch on `protocolVersion` — v9 records through today's static path unchanged; v8-tagged records decode provider-side via `loadV8()` (awaited inside the already-async query methods, memoised on first use). `FinalizedTxData` and decoded contract-state results become D14 unions. **Raw state:** `queryRawContractState` — serialized state + version, both envelopes, both eras (the provider receives the hex before parsing). **Head query:** `queryLatestProtocolVersion(): Promise<number>` — backs FR3/`networkHeadVersion`; the concrete indexer GraphQL field is a discovery item (OQ3d); the integration test asserts strictly against that source. Both new members are required interface members — implementer-facing breaking; all in-repo implementations and testkit mocks update in the same PR. **Single-request composition:** on call paths, serve the head query and the raw-state query from one composed GraphQL request (two root fields; the interface stays two members) — head and state derive from a single indexer snapshot. The head value MUST come from the explicit head field; a record's own `protocolVersion` is never a substitute.
- **Wallet / midnight provider seams:** `balanceTx`/`submitTx` carry version-tagged payloads (D14). The v8 arm is **serialized tag-prefixed bytes, request and response** (§4.5); no live v8 WASM object ever reaches a wallet/proof/midnight implementation (the pre-fork wallet deserializes with its own `ledger-v8` — its native wire format; confirmation folded into OQ7). Read paths are exempt (§4.5). The wallet's own fork crossing (`migrateState`) is the Wallet SDK's — OQ7, a hard FR0 dependency; the migration guide states the minimum wallet version.
- **Proof providers:** request payload version-tagged. Post-fork/keep-state: retained pre-fork key triples pass through the existing configured `proofProvider` (V2/ZKIR-v2; the dual-capable server self-dispatches on the ZKIR's embedded version — #1005 answer 3; key-delivery API = OQ12). Pre-fork: the proof server is **fork-prepared** (OQ16, owner ruling) — one endpoint across the window; the v8-native path reuses the proof provider unchanged.
- **`level-private-state-provider`** (security-critical): expected version-agnostic — it stores opaque contract-defined values the envelope migration never touches; under both engine paths they keep being written by the unchanged 0.16 stack. Confirm and record during MJS-03.
- **`types`:** consumer-breaking exactly at the documented D14 set — `FinalizedTxData`, decoded contract-state results, the tx-flow payloads — plus the two implementer-facing provider members. Verified by a **`.d.ts` API-report diff** for `types` and the barrel (checked-in report; any undocumented diff entry fails CI), with a positive compile test that the AC9 migration recipes compile. The `CostModel.initialCostModel()` default in `createProofProvider` is re-audited for the v8 arm during MJS-03.
- **`midnight-js` barrel:** re-exports the version utilities, `assertNever` and the error-code guards. `protocol/v8`'s runtime surface is deliberately **not** re-exported (transitional; type-only naming goes through the subpath).

### 4.5 Type strategy (D14)

- **Closed `LedgerVersion`-discriminated unions** at every version-divergent surface. Two members; discriminant = `version: LedgerVersion`. Narrowing is a compile-time `switch` with **`assertNever`** in the default branch (exported from `utils`; lint-enforced in-repo; part of the AC9 recipe) — at the v10 widening/shrinking, every seam fails to compile exactly where it must change.
- **Version-truth invariant:** on every union arm, `version === protocolVersionToLedger(protocolVersion)`; `version` is derived at exactly one construction point per provider — never set independently; testkit mock constructors assert it.
- **Tx-flow payload representation:** the v8 arm crosses the wallet/proof/midnight seams as **serialized, tag-prefixed bytes** (`{ version: 'v8', txBytes }`), request **and** response (`submitTx` returns the version-agnostic id); after the single serialization in `contracts`, the v8 arm is bytes end-to-end until submit. The v9 arm keeps today's live-object shape. Rationale: every one of these seams serializes immediately anyway (connector messaging, HTTP, node submit), and a pre-fork wallet holds its **own** `ledger-v8` instance — a live-object handoff is #1052's dual-instantiation shape, while bytes are immune by construction and stay OQ15-verifiable on the payload itself. **Read-path exception:** decoded v8 arms of `FinalizedTxData`/state results carry live `protocol/v8` objects (both sides share the process's single `protocol` instance).
- **Branded types are rejected** (a standing ruling): brands are runtime-erased (dispatch needs a parallel tag — two sources of truth), applied via the `as`-casts NFR2 bans, give no exhaustiveness, and die at serialization boundaries; the union's `version` field does all four jobs. Naked bytes never cross a seam — always the union object; the OQ15 tag parse is the defence-in-depth backstop.
- The shared POJO layer (`EncodedStateValue`, transcript/`Op`/`AlignedValue`) is byte-identical across versions (spike-established, contractual). It is engine-internal (§4.1); its dual-ledger drift-compile test lives in `protocol`'s suite. **Fixtures are the authoritative check**; `AssertEqual`-style assertions are an API-drift detector, not a serialization guarantee.

---

## 5. Data Flow

```
Network/indexer ──protocolVersion:int──▶ publicDataProvider ──▶ unified entry resolves:
        │                                     pipeline (artifact era) · envelope (head era) · keys (truth table)
        │
        ├─ head @ v8 (pre-fork), 0.16 contract — V8-NATIVE (FR8):
        │     queryRawContractState (v8 envelope, single snapshot) → SEC-5 v2-slot check
        │       → engine via loadV8(): extract → down-convert+rehash → circuit on shared 0.16 stack
        │       → compose native v8 tx (protocol/v8) → serialize (tag-prefixed bytes)
        │       → prove (V2, fork-ready server) ─▶ balance ─▶ submit   (v8 arm = bytes end-to-end)
        │
        └─ head @ v9 (post-fork)
             ├─ 0.18 contract ──▶ v9-native path (untouched — FR7)
             └─ 0.16 contract — KEEP-STATE (FR4), same entry:
                   queryRawContractState (migrated v9 envelope, single snapshot) → SEC-5 co.v2 check
                     → engine: extract → down-convert+rehash → circuit on shared 0.16 stack
                     → wrap → v9 ContractCallPrototype → Intent → Transaction (zswap-utils)
                     → prove (V2 by key tag; verifies against preserved co.v2)
                     → proofProvider ─▶ walletProvider ─▶ midnightProvider

Historical records: v9 → static decode (unchanged); v8 → provider-side via loadV8();
both surfaced as LedgerVersion-discriminated unions (D14).
```

The transaction flow (`UnprovenTransaction → proveTx → balanceTx → submitTx`) is unchanged in shape; during the window its payloads are version-tagged and the era is selected per operation.

---

## 6. Error Handling

### 6.1 Threat model & trust boundaries

The indexer is a network service **outside the dApp's trust boundary**. Its version ints drive surfacing and dispatch; the fetched `ContractState`'s key-set shape drives verification-path selection and its bytes become execution input.

| Boundary | Data crossing it | Failure mode |
|---|---|---|
| Indexer (GraphQL) | `protocolVersion` ints; records; fetched `ContractState` (key-set shape **and** bytes) | mis-dispatch / garbage execution input — bounded to DoS/griefing by node rejection + the effects-equality backstop |
| Proof server | full private witness + retained key triples | witness exfiltration if compromised; one fork-prepared dual-capable server across the window (#1005 answer 3, OQ16) — the single witness recipient |
| zk-config artifact source | prover/verifier/zkir triples | tampered/stale artifacts → griefing; bounded by the SEC-5 verifier-key consistency checks |
| Wallet / dapp-connector | version-tagged tx payloads (request); balanced serialized tx bytes (response) | key/fund compromise is out of framework scope; returned bytes are adversarial input to submit — carried as tag-prefixed bytes (§4.5) |
| dApp-supplied contract object / runtime peers | module references | in-process, same trust domain; mismatched module contexts are a deterministic typed failure (the §4.1 identity probes) |

**The integrity backstop is the ledger itself:** at apply, it replays the transcript against the real on-chain state and requires effects equality — state/dispatch tampering is bounded to **DoS/griefing** (wasted proving, doomed submissions), never fund or verification compromise. Load-bearing; asserted by a §8 negative test.

**Residual risk — plausible-but-wrong version (OQ8).** `protocolVersionToLedger` guards only *unknown* ints; a lying indexer head mis-selects the **era** of the whole construct pipeline. Both mis-directions collapse to doomed submissions (a v9 tx pre-fork / a v8 tx post-fork — node-rejected), as do keep-state↔v9-native mis-selections — DoS-bounded. Mitigation (independent cross-check signal) is **OQ8** with a named owner; until it lands, the §6.3 breadcrumbs are the detection. The QA-3 stale-head re-query shares this trust assumption (same source): it detects the fork race, not indexer malice.

**Wrong-version-into-proving.** With D14 unions plus the no-cast policy, a payload cannot reach the wrong pipeline arm without defeating the type system. Defence: (a) compile-time narrowing; (b) the backstop; (c) the OQ15 tag-prefix parse at the proving seams, both arms — upstream's sanctioned permanent mechanism (parse to the second `:`, branch on the tag; no first-class API is coming).

### 6.2 Error handling rules

- `protocolVersionToLedger` is the **sole narrowing point** from untrusted `number` to `LedgerVersion`. Unknown int ⇒ typed error naming the int and the supported set — read and construct paths named distinctly (D8).
- **Fork-crossing stale head (the primary transition scenario, not a rare race):** the head crosses the fork between resolution and submit (proving takes minutes) — every in-flight operation at the fork hits this. **Detection predicate (QA-3):** on submit rejection, re-query the head; the stale-head error is raised **iff** it differs from the operation-start version; otherwise the original rejection propagates wrapped with `{ cause }`. The error advises re-running — re-resolution routes the operation down the post-fork path (keep-state for ledger-8 contracts), which is FR0's recovery story. No silent auto-retry. The node is assumed to **hard-reject** in-flight v8 transactions at the fork (owner ruling, OQ17); a grace window could only reduce rejections.
- **Era/artifact mismatch:** v9 artifacts on a v8 head (call or deploy) ⇒ typed fail-fast; ledger-8 **deploy** on a v9 head ⇒ typed fail-fast.
- **Pipeline↔key-set contradiction (SEC-5 family, both eras):** locally-resolved verifier key vs the fetched state's slot — `v2`/`co.v2` on the ledger-8 pipeline, `v3` on the v9-native pipeline — absent or mismatched ⇒ typed error **before proving**, naming both sources; the `co.v2`-only case names **both plausible causes** (migrated pre-fork contract / v9-era ZKIR-v2 deploy — A4 unconfirmed) so a mis-dispatch is diagnosable.
- **Instance mismatch:** the §4.1 identity probes failing on the first ledger-8 operation ⇒ `Ledger8InstanceMismatchError`, remediation → the dual-instantiation guide — before any fetch or proving.
- **Down-convert failure:** malformed input, cross-version decode failure, lost `StateValue` type ⇒ throw; never a silently wrong or empty state.
- **Proof-version invariant:** proof version derives from the resolved key tag, never hardcoded; a key set matching no supported proof version ⇒ typed error.
- **Decode mismatch:** wrong-version decode surfaces the decoder error wrapped with `{ cause }` + version context — never swallowed. Where a v8 decoder fails **open** (plausible for byte-identical shapes), the provider decode seam adds its own discriminant/round-trip check (OQ3c).
- **Unsupported key set** ("neither" shape) ⇒ typed error.
- **Remediation-bearing messages:** every typed error states what happened, why, and the one next step, with concrete versions/heights.
- Error classes carry a stable `code` discriminant (dual-scope `instanceof` fails silently). **Typed guards ship alongside** (`hasErrorCode` + per-class predicates in `utils`) — reading `.code` off `unknown` without them needs banned casts; guide examples use the guards.
- Repo conventions: re-throw with `{ cause }`. **Privacy constraint:** errors may reach an off-device logger — version ints, version sets and key *identifiers* are allowed; key bytes, decoded state contents, key material and raw payloads are not.

### 6.3 Observability

A plausible-but-wrong version passes narrowing silently, so positive-path breadcrumbs are required. Every version-dispatch decision (record **surfacing**, **head** resolution, **pipeline/verification-path selection**, construct/submit **encoding**) emits a debug-level `loggerProvider` breadcrumb: selected `LedgerVersion`, path, source (per-record / network-head), raw int. The path-selection breadcrumb additionally carries the observed key-set shape and the contract address (public — the privacy constraint is respected): while A4 is unconfirmed, an A4 mis-dispatch has no throwing path of its own, and this breadcrumb makes it reconstructable from logs. `loggerProvider` is optional — the migration guide instructs operators to enable debug logging during the window; the no-logger gap is part of OQ8's residual-risk sign-off.

---

## 7. Key Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | **Explicit version handling**, no mutable global. | v8/v9 operations coexist during the window; a shared global is racy. |
| D2 | `protocol` is the single seam for **both** ledger eras (root = v9, `./v8` + engine = v8). | One package owns the WASM boundary; consumers never name a ledger package directly (NFR4). |
| D3 | Existing `protocol` exports stay exactly as today; all v8-era additions are additive until their removal at v10. | Nothing moves, nothing re-points. |
| D4 | Version source = indexer `protocolVersion` (already present). | No schema change; subject to the OQ8 cross-check stance. |
| D6 | Post-fork support for pre-fork contracts = **keep-state** (no recompile, no v9 variant). | Spike-proven, contractual upstream (#1005 answer 1); wrapping unchanged ledger-8 execution in a native v9 tx is sufficient and strictly simpler. |
| D7 | **Unified, version-agnostic entries** (restores #1004's original framing): the existing entries gain an additive overload for 0.16 contract objects; pipeline/envelope/verification dispatch is fully internal (§4.3). | Owner requirement: the developer never chooses a version-specific function. Migration = bump only; no change at the fork (FR0); "inexperienced developers first". |
| D8 | **Support window: current + previous** (policy confirmation OQ10). Keep-state soundness re-validated per fork via a spike, never assumed. | Bounds dependency/test growth. Upstream imposes no ceiling (#1005 answers 2/4) — retirement is a midnight-js policy act. |
| D9 | **Pre-fork operation in scope:** construct/submit dispatches on the head era. | The alternative (v9-only construct) made the new major non-adoptable — dApps upgrade *before* the fork and must keep transacting (#1004 comment; FR0). |
| D10 | **No generic version-dispatch layer**: concrete modules + two-case switches; D14 unions carry the data. | N never exceeds 2 (D8); a generic facade encodes an axis of variation an unknown v10 will not honour. |
| D11 | **No transitional package** (owner ruling): the ledger-8 engine lives in `protocol` behind `loadV8()`; the 0.16 runtimes are optional peers of `protocol`. Everything v8-era retires from one place at v10. | With unified entries the engine has no user API — a package bought nothing; migration DX collapses to "bump only". Cost accepted: engine hotfixes ride `protocol` releases; core carries transitional code until v10. Era-relative convention for future forks (§4.2). |
| D12 | **Fork date is not a design driver.** Delivery sequenced by dependency order (§10); cross-team items track their own milestones. | The date changes no line of this design. |
| D13 | **Dual-ledger `protocol`**: `ledger-v8` as a regular dependency exposed only at `./v8`; runtime access only via the memoised `loadV8()` (relative internal import), gated on an observed v8 version at an already-async boundary; subpath serves type-only imports. | Lazy WASM (NFR6); immune to dual-scope specifier mixing within one `protocol` copy; install-time cost and the OQ2 checklist move to core consciously — the price of "bump and it works". |
| D14 | **Closed `LedgerVersion`-discriminated unions** at every version-divergent surface; v8 tx-flow arm = serialized tag-prefixed bytes (request+response), v9 arm = live-object status quo; read-path arms carry live `protocol/v8` objects. Brands rejected. Consumer-breaking — ships as the new major. | Honest types over lying types; bytes at the tx-flow seams close #1052 against the wallet's own `ledger-v8` instance; the discriminant is compiler-checked and runtime-dispatchable at once (§4.5). |
| D15 | **Instance sharing by resolution, guarded**: 0.16 runtimes as optional peers shared with the dApp's generated code; constructor-reference identity probes fail-fast on the first ledger-8 operation. | The same mechanism (and risk class) the v9-native path already uses — now with an explicit typed guard for the bundler failure mode (#1052). |

(D5 of earlier drafts merged into D14.)

---

## 8. Testing Strategy

Repo conventions: TDD, Arrange-Act-Assert, meaningful negatives, strict equality, both versions exercised wherever behaviour is dual (NFR5).

**Fixtures (OQ9).** Preferred: port the spike's generators (`ledger-v8` + `onchain-runtime-v3` devDependencies; mint at test time; migrated-state fixture via the spike's migrate flow); fallback: committed golden hex + `protocolVersion` int. Inventory: v8 / migrated-v9 / **v8-v6-envelope pre-fork** states; **tampered** variants (key set flipped both ways; perturbed bytes); a **both-keys** fixture; a **Merkle-bearing** migrated fixture; a **test-only v9-compiled twin** of the minimal fixture contract (mints the V3 proof + repopulated key set for AC3's negative). Minimal-size mandate (repo precedent: WASM-fixture coverage timeouts).

**Verification harness.** Proof/apply-level assertions need a local verifier (ledger-v9 local verify vs ported spike simulator — decided with OQ9). A fork-capable e2e environment does not exist yet (OQ14); until it does, proof/apply-level ACs — including AC0 — gate at the unit/integration tier (recorded, not implied).

- **protocol:** `protocolVersionToLedger` table test (per-major ranges, unseen-minor regression guard, major-0 exemption boundaries, unknown-major fail-fast); sourcing spy test (`networkHeadVersion` exactly once per construct operation; `versionOfRecord` never on the construct path); `./v8` export-surface test (strict sorted-key equality vs the OQ3 list); v8 fixtures decode; wrong-version decode ⇒ deterministic failure (OQ3c); **engine:** down-convert round-trip (POJO equals pre-migration reference; malformed ⇒ throw), Merkle rehash (non-rehashed decode throws on root access), **POJO drift** (dual-ledger compile test), **identity probes:** npm-alias dual-instance negatives on both axes (`onchain-runtime-v3-alt`, `ledger-v9-alt`) ⇒ `Ledger8InstanceMismatchError`; same-instance positive.
- **contracts (unified entries):**
  - **Overload compile tests:** a 0.16-generated contract object is accepted; existing 0.18 call sites compile byte-unchanged.
  - **Dispatch table:** artifact era × head era ⇒ pipeline/envelope per §4.3; era mismatches ⇒ typed errors; head memoised (spy: one `queryLatestProtocolVersion` per operation).
  - **Key-set truth table** (v9 head, strict on all four shapes) incl. the pipeline↔key-set contradiction errors (both directions) and the dual-key breadcrumb.
  - **Pre-fork positive (FR8):** 0.16 contract completes call **and deploy** end-to-end with a v8 head through the same entry.
  - **Keep-state positive (FR4):** the same contract accepts a post-fork call through the **same unchanged call site** — the FR0 mechanism asserted at unit tier.
  - **Single-snapshot invariant:** routing, SEC-5 and execution input derive from one `queryRawContractState` per operation (spy, both eras).
  - **A4 mis-dispatch:** a `co.v2`-only fixture not built from the retained artifacts ⇒ deterministic typed failure at down-convert/execute; breadcrumb carries key-set shape + address.
  - **Fork-crossing stale-head (QA-3):** rejection + flipped head ⇒ stale-head error; rejection + same head ⇒ original error wrapped with `{ cause }`; a re-run after the flip lands on keep-state with no code change.
  - **Proof-version negative:** V3 proof against preserved `co.v2` fails (v9-twin fixture); **unsanctioned mixing** — anything other than (a) a native v8 tx pre-fork and (b) the keep-state composition post-fork throws; enumerated construction mechanisms (serialized fixtures via the OQ15 tag; engine internals).
  - **Tampered state:** key set flipped ⇒ typed error (unit); perturbed bytes ⇒ rejection at apply (harness tier) — together asserting the backstop.
  - **v9-native non-regression (FR7):** behavioural test files not touching D14 surfaces run byte-unmodified (diff gate); D14-touching files get recorded mechanical-narrowing exceptions only; golden-fixture byte equality on deterministic stages (closed set, captured on `main` pre-change; proof bytes excluded); re-baselining only in dedicated no-production-change commits.
  - **Fork-crossing scenario (AC0):** one session, unchanged code: pre-fork v8-native call → fork (stale-head → re-run → keep-state) → v9-native flow → reads its own v8 history. Authoritative at the OQ14 tier; mocked head flips until then.
- **providers:** per-record dual decode (docker integration against real indexer responses); union narrowing both ways (exhaustive switch compiles; wrong-arm access is a compile error); **lazy-load gate:** a v9-only session never loads the v8 WASM; first v8 record ⇒ exactly one memoised `loadV8()`; a decode-only session never loads the 0.16 runtimes; `queryRawContractState` round-trips both envelopes; decoded state queries return the correct union arm per envelope; `queryLatestProtocolVersion` backs `networkHeadVersion`; **tx-flow:** the v8 arm asserted to be serialized tag-prefixed bytes at every wallet/proof/midnight seam, request and response (read paths exempt — covered by decode tests); keep-state proving selects V2 by key tag and passes retained triples through the configured `proofProvider`; **mock version-invariant:** a mock record whose `version` disagrees with `protocolVersionToLedger(protocolVersion)` throws in the mock layer.
- **Structural gates (CI):** only `protocol` resolves `ledger-v8`; **no runtime import of `protocol/v8` outside `protocol`** (lint; type-only exempt); ESLint `no-explicit-any` + grep gate on `as unknown`; `protocol/v8` export test (full sorted key set); **`types`/barrel API-report diff** (checked-in `.d.ts` report; any undocumented entry fails CI) + the positive migration-recipe compile test; in-repo D14 switches use `assertNever` (lint).
- **Coverage:** `packages/protocol` keeps 100% on the version module; engine branches unreachable in unit scope get explicit justified carve-outs decided in PR. No coverage padding.
- **Operational:** keep-state proving e2e runs serialized against its proof server (spike-documented contention). The fee-paying cross-fork e2e uses the test-only wallet shim (OQ7) — the shim port is a named work item so the e2e never silently degrades to `test.skip`.

---

## 9. Acceptance Criteria

- **AC0 — Fork-crossing (FR0, umbrella):** one build of one dApp, **no code change at the fork and no API change at migration**: (a) operates on a v8 head (call + deploy + submit), (b) survives the fork moment (in-flight operation → stale-head → re-run succeeds post-fork), (c) operates post-fork (v9-native + keep-state through the same call sites), (d) reads its own pre-fork history throughout. Authoritative at the OQ14 e2e tier; unit/integration with mocked head flips until then. Externally conditioned on the wallet crossing (OQ7 — test shim until `migrateState`).
- **AC1 — `protocol`:** version utilities per FR1 (structural parameters; OQ1 ranges incl. major-0 exemption; typed unknown-major throw); **every pre-existing export unchanged** — strict-equality export-surface test (sorted full key sets) diffed against the pre-change list + existing suites unmodified; the `./v8` surface matches the OQ3 list; `loadV8()` additive and memoised.
- **AC2 — Errors:** every §6.2 typed error path exists and is negative-tested, one test per path — unknown version (read/construct separately), fork-crossing stale-head (error + `{cause}` branches), era/artifact mismatch (both directions), pipeline↔key-set contradiction (both directions, both-causes text), instance mismatch, down-convert failure, unsupported key set, proof-version invariant, decode mismatch (`{cause}` propagation), unsanctioned mixing. **Meta-test:** the stable error-`code` registry equals the set of negative-tested codes — a new error class cannot ship untested.
- **AC3 — Ledger-8 operation:** a ledger-8 contract transacts **pre-fork natively and post-fork via keep-state through the same unified entry call site**, with no recompilation, no v9 variant, no config; post-fork calls verify against the preserved `co.v2` key (negative: V3 proof fails); #1052 guarded by the identity probes (dual-instance negatives) and the structural gates.
- **AC4 — v9-native non-regression:** existing v9 call sites compile byte-unchanged (additive overload) and behave unchanged except the two sanctioned additions (head query; era-mismatch reject) — verified by the scoped diff gate + golden fixtures, not by absence of complaints.
- **AC5 — Unified dispatch & DX:** one entry set, version-agnostic; pipeline/envelope/verification dispatch fully internal per §4.3; migration = version bump only (the guide's window chapter contains no new API calls); a 0.16 contract object type-checks against the same entry as a 0.18 one; all fail-fasts per §6.2.
- **AC6 — Structural isolation:** only `protocol` resolves `ledger-v8`; no runtime `protocol/v8` import outside `protocol` (lint); the 0.16 runtimes are optional peers loaded only on ledger-8 operations; a session that never observes v8 instantiates exactly today's single WASM stack (lazy-load gates, §8).
- **AC7 — Types:** the breaking surface is **exactly** the documented D14 set + the two provider members — asserted by the `.d.ts` API-report diff (anything else fails CI), with the positive migration-recipe compile test; `yarn lint` clean, build green, no `any`/`unknown` casts (CI-enforced from the first PR).
- **AC8 — Observability:** all four dispatch decision points emit the §6.3 breadcrumb (version, path, source, raw int; path-selection also key-set shape + address) — unit-tested with an injected logger, strict equality on structured fields, no payloads/keys.
- **AC9 — Documentation ships with the feature:** migration guide — the bump-only window chapter, the D14 narrowing recipe (using `assertNever` and the error guards), the retained-toolchain note (A2), the operator requirements (OQ12/OQ16: fork-ready server minimum version + key-delivery API), the OQ17 note (track finalization, not submit success, around the fork), the minimum wallet version (OQ7), the V2-support statement (#1005 answer 2: no upstream sunset); TROUBLESHOOTING entries for the new typed errors; llms.txt/API-doc updates.

---

## 10. Rollout & Sequencing

Sequenced by dependency order (D12 — the fork date is not a scheduling input):

1. **`protocol`:** version utils + `./v8` subpath + `loadV8()` + the engine skeleton (envelope/POJO layers testable against fixtures); OQ2 supply-chain checklist runs here.
2. **`types` + `utils`:** D14 unions, the two provider members; `assertNever` + error guards.
3. **`contracts`:** unified-entry overloads, internal dispatch, engine orchestration (keep-state path first — it has fixtures from day one; v8-native path follows), fail-fasts, non-regression baselines captured before the first change.
4. **Providers:** dual decode + union surfacing, the two queries (all in-repo implementations + testkit mocks in the same PR), version-tagged tx flows; barrel re-exports.
5. **Integration milestone:** port the spike to the productized topology (published framework packages + a dApp persona with its retained 0.16 stack, calling the unified entries) — the split-topology gap recorded in OQ13.
6. **Hardening:** OQ8 cross-check (+negative test), the OQ15 tag asserts at both proving seams, the AC0 fork-crossing e2e when OQ14 lands.

Notes:
- **Versioning:** this ships as **one new framework major** (D14 is consumer-breaking; FR0 requires dApps to adopt exactly this major pre-fork). The migration guide is part of the deliverable (AC9).
- **Removal at v10 (D8/D11/D13):** drop `./v8`, the engine and the optional 0.16 peers from `protocol` (one breaking `exports` change in the next major), shrink `LedgerVersion` (every D14 switch fails to compile where it must change), collapse the unions to single-arm. Pre-announced from day one. Whether the (v9,v10) window needs an analogous engine is decided by that fork's spike. **Caveat:** upstream keeps ZKIR-v2 contracts transactable indefinitely (#1005 answer 4) — retirement is a midnight-js policy act (OQ10) and strands un-graduated keep-state contracts on the last supporting major; the sanctioned graduation mechanism (key rotation installing v9 artifacts) is unconfirmed (OQ10).
- **Operator requirement (OQ12; OQ16 answered):** one fork-prepared dual-capable proof server across the window — minimum version + key-delivery API pinned when OQ12 closes; in the migration guide.
- **Wallet SDK (OQ7, elevated):** FR0 holds end-to-end only if the wallet crosses the fork; `migrateState` (owner @agronmurtezi) is a hard external dependency of the release. Interim: the two-SDK workaround (#1005 answer 7); test shim port is a named work item.
- **Issue updates:** re-scope #1004/#1005/#1006 to v5.0 — #1004's original "unified APIs, internal dispatch" framing is **restored** (D7); MJS-01 = the dual-ledger `protocol` (subpath, `loadV8()`, engine); MJS-02 = unified entries + dispatch; MJS-03 = provider dual decode + version-tagged flows.

---

## 11. Open Questions

Gates close only when a concrete artifact merges with a green test. Mirror open items as tracker issues (owners + resolve-by).

- **OQ1 — RESOLVED.** `protocolVersion` = node version int (`major·1_000_000 + minor·1_000`); mapping per [`protocol_version.rs`](https://github.com/midnightntwrk/midnight-indexer/blob/main/indexer-common/src/domain/protocol_version.rs): node 0.22 & 1.x → v8; 2.x → v9. Same node major ⇒ same era (confirmed, #1005 answer 6; converse does not hold). Bounded per-major ranges; unknown-major fail-fast is the designed maintenance signal; major-0 exemption (only 0.22 attested).
- **OQ2 — RESOLVED (pins; re-confirm at implementation — RC churn).** v8: `@midnight-ntwrk/ledger-v8@8.1.0` + `onchain-runtime-v3`; retained dApp stack: compact `0.31.1` / compact-runtime `0.16.0`; v9: `ledger-v9@1.0.0-rc.3` / `onchain-runtime-v4@4.0.0-rc.3`. Supply-chain checklist scoped to **`protocol`** (owns `ledger-v8` and the optional 0.16 peers): both npm scopes' org ownership (typosquat-shaped risk), exact pins + lockfile integrity, CI gate on audited scopes/versions.
- **OQ3 — OPEN (discovery):** (a) the final `protocol/v8` decode/construct surface (product + FR8 input); (b) byte-identity verification for the shared POJO layer (fixtures authoritative); (c) which v8 decoders fail **open** (drives the decode-seam checks); (d) the indexer GraphQL field backing `queryLatestProtocolVersion` — confirm before MJS-03.
- **OQ4 — RESOLVED.** Exactly two sanctioned compositions: native v8 tx pre-fork; keep-state post-fork. Seams reject any other intra-tx mix (negative tests).
- **OQ5 — WITHDRAWN (D12).** Fork date/height is a planning datum, not a design driver.
- **OQ6 — WITHDRAWN.** `loadV8()`, gated on the resolved version at an async boundary, **is** the init choreography; at-import WASM instantiation is contained by making the import conditional.
- **OQ7 — ELEVATED: hard FR0 dependency (owner @agronmurtezi, Wallet SDK).** `migrateState` is a stub; the release's transition-window readiness and the guide's minimum-wallet-version statement depend on it. Interim: two-SDK workaround (validated, #1005 answer 7); test-shim port named in §10. **Also confirm:** the pre-fork wallet's connector accepts the **serialized** v8 transaction for balancing (its native wire format — expected yes; a contradiction is a spec-revision trigger for D14's v8-arm representation). Target date unanswered — follow up.
- **OQ8 — OPEN, SECURITY (owner TBD — a named owner formally accepts the residual risk while open).** Independent cross-check for the indexer head version on construct/submit (§6.1). Until it lands: §6.3 breadcrumbs are the detection. Resolve before the release is declared production-ready for the window.
- **OQ9 — PARTIALLY RESOLVED.** Spike islands are the canonical fixture source. Remaining: port/mint per §8; record the verification-harness decision (ledger-v9 local verify vs spike simulator). Blocks the decode/engine test slices.
- **OQ10 — OPEN (owner: team/PO).** Confirm "current + previous" (D8) as standing policy; confirm the graduation path for keep-state contracts (post-fork key rotation installing v9 artifacts — the both-keys shape) — retirement without a graduation mechanism strands them (§10).
- **OQ11 — RESOLVED (dissolved).** One dual-capable server ⇒ no client-side leg routing; retained key triples pass through the existing `proofProvider`; details folded into OQ12.
- **OQ12 — RESCOPED (owner TBD; before MJS-03 freeze).** Remaining: (a) the supported key-delivery API for retained pre-fork key triples; (b) the minimum proof-server version with dual-ZKIR support shipped; (c) DApp-connector local proving status (separate upstream story — record for the guide); (d) the request wire format for the serialized v8-arm payload (expected: native).
- **OQ13 — OPEN (owner TBD; before the engine API freeze).** Engine leg shape: confirm no compact-js involvement (spike drives raw `createCircuitContext` + invoke) or pin a 0.16-compatible shim; the artifact field carrying the **era tag** for pipeline dispatch (§4.3); the exact overload typing for 0.16 contract objects; **confirm A4** (does every v9-era deploy populate `v3`/`ir`? — if refuted, add a second dispatch signal from indexer deploy-era metadata); **the split-topology integration milestone** (§10 step 5) — the spike never exercised the productized package split.
- **OQ14 — DIRECTION SET (owner TBD).** Upstream runs fork rehearsals but advises midnight-js to own environment-independent e2e (#1005 answer 5). Build the fork-capable testkit matrix (node+indexer+proof-server starting at v8, migrating at a height) or adopt the spike simulator (with OQ9). Until then, proof/apply-level ACs — including **AC0** — gate at unit/integration tier.
- **OQ15 — RESOLVED BY RULING.** No first-class version-discriminant ledger API; the prepended serialized tag prefixes **are** the mechanism (@tkerber): parse to the second `:`, branch on the tag. The proving-seam asserts implement exactly this, permanently, on both arms. Non-blocking defence-in-depth.
- **OQ16 — ANSWERED (owner, 2026-08-16).** The proof server is **fork-prepared**: the dual-capable server is available before the fork; one configured endpoint across the whole window; the v8-native path reuses the proof provider unchanged. Minimum version pinned via OQ12(b).
- **OQ17 — RULED (owner, 2026-08-16): assume hard rejection** for in-flight v8 transactions at the fork. QA-3 + re-run guidance is the transition story; AC0 asserts the rejection path; the guide tells dApps to track **finalization**, not submit success, around the fork. Upstream confirmation welcome, non-blocking (a grace window only reduces rejections).

**Assumptions.** **A1:** the indexer tags every block/tx/event with a correct `protocolVersion`; trusted subject to OQ8. **A2:** the dApp retains its pre-fork toolchain outputs unchanged (artifacts, keys, runtime); the framework never compiles contracts and never mutates artifacts. **A3:** the keep-state migration facts (byte-identical state data and transcripts, `co.v2` preservation, V2 verification against the preserved slot) are contractual upstream guarantees (#1005 answer 1, confirmed). **A4:** a `co.v2`-only key set on a post-fork state implies a migrated pre-fork contract (equivalently: every v9-era deploy populates `v3`/`ir`) — **unconfirmed** (asked with OQ13); a v9-era ZKIR-v2 deploy could violate it; fallback: a second dispatch signal from indexer deploy-era metadata.
