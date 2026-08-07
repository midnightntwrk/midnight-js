# Design Spec — Ledger v8 / v9 Support in Midnight.js (Hard-Fork Transition)

**Status:** Draft v3.9 (upstream confirmation)
**Date:** 2026-07-09 (v1) · 2026-08-03 (v2 — keep-state rework) · 2026-08-04 (v3 — simplification rework; v3.1 — TS-dev review findings) · 2026-08-05 (v3.2 — upstream answers, #1005; v3.3 — architecture re-review; v3.4 — senior-dev re-review) · 2026-08-06 (v3.5 — per-major version mapping; v3.6 — helpers to `utils`; v3.7 — QA review; v3.8 — version-neutral helper names; v3.9 — @tkerber confirmation, OQ15 re-ruled)
**Author:** Systems architecture (spec workflow)
**Source issues:**
- [#1004 — MJS-01 protocol package: unified v8/v9 dispatch APIs](https://github.com/midnightntwrk/midnight-js/issues/1004)
- [#1005 — MJS-02 contracts package: protocol-version orchestration](https://github.com/midnightntwrk/midnight-js/issues/1005)
- [#1006 — MJS-03 provider API updates to unified APIs](https://github.com/midnightntwrk/midnight-js/issues/1006)

Part of the **Ledger v8→v9 Hard Fork Migration** (SOW-Q3-10 / product#119).

> **Revision note (v2, 2026-08-03, compressed).** The v1 dual-artifact model (accept a v8- and a v9-compiled contract, select at dispatch) was superseded after the DApp-HF spike ([`shieldedtech/spike-dapp-hf`](https://github.com/shieldedtech/spike-dapp-hf)): deployed pre-fork contracts keep transacting after the fork **with no recompilation and no v9-compiled variant** via a *keep-state* path — down-convert the migrated state, execute on the unchanged ledger-8 stack, wrap in a native ledger-9 transaction with a V2 proof. The protocol migrates all contract state to the v9 envelope at the fork; state *data* and transcripts are byte-identical across versions.
>
> **Revision note (v3, 2026-08-04).** Architecture review removed the generic dual-version machinery that decision D9 (construct/submit is v9-only) had already made redundant. The keep-state model itself is **unchanged**. What changed: (1) no version-parameterised accessor — v9 stays on today's static imports; (2) the type-divergence bucket taxonomy, DEV-6 branding gate and per-version ACL lists are withdrawn — under D9 no v8 value enters the v9 pipeline; (3) v8 decode + keep-state primitives ship as a transitional package (D11), injected by the dApp; (4) SEC-2 reduced to a types-first stance plus an optional upstream discriminant (OQ15); (5) the fork date withdrawn as a design driver (D12).
>
> **Revision note (v3.1, 2026-08-04).** Senior-TS-developer review; seven findings applied:
> 1. **Package named** `@midnight-ntwrk/midnight-js-ledger-v8-compat` (entries `.` = keep-state, `./codec` = v8 decoders). The version in the name makes deprecation at v10 natural and encodes the per-fork-package pattern (D11).
> 2. **v8 records never inhabit core types.** `FinalizedTxData.tx` is v9-typed (`types/src/midnight-types.ts`); a decoded v8 transaction cannot fill it without a union or a banned cast. Resolution: v8-tagged records surface as **raw bytes + version int** (additive fields); `tx` access on a v8 record throws a typed error naming the compat codec; decoding is dApp-side. The provider-side `v8Codec` injection seam of v3 is withdrawn (kept as a recorded fallback).
> 3. **Layering fix:** `types` depends on `protocol`, so `protocol` cannot import `PublicDataProvider` — `networkHeadVersion` takes a structural parameter.
> 4. **#1052 on the v9 axis closed:** the compat package consumes v9 **exclusively through `protocol/ledger` with `protocol` as a peerDependency** (no direct `ledger-v9` dependency — packaging lint), plus a reference-equality instance check at config attach (typed fail-fast).
> 5. **Published-types fix:** the 0.16 runtime types are hand-maintained **structural interfaces** (drift-checked in CI against the real packages in devDependencies) — a type-only aliased devDependency does not survive publishing.
> 6. **Interface granularity pinned:** the `KeepStateBridge` interface (declared in `contracts`) is `executeCall`-level — only POJOs and v9 types in signatures; the three primitives are compat-package internals. Keep-state ships as a **dedicated call entry** (pre-fork contracts are typed against the 0.16 toolchain and may not satisfy the v9-pinned generics of the existing entry); witness/private-state flow crosses the interface explicitly.
> 7. **State-bytes source pinned:** the provider exposes the **raw serialized** migrated contract state (additive query) so no WASM-backed object ever crosses the package boundary.
>
> **Revision note (v3.2, 2026-08-05).** Upstream answered the eight consolidated architecture questions ([#1005 answers](https://github.com/midnightntwrk/midnight-js/issues/1005#issuecomment-5190024611), kapke — *initial answers; @tkerber confirmation pending*):
> 1. The keep-state migration facts (byte-identity, key preservation, V2 verification) are **contractual** — changing any would invalidate existing contracts (D6, A3).
> 2. + 4. **No upstream sunset** for V2 proofs or ZKIR-v2 contract support — the keep-state window is a midnight-js support-window *policy* decision (OQ10), not an upstream technical constraint (D8, §10). The contract dictates its runtime (and likely Compact.js); midnight-js dictates the chain interaction.
> 3. The transition-window proof server is **one dual-capable v9-era instance** — v2 vs v3 is the ZKIR version, the server supports/is being extended to support both, and ZKIR self-describes its version for server-side dispatch. No client-side leg-routing decorator (**OQ11 dissolved**); **OQ12 rescoped** to the key-delivery API + shipped-version confirmation.
> 5. Upstream runs multiple fork rehearsals, and advises midnight-js to own **environment-independent e2e tests** (happy paths minimum) — OQ14 direction set.
> 6. The protocolVersion→ledger convention is confirmed with a nuance: the protocol major may rise faster than ledger eras, but a ledger era change always bumps the major (OQ1 closed).
> 7. Wallet `migrateState` owner: **@agronmurtezi**; validated interim workaround — run two Wallet SDK versions, restore v1 state with v2 code (spike-demonstrated) (OQ7).
> 8. A transaction version discriminant is deemed reasonable and doable; interim, every serialized object carries a prepended type/version tag usable as a serialized-form check (OQ15).
>
> **Revision note (v3.3, 2026-08-05).** Architecture re-review of v3.2; six findings applied:
> 1. **`KeepStateBridge` moved to `types`** (was `contracts`) — it is a provider-shaped seam, and repo convention keeps pluggable seams in `packages/types/src/`; feasible because `types` already depends on `protocol` (signatures carry only POJOs + v9 types). The compat package gains `types` as a second peerDependency; the `keepState` config attaches as a typed options field of the dedicated keep-state entry.
> 2. **Routing provenance assumption made explicit (A4):** `co.v2`-only ⇒ keep-state assumes every v9-era deploy populates `v3`/`ir`; upstream answer 4 makes a v9-era ZKIR-v2 deploy plausible. Confirmation folded into OQ13; indexer deploy-era metadata recorded as the fallback second signal.
> 3. **Throwing `tx` accessor hardened:** non-enumerable (serialization/spread/deep-equality never trip it), an `isDecodedTxData()` type guard ships, and AC7's claim is downgraded from "additive-only" to consumer-compile-compatible with a documented runtime break for `.tx` on v8 records.
> 4. **Head-version query added to scope:** today's `PublicDataProvider` exposes no head protocol version, yet FR3/`networkHeadVersion` needs one — additive `queryLatestProtocolVersion()`; both new provider members are named implementer-facing changes (all in-repo implementations updated in the same PR).
> 5. **SEC-9 rescoped to decoded reads:** pre-fork, only the decoded contract-state query throws; `queryRawContractState` returns bytes + version, so the new major stays read-capable pre-fork via the compat codec (adoption-cliff consequence recorded at D9).
> 6. **Identity probe pinned:** both sides use the `ContractState` constructor exported from `protocol/ledger`; the check is constructor-reference equality.
>
> **Revision note (v3.4, 2026-08-05).** Senior-dev re-review of v3.3; nine findings applied:
> 1. **`.tx` typing decision pinned:** the declared `tx` stays required (a documented lying type on v8 records); `rawTx` is the sole additive field, populated on v8-tagged records **only**, and its absence is the guard's discriminant — `isDecodedTxData(d): d is FinalizedTxData & { readonly rawTx?: undefined }`. The compile-time signal is weak by design; guard + TROUBLESHOOTING are the mitigation.
> 2. **Shared accessor factory:** `createRawFinalizedTxData(fields)` in `types` installs the non-enumerable throwing accessor — mandatory for the provider and testkit mocks (descriptor-parity test, §8); an object literal would silently satisfy the interface without the throw.
> 3. **Sequencing fixed for the interface move:** `types` additions land before the compat package (which implements the interface via its `types` peer); §3/§10 re-ordered.
> 4. **OQ13 decoupled from `types` churn:** `KeepStateBridge<TArgs, TWitnesses, TPrivateState>` — witness/private-state shapes are opaque generics, so closing OQ13 cannot change the published `types` surface.
> 5. `protocolVersion` pre-exists on every record — only `rawTx` is additive (spec corrected).
> 6. `isDecodedTxData()` is declared in `types` and re-exported by the barrel — not in a provider implementation package.
> 7. **Single state snapshot per keep-state operation:** one `queryRawContractState` fetch; `contracts` decodes those bytes for routing + SEC-5 and hands the identical bytes to `executeCall` (closes an intra-operation TOCTOU).
> 8. Probe parameter typed `typeof ContractState` (not `object`) — the wrong-symbol failure mode is a compile error.
> 9. The SEC-9 pre-fork throw on decoded contract-state queries is recorded as AC7's third consumer-runtime caveat.
>
> **Revision note (v3.9, 2026-08-06).** Upstream confirmation received ([#1005 comment](https://github.com/midnightntwrk/midnight-js/issues/1005#issuecomment-5202692002), @tkerber): **all eight v3.2 answers are confirmed** — the v3.2 status caveat ("confirmation pending; a contradicting confirmation is a spec-revision trigger") is discharged with no contradiction. One re-ruling on answer 8 (**OQ15**): upstream will **not** add a first-class version-discriminant API to the ledger — the prepended serialized tag prefixes **are** the intended mechanism ("read the raw data to the second `:`, branch on the resulting human-readable data tag"). Rationale: a self-decoded tag has no dependency on APIs changing underneath, and with `n` versions it is one `n`-arm case statement instead of `n` individual instance tests. Consequence: the proving-seam assert is no longer "interim until the API lands" — the tag-prefix parse **is** the permanent, sanctioned implementation; OQ15 closes as resolved-by-ruling (still non-blocking defence-in-depth).
>
> **Revision note (v3.8, 2026-08-06).** Naming ruling (owner): the `utils` runtime helpers get **version-neutral names** — `isV9TxData()` → **`isDecodedTxData()`**, `createV8FinalizedTxData()` → **`createRawFinalizedTxData()`**. Rationale: (a) the pair's real axis is **raw vs decoded** — the discriminant is `rawTx` presence, and raw/decoded is already this spec's established vocabulary (`rawTx`, `queryRawContractState`, the SEC-9 *decoded*-read throw); (b) the helpers contain no v8 code (bytes + version int + a `defineProperty` accessor) — "v8" described the record, not a dependency, and the version-neutral name removes the false impression of v8 knowledge in core; (c) the mechanism generalises to the next fork window (at v10 the same factory surfaces raw **v9** records) — no public-API rename mid-window; the record's version stays in the data (`protocolVersion`), never in the function name. Applied throughout, **including in earlier revision notes** (the old names never shipped); record-construction and narrowing semantics are unchanged.
>
> **Revision note (v3.7, 2026-08-06).** Senior-QA review; ten findings applied (QA-11 withdrawn as moot after v3.6 — the helpers' tests live in `utils`, which has vitest infrastructure):
> 1. **Major-0 exemption (fixes a v3.5 self-contradiction):** major 0 is exempt from the same-major⇒same-era rule — 0.x minors are semver-breaking and only node 0.22 is attested as v8; int `23_000` fail-fasts **by design**. 0.x boundary values added to the table test.
> 2. **AC3's V3-proof negative given a construction path:** a test-only v9-compiled twin of the minimal keep-state fixture contract mints the V3 proof and the repopulated `v3`/`ir` key set; gates on the OQ9 harness decision.
> 3. **Stale-head detection predicate pinned:** on submit rejection, re-query the head — stale-head error iff it differs from the operation-start version; otherwise the rejection propagates wrapped with `{ cause }`.
> 4. **Head-query data source recorded** as a discovery item (OQ3d): the concrete indexer GraphQL field backing `queryLatestProtocolVersion` must be confirmed; the integration test asserts strictly against that source.
> 5. **Unsanctioned-mixing negatives enumerated** with their construction mechanisms (the type system makes them unrepresentable, so tests use serialized fixtures / compat internals).
> 6. **Spread-copy semantics tested and documented:** a cloned v8 record does not throw — `tx` is `undefined`, `rawTx` survives, `isDecodedTxData(copy)` is `false`; "re-guard after clone" goes to TROUBLESHOOTING.
> 7. **A4 mis-route with config attached** gets a specified observable (breadcrumb carries key-set shape + contract identity) and a deterministic-failure test.
> 8. **Golden-baseline lifecycle defined:** closed stage set; re-baselining only in dedicated no-production-change commits; anything else fails CI.
> 9. AC1's "byte-for-byte unchanged" replaced with a mechanically checkable export-surface assertion.
> 10. AC2's error-path enumeration made exhaustive against §6.2 + a meta-test on the error-code registry.
>
> **Revision note (v3.6, 2026-08-06).** Placement correction (owner ruling): `createRawFinalizedTxData()` and `isDecodedTxData()` are **runtime code and do not belong in `types`** — v3.4 findings 2/6 placed them there, which would have violated NFR4's own "`types` stays implementation-free". They live in **`@midnight-ntwrk/midnight-js-utils`** (core-logic layer, depends on `types`), re-exported by the barrel as before; the provider and testkit mocks import them from `utils`. `types` keeps only declarations: the `rawTx` field, the generic `KeepStateBridge` family, the keep-state entry options type, the two provider-query members.
>
> **Revision note (v3.5, 2026-08-06).** Blockchain-architect re-review; one finding applied (BC-1): `protocolVersionToLedger` maps **bounded per-major ranges** instead of per-minor ones. The confirmed invariant (#1005 answer 6 — same node major ⇒ same ledger era) makes a routine node minor upgrade (e.g. 2.2 → int `2_002_000`) provably same-era; under per-minor ranges it would hit the fail-fast branch and brick construct/submit for every dApp until a framework patch shipped. Bounds stay closed on both sides — the converse does **not** hold (majors may rise faster than eras), so an unknown *major* still fail-fasts rather than silently mapping a possible v10 era to v9. Security and blockchain-architect rounds otherwise deferred (see tracker issues).

---

## 1. Problem & Why

The Midnight blockchain is undergoing a hard fork from Ledger protocol **v8** to **v9**:

- Historical blocks/transactions on-chain are encoded with **v8**; new blocks past the fork height with **v9**. A single dApp session may read v8 history and submit v9 transactions.
- At the fork the protocol **migrates every deployed contract's on-chain `ContractState` into the ledger-9 envelope**, preserving the pre-fork verifier key (`source.v2 → op.v2`, `v3`/`ir` empty). State *data* (`impact-state-value[v2]`) and call transcripts are **byte-identical** across the two versions — only the envelope is re-versioned. These properties are spike-established **and contractual upstream** (#1005 answer 1: changing any of them would invalidate existing contracts, which is not an option).
- A pre-fork contract's compiled artifacts and the runtime that executes its circuits are pinned to ledger-8. The spike proved recompile-and-upgrade is **avoidable**: the deployed contract, its keys, and the executing runtime all stay on ledger-8 (keep-state, §4.3).

Today the framework is hard-pinned to v9: `@midnight-ntwrk/midnight-js-protocol` re-exports `@midnightntwrk/ledger-v9` / `onchain-runtime-v4` exclusively, and every downstream package imports through it. There is no runtime version selection anywhere.

**Goal:** (a) decode historical v8 records, (b) construct and submit v9 transactions (unchanged), (c) keep pre-fork (ledger-8-compiled) contracts transacting after the fork via keep-state — selecting behaviour at runtime from the protocol version reported by the network.

**What this is deliberately not:** a generic multi-version framework. Under D9 the construct→prove→submit pipeline is statically v9; v8 capability is decode/read plus the keep-state bridge. Under D8 (support window: current + previous) at most two versions are ever live, so version dispatch is a two-case switch at each of the few places that need it — not a parameterised facade.

---

## 2. Requirements

### Functional
- **FR1** — `protocol` MUST expose **version identity** utilities: the closed `LedgerVersion` type, `protocolVersionToLedger(int)` (OQ1 per-major bounded ranges, fail-fast on unknown major only — v3.5), and the sourcing helpers `versionOfRecord(record)` / `networkHeadVersion(source)`. Parameters are **structural** — `types` depends on `protocol`, so `protocol` cannot import provider interfaces (layering, §4.1). No unified dispatch facade (D10); `protocol`'s existing v9 exports are unchanged.
- **FR2** — Version handling MUST be **explicit**: helpers take the record / source as arguments; no hidden mutable global (D1).
- **FR3** — `contracts` MUST resolve the active protocol version from the `publicDataProvider` **per operation** (resolved at operation start, memoised within that operation only — no session-level subscription, which would reintroduce stale bindings). Requires the additive head-version query on `PublicDataProvider` (§4.4, v3.3 finding 4) — today's interface exposes none.
- **FR4** — **Keep-state.** `contracts` MUST let an already-deployed, ledger-8-compiled contract keep transacting after the fork with no recompilation and no v9 variant: down-convert the migrated state, execute on the dApp's retained ledger-8 stack, wrap the transcript in a native ledger-9 transaction with a V2 proof (proof version selected by the resolved verifier-key tag, never hardcoded). Enabled by **one opt-in config object** carrying a `KeepStateBridge` instance created by the compat package (§4.3). Applies to **calls** on pre-fork contracts only; post-fork deploys with ledger-8 artifacts throw.
- **FR5** — **No core package gains a v8 dependency.** `protocol`, `contracts`, `types` and all providers stay free of `ledger-v8` and of the compat package. v8 capability enters only dApp-side: the `keepState` config (keep-state) and dApp-side decoding of raw v8 records with the compat codec (§4.4). Proof providers are unchanged under D9 (keep-state key-triple pass-through per OQ12).
- **FR6** — Serialization respects what exists on-chain: **historical v8 records** are surfaced by the framework as **raw bytes + their `protocolVersion`** (the additive `rawTx` field, populated on v8-tagged records only; `protocolVersion` already exists on every record — v3.4 finding 5) and decoded dApp-side with the compat codec — they never inhabit v9-typed core interfaces (v3.1 finding 2); v9 records decode as today. **Fetched `ContractState` after the fork is always current-envelope** (migrated) and decodes with v9; a **decoded** `ContractState` fetch while the head is pre-fork (v6 envelope) throws a deterministic typed error (SEC-9) — the **raw** query (`queryRawContractState`, §4.4) stays available pre-fork (bytes + version, decodable dApp-side with the compat codec), so the new major remains read-capable before the fork (v3.3 finding 5).
- **FR7** — **No impairment of native ledger-9 execution.** The v9-native call/deploy path stays the default and MUST remain behaviourally unaffected (non-regression coverage required). Keep-state ships as a **dedicated entry point** — the v9-native entry's signatures and generics are untouched.

### Non-functional
- **NFR1 — Fail fast.** Unknown/unsupported protocol versions, version/artifact mismatches, dual-instance detection, and missing opt-in config throw clear, typed, remediation-bearing errors immediately. Never a silent default.
- **NFR2 — Type safety.** No `any` casts, no `unknown` bridging. v8 decode outputs are distinct types produced and consumed dApp-side; core interfaces carry v8 data only as raw bytes plus a version int.
- **NFR3 — KISS / YAGNI.** Only v8 and v9. No generic N-version layer (D10); at most two versions live at once (D8).
- **NFR4 — Layering preserved.** `types` stays implementation-free and depends on `protocol` (existing direction — `protocol` must not import from `types`); `protocol` remains the single seam for the v9 implementation, **including for the compat package** (which consumes v9 through `protocol/ledger`, never directly). The compat package is a **leaf** consumed only by dApps and injected inward.
- **NFR5 — Testability.** Every dual-behaviour path (routing, record surfacing, keep-state) is covered by tests exercising both versions.
- **NFR6 — Single WASM stack for core (structural, not promised).** Core packages never import v8 WASM — verified by a dependency-graph gate. The compat package introduces **no second v9 instance either**: v9 enters it only via the `protocol` peerDependency (v3.1 finding 4). Its `./codec` entry instantiates the v8 WASM at import (upstream wasm-bindgen behaviour); **importing that entry is itself the opt-in** — no init choreography.

---

## 3. Scope

### In scope
- `protocol`: additive version-identity exports (FR1). No dependency or subpath changes.
- New transitional package `@midnight-ntwrk/midnight-js-ledger-v8-compat` (D11): keep-state implementation (root entry) + the v8 historical-record decoders (`./codec` entry).
- `contracts` (MJS-02): per-operation version resolution, routing table (§4.3), a dedicated keep-state call entry consuming the `KeepStateBridge` interface from `types` (v3.4 finding 3), typed pre-fork/deploy throws.
- `indexer-public-data-provider` (MJS-03): raw-bytes + version surfacing for v8 records; additive raw-contract-state query for keep-state; additive head-version query (`queryLatestProtocolVersion()`) backing FR3/`networkHeadVersion` (v3.3 finding 4).
- `types`: **consumer-compile-compatible**, declarations only (the `rawTx` field, the generic `KeepStateBridge` family + keep-state entry options type, two provider queries — no changes to existing consumer-facing signatures; implementer policy and runtime caveats in §4.4).
- `utils`: the runtime helpers `isDecodedTxData()` + `createRawFinalizedTxData()` (v3.6 — `types` stays implementation-free per NFR4).
- Tests across both versions, including the fork-boundary scenario; migration guide + TROUBLESHOOTING entries for the new typed errors.

### Out of scope
- Pre-fork **operation** (construct/submit while the head is v8) — **D9**. There is no v8-native construct pipeline in this codebase and building one would serve only the shrinking pre-fork window. dApps that must transact pre-fork stay on the last v8-based major. A v8 head fail-fasts (§6.2). **Recorded consequence (v3.3):** pre-fork, the new major is **read-capable only** — raw record surfacing and `queryRawContractState` work (decode dApp-side via the compat codec), while construct/submit and decoded contract-state reads are unavailable.
- Producing v9-compiled variants of pre-fork contracts (superseded, v2) and deploying **new** ledger-8 contracts post-fork (typed error; new deploys require v9-compiled contracts).
- Wallet-side state migration — Wallet SDK track (OQ7); the midnight-js cross-fork e2e uses a test-only shim until it lands.
- Indexer/GraphQL schema changes (`protocolVersion` already exists); zk-config providers (ledger-agnostic; their artifacts are integrity-checked against the on-chain `co.v2` key — SEC-5); versions beyond v8/v9; proof-server infrastructure.
- A generic version-dispatch layer of any kind (D10).

---

## 4. Architecture & Components

### 4.1 MJS-01 — `protocol`: version identity only (shrunk)

`protocol` gains one small module and **nothing else changes** — no new dependencies, no WASM change, no subpath change. Backward compatibility (AC8) is trivial: the package's existing surface is untouched.

```ts
// packages/protocol/src/version.ts (illustrative)
export const LEDGER_VERSIONS = ['v8', 'v9'] as const;
export type LedgerVersion = (typeof LEDGER_VERSIONS)[number];

/** int encodes the NODE version (major·1_000_000 + minor·1_000) — OQ1 + BC-1 (v3.5).
 *  Bounded per-MAJOR ranges (same major ⇒ same era, #1005 answer 6):
 *  22_000 ≤ v < 23_000 (node 0.22) → v8; 1_000_000 ≤ v < 2_000_000 (node 1.x) → v8;
 *  2_000_000 ≤ v < 3_000_000 (node 2.x) → v9.
 *  Fail fast ONLY on an unknown major — a genuinely possible new era. Never on an unseen
 *  minor within a known major: a routine node upgrade must not brick construct/submit.
 *  No open-ended `>=`: majors can rise faster than eras, so node 3.x might be v10.
 *  Exception (QA-1): major 0 is EXEMPT from the same-major rule — 0.x minors are
 *  semver-breaking and only node 0.22 is attested as v8; 23_000 fail-fasts by design. */
export const protocolVersionToLedger = (protocolVersion: number): LedgerVersion => { ... };

/** Sourcing helpers — the two version sources are syntactically distinct so a wrong
 *  pairing is a spot-the-wrong-call error in review. Layering note: `types` depends
 *  on `protocol`, so these take STRUCTURAL parameters (any PublicDataProvider
 *  instance satisfies them) — protocol must not import provider interfaces. */
export const versionOfRecord = (record: { protocolVersion: number }): LedgerVersion => { ... };      // read paths
export const networkHeadVersion = (
  source: { queryLatestProtocolVersion(): Promise<number> }                                          // illustrative shape,
): Promise<LedgerVersion> => { ... };                                                                // construct/submit paths
```

`LedgerVersion` (widening at a future fork, then shrinking on removal) is the single compile-time signal downstream packages key on (D8). The sourcing distinction is convention plus spy tests, not a compiler guarantee — accepted consequence of dropping branded types (D10).

### 4.2 `@midnight-ntwrk/midnight-js-ledger-v8-compat` — transitional package (new, D11)

**Naming (v3.1).** The version is in the name because the package is inherently **one-fork-scoped**: it solves the (v8, v9) pair. Deprecation at v10 is natural ("the v8 package retires with v8"), and a future fork's transition package — if the per-fork spike shows one is needed at all — gets its own name (`…-ledger-v9-compat`) and its own spike-derived shape. "compat" states the purpose in the dApp developer's language; "bridge" remains the internal architecture term (the `KeepStateBridge` interface).

Two entry points, so a keep-state-only consumer never pays the v8 WASM cost:

**Root entry (`.`) — keep-state.**

```ts
export interface KeepStateBridgeConfig {
  compactRuntime: CompactRuntime016;   // structural interfaces (below) — the dApp's own
  onchainRuntime: OnchainRuntimeV3;    // imported instances; the framework cannot reach them (#1052)
}
export const createKeepStateBridge = (cfg: KeepStateBridgeConfig): KeepStateBridge => { ... };
```

- **v9 side — via `protocol` only (v3.1 finding 4).** The package declares `@midnight-ntwrk/midnight-js-protocol` **and `@midnight-ntwrk/midnight-js-types`** as **peerDependencies** (ranges = the framework major; workspace devDependencies for local build/tests) — `types` supplies the `KeepStateBridge` interface it implements (v3.3 finding 1) — and imports every v9 symbol from `protocol/ledger`. It declares **no direct `ledger-v9` dependency** — enforced by a packaging lint. Peer resolution guarantees the compat package shares the host app's single ledger-v9 module instance, so objects it produces (`ContractCallPrototype`) pass `instanceof` in the core pipeline. This closes the dual-instantiation axis (#1052) that a separate package would otherwise open on the v9 side, keeps `protocol` the single v9 seam (NFR4/D2), and decouples the compat package from ledger-v9 RC pin churn (OQ2).
- **Runtime identity fail-fast.** Module resolution can still be defeated by bundler misconfiguration (two module contexts — cf. the repo's Vite WASM guide). The bridge therefore exposes `usesSameLedgerInstance(probe: typeof ContractState): boolean`, and `contracts` invokes it **when the `keepState` config is attached**, throwing a typed `KeepStateLedgerInstanceMismatchError` (remediation → the dual-instantiation guide) before any work starts. **The probe is part of the contract (v3.3 finding 6):** both sides use the **`ContractState` constructor exported from `protocol/ledger`** — `contracts` passes it, the bridge compares it by **constructor-reference equality** against its own import. Pinning the symbol prevents the failure mode where the two sides pick different exports and the check either always fails or silently checks nothing — and the parameter is **typed `typeof ContractState`** (v3.4 finding 8), so a wrong symbol is a compile error, not a prose violation. One `===`, deterministic, and it fails at configuration time instead of as a mysterious proof failure minutes later.
- **0.16 typing (v3.1 finding 5).** `CompactRuntime016` / `OnchainRuntimeV3` are **hand-maintained structural interfaces** declared in the compat package, covering exactly the members it calls (`createCircuitContext`, decode, rehash — a handful). The real `compact-runtime@0.16` / `onchain-runtime-v3` packages are **devDependencies only**, used by a CI compile test that assigns the real module types to the structural interfaces — drift breaks the build. (v3's "type-only aliased devDependency" is withdrawn: published `.d.ts` referencing a dev-only alias does not resolve for consumers.)
- **Internals vs public contract.** `extractEncodedStateValue` (v9-enveloped bytes → byte-identical POJO; throws on malformed input or a lost `StateValue` type), `toExecutionState` (decode **and rehash** inside the dApp's runtime instance — bounded Merkle trees come back non-rehashed and must be rehashed before any `checkRoot`), and `wrapTranscriptV9` (POJO transcript + key tag → native v9 `ContractCallPrototype`) are **package internals**, exported only for the package's own tests. The public contract between packages is the `KeepStateBridge` interface (§4.3) at `executeCall` granularity — so no retained-stack type can ever appear in a core-package signature. Down-convert carries only `.data`; blank `.balance`/`.operations` are harmless — the ledger checks claimed spends against the real migrated on-chain state at apply.

**`./codec` entry — historical decode.** Exports the concrete decoders for raw v8 records surfaced by the provider (§4.4) — `decodeTransaction`, `decodeLedgerParameters`, `decodeZswapState` (final list is OQ3). This entry has `@midnight-ntwrk/ledger-v8` as a **regular dependency** — the only place in the whole tree — and importing it instantiates the v8 WASM: that import is the opt-in (NFR6). Where a v8 decoder fails **open** on wrong-version input (returns a structurally-valid-but-wrong object), the codec adds its own discriminant/round-trip check (OQ3c).

**Packaging.** ESM-only is acceptable (only transition-window dApps install it — no dual `.cjs`, no bundler-verification records: isolation is the package boundary). The OQ2 supply-chain checklist (two near-identical npm scopes, exact pins, lockfile integrity, CI scope/version gate) applies to **this package's** dependency tree. CI gates: (a) no core package resolves `ledger-v8` or the compat package; (b) the compat package resolves no direct `ledger-v9` (NFR6/FR5).

### 4.3 MJS-02 — `contracts`: protocol-version orchestration

**Version sources.** Read/decode of blocks/txs/events dispatches on the **per-record** `protocolVersion` (`versionOfRecord`). Construct/submit dispatches on the **network-head** version (`networkHeadVersion`) or an explicit caller-supplied target. Fetched contract state post-fork is always current-envelope (FR6 exception).

**Routing.** `contracts` resolves the version per operation and routes each operation down exactly one path:

| Network head | Contract | Path |
|---|---|---|
| v8 (pre-fork) | any | **out of scope (D9)** — construct/submit throws typed pre-fork error; read of v8 records works |
| v9 | compiled for ledger-9 | **v9-native** — default, untouched (FR7) |
| v9 | **call** on a pre-fork contract | **keep-state** (FR4) |
| v9 | **deploy** with ledger-8 artifacts | **rejected** — typed fail-fast error |

**Path detection (total truth table — the key-set shape is an adversarial input, §6.1).** Calls route on the operation verifier-key set of the fetched (migrated) `ContractState`: `co.v2`-only ⇒ **keep-state**; `v3`/`ir` present, no `co.v2` ⇒ **v9-native**; **both** populated (post-fork key rotation on a migrated contract) ⇒ **v9-native** + a dual-key breadcrumb; **neither** ⇒ typed unsupported-key-set error. Routing and proof-version selection read the same key tag, so they cannot disagree. Deploys route on the version tag of the supplied artifacts (exact artifact field: discovery item with OQ13). **Provenance caveat (v3.3 finding 2):** the `co.v2`-only ⇒ keep-state edge is total over *shapes*, not *provenance* — it assumes **A4** (every v9-era deploy populates `v3`/`ir`). Upstream keeps ZKIR-v2 contract support (#1005 answer 4), so a v9-era ZKIR-v2 deploy carrying `co.v2`-only keys is plausible and would mis-route to keep-state; A4's confirmation is asked with OQ13, and indexer deploy-era metadata is the recorded fallback second signal. Until confirmed, the missing-config error names both plausible causes (§6.2) so a mis-route is diagnosable.

**The `KeepStateBridge` interface (declared in `types` — v3.3 finding 1; `executeCall` granularity per v3.1 finding 6).** The bridge is a provider-shaped seam (implemented by the compat package, consumed by `contracts`, injected by the dApp), so it lives in `packages/types/src/` with the seven provider interfaces — feasible because `types` depends on `protocol`, and only POJOs and v9 types may appear in its signatures; no 0.16 type crosses into core:

```ts
export interface KeepStateBridge<TArgs, TWitnesses, TPrivateState> {
  /** Probe = the `ContractState` constructor from `protocol/ledger`, typed — passing any other
   *  symbol is a compile error (v3.4 finding 8); compared by constructor-reference equality (§4.2). */
  usesSameLedgerInstance(probe: typeof ContractState): boolean;
  /** Down-convert + execute + wrap, entirely inside the compat package. */
  executeCall(
    input: KeepStateCallInput<TArgs, TWitnesses, TPrivateState>
  ): Promise<KeepStateCallResult<TPrivateState>>;
}
export interface KeepStateCallInput<TArgs, TWitnesses, TPrivateState> {
  serializedContractState: Uint8Array;  // the SAME bytes contracts routed on — one fetch/operation (v3.4 finding 7)
  circuitId: string;
  args: TArgs;                          // opaque generics (v3.4 finding 4): OQ13 fixes the dApp-side
  witnesses: TWitnesses;                // bindings, not this published `types` surface
  privateState: TPrivateState;
}
export interface KeepStateCallResult<TPrivateState> {
  transcript: ...;                      // POJO (byte-identical layer) — exact type recorded with OQ13
  callPrototype: ContractCallPrototype; // native v9 object — same instance guaranteed (§4.2)
  nextPrivateState: TPrivateState;
}
```

**Dedicated keep-state entry (v3.1 finding 6).** A pre-fork contract's generated TS types target the 0.16 toolchain and will generally **not satisfy** the v9-pinned generic constraints (compact-js / compact-runtime 0.18) of the existing call entry. Keep-state therefore ships as a **separate, dedicated entry point** (e.g. `submitKeepStateCallTx`), generic over POJO circuit args/results with no 0.18 constraints — the v9-native entry's signatures are untouched (FR7). **The `keepState` config attaches as a typed options field of this dedicated entry** (type declared in `types` alongside the bridge interface — v3.3 finding 1), not on the global providers object — keep-state stays invisible to v9-only code paths. Private state keeps flowing through `privateStateProvider` under `contracts`' orchestration; witnesses and private-state values cross the bridge interface as opaque dApp-typed data (exact typing: OQ13).

**Developer contract (opt-in by design).** The framework cannot reach the dApp's runtime instances (#1052). Keep-state is enabled by one documented config object:

```ts
import { createKeepStateBridge } from '@midnight-ntwrk/midnight-js-ledger-v8-compat';
// ...
{ keepState: createKeepStateBridge({ compactRuntime, onchainRuntime }) }
```

On attach, `contracts` runs the instance-identity check (§4.2) — mismatch throws typed. A call routing to keep-state without the config fail-fasts with a typed error containing the exact snippet above. A zero-config mechanism discovered later is an upgrade, not a dependency of this design.

**The keep-state path** (per post-fork call on a pre-fork contract):
1. Fetch the **raw serialized** migrated `ContractState` (v9 envelope) via the provider's raw-state query (§4.4) — bytes, not a WASM object (v3.1 finding 7). **One fetch per operation (v3.4 finding 7):** `contracts` decodes these bytes itself (v9 decode via `protocol/ledger`) for the routing key-set and the SEC-5 pre-check, then hands the **identical bytes** to `bridge.executeCall` — routing, SEC-5 and execution share a single state snapshot. A second independent fetch would open an intra-operation TOCTOU window (routing evaluated against one block, execution input from another — doomed submissions or SEC-5 errors that look like tampering); §6.2's stale-head rule covers only the head-flip race, not this one.
2. `bridge.executeCall(...)` — inside the compat package: extract POJO → decode + rehash in the dApp's instance → execute the circuit on the dApp's retained stack → wrap the POJO transcript into a v9 `ContractCallPrototype`.
3. `contracts` composes `Intent` → `Transaction` (existing `zswap-utils`). The intent binding is v9-native from the start — no v8-tx carrier, no re-bind.
4. Prove — **V2**, selected by the resolved key tag. **Pre-proving consistency check (SEC-5):** the locally-resolved verifier key MUST byte-match the fetched state's `co.v2` slot; mismatch throws **before proving starts**. The ledger dispatches verification to the preserved `co.v2` slot, replays the transcript, requires effects equality.

State read paths (`get-states`, `tx-model`, `ledger-utils`, `zswap-utils`) decode per FR6.

### 4.4 MJS-03 — providers (shrunk)

Under D9 the proving pipeline is statically v9, so **most providers change nothing**:
- **Proof providers** (`http-client-proof-provider`, `dapp-connector-proof-provider`): unchanged. Keep-state proving: contract circuits prove with locally-sourced retained pre-fork key triples (V2 — ZKIR v2), native dust/zswap legs as regular v9 proofs. Per #1005 answer 3, the v9-era proof server supports (or is being extended to support) **both ZKIR versions**, and the ZKIR payload self-describes its version for server-side dispatch — the transition runs against **one dual-capable server**, which is also the single instance that receives the private witness. No client-side leg-routing decorator is needed (**OQ11 dissolved**); the client passes the retained key triples through the existing configured `proofProvider`. The *supported* key-delivery API and confirmation that the dual-ZKIR extension has shipped are the remaining items (**OQ12**, rescoped). "Local" = where keys are *sourced*, not where proving runs.
- **`indexer-public-data-provider`** — **v8 records are not decoded by the provider (v3.1 finding 2).** Per-record dispatch on `protocolVersion`: v9 records decode through today's static path, unchanged; **v8-tagged records** populate the additive `rawTx: Uint8Array` field — the **sole** additive field (`protocolVersion` pre-exists on every record, which is also what makes FR1's `versionOfRecord` structural parameter satisfiable — v3.4 finding 5); `rawTx` is populated on v8-tagged records **only**, making its presence/absence the runtime discriminant (the provider already holds `transaction.raw`). Accessing the v9-typed `tx` on them throws a typed error naming the compat codec ("decode `rawTx` with `@midnight-ntwrk/midnight-js-ledger-v8-compat/codec`"). **The throwing accessor is non-enumerable (v3.3 finding 3):** `JSON.stringify`, object spread, `structuredClone`, deep-equality and logging middleware iterate properties and must never trip it — the throw fires only on a direct `tx` read at the version seam (§6.2). **Typing decision (v3.4 finding 1):** the declared `tx` stays required — a documented lying type on v8 records; the compile-time signal is weak by design. Mitigation: `isDecodedTxData(d): d is FinalizedTxData & { readonly rawTx?: undefined }` — **declared in `utils`** (v3.6; runtime code never lives in `types` — NFR4) and re-exported by the `midnight-js` barrel, never in a provider implementation package (v3.4 finding 6) — plus the TROUBLESHOOTING entry. **Record construction goes through `createRawFinalizedTxData(fields)`** — a factory in `utils` (v3.4 finding 2, relocated v3.6) that installs the non-enumerable throwing accessor and populates `rawTx`; mandatory for this provider and the testkit mocks, because an object literal silently satisfies the interface with an enumerable, non-throwing `tx` (tests pass on mocks, production throws). Decoding v8 history is dApp-side. This keeps every core interface v9-typed with **zero v8 knowledge in the provider** — no injection seam. *Recorded fallback:* if MJS-03 implementation finds provider-internal logic that must read decoded v8 fields, an optional injected codec is the fallback design (discovery item with OQ3a).
  **Raw contract state for keep-state (v3.1 finding 7):** the provider exposes the serialized migrated state (it receives the hex before parsing) via an additive query (e.g. `queryRawContractState`), so the compat package receives bytes — no cross-package WASM object handoff. Contract-state exception per FR6 (decoded fetch is always current-envelope post-fork; the SEC-9 pre-fork throw applies to the **decoded** query only — the raw query returns v6-envelope bytes + version pre-fork, v3.3 finding 5).
  **Head-version query (v3.3 finding 4):** additive `queryLatestProtocolVersion(): Promise<number>` on `PublicDataProvider` — today's interface exposes no head protocol version, and FR3/`networkHeadVersion` requires one. **Data source (QA-4):** the concrete indexer GraphQL field backing it (expected: the latest block's `protocolVersion` tag) is a discovery item (OQ3d) — confirm it exists before MJS-03; the §8 integration test asserts strictly against that source, not just "a number". **Implementer policy for both new members** (`queryRawContractState`, `queryLatestProtocolVersion`): they are required interface members — consumer-compile-compatible but **implementer-facing breaking** (testkit mocks and third-party implementations must add them); per the repo rule all in-repo implementations update in the same PR, and the migration guide carries an implementer note.
- **`level-private-state-provider`** (security-critical): expected version-agnostic — it stores opaque contract-defined values the envelope migration never touches, and under keep-state they keep being written by the unchanged 0.16 stack. Confirm and record during MJS-03.
- **`types`**: **consumer-compile-compatible** (revises v3.2's "additive-only" — v3.3/v3.4): the `FinalizedTxData.rawTx` field, the generic `KeepStateBridge` family + keep-state entry options type (v3.3 finding 1, v3.4 finding 4), and the two provider queries are additions — declarations only; the runtime helpers `isDecodedTxData()` / `createRawFinalizedTxData()` live in `utils` (v3.6, NFR4); every existing consumer-facing signature is untouched. **Three conscious caveats (v3.4 finding 9):** `.tx` access on a historical v8 record is a **documented runtime break** (non-enumerable throwing accessor + guard); the **SEC-9 pre-fork throw** changes the runtime behaviour of the existing decoded contract-state queries (`queryContractState`, `queryZSwapAndContractState`, deploy-state variants — exact member list recorded during MJS-03) from `null`-returning to typed-throwing while the head is v8 (TROUBLESHOOTING entry per §6.2); and the new provider members are **implementer-facing breaking** (policy above). Under D9 every transaction reaching `proveTx` is statically v9, so the existing `CostModel.initialCostModel()` default in `createProofProvider` stays. Audit `types` for other runtime ledger values during MJS-01 (lint gate stays).
- **`midnight-js` barrel**: re-exports `protocol`'s new version utilities and `utils`' `isDecodedTxData()` guard (v3.4 finding 6, placement v3.6). The compat package is **deliberately not re-exported** — it is transitional, opt-in, and its deletion must not touch the barrel.

### 4.5 Type divergence — dissolved (replaces v2 §4.3)

There is no unified v8/v9 type surface to design:
- The construct→prove→submit pipeline is statically v9 (D9) — no unions, no brands, no discriminants.
- v8 decode outputs are plain types from the compat `./codec` entry, produced and consumed **dApp-side**. Core interfaces never carry them: v8 records cross core APIs as **raw bytes + version int** (§4.4), so no v9-typed field is ever asked to hold a v8 object (v3.1 finding 2).
- The shared keep-state POJO layer (`EncodedStateValue` / `impact-state-value[v2]`, transcript/`Op`/`AlignedValue`) is byte-identical across versions (spike-established). **Fixtures are the authoritative check**; compile-time `AssertEqual` assertions (where the `.d.ts` surfaces allow) are an API-drift detector, not a serialization guarantee.

The v2 three-bucket taxonomy, DEV-6 branding gate, WeakMap side-tables, and per-version ACL parity lists remain withdrawn — they solved a problem D9 had already removed.

---

## 5. Data Flow

```
Network/indexer ──protocolVersion:int──▶ publicDataProvider ──▶ contracts resolves LedgerVersion
        │                                       (protocol.protocolVersionToLedger)
        │
        ├─ network @ v8 (pre-fork) ─────────▶ read only; construct/submit throws (D9)
        │
        └─ network @ v9 (post-fork)
             ├─ v9-native contract ─────────▶ default v9 path (untouched — FR7)
             │
             └─ pre-fork (ledger-8) contract — KEEP-STATE (dedicated entry + injected bridge):
                  queryRawContractState → serialized migrated state (bytes)
                    │  bridge.executeCall: POJO extract → decode+rehash in dApp instance
                    │                      → circuit on dApp's ledger-8 stack → POJO transcript
                    │                      → wrap → ContractCallPrototype (same v9 instance — peer dep)
                    ▼
                  contracts composes Intent → Transaction (zswap-utils)
                    ▼
                  prove (V2 — selected by key tag; SEC-5 pre-check; verifies against preserved co.v2)
                    ▼
                  proofProvider ──▶ walletProvider ──▶ midnightProvider

Historical records: v9 → static decode (unchanged); v8 → surfaced as rawTx + protocolVersion,
decoded dApp-side via ledger-v8-compat/codec (tx access on a v8 record throws typed).
```

The transaction flow (`UnprovenTransaction → proveTx → balanceTx → submitTx`) is unchanged in shape and statically v9.

---

## 6. Error Handling

### 6.1 Threat model & trust boundaries

The indexer is a network service **outside the dApp's trust boundary**. The version int it reports drives record surfacing and path routing; the fetched `ContractState`'s key-set shape drives routing and its bytes become execution input.

| Boundary | Data crossing it | Failure mode |
|---|---|---|
| Indexer (GraphQL) | `protocolVersion` ints; records; fetched `ContractState` (key-set shape **and** bytes) | mis-route / garbage execution input — **bounded to DoS/griefing by the effects-equality backstop** |
| Proof server | full private witness + locally-sourced key triples | witness exfiltration if compromised; the transition runs **one dual-capable v9-era server** (#1005 answer 3) — the single witness recipient; confirm the dual-ZKIR extension has shipped when pinning (OQ12) |
| zk-config artifact source | prover/verifier/zkir triples | tampered/stale artifacts → griefing; bounded by the SEC-5 `co.v2` consistency check |
| dApp-supplied bridge/runtime handles | module references | in-process, same trust domain as the dApp's own code; a wrong module is a documented typed failure (incl. the §4.2 instance-identity check) |

**The integrity backstop is the ledger itself:** at apply, ledger-9 replays the transcript against the real on-chain state and requires effects equality — state/routing tampering is bounded to **DoS/griefing** (wasted proving, doomed submissions), never fund or verification compromise. This invariant is load-bearing and asserted by a §8 negative test.

**Residual risk — plausible-but-wrong version (SEC-1/OQ8).** `protocolVersionToLedger` guards only against *unknown* ints; a malicious indexer reporting a wrong-but-valid version passes narrowing. Under D9 a construct-path downgrade to v8 collapses to the fail-fast throw (DoS at worst); the remaining live risk is mis-routing a call between keep-state and v9-native — also bounded by the backstop. Mitigation (cross-check the head version against an independent signal) is tracked as **OQ8** with a named owner; until it lands, the §6.3 breadcrumbs are the detection mechanism.

**Wrong-version-into-proving (reduced in v3).** Under D9 plus the no-cast policy (NFR2, CI-enforced), a v8 value cannot reach `proveTx` without the developer defeating the type system first — and after v3.1 finding 2, decoded v8 objects exist only dApp-side. The proportionate defence: (a) compile-time separation (§4.5); (b) the on-chain backstop; (c) a one-line assert at the proving seam — per the upstream ruling (**OQ15**, v3.9, non-blocking) the prepended type/version tag on every serialized object **is** the sanctioned mechanism (parse to the second `:`, branch on the human-readable tag; no first-class API is coming), so the serialized-form check is the permanent implementation, not an interim one.

### 6.2 Error handling rules

- `protocolVersionToLedger` is the **sole narrowing point** from the untrusted `number` to the closed `LedgerVersion` set. Unknown int ⇒ typed error naming the observed int and the supported set — on read **and** construct paths (named distinctly so the next fork inherits a conscious decision — D8).
- **Pre-fork head (D9):** construct/submit with a v8 head ⇒ typed pre-fork-unsupported error ("stay on midnight-js vX for pre-fork operation").
- **Stale-head race:** the head can cross the fork between `networkHeadVersion` resolution and submit (proving takes minutes). **Detection predicate (QA-3):** on submit rejection, re-query `queryLatestProtocolVersion`; the stale-head error is raised **iff** the head version differs from the one resolved at operation start (deterministic, independent of the node/indexer error taxonomy). Otherwise the original rejection propagates wrapped with `{ cause }`. Dedicated typed error advising re-resolution and rebuild; no silent auto-retry.
- **v8 record `tx` access (v3.1; hardened v3.3):** reading the v9-typed `tx` of a v8-tagged `FinalizedTxData` ⇒ typed error: "v8 record — decode `rawTx` with `@midnight-ntwrk/midnight-js-ledger-v8-compat/codec`". The accessor is **non-enumerable** — serialization, spread, `structuredClone` and deep-equality never trigger it; only a direct read does. **Copies do not carry the accessor (QA-6):** after spread/clone, `tx` is silently `undefined` (no throw) while `rawTx` survives — always re-guard after cloning; `isDecodedTxData(copy)` still returns `false`. Prefer the exported `isDecodedTxData()` guard over try/catch (TROUBLESHOOTING entry covers both the throw and the copy caveat).
- **Ledger instance mismatch (v3.1):** the §4.2 identity check failing at `keepState` attach ⇒ `KeepStateLedgerInstanceMismatchError` with remediation pointing at the dual-instantiation guide — thrown at configuration time, before any fetch/proving.
- **Down-convert failure:** malformed input, cross-version decode failure, or a lost `StateValue` type ⇒ throw; never a silently wrong or empty state.
- **Proof-version invariant:** proof version derives from the resolved key tag, never hardcoded; a key set matching no supported proof version ⇒ typed error.
- **Artifact ↔ on-chain key mismatch (SEC-5):** locally-resolved verifier key ≠ fetched state's `co.v2` slot ⇒ typed error naming both sources, **before proving starts**.
- **Pre-migration contract state (SEC-9; rescoped v3.3):** a **decoded** fetch of a v6-envelope `ContractState` (pre-fork head) ⇒ deterministic typed error — never left to the v9 decoder happening to fail (cross-decode is not guaranteed to throw). The error names the raw alternative: `queryRawContractState` + the compat codec work pre-fork (FR6).
- **Missing opt-in config:** a call routing to keep-state without a `keepState` bridge ⇒ typed error containing the exact config snippet **and both plausible causes** (v3.3 finding 2): a migrated pre-fork contract (attach the config) *or* a v9-era ZKIR-v2 deploy mis-hitting the route (A4 unconfirmed) — so a mis-route is diagnosable, not just remediable.
- **Decode mismatch:** wrong-version decode surfaces the decoder error wrapped with `{ cause }` plus version context — never swallowed. Where a v8 decoder fails **open** (plausible for byte-identical shapes), the compat codec adds its own discriminant/round-trip check (OQ3c).
- **Remediation-bearing messages (DX):** every typed error states what happened, why, and the one next step, with concrete versions/heights/config keys.
- New error classes carry a stable `code` discriminant alongside the class (repo dual-publishes under two npm scopes — `instanceof` across accidentally-mixed scopes fails silently; document catching by `code`).
- Repo conventions: re-throw with `{ cause }`; **privacy constraint** — errors may reach an off-device logger: version ints, version sets, and key *identifiers* (names, tags, hashes) are allowed; key bytes, decoded state contents, key material, and raw payloads are not.

### 6.3 Observability

Throws catch failing cases; a plausible-but-wrong version passes narrowing silently — so positive-path breadcrumbs are required. Every version-dispatch decision (record **surfacing**, network-**head** resolution, **execution-path selection**, construct/submit **encoding**) emits a debug-level `loggerProvider` breadcrumb: selected `LedgerVersion`, path, source (per-record / network-head / explicit), raw int. **The execution-path-selection breadcrumb additionally carries the observed key-set shape and the contract address (QA-7)** — while A4 is unconfirmed, an A4 mis-route with the `keepState` config attached has no throwing path of its own, so this breadcrumb is what makes it reconstructable from logs (contract addresses are public — the §6.2 privacy constraint is respected). Subject to the §6.2 privacy constraint. `loggerProvider` is optional — the migration guide instructs operators to enable debug logging during the transition window, and the no-logger gap is part of OQ8's residual-risk sign-off.

---

## 7. Key Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | **Explicit version handling**, no mutable global. | v8/v9 operations coexist during the transition; a shared global is racy. Fail-fast-friendly. |
| D2 | `protocol` stays the single seam for the **v9** implementation — **including for the compat package**, which consumes v9 through `protocol/ledger` as a peerDependency. | Layering (NFR4) with a smaller core; one v9 WASM instance in the process by construction (v3.1 finding 4). |
| D3 | Existing `protocol` subpath exports stay **exactly as today** (v9). | Nothing is re-pointed because nothing moves. AC8 is trivial. |
| D4 | Version source = indexer `protocolVersion` (already present). | No schema change; subject to the §6.1 cross-check stance (OQ8). |
| D5 | v8 types stay **separate types**, never unified with v9; core interfaces carry v8 data only as raw bytes + version int. | Read leaves need no shared surface (§4.5); compile-time separation replaces runtime discriminants; the one place a v8 value would meet a v9-typed field (`FinalizedTxData.tx`) is resolved by raw surfacing (v3.1 finding 2). |
| D6 | Post-fork support for pre-fork contracts = **keep-state** (no recompile, no v9 variant, no artifact selection). | Spike-proven and **contractual upstream** (#1005 answer 1): migration preserves `co.v2`; state/transcript data byte-identical; wrapping unchanged ledger-8 execution in a native v9 tx is sufficient and strictly simpler. |
| D7 | Keep-state implementation lives in the **compat package**, behind the `executeCall`-granular `KeepStateBridge` interface declared in `types` (v3.3 finding 1); `Intent`/`Transaction`/offer composition stays in `contracts`. | The bridge is a provider-shaped seam — repo convention puts those in `packages/types/src/`; `contracts` stays 100% v9-typed — no 0.16 type can appear in a core signature (v3.1 finding 6); WASM instance identity preserved (#1052); no duplicated zswap logic. |
| D8 | **Support window: current + previous** (pending confirmation, OQ10). Construct/submit = current only (D9); decode/read = current + previous. Keep-state soundness is re-validated **per fork** via a spike, never assumed. | Bounds dependency/test growth; implies retiring the compat package when v10 enters scope. **Upstream imposes no ceiling** (#1005 answers 2/4: no plan to drop V2 proofs or ZKIR-v2 contract support) — the window is a midnight-js maintenance-policy choice, and retiring it requires the explicit OQ10 decision, not an upstream event. |
| D9 | **Pre-fork operation out of scope:** v8 capability = decode/read + keep-state; construct/submit is v9-only; a v8 head fail-fasts. | No v8-native construct pipeline exists; building one would be a major hidden workstream for a shrinking window. KISS/YAGNI. |
| D10 | **No generic version-dispatch layer:** no `getLedger<V>`, no unified facade, no type-bucket taxonomy. Concrete modules + a two-case switch at the few dispatch points. | Under D9 the pipeline is statically v9 and the raw v8-decode surface is ~4 functions in one file. N never exceeds 2 (D8). A generic facade encodes an assumed axis of variation an unknown v10 will not honour — abstraction is added *when* a future fork's shape is known (NFR3). |
| D11 | **Transitional package** `@midnight-ntwrk/midnight-js-ledger-v8-compat` (entries `.` keep-state / `./codec` decoders) instead of a `protocol/v8` subpath; **one package per fork window**, named for the version it retires with. | Bundle isolation is structural (don't install it); deletion at v10 is a package deprecation, not a breaking `exports`-map change on `protocol`; the v8 supply-chain surface is confined to one `package.json`; a future fork's package (if the spike shows one is needed) has its own name and shape. |
| D12 | **Fork date is not a design or priority driver.** Delivery is sequenced by dependency order (§10); cross-team items (OQ7, OQ12) track their own milestones. | The date changes no line of this design. |

---

## 8. Testing Strategy

Repo conventions: TDD, Arrange-Act-Assert, meaningful negatives, strict equality, both versions exercised where behaviour is dual (NFR5).

**Fixture provenance (precondition of the decode/keep-state test slices — OQ9).** The repo is v9-only today. Preferred: port the spike's generators (`ledger-v8` + `onchain-runtime-v3` as devDependencies; mint fixtures at test time; migrated-state fixture via the spike's migrate flow). Fallback: committed golden hex with its `protocolVersion` int. Inventory beyond v8/v9/migrated: a **v6-envelope** pre-migration state (SEC-9); **tampered** variants (key set flipped both ways; perturbed bytes); a **both-keys** fixture (truth table); a **Merkle-bearing** migrated fixture (rehash); a **test-only v9-compiled twin** of the minimal keep-state fixture contract (same circuits, v9 toolchain — QA-2) used solely to mint the V3 proof and the repopulated `v3`/`ir` key set for AC3's negative (that negative gates on the OQ9 harness decision and is authoritative at the unit/integration tier until OQ14). **Minimal-size mandate:** the smallest contract exhibiting each property (repo precedent: WASM-fixture coverage timeouts).

**Verification harness.** Proof/apply-level assertions need a local verifier — ledger-v9's local verify entry or a ported spike-simulator devDependency; **which one is decided with OQ9**. A fork-capable e2e environment (node/indexer/proof-server starting at v8, migrating at a height) does not exist in the testkit — **OQ14**; until it does, proof/apply-level ACs are authoritatively gated at the unit/integration tier (recorded, not implied).

- **protocol:** `protocolVersionToLedger` table test over the per-major bounded ranges (v3.5): known ints map, an **unseen minor within a known major maps without error** (node-2.2 regression guard), boundary values behave per the bounds — major 2 (`2_000_000`, `2_999_999`, `3_000_000`) **and the major-0 exemption** (`21_999`, `22_000`, `22_999`, `23_000` — the last fail-fasts by design, QA-1), unknown major hits the typed fail-fast; sourcing-guardrail spy test — `networkHeadVersion` called exactly once per construct operation, `versionOfRecord` never on the construct path.
- **ledger-v8-compat:**
  - Down-convert round-trip: migrated-state fixture → execution-ready state whose `StateValue` equals the pre-migration reference; negatives throw (malformed bytes, lost `StateValue` type).
  - Merkle rehash: a tree-bearing fixture's root is readable after down-convert; a deliberately non-rehashed decode **throws** on root access (proves the rehash step is load-bearing).
  - **Instance identity, 0.16 axis (#1052):** devDependency npm alias of the same runtime package (`onchain-runtime-v3-alt`); decode via one instance, execute via the other — POJO handoff succeeds; negative control: a WASM-backed object across instances fails.
  - **Instance identity, v9 axis (v3.1):** a `ledger-v9-alt` npm alias supplies a class from a second copy — `usesSameLedgerInstance` returns false and the `contracts` attach path throws `KeepStateLedgerInstanceMismatchError`.
  - **Structural-type drift (v3.1):** CI compile test assigning the real `compact-runtime@0.16` / `onchain-runtime-v3` module types (devDependencies) to the package's structural interfaces — upstream drift breaks the build.
  - `./codec`: v8 fixtures decode; a v9-tagged payload fed to a v8 decoder yields a **deterministic** failure signal — a throw where the decoder throws, otherwise the codec's own round-trip/discriminant check (OQ3c).
- **contracts:**
  - Routing truth table: all four key-set shapes asserted strictly (`co.v2`-only ⇒ keep-state; `v3`-bearing ⇒ v9-native; both ⇒ v9-native + breadcrumb; neither ⇒ typed error); post-fork v8-artifact **deploy** ⇒ typed error; keep-state route without config ⇒ guidance-bearing typed error.
  - Keep-state positive: pre-fork contract (migrated-state fixture + retained artifacts) accepts a post-fork call end-to-end through the **dedicated entry** — including the witness/private-state pass-through — with no recompilation and no v9 variant.
  - **Single-snapshot invariant (v3.4 finding 7):** the routing decision and the `serializedContractState` handed to `executeCall` derive from the same fetched bytes — exactly one `queryRawContractState` call per keep-state operation (spy-asserted).
  - **A4 mis-route with config attached (QA-7):** a `co.v2`-only fixture **not** built from the retained artifacts, entering keep-state with the `keepState` option attached ⇒ a deterministic typed failure at down-convert/execute — never a doomed submission with no version context; the execution-path breadcrumb carries the key-set shape + contract address.
  - **Stale-head predicate (QA-3):** mocked submit rejection + flipped head re-query ⇒ the stale-head typed error; the same rejection + unchanged head ⇒ the original rejection propagates wrapped with `{ cause }`.
  - **Entry typing (v3.1):** a compile-level test that a 0.16-generated contract's types are accepted by the dedicated keep-state entry (and NOT required to satisfy the v9-native entry's generics).
  - Proof-version negative: a V3 proof / repopulated `v3`/`ir` against the preserved `co.v2` key fails verification (minted with the v9-compiled twin fixture — QA-2); **unsanctioned mixing** — any intra-tx version mix other than the sanctioned keep-state composition throws (OQ4). **Enumerated cases + construction (QA-5)** — the type system makes these unrepresentable, so each names its mechanism: (i) a v8-serialized transaction body presented at the proving seam (serialized fixture, discriminated via the prepended version tag — the sanctioned OQ15 mechanism); (ii) a keep-state transcript wrapped with a V3 key tag (compat-package internal exports); (iii) a v9-native call prototype paired with a V2 proof request (serialized fixture).
  - Tampered fetched state (one deterministic outcome per fixture): key set flipped either way ⇒ the respective typed error (unit); state bytes perturbed but well-formed ⇒ rejection at apply (harness/OQ14 tier) — together asserting the §6.1 effects-equality backstop.
  - SEC-5: local verifier key ≠ `co.v2` slot ⇒ typed error **before proving**. SEC-9: v6-envelope fixture ⇒ deterministic typed throw.
  - Pre-fork head (D9): construct/submit throws; read of v8 records still succeeds.
  - **v9-native non-regression (FR7):** (a) existing v9 suites run **unmodified** (diff gate on the test files); (b) golden-fixture byte equality on deterministic stages (serialized `UnprovenTransaction`/`Intent`, decoded-state snapshots — a **closed set**, QA-8) captured on `main` before the first PR; (c) proof bytes excluded (nondeterministic); (d) **baseline lifecycle (QA-8):** the v9 RC pins churn (OQ2), so re-baselining is allowed only in a dedicated commit containing **no production-code changes**, with the per-stage diff recorded in the commit message — a baseline change in any other commit fails CI, so a real regression cannot hide inside a dependency-bump re-baseline.
  - Cross-cutting fork-boundary scenario: one session reads v8 history (raw + dApp-side decode), runs a keep-state call, and runs a v9-native flow side by side; stale-head flip ⇒ the dedicated typed error.
- **providers:** v8-tagged record ⇒ `rawTx`/`protocolVersion` populated and direct `tx` access throws the typed error, while `JSON.stringify`/spread/deep-equality of the same record do **not** throw (non-enumerable accessor, v3.3) and `isDecodedTxData()` narrows correctly both ways; mock and real provider records carry **identical property descriptors** for `tx` (both built via `createRawFinalizedTxData` — v3.4 finding 2); **copy shape (QA-6):** after spread/clone of a v8 record, strictly assert `copy.tx === undefined` (no throw), `rawTx` byte-equal to the original, and `isDecodedTxData(copy) === false`; v9 record ⇒ behaviour unchanged (docker integration against a real indexer response); `queryRawContractState` round-trips against the parsed state **and returns bytes + version for a pre-fork (v6-envelope) state** while the decoded query throws SEC-9; `queryLatestProtocolVersion` returns the head int backing `networkHeadVersion`; keep-state proving selects V2 by key tag and passes the retained key triples through the configured `proofProvider` (delivery API per OQ12).
- **Structural gates (CI):** dependency-graph assertions — no core package resolves `ledger-v8` or the compat package, and the compat package resolves no direct `ledger-v9` (NFR6/FR5); ESLint `no-explicit-any` + grep gate on `as unknown` (NFR2); compat-package export test (strict `toEqual` on sorted keys — full key set, not a subset); `types` compile-compat assertion (consumer direction — existing consumer code compiles unchanged; the implementer direction is covered by updating all in-repo implementations in the same PR, §4.4).
- Coverage: `packages/protocol` keeps 100%; compat-package branches unreachable in unit scope (WASM-internal error surfaces) get explicit, justified carve-outs decided in the PR, not at CI time. No coverage-padding tests.
- **Operational:** keep-state proving e2e runs serialized against its proof server (spike-documented contention; parallel cross-fork proving flakes). The fee-paying cross-fork e2e uses the test-only wallet shim (OQ7) — the shim port is a named work item so the e2e never silently degrades to `test.skip`.

---

## 9. Acceptance Criteria

AC numbering restarts in v3 (v2 mapping: AC4→AC3, AC11→AC4, AC12→AC5, AC13→AC8; v2 AC1/AC9/AC10 and the DEV-6/SEC-2 gates were withdrawn with the accessor layer).

- **AC1** — `protocol` exposes the version-identity utilities (FR1) with structural parameters (no import from `types`); `protocolVersionToLedger` maps the OQ1 per-major ranges (major-0 exemption included) and throws typed on unknown majors; **every pre-existing export (name, signature, runtime behaviour) is unchanged** — verified mechanically (QA-9): a strict-equality export-surface test (sorted **full** key sets) diffed against the pre-change export list, plus the existing suites running unmodified.
- **AC2** — **Every typed error path of §6.2 exists and is negative-tested, one test per path** — the enumeration is §6.2 itself, kept exhaustive (QA-10): unknown version (read and construct, separately), pre-fork head, post-fork v8 deploy, v8-record `tx` access, ledger-instance mismatch at attach, down-convert failure, **unsupported key set (the "neither" shape)**, **proof-version invariant (key set matching no supported proof version)**, SEC-5 mismatch, SEC-9 pre-migration state, stale-head (via the QA-3 predicate), missing `keepState` config, unsanctioned mixing, **wrapped decode-mismatch (`{ cause }` propagation)**. **Meta-test (QA-10):** the stable error-`code` registry is asserted with strict equality against the set of negative-tested codes — a new error class cannot ship untested. No silent fallback anywhere (NFR1).
- **AC3** — **Keep-state:** a contract deployed under ledger-8 accepts a new transaction after the fork with **no recompilation and no v9 variant**, through the dedicated entry with the documented `keepState` config; post-fork calls verify against the preserved `co.v2` key (negative: V3 proof fails verification); the #1052 POJO-only boundary holds on **both axes** (0.16 dual-instance test; v9 `ledger-v9-alt` identity test). (FR4)
- **AC4** — **v9-native non-regression:** v9 call/deploy flows behave exactly as before — verified by the FR7 mechanism (unmodified suites + golden fixtures), not by absence of complaints; the v9-native entry's signatures and generics are untouched. (FR7)
- **AC5** — **Routing & developer contract:** calls route via the total four-shape truth table; deploys via the artifact version tag; keep-state is enabled by the single documented `keepState` config attached to the dedicated entry's typed options (declared in `types`) with no contract/artifact changes; a 0.16-generated contract type-checks against the dedicated entry (compile-level test); missing config fail-fasts with the snippet-and-both-causes error (§6.2). (FR3, FR4)
- **AC6** — **Structural isolation:** no core package resolves `ledger-v8` or the compat package, and the compat package resolves no direct `ledger-v9` (CI dependency-graph gates); a v9-only dApp ships exactly today's single WASM stack; exactly one v9 instance exists in a keep-state process (peer resolution + attach-time identity check). (FR5, NFR6)
- **AC7** — Historical v8 records surface as raw bytes + version and decode correctly dApp-side via the compat codec; v9 records through the static path, unchanged; `types` changes are **consumer-compile-compatible** (existing consumer code compiles unchanged; three recorded caveats — the documented `.tx` runtime break on v8 records with its non-enumerable accessor + `isDecodedTxData()` guard, the SEC-9 pre-fork throw on the decoded contract-state queries, and the implementer-facing addition of the two provider members, all in-repo implementations updated in the same PR); `yarn lint` clean, build succeeds, tests pass, no `any`/`unknown` casts (CI-enforced from the first PR). (FR6, NFR2, NFR5)
- **AC8** — **Observability:** all four version-dispatch decision points emit the §6.3 breadcrumb (selected version, path, source, raw int) — unit-tested with an injected logger, strict equality on structured fields, no payloads/keys.
- **AC9** — **Documentation ships with the feature:** migration guide (the `keepState` snippet, dApp-side v8 history decoding, the OQ12 proof-server operator requirement — single dual-capable server + minimum version — once pinned, the D9 pre-fork stance, the V2-support statement per #1005 answer 2: no upstream sunset planned), TROUBLESHOOTING entries for the new typed errors (incl. instance mismatch and v8 `tx` access), llms.txt/API-doc updates.

---

## 10. Rollout & Sequencing

Sequenced by **dependency order** (D12 — the fork date is not a scheduling input for this spec):

1. **`protocol` version utils** (small, additive, unblocks everything).
2. **`types` + `utils`** (v3.4 finding 3 — MUST precede the compat package, which implements the interface via the `types` peer): `types` gets the declarations (generic `KeepStateBridge` family + keep-state entry options type, `rawTx`, the two new provider members); `utils` gets the runtime helpers `isDecodedTxData()` + `createRawFinalizedTxData()` (v3.6).
3. **`ledger-v8-compat` package** — keep-state (root entry) first, `./codec` second; each independently testable against fixtures.
4. **`contracts`**: routing, dedicated keep-state entry (bridge injected in tests).
5. **`indexer-public-data-provider`**: raw surfacing for v8 records + `queryRawContractState` + `queryLatestProtocolVersion` implementations (all in-repo implementations and testkit mocks in the same PR); barrel re-export of the version utils + `isDecodedTxData()`.
6. **Hardening:** OQ8 cross-check mechanism (with its negative test), the OQ15 tag-prefix assert at the proving seam (implementable now — v3.9 ruling; no upstream API to wait for), fork-capable e2e when OQ14 lands.

Notes:
- **Versioning:** core packages take additive/minor changes only (nothing existing moves — D3); the compat package versions independently and fast during the window (peer range on `protocol` tracks the framework major). Public-API additions follow repo release conventions.
- **Removal path (D8/D11):** at v10, `npm deprecate` the compat package ("ledger v8 is no longer supported — this compatibility layer is retired") and shrink `LedgerVersion` — the single compile-time signal downstream code keys on. Pre-announced from day one in the package README. Whether the (v9, v10) fork needs its own compat package is decided by that fork's spike — never assumed (D8). **Caveat (v3.2):** upstream keeps ZKIR-v2 contracts transactable indefinitely (#1005 answer 4), so retirement is a midnight-js policy act (OQ10) and strands any still-un-graduated keep-state contracts on the last compat-supporting major; the sanctioned graduation mechanism (key rotation installing v9 artifacts) is still unconfirmed upstream (tracked with OQ10).
- **Operator requirement (OQ12):** the transition window runs **one dual-capable v9-era proof server** (#1005 answer 3); the documented operator-facing requirement reduces to the minimum server version with dual-ZKIR support and the key-delivery API, pinned when OQ12 closes.
- **Wallet SDK dependency (OQ7):** the fee-paying cross-fork e2e depends on wallet state migration; the test-only shim port (spike `facade-builder.ts`/`sim-reads.ts` → testkit) is a named work item with an owner, deleted when the Wallet SDK lands `migrateState`.
- **Issue updates:** #1004's "unified v8/v9 dispatch APIs" framing and the #1005/#1006 sizings predate v3 — re-scope all three issues against D10/D11 (MJS-01 shrinks substantially; MJS-03 shrinks to the record-surfacing + raw-state query + the OQ12 key-triple pass-through).

---

## 11. Open Questions

Gates close only when a concrete artifact is merged with a green test. Mirror the open items as tracker issues (owners + resolve-by) rather than growing this document.

- **OQ1 — RESOLVED (incl. contract status, v3.2).** `protocolVersion` int encodes the **node** version (`major·1_000_000 + minor·1_000`); authoritative mapping in [`midnight-indexer/.../protocol_version.rs`](https://github.com/midnightntwrk/midnight-indexer/blob/main/indexer-common/src/domain/protocol_version.rs): node 0.22 & 1.0 → v8; node 2.0 & 2.1 → v9; anything else → error. Convention confirmed (#1005 answer 6) with a nuance: **the protocol major may rise faster than ledger eras, but a ledger era change always requires a protocol major change**. **Implementation (v3.5, BC-1): bounded per-major ranges** — an unseen minor within a known major maps automatically (same-major ⇒ same-era), so routine node upgrades never brick dApps; the fail-fast else-branch fires only on an unknown *major*, where a new era is genuinely possible (no open-ended `>=` — the converse of the invariant does not hold). Consequence: the mirrored table is extended once per node **major**, after confirming that major's era — that fail-fast is the designed maintenance signal, not a bug. Note the deliberate divergence from the indexer's per-minor table: the indexer fail-fasting on an unmapped minor is its own operational choice; midnight-js must not amplify it client-side. **Major-0 exemption (v3.7/QA-1):** major 0 does not get a whole-major range — 0.x minors are semver-breaking, so the invariant arguably does not extend to them, and only node 0.22 is historically attested as v8; `23_000` (a hypothetical node 0.23) fail-fasts by design.
- **OQ2 — RESOLVED (pins; re-confirm at implementation — RC tags churn).** v8 decode surface: `@midnight-ntwrk/ledger-v8@8.1.0` + `onchain-runtime-v3`; retained execution stack (dApp-owned): compact `0.31.1` / compact-runtime `0.16.0`; v9: `ledger-v9@1.0.0-rc.3` / `onchain-runtime-v4@4.0.0-rc.3`. **Supply-chain checklist** (scoped to the compat package): verify org ownership of both npm scopes (`@midnight-ntwrk` vs `@midnightntwrk` — a typosquat-shaped risk exactly where a wrong scope hides in review); exact pins + lockfile integrity for the v8 tree; CI gate asserting only audited scopes/versions in the compat package's resolved tree.
- **OQ3 — rescoped:** (a) the final `./codec` decoder list — which historical record types dApps actually consume (product input; today's codec surface is 4 functions, and post-fork contract state is v9-enveloped, so the likely answer is 2–3) — also decides whether the provider-side injected-codec **fallback** (§4.4) is ever needed; (b) byte-identity verification for the shared POJO layer (fixtures authoritative; `AssertEqual` as drift detector); (c) which v8 decoders fail **open** on wrong-version input (drives the codec-seam discriminant checks, §6.2); (d — v3.7/QA-4) the concrete indexer GraphQL field backing `queryLatestProtocolVersion` (expected: latest block's `protocolVersion`) — confirm existence and pin its semantics before MJS-03. Gate: the checked-in decoder list + identity assertions.
- **OQ4 — RESOLVED.** Exactly one sanctioned cross-version composition exists (keep-state: ledger-8 transcript in a native v9 tx with a V2 proof); the seam rejects any other intra-tx mix (negative test, §8).
- **OQ5 — WITHDRAWN (D12).** The fork date/height is not a design or priority driver for this spec. It remains a business/planning datum tracked outside this document.
- **OQ6 — WITHDRAWN.** The v2 lazy-init design (`initLedgerV8`, pre-init typed throws, CJS smoke tests) is moot under D11: the compat `./codec` import is the opt-in, and upstream at-import WASM instantiation (verified on `ledger-v9@1.0.0-rc.3`; confirm same layout on `ledger-v8` when pinning) is acceptable inside an explicitly-installed transitional package.
- **OQ7 — CONFIRMED REAL (owner: **@agronmurtezi**, Wallet SDK track — v3.2).** `migrateState` is an unimplemented stub; the spike reconstructed v9 wallet dust/shielded state from migrated on-chain state. Wallet SDK scope, but the midnight-js cross-fork fee e2e depends on it. **Validated interim workaround** (#1005 answer 7): run two Wallet SDK versions and restore v1 state using v2 code — spike-demonstrated. Fallback (named work item, §10): port the spike's reconstruct shim into testkit as test-only scaffolding; delete when the SDK lands. Target date still unanswered — follow up with the owner.
- **OQ8 — SECURITY, downgrade cross-check (owner: TBD — a named owner formally accepts the residual risk while open).** Independent signal to cross-check the indexer's head version on construct/submit (§6.1). Until it lands, §6.3 breadcrumbs are the detection; the negative test ships with the mechanism. Resolve before the release is declared production-ready for the transition window.
- **OQ9 — PARTIALLY RESOLVED.** Spike islands are the canonical fixture source (reproducible generators exist). Remaining: port/mint per §8 inventory + record the verification-harness decision (ledger-v9 local verify vs spike simulator). Blocks the decode/keep-state test slices.
- **OQ10 — support window (owner: team/PO).** Confirm "current + previous" (D8) as standing policy — still unanswered. **New input (v3.2):** upstream imposes no ceiling — no plan to drop V2 proofs (#1005 answer 2) or ZKIR-v2 contract support (answer 4); the contract dictates its runtime, midnight-js the chain interaction. D8 is therefore purely a midnight-js maintenance decision. **Folded in from question 4a:** the sanctioned graduation path (post-fork maintenance-authority key rotation installing v9 artifacts — the "both keys" routing shape) is unconfirmed upstream; confirm it alongside the window policy, since retirement without a graduation mechanism strands keep-state contracts (§10).
- **OQ11 — RESOLVED (dissolved, v3.2).** With one dual-capable proof server (#1005 answer 3) there is no leg-routing to own: the client passes the retained pre-fork key triples through the existing configured `proofProvider`; ZKIR self-describes its version and the server dispatches. The pass-through plumbing ships with the dedicated keep-state entry (MJS-02); the API detail folds into OQ12.
- **OQ12 — RESCOPED (owner: TBD; before MJS-03 freeze).** Topology answered (#1005 answer 3): **one dual-capable v9-era server**, single witness recipient, server-side dispatch on the ZKIR's embedded version. Remaining: (a) the *supported* key-delivery API for retained pre-fork key triples (the spike shipped them ad-hoc); (b) the minimum proof-server version with dual-ZKIR support actually shipped ("is being extended" — confirm at pin time); (c) other proving modalities (e.g. DApp-connector local proving) are a separate upstream story — record their status for the migration guide. Still becomes the operator-facing rollout requirement (§10).
- **OQ13 — keep-state execution-leg shape (owner: TBD; before the compat API freeze).** Confirm keep-state needs no compact-js involvement (the spike drives raw `createCircuitContext` + invoke); if a shim is needed, pin a 0.16-compatible version. Finalise the `executeCall` signature — **including the witness / private-state typing** (v3.1 finding 6) — and record the artifact field carrying the version tag for deploy-path detection (§4.3). **Added v3.3:** confirm **A4** upstream — does every v9-era deploy populate `v3`/`ir`, i.e. is a `co.v2`-only key set a unique signature of a migrated pre-fork contract? If refuted, add a second routing signal (indexer deploy-era/contract-version metadata) — recorded fallback (§4.3). **Added v3.4:** the witness/private-state typing decision binds only the dApp-side generic instantiation — the published `types` surface is generic (`KeepStateBridge<TArgs, TWitnesses, TPrivateState>`, finding 4) and does not churn when this closes.
- **OQ14 — DIRECTION SET (owner: TBD — now a midnight-js scope decision, v3.2).** Upstream's test plan includes **multiple fork rehearsals**, but explicitly advises midnight-js to own **environment-independent e2e tests, even if only happy paths** (#1005 answer 5) — rehearsals complement, they do not substitute. Remaining: build the testkit node+indexer+proof-server matrix that starts at v8 and migrates at a height, or adopt the spike simulator (decide with OQ9's harness choice). Until it exists, proof/apply-level ACs gate at the unit/integration harness tier.
- **OQ15 — RESOLVED BY RULING (v3.9; non-blocking).** No first-class version-discriminant API will be added to the ledger — @tkerber's ruling ([#1005 comment](https://github.com/midnightntwrk/midnight-js/issues/1005#issuecomment-5202692002)) is that the prepended serialized tag prefixes **are** the way to do this: read the raw data to the second `:`, branch on the resulting human-readable data tag. Advantages named upstream: no dependency on APIs changing underneath, and one `n`-arm case statement instead of `n` instance tests as versions grow. The proving-seam assert (§6.1) implements exactly this parse and is the permanent mechanism. Nice-to-have defence-in-depth; the design does not depend on it.

**Assumptions.** **A1:** the indexer tags every block/tx/event with a correct `protocolVersion`; trusted subject to the OQ8 cross-check stance. **A2:** the dApp retains its pre-fork toolchain outputs unchanged (artifacts, keys, runtime); the framework never compiles contracts and never mutates artifacts. **A3 (v3.2):** the keep-state migration facts — byte-identical state data and transcripts, `co.v2` key preservation, ledger-9 verifying V2 proofs against the preserved slot — are **contractual upstream guarantees**, not spike-era behaviour (#1005 answer 1). **A4 (v3.3):** a `co.v2`-only key set on a fetched post-fork `ContractState` implies a **migrated pre-fork contract** — equivalently, every v9-era deploy populates `v3`/`ir`. Not yet upstream-confirmed (asked with OQ13); given #1005 answer 4 (ZKIR-v2 contract support continues), a v9-era ZKIR-v2 deploy could violate it — fallback: a second routing signal from indexer deploy-era metadata. *Status of the v3.2 answers:* **confirmed** — @tkerber confirmed all eight of @kapke's reads on 2026-08-06 ([#1005 comment](https://github.com/midnightntwrk/midnight-js/issues/1005#issuecomment-5202692002)); the only nuance is the OQ15 re-ruling (tag prefixes are the mechanism; no first-class API), which contradicts nothing this design depends on. Note A4 is a midnight-js-side assumption asked with OQ13 — it is *not* covered by this confirmation.
