# Design Spec — Ledger v8 / v9 Support in Midnight.js (Hard-Fork Transition)

**Status:** Draft v3.1 (post TS-implementability review)
**Date:** 2026-07-09 (v1) · 2026-08-03 (v2 — keep-state rework) · 2026-08-04 (v3 — simplification rework; v3.1 — TS-dev review findings)
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

---

## 1. Problem & Why

The Midnight blockchain is undergoing a hard fork from Ledger protocol **v8** to **v9**:

- Historical blocks/transactions on-chain are encoded with **v8**; new blocks past the fork height with **v9**. A single dApp session may read v8 history and submit v9 transactions.
- At the fork the protocol **migrates every deployed contract's on-chain `ContractState` into the ledger-9 envelope**, preserving the pre-fork verifier key (`source.v2 → op.v2`, `v3`/`ir` empty). State *data* (`impact-state-value[v2]`) and call transcripts are **byte-identical** across the two versions — only the envelope is re-versioned (spike-established).
- A pre-fork contract's compiled artifacts and the runtime that executes its circuits are pinned to ledger-8. The spike proved recompile-and-upgrade is **avoidable**: the deployed contract, its keys, and the executing runtime all stay on ledger-8 (keep-state, §4.3).

Today the framework is hard-pinned to v9: `@midnight-ntwrk/midnight-js-protocol` re-exports `@midnightntwrk/ledger-v9` / `onchain-runtime-v4` exclusively, and every downstream package imports through it. There is no runtime version selection anywhere.

**Goal:** (a) decode historical v8 records, (b) construct and submit v9 transactions (unchanged), (c) keep pre-fork (ledger-8-compiled) contracts transacting after the fork via keep-state — selecting behaviour at runtime from the protocol version reported by the network.

**What this is deliberately not:** a generic multi-version framework. Under D9 the construct→prove→submit pipeline is statically v9; v8 capability is decode/read plus the keep-state bridge. Under D8 (support window: current + previous) at most two versions are ever live, so version dispatch is a two-case switch at each of the few places that need it — not a parameterised facade.

---

## 2. Requirements

### Functional
- **FR1** — `protocol` MUST expose **version identity** utilities: the closed `LedgerVersion` type, `protocolVersionToLedger(int)` (OQ1 range table, fail-fast on unknown), and the sourcing helpers `versionOfRecord(record)` / `networkHeadVersion(source)`. Parameters are **structural** — `types` depends on `protocol`, so `protocol` cannot import provider interfaces (layering, §4.1). No unified dispatch facade (D10); `protocol`'s existing v9 exports are unchanged.
- **FR2** — Version handling MUST be **explicit**: helpers take the record / source as arguments; no hidden mutable global (D1).
- **FR3** — `contracts` MUST resolve the active protocol version from the `publicDataProvider` **per operation** (resolved at operation start, memoised within that operation only — no session-level subscription, which would reintroduce stale bindings).
- **FR4** — **Keep-state.** `contracts` MUST let an already-deployed, ledger-8-compiled contract keep transacting after the fork with no recompilation and no v9 variant: down-convert the migrated state, execute on the dApp's retained ledger-8 stack, wrap the transcript in a native ledger-9 transaction with a V2 proof (proof version selected by the resolved verifier-key tag, never hardcoded). Enabled by **one opt-in config object** carrying a `KeepStateBridge` instance created by the compat package (§4.3). Applies to **calls** on pre-fork contracts only; post-fork deploys with ledger-8 artifacts throw.
- **FR5** — **No core package gains a v8 dependency.** `protocol`, `contracts`, `types` and all providers stay free of `ledger-v8` and of the compat package. v8 capability enters only dApp-side: the `keepState` config (keep-state) and dApp-side decoding of raw v8 records with the compat codec (§4.4). Proof providers are unchanged under D9 (keep-state proving routing per OQ11/OQ12).
- **FR6** — Serialization respects what exists on-chain: **historical v8 records** are surfaced by the framework as **raw bytes + their `protocolVersion`** and decoded dApp-side with the compat codec — they never inhabit v9-typed core interfaces (v3.1 finding 2); v9 records decode as today. **Fetched `ContractState` after the fork is always current-envelope** (migrated) and decodes with v9; a `ContractState` fetched while the head is pre-fork (v6 envelope) throws a deterministic typed error (SEC-9).
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
- `contracts` (MJS-02): per-operation version resolution, routing table (§4.3), the `KeepStateBridge` interface, a dedicated keep-state call entry, typed pre-fork/deploy throws.
- `indexer-public-data-provider` (MJS-03): raw-bytes + version surfacing for v8 records; additive raw-contract-state query for keep-state.
- `types`: **additive-only** changes (new optional/raw fields and query — no breaking signature changes).
- Tests across both versions, including the fork-boundary scenario; migration guide + TROUBLESHOOTING entries for the new typed errors.

### Out of scope
- Pre-fork **operation** (construct/submit while the head is v8) — **D9**. There is no v8-native construct pipeline in this codebase and building one would serve only the shrinking pre-fork window. dApps that must transact pre-fork stay on the last v8-based major. A v8 head fail-fasts (§6.2).
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

/** int encodes the NODE version (major·1_000_000 + minor·1_000) — OQ1 table.
 *  22_000–22_999 (node 0.22) → v8; 1_000_000–1_000_999 (node 1.0) → v8;
 *  2_000_000–2_000_999 (node 2.0) → v9; 2_001_000–2_001_999 (node 2.1) → v9.
 *  Fail fast on anything else (the indexer does the same). */
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

- **v9 side — via `protocol` only (v3.1 finding 4).** The package declares `@midnight-ntwrk/midnight-js-protocol` as a **peerDependency** (range = the framework major; workspace devDependency for local build/tests) and imports every v9 symbol from `protocol/ledger`. It declares **no direct `ledger-v9` dependency** — enforced by a packaging lint. Peer resolution guarantees the compat package shares the host app's single ledger-v9 module instance, so objects it produces (`ContractCallPrototype`) pass `instanceof` in the core pipeline. This closes the dual-instantiation axis (#1052) that a separate package would otherwise open on the v9 side, keeps `protocol` the single v9 seam (NFR4/D2), and decouples the compat package from ledger-v9 RC pin churn (OQ2).
- **Runtime identity fail-fast.** Module resolution can still be defeated by bundler misconfiguration (two module contexts — cf. the repo's Vite WASM guide). The bridge therefore exposes `usesSameLedgerInstance(probe: object): boolean` — reference equality against its own imported v9 class — and `contracts` invokes it **when the `keepState` config is attached**, throwing a typed `KeepStateLedgerInstanceMismatchError` (remediation → the dual-instantiation guide) before any work starts. One `===`, deterministic, and it fails at configuration time instead of as a mysterious proof failure minutes later.
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

**Path detection (total truth table — the key-set shape is an adversarial input, §6.1).** Calls route on the operation verifier-key set of the fetched (migrated) `ContractState`: `co.v2`-only ⇒ **keep-state**; `v3`/`ir` present, no `co.v2` ⇒ **v9-native**; **both** populated (post-fork key rotation on a migrated contract) ⇒ **v9-native** + a dual-key breadcrumb; **neither** ⇒ typed unsupported-key-set error. Routing and proof-version selection read the same key tag, so they cannot disagree. Deploys route on the version tag of the supplied artifacts (exact artifact field: discovery item with OQ13).

**The `KeepStateBridge` interface (declared in `contracts` — v3.1 finding 6).** Only POJOs and v9 types may appear in its signatures; no 0.16 type crosses into core:

```ts
export interface KeepStateBridge {
  /** Reference-equality probe against the bridge's own v9 import (§4.2). */
  usesSameLedgerInstance(probe: object): boolean;
  /** Down-convert + execute + wrap, entirely inside the compat package. */
  executeCall(input: KeepStateCallInput): Promise<KeepStateCallResult>;
}
export interface KeepStateCallInput {
  serializedContractState: Uint8Array;  // raw migrated state (v9 envelope) — provider raw query (§4.4)
  circuitId: string;
  args: ...;                            // POJO circuit arguments
  witnesses: ...;                       // dApp witness functions + private state, passed through opaquely —
  privateState: ...;                    // exact typing is part of the OQ13 freeze gate
}
export interface KeepStateCallResult {
  transcript: ...;                      // POJO (byte-identical layer)
  callPrototype: ContractCallPrototype; // native v9 object — same instance guaranteed (§4.2)
  nextPrivateState: ...;
}
```

**Dedicated keep-state entry (v3.1 finding 6).** A pre-fork contract's generated TS types target the 0.16 toolchain and will generally **not satisfy** the v9-pinned generic constraints (compact-js / compact-runtime 0.18) of the existing call entry. Keep-state therefore ships as a **separate, dedicated entry point** (e.g. `submitKeepStateCallTx`), generic over POJO circuit args/results with no 0.18 constraints — the v9-native entry's signatures are untouched (FR7). Private state keeps flowing through `privateStateProvider` under `contracts`' orchestration; witnesses and private-state values cross the bridge interface as opaque dApp-typed data (exact typing: OQ13).

**Developer contract (opt-in by design).** The framework cannot reach the dApp's runtime instances (#1052). Keep-state is enabled by one documented config object:

```ts
import { createKeepStateBridge } from '@midnight-ntwrk/midnight-js-ledger-v8-compat';
// ...
{ keepState: createKeepStateBridge({ compactRuntime, onchainRuntime }) }
```

On attach, `contracts` runs the instance-identity check (§4.2) — mismatch throws typed. A call routing to keep-state without the config fail-fasts with a typed error containing the exact snippet above. A zero-config mechanism discovered later is an upgrade, not a dependency of this design.

**The keep-state path** (per post-fork call on a pre-fork contract):
1. Fetch the **raw serialized** migrated `ContractState` (v9 envelope) via the provider's raw-state query (§4.4) — bytes, not a WASM object (v3.1 finding 7).
2. `bridge.executeCall(...)` — inside the compat package: extract POJO → decode + rehash in the dApp's instance → execute the circuit on the dApp's retained stack → wrap the POJO transcript into a v9 `ContractCallPrototype`.
3. `contracts` composes `Intent` → `Transaction` (existing `zswap-utils`). The intent binding is v9-native from the start — no v8-tx carrier, no re-bind.
4. Prove — **V2**, selected by the resolved key tag. **Pre-proving consistency check (SEC-5):** the locally-resolved verifier key MUST byte-match the fetched state's `co.v2` slot; mismatch throws **before proving starts**. The ledger dispatches verification to the preserved `co.v2` slot, replays the transcript, requires effects equality.

State read paths (`get-states`, `tx-model`, `ledger-utils`, `zswap-utils`) decode per FR6.

### 4.4 MJS-03 — providers (shrunk)

Under D9 the proving pipeline is statically v9, so **most providers change nothing**:
- **Proof providers** (`http-client-proof-provider`, `dapp-connector-proof-provider`): unchanged. Keep-state **hybrid proving** routes by key location (spike `contract-proving.ts`): contract circuits prove with locally-sourced retained pre-fork key triples (V2), native dust/zswap legs via the proof server. "Local" = where keys are *sourced*; the witness still ships to the proof server (`8.0.3` in the spike) — which server(s) see it during the transition is an output of **OQ12**. Whether the routing lands in MJS-02 or MJS-03 is **OQ11**.
- **`indexer-public-data-provider`** — **v8 records are not decoded by the provider (v3.1 finding 2).** Per-record dispatch on `protocolVersion`: v9 records decode through today's static path, unchanged; **v8-tagged records** populate additive raw fields (`protocolVersion: number`, `rawTx: Uint8Array` — the provider already holds `transaction.raw`) and accessing the v9-typed `tx` on them throws a typed error naming the compat codec ("decode `rawTx` with `@midnight-ntwrk/midnight-js-ledger-v8-compat/codec`"). Decoding v8 history is dApp-side. This keeps every core interface v9-typed with **zero v8 knowledge in the provider** — no injection seam. *Recorded fallback:* if MJS-03 implementation finds provider-internal logic that must read decoded v8 fields, an optional injected codec is the fallback design (discovery item with OQ3a).
  **Raw contract state for keep-state (v3.1 finding 7):** the provider exposes the serialized migrated state (it receives the hex before parsing) via an additive query (e.g. `queryRawContractState`), so the compat package receives bytes — no cross-package WASM object handoff. Contract-state exception per FR6 (always current-envelope post-fork; SEC-9 pre-fork throw).
- **`level-private-state-provider`** (security-critical): expected version-agnostic — it stores opaque contract-defined values the envelope migration never touches, and under keep-state they keep being written by the unchanged 0.16 stack. Confirm and record during MJS-03.
- **`types`**: **additive-only, no breaking changes** (revises v3's "unchanged"): the `FinalizedTxData` raw fields and the raw-state query are additions; every existing signature is untouched. Under D9 every transaction reaching `proveTx` is statically v9, so the existing `CostModel.initialCostModel()` default in `createProofProvider` stays. Audit `types` for other runtime ledger values during MJS-01 (lint gate stays).
- **`midnight-js` barrel**: re-exports `protocol`'s new version utilities. The compat package is **deliberately not re-exported** — it is transitional, opt-in, and its deletion must not touch the barrel.

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
| Proof server(s) | full private witness + locally-sourced key triples | witness exfiltration if compromised; the transition may run an old `8.0.3` server or two servers side by side — which server(s) see the witness is an output of OQ12 |
| zk-config artifact source | prover/verifier/zkir triples | tampered/stale artifacts → griefing; bounded by the SEC-5 `co.v2` consistency check |
| dApp-supplied bridge/runtime handles | module references | in-process, same trust domain as the dApp's own code; a wrong module is a documented typed failure (incl. the §4.2 instance-identity check) |

**The integrity backstop is the ledger itself:** at apply, ledger-9 replays the transcript against the real on-chain state and requires effects equality — state/routing tampering is bounded to **DoS/griefing** (wasted proving, doomed submissions), never fund or verification compromise. This invariant is load-bearing and asserted by a §8 negative test.

**Residual risk — plausible-but-wrong version (SEC-1/OQ8).** `protocolVersionToLedger` guards only against *unknown* ints; a malicious indexer reporting a wrong-but-valid version passes narrowing. Under D9 a construct-path downgrade to v8 collapses to the fail-fast throw (DoS at worst); the remaining live risk is mis-routing a call between keep-state and v9-native — also bounded by the backstop. Mitigation (cross-check the head version against an independent signal) is tracked as **OQ8** with a named owner; until it lands, the §6.3 breadcrumbs are the detection mechanism.

**Wrong-version-into-proving (reduced in v3).** Under D9 plus the no-cast policy (NFR2, CI-enforced), a v8 value cannot reach `proveTx` without the developer defeating the type system first — and after v3.1 finding 2, decoded v8 objects exist only dApp-side. The proportionate defence: (a) compile-time separation (§4.5); (b) the on-chain backstop; (c) **if** the ledger exposes a cheap version discriminant, a one-line assert at the proving seam (**OQ15**, non-blocking).

### 6.2 Error handling rules

- `protocolVersionToLedger` is the **sole narrowing point** from the untrusted `number` to the closed `LedgerVersion` set. Unknown int ⇒ typed error naming the observed int and the supported set — on read **and** construct paths (named distinctly so the next fork inherits a conscious decision — D8).
- **Pre-fork head (D9):** construct/submit with a v8 head ⇒ typed pre-fork-unsupported error ("stay on midnight-js vX for pre-fork operation").
- **Stale-head race:** the head can cross the fork between `networkHeadVersion` resolution and submit (proving takes minutes). A submit rejection consistent with a version flip ⇒ dedicated typed error advising re-resolution and rebuild; no silent auto-retry.
- **v8 record `tx` access (v3.1):** reading the v9-typed `tx` of a v8-tagged `FinalizedTxData` ⇒ typed error: "v8 record — decode `rawTx` with `@midnight-ntwrk/midnight-js-ledger-v8-compat/codec`".
- **Ledger instance mismatch (v3.1):** the §4.2 identity check failing at `keepState` attach ⇒ `KeepStateLedgerInstanceMismatchError` with remediation pointing at the dual-instantiation guide — thrown at configuration time, before any fetch/proving.
- **Down-convert failure:** malformed input, cross-version decode failure, or a lost `StateValue` type ⇒ throw; never a silently wrong or empty state.
- **Proof-version invariant:** proof version derives from the resolved key tag, never hardcoded; a key set matching no supported proof version ⇒ typed error.
- **Artifact ↔ on-chain key mismatch (SEC-5):** locally-resolved verifier key ≠ fetched state's `co.v2` slot ⇒ typed error naming both sources, **before proving starts**.
- **Pre-migration contract state (SEC-9):** fetching a v6-envelope `ContractState` (pre-fork head) ⇒ deterministic typed error — never left to the v9 decoder happening to fail (cross-decode is not guaranteed to throw).
- **Missing opt-in config:** a call routing to keep-state without a `keepState` bridge ⇒ typed error containing the exact config snippet.
- **Decode mismatch:** wrong-version decode surfaces the decoder error wrapped with `{ cause }` plus version context — never swallowed. Where a v8 decoder fails **open** (plausible for byte-identical shapes), the compat codec adds its own discriminant/round-trip check (OQ3c).
- **Remediation-bearing messages (DX):** every typed error states what happened, why, and the one next step, with concrete versions/heights/config keys.
- New error classes carry a stable `code` discriminant alongside the class (repo dual-publishes under two npm scopes — `instanceof` across accidentally-mixed scopes fails silently; document catching by `code`).
- Repo conventions: re-throw with `{ cause }`; **privacy constraint** — errors may reach an off-device logger: version ints, version sets, and key *identifiers* (names, tags, hashes) are allowed; key bytes, decoded state contents, key material, and raw payloads are not.

### 6.3 Observability

Throws catch failing cases; a plausible-but-wrong version passes narrowing silently — so positive-path breadcrumbs are required. Every version-dispatch decision (record **surfacing**, network-**head** resolution, **execution-path selection**, construct/submit **encoding**) emits a debug-level `loggerProvider` breadcrumb: selected `LedgerVersion`, path, source (per-record / network-head / explicit), raw int. Subject to the §6.2 privacy constraint. `loggerProvider` is optional — the migration guide instructs operators to enable debug logging during the transition window, and the no-logger gap is part of OQ8's residual-risk sign-off.

---

## 7. Key Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | **Explicit version handling**, no mutable global. | v8/v9 operations coexist during the transition; a shared global is racy. Fail-fast-friendly. |
| D2 | `protocol` stays the single seam for the **v9** implementation — **including for the compat package**, which consumes v9 through `protocol/ledger` as a peerDependency. | Layering (NFR4) with a smaller core; one v9 WASM instance in the process by construction (v3.1 finding 4). |
| D3 | Existing `protocol` subpath exports stay **exactly as today** (v9). | Nothing is re-pointed because nothing moves. AC8 is trivial. |
| D4 | Version source = indexer `protocolVersion` (already present). | No schema change; subject to the §6.1 cross-check stance (OQ8). |
| D5 | v8 types stay **separate types**, never unified with v9; core interfaces carry v8 data only as raw bytes + version int. | Read leaves need no shared surface (§4.5); compile-time separation replaces runtime discriminants; the one place a v8 value would meet a v9-typed field (`FinalizedTxData.tx`) is resolved by raw surfacing (v3.1 finding 2). |
| D6 | Post-fork support for pre-fork contracts = **keep-state** (no recompile, no v9 variant, no artifact selection). | Spike-proven: migration preserves `co.v2`; state/transcript data byte-identical; wrapping unchanged ledger-8 execution in a native v9 tx is sufficient and strictly simpler. |
| D7 | Keep-state implementation lives in the **compat package**, behind the `executeCall`-granular `KeepStateBridge` interface declared in `contracts`; `Intent`/`Transaction`/offer composition stays in `contracts`. | `contracts` stays 100% v9-typed — no 0.16 type can appear in a core signature (v3.1 finding 6); WASM instance identity preserved (#1052); no duplicated zswap logic. |
| D8 | **Support window: current + previous** (pending confirmation, OQ10). Construct/submit = current only (D9); decode/read = current + previous. Keep-state soundness is re-validated **per fork** via a spike, never assumed. | Bounds dependency/test growth; implies retiring the compat package when v10 enters scope. |
| D9 | **Pre-fork operation out of scope:** v8 capability = decode/read + keep-state; construct/submit is v9-only; a v8 head fail-fasts. | No v8-native construct pipeline exists; building one would be a major hidden workstream for a shrinking window. KISS/YAGNI. |
| D10 | **No generic version-dispatch layer:** no `getLedger<V>`, no unified facade, no type-bucket taxonomy. Concrete modules + a two-case switch at the few dispatch points. | Under D9 the pipeline is statically v9 and the raw v8-decode surface is ~4 functions in one file. N never exceeds 2 (D8). A generic facade encodes an assumed axis of variation an unknown v10 will not honour — abstraction is added *when* a future fork's shape is known (NFR3). |
| D11 | **Transitional package** `@midnight-ntwrk/midnight-js-ledger-v8-compat` (entries `.` keep-state / `./codec` decoders) instead of a `protocol/v8` subpath; **one package per fork window**, named for the version it retires with. | Bundle isolation is structural (don't install it); deletion at v10 is a package deprecation, not a breaking `exports`-map change on `protocol`; the v8 supply-chain surface is confined to one `package.json`; a future fork's package (if the spike shows one is needed) has its own name and shape. |
| D12 | **Fork date is not a design or priority driver.** Delivery is sequenced by dependency order (§10); cross-team items (OQ7, OQ12) track their own milestones. | The date changes no line of this design. |

---

## 8. Testing Strategy

Repo conventions: TDD, Arrange-Act-Assert, meaningful negatives, strict equality, both versions exercised where behaviour is dual (NFR5).

**Fixture provenance (precondition of the decode/keep-state test slices — OQ9).** The repo is v9-only today. Preferred: port the spike's generators (`ledger-v8` + `onchain-runtime-v3` as devDependencies; mint fixtures at test time; migrated-state fixture via the spike's migrate flow). Fallback: committed golden hex with its `protocolVersion` int. Inventory beyond v8/v9/migrated: a **v6-envelope** pre-migration state (SEC-9); **tampered** variants (key set flipped both ways; perturbed bytes); a **both-keys** fixture (truth table); a **Merkle-bearing** migrated fixture (rehash). **Minimal-size mandate:** the smallest contract exhibiting each property (repo precedent: WASM-fixture coverage timeouts).

**Verification harness.** Proof/apply-level assertions need a local verifier — ledger-v9's local verify entry or a ported spike-simulator devDependency; **which one is decided with OQ9**. A fork-capable e2e environment (node/indexer/proof-server starting at v8, migrating at a height) does not exist in the testkit — **OQ14**; until it does, proof/apply-level ACs are authoritatively gated at the unit/integration tier (recorded, not implied).

- **protocol:** `protocolVersionToLedger` table test mirroring the indexer's ranges incl. the fail-fast else-branch; sourcing-guardrail spy test — `networkHeadVersion` called exactly once per construct operation, `versionOfRecord` never on the construct path.
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
  - **Entry typing (v3.1):** a compile-level test that a 0.16-generated contract's types are accepted by the dedicated keep-state entry (and NOT required to satisfy the v9-native entry's generics).
  - Proof-version negative: a V3 proof / repopulated `v3`/`ir` against the preserved `co.v2` key fails verification; **unsanctioned mixing** — any intra-tx version mix other than the sanctioned keep-state composition throws (OQ4).
  - Tampered fetched state (one deterministic outcome per fixture): key set flipped either way ⇒ the respective typed error (unit); state bytes perturbed but well-formed ⇒ rejection at apply (harness/OQ14 tier) — together asserting the §6.1 effects-equality backstop.
  - SEC-5: local verifier key ≠ `co.v2` slot ⇒ typed error **before proving**. SEC-9: v6-envelope fixture ⇒ deterministic typed throw.
  - Pre-fork head (D9): construct/submit throws; read of v8 records still succeeds.
  - **v9-native non-regression (FR7):** (a) existing v9 suites run **unmodified** (diff gate on the test files); (b) golden-fixture byte equality on deterministic stages (serialized `UnprovenTransaction`/`Intent`, decoded-state snapshots) captured on `main` before the first PR; (c) proof bytes excluded (nondeterministic).
  - Cross-cutting fork-boundary scenario: one session reads v8 history (raw + dApp-side decode), runs a keep-state call, and runs a v9-native flow side by side; stale-head flip ⇒ the dedicated typed error.
- **providers:** v8-tagged record ⇒ `rawTx`/`protocolVersion` populated and `tx` access throws the typed error; v9 record ⇒ behaviour unchanged (docker integration against a real indexer response); `queryRawContractState` round-trips against the parsed state; keep-state proving selects V2 by key tag and routes legs per OQ11.
- **Structural gates (CI):** dependency-graph assertions — no core package resolves `ledger-v8` or the compat package, and the compat package resolves no direct `ledger-v9` (NFR6/FR5); ESLint `no-explicit-any` + grep gate on `as unknown` (NFR2); compat-package export test (strict `toEqual` on sorted keys — full key set, not a subset); `types` compile-compat assertion (additive-only — existing consumer code compiles unchanged).
- Coverage: `packages/protocol` keeps 100%; compat-package branches unreachable in unit scope (WASM-internal error surfaces) get explicit, justified carve-outs decided in the PR, not at CI time. No coverage-padding tests.
- **Operational:** keep-state proving e2e runs serialized against its proof server (spike-documented contention; parallel cross-fork proving flakes). The fee-paying cross-fork e2e uses the test-only wallet shim (OQ7) — the shim port is a named work item so the e2e never silently degrades to `test.skip`.

---

## 9. Acceptance Criteria

AC numbering restarts in v3 (v2 mapping: AC4→AC3, AC11→AC4, AC12→AC5, AC13→AC8; v2 AC1/AC9/AC10 and the DEV-6/SEC-2 gates were withdrawn with the accessor layer).

- **AC1** — `protocol` exposes the version-identity utilities (FR1) with structural parameters (no import from `types`); `protocolVersionToLedger` maps the OQ1 ranges and throws typed on unknown ints; the package's pre-existing surface is byte-for-byte unchanged.
- **AC2** — All typed error paths of §6.2 exist and are negative-tested: unknown version (read and construct, separately), pre-fork head, post-fork v8 deploy, v8-record `tx` access, ledger-instance mismatch at attach, down-convert failure, SEC-5 mismatch, SEC-9 pre-migration state, stale-head, missing `keepState` config, unsanctioned mixing. No silent fallback anywhere (NFR1). New error classes carry a stable `code`.
- **AC3** — **Keep-state:** a contract deployed under ledger-8 accepts a new transaction after the fork with **no recompilation and no v9 variant**, through the dedicated entry with the documented `keepState` config; post-fork calls verify against the preserved `co.v2` key (negative: V3 proof fails verification); the #1052 POJO-only boundary holds on **both axes** (0.16 dual-instance test; v9 `ledger-v9-alt` identity test). (FR4)
- **AC4** — **v9-native non-regression:** v9 call/deploy flows behave exactly as before — verified by the FR7 mechanism (unmodified suites + golden fixtures), not by absence of complaints; the v9-native entry's signatures and generics are untouched. (FR7)
- **AC5** — **Routing & developer contract:** calls route via the total four-shape truth table; deploys via the artifact version tag; keep-state is enabled by the single documented `keepState` config with no contract/artifact changes; a 0.16-generated contract type-checks against the dedicated entry (compile-level test); missing config fail-fasts with the snippet-bearing error. (FR3, FR4)
- **AC6** — **Structural isolation:** no core package resolves `ledger-v8` or the compat package, and the compat package resolves no direct `ledger-v9` (CI dependency-graph gates); a v9-only dApp ships exactly today's single WASM stack; exactly one v9 instance exists in a keep-state process (peer resolution + attach-time identity check). (FR5, NFR6)
- **AC7** — Historical v8 records surface as raw bytes + version and decode correctly dApp-side via the compat codec; v9 records through the static path, unchanged; `types` changes are additive-only (existing consumer code compiles unchanged); `yarn lint` clean, build succeeds, tests pass, no `any`/`unknown` casts (CI-enforced from the first PR). (FR6, NFR2, NFR5)
- **AC8** — **Observability:** all four version-dispatch decision points emit the §6.3 breadcrumb (selected version, path, source, raw int) — unit-tested with an injected logger, strict equality on structured fields, no payloads/keys.
- **AC9** — **Documentation ships with the feature:** migration guide (the `keepState` snippet, dApp-side v8 history decoding, the OQ12 proof-server operator matrix once pinned, the D9 pre-fork stance), TROUBLESHOOTING entries for the new typed errors (incl. instance mismatch and v8 `tx` access), llms.txt/API-doc updates.

---

## 10. Rollout & Sequencing

Sequenced by **dependency order** (D12 — the fork date is not a scheduling input for this spec):

1. **`protocol` version utils** (small, additive, unblocks everything).
2. **`ledger-v8-compat` package** — keep-state (root entry) first, `./codec` second; each independently testable against fixtures.
3. **`contracts`**: `KeepStateBridge` interface, routing, dedicated keep-state entry (bridge injected in tests).
4. **`indexer-public-data-provider`**: raw surfacing for v8 records + `queryRawContractState`; barrel re-export of the version utils; additive `types` fields.
5. **Hardening:** OQ8 cross-check mechanism (with its negative test), OQ15 discriminant assert if upstream provides one, fork-capable e2e when OQ14 lands.

Notes:
- **Versioning:** core packages take additive/minor changes only (nothing existing moves — D3); the compat package versions independently and fast during the window (peer range on `protocol` tracks the framework major). Public-API additions follow repo release conventions.
- **Removal path (D8/D11):** at v10, `npm deprecate` the compat package ("ledger v8 is no longer supported — this compatibility layer is retired") and shrink `LedgerVersion` — the single compile-time signal downstream code keys on. Pre-announced from day one in the package README. Whether the (v9, v10) fork needs its own compat package is decided by that fork's spike — never assumed (D8).
- **Operator requirement (OQ12):** the transition-window proof-server matrix (which versions, for which proving legs, which server(s) receive the witness) becomes a documented operator-facing requirement once pinned.
- **Wallet SDK dependency (OQ7):** the fee-paying cross-fork e2e depends on wallet state migration; the test-only shim port (spike `facade-builder.ts`/`sim-reads.ts` → testkit) is a named work item with an owner, deleted when the Wallet SDK lands `migrateState`.
- **Issue updates:** #1004's "unified v8/v9 dispatch APIs" framing and the #1005/#1006 sizings predate v3 — re-scope all three issues against D10/D11 (MJS-01 shrinks substantially; MJS-03 shrinks to the record-surfacing + raw-state query + OQ11 routing).

---

## 11. Open Questions

Gates close only when a concrete artifact is merged with a green test. Mirror the open items as tracker issues (owners + resolve-by) rather than growing this document.

- **OQ1 — RESOLVED.** `protocolVersion` int encodes the **node** version (`major·1_000_000 + minor·1_000`); authoritative mapping in [`midnight-indexer/.../protocol_version.rs`](https://github.com/midnightntwrk/midnight-indexer/blob/main/indexer-common/src/domain/protocol_version.rs): node 0.22 & 1.0 → v8; node 2.0 & 2.1 → v9; anything else → error. Implemented as ranges with a fail-fast else-branch + table test. Outstanding: node/ledger team confirms the table is a *contract* and future ranges extend the convention.
- **OQ2 — RESOLVED (pins; re-confirm at implementation — RC tags churn).** v8 decode surface: `@midnight-ntwrk/ledger-v8@8.1.0` + `onchain-runtime-v3`; retained execution stack (dApp-owned): compact `0.31.1` / compact-runtime `0.16.0`; v9: `ledger-v9@1.0.0-rc.3` / `onchain-runtime-v4@4.0.0-rc.3`. **Supply-chain checklist** (scoped to the compat package): verify org ownership of both npm scopes (`@midnight-ntwrk` vs `@midnightntwrk` — a typosquat-shaped risk exactly where a wrong scope hides in review); exact pins + lockfile integrity for the v8 tree; CI gate asserting only audited scopes/versions in the compat package's resolved tree.
- **OQ3 — rescoped:** (a) the final `./codec` decoder list — which historical record types dApps actually consume (product input; today's codec surface is 4 functions, and post-fork contract state is v9-enveloped, so the likely answer is 2–3) — also decides whether the provider-side injected-codec **fallback** (§4.4) is ever needed; (b) byte-identity verification for the shared POJO layer (fixtures authoritative; `AssertEqual` as drift detector); (c) which v8 decoders fail **open** on wrong-version input (drives the codec-seam discriminant checks, §6.2). Gate: the checked-in decoder list + identity assertions.
- **OQ4 — RESOLVED.** Exactly one sanctioned cross-version composition exists (keep-state: ledger-8 transcript in a native v9 tx with a V2 proof); the seam rejects any other intra-tx mix (negative test, §8).
- **OQ5 — WITHDRAWN (D12).** The fork date/height is not a design or priority driver for this spec. It remains a business/planning datum tracked outside this document.
- **OQ6 — WITHDRAWN.** The v2 lazy-init design (`initLedgerV8`, pre-init typed throws, CJS smoke tests) is moot under D11: the compat `./codec` import is the opt-in, and upstream at-import WASM instantiation (verified on `ledger-v9@1.0.0-rc.3`; confirm same layout on `ledger-v8` when pinning) is acceptable inside an explicitly-installed transitional package.
- **OQ7 — CONFIRMED REAL (owner: Wallet SDK track).** `migrateState` is an unimplemented stub; the spike reconstructed v9 wallet dust/shielded state from migrated on-chain state. Wallet SDK scope, but the midnight-js cross-fork fee e2e depends on it. Fallback (named work item, §10): port the spike's reconstruct shim into testkit as test-only scaffolding; delete when the SDK lands.
- **OQ8 — SECURITY, downgrade cross-check (owner: TBD — a named owner formally accepts the residual risk while open).** Independent signal to cross-check the indexer's head version on construct/submit (§6.1). Until it lands, §6.3 breadcrumbs are the detection; the negative test ships with the mechanism. Resolve before the release is declared production-ready for the transition window.
- **OQ9 — PARTIALLY RESOLVED.** Spike islands are the canonical fixture source (reproducible generators exist). Remaining: port/mint per §8 inventory + record the verification-harness decision (ledger-v9 local verify vs spike simulator). Blocks the decode/keep-state test slices.
- **OQ10 — support window (owner: team/PO).** Confirm "current + previous" (D8) as standing policy — asked on [#1005](https://github.com/midnightntwrk/midnight-js/issues/1005#issuecomment-5166550550). Until answered, D8 is a proposal.
- **OQ11 — hybrid-proving ownership (owner: TBD; before MJS-03 freeze).** Does keep-state proving routing (local key triples for contract legs, proof server for native legs) land in MJS-02 or MJS-03?
- **OQ12 — proof-server version matrix (owner: TBD; before MJS-03 freeze).** Which proof-server version(s) must an operator run during the transition (contract legs vs native legs; one server or two) — and which server(s) receive the private witness. Becomes an operator-facing rollout requirement (§10).
- **OQ13 — keep-state execution-leg shape (owner: TBD; before the compat API freeze).** Confirm keep-state needs no compact-js involvement (the spike drives raw `createCircuitContext` + invoke); if a shim is needed, pin a 0.16-compatible version. Finalise the `executeCall` signature — **including the witness / private-state typing** (v3.1 finding 6) — and record the artifact field carrying the version tag for deploy-path detection (§4.3).
- **OQ14 — fork-capable e2e environment (owner: TBD).** Define/build the node+indexer+proof-server matrix that starts at v8 and migrates at a height (or adopt the spike simulator). Until then, proof/apply-level ACs gate at the unit/integration harness tier.
- **OQ15 — (owner: ledger team; non-blocking).** Request a cheap, reliable version discriminant on transaction objects from the v9 ledger API, enabling a one-line assert at the proving seam (§6.1). Nice-to-have defence-in-depth; the design does not depend on it.

**Assumptions.** **A1:** the indexer tags every block/tx/event with a correct `protocolVersion`; trusted subject to the OQ8 cross-check stance. **A2:** the dApp retains its pre-fork toolchain outputs unchanged (artifacts, keys, runtime); the framework never compiles contracts and never mutates artifacts.
