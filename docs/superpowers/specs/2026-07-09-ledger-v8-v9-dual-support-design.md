# Design Spec — Simultaneous Ledger v8 / v9 Support in Midnight.js

**Status:** Draft v2 (spec review in progress)
**Date:** 2026-07-09 (v1) · 2026-08-03 (v2 — keep-state rework)
**Author:** Systems architecture (spec workflow)
**Source issues:**
- [#1004 — MJS-01 protocol package: unified v8/v9 dispatch APIs](https://github.com/midnightntwrk/midnight-js/issues/1004)
- [#1005 — MJS-02 contracts package: protocol-version orchestration](https://github.com/midnightntwrk/midnight-js/issues/1005)
- [#1006 — MJS-03 provider API updates to unified APIs](https://github.com/midnightntwrk/midnight-js/issues/1006)

Part of the **Ledger v8→v9 Hard Fork Migration** (SOW-Q3-10 / product#119).

> **Revision note (v2, 2026-08-03).** Issue #1005 was reworked on 2026-07-23 against the completed DApp-HF spike ([`shieldedtech/spike-dapp-hf`](https://github.com/shieldedtech/spike-dapp-hf)). The dual-artifact model this spec originally designed for MJS-02 (accept a v8- and a v9-compiled contract, select at dispatch — former FR4/D6/AC4) is **superseded**: deployed pre-fork contracts keep transacting after the fork **with no recompilation and no v9-compiled variant**, via a *keep-state* path (down-convert the migrated state → execute on the unchanged ledger-8 stack → wrap in a native ledger-9 transaction with a V2 proof). v2 replaces FR4/D6/AC4 accordingly, re-grounds the contract-state model (the protocol migrates all contract state to the v9 envelope at the fork), reformulates OQ4 (the keep-state composition is the *required* cross-version mix, not a hazard), and resolves OQ2/OQ7/OQ9 with spike findings.

---

## 1. Problem & Why

The Midnight blockchain is undergoing a hard fork from Ledger protocol **v8** to **v9**. During the transition window, the network — and therefore any dApp built on Midnight.js — must interoperate with **both** protocol versions simultaneously:

- Historical blocks/transactions on-chain are encoded with **v8**.
- New blocks past the fork height are encoded with **v9**.
- A single dApp session may read v8 history and submit v9 transactions across the fork boundary.
- **Contract state does not stay v8:** at the fork the protocol **migrates every deployed contract's on-chain `ContractState` into the ledger-9 envelope** (`contract-state[v6]→[v8]`), preserving the pre-fork verifier key (`source.v2 → op.v2`, `v3`/`ir` left empty). State *data* (`impact-state-value[v2]`) and call transcripts are **byte-identical** across the two versions — only the envelope is re-versioned. (Established by the DApp-HF spike.)
- A pre-fork contract's compiled artifacts (zkir + prover/verifier keys) and the compact/onchain-runtime that executes its circuits are pinned to ledger-8. The default expectation would be recompile-and-upgrade in lockstep with the fork; the spike proved this is **avoidable** — the deployed contract, its keys, and the executing runtime can all stay on ledger-8 (keep-state, §4.2).

Today the framework is hard-pinned to a single ledger version. The `@midnight-ntwrk/midnight-js-protocol` package is a thin re-export facade wired exclusively to `@midnightntwrk/ledger-v9` and `@midnightntwrk/onchain-runtime-v4`:

```ts
// packages/protocol/src/ledger.ts
export * from '@midnightntwrk/ledger-v9';
// packages/protocol/src/onchain-runtime.ts
export * from '@midnightntwrk/onchain-runtime-v4';
```

Every downstream package (`contracts`, `types`, proof providers, `indexer-public-data-provider`) imports ledger types transitively through this facade. There is **no runtime version selection** anywhere in the framework. A dApp built against this cannot decode v8 history once the network is on v9, and cannot keep transacting against a pre-fork contract after the fork.

**Goal:** introduce a version-aware protocol layer so the framework can (a) decode historical v8 records, (b) construct and submit transactions for the network's current version, and (c) keep pre-fork (ledger-8-compiled) contracts transacting after the fork via the keep-state path — selecting the correct behaviour at runtime based on the protocol version reported by the network.

---

## 2. Requirements

### Functional
- **FR1** — The `protocol` package MUST expose a unified API surface that can operate against either Ledger v8 or v9, dispatching internally to the correct version-specific implementation. Capability is deliberately **asymmetric (D9)**: v8 support covers decode/read of historical records and the keep-state bridge; construct/submit is v9-only — pre-fork operation of this release against a v8 network head is out of scope.
- **FR2** — Version selection MUST be **explicit**: unified APIs receive the target protocol version as an argument (or via a version-bound accessor object). No hidden mutable global drives dispatch. (Decision — see §7.)
- **FR3** — The `contracts` package MUST determine the active protocol version from the public data provider (the indexer already returns `protocolVersion` on blocks/transactions/events) and switch behaviour once v9 is active, so contract flows remain correct across the fork. *(Interpretation notes: #1005's scope wording "public state provider" is read as the `publicDataProvider` (indexer) — the repo's `privateStateProvider` plays no role in version resolution; the issue wording should be corrected. #1005's "subscribe" is deliberately implemented as **per-operation resolution** — each construct/submit resolves `networkHeadVersion(...)` at operation start, memoised within that single operation only; no session-level subscription or cached observable, which would reintroduce the stale-binding failure D1 forbids.)*
- **FR4** — **Keep-state (replaces the superseded dual-artifact requirement).** The `contracts` package MUST let an **already-deployed, ledger-8-compiled contract keep transacting after the fork with no recompilation and no v9-compiled variant**. Three moves, per post-fork call (reference implementation: spike island-3):
  1. **Keep** the deployed ledger-8 artifacts and the old execution runtime — no recompile.
  2. **Down-convert** the on-chain state (migrated by the protocol into the v9 envelope) back to the ledger-8 shape for execution — productionize [`downcastV9StateForExecution`](https://github.com/shieldedtech/spike-dapp-hf/blob/main/island-3/driver/src/downcast.ts), including the contract-agnostic `rehashStateValue` step (bounded Merkle trees come back non-rehashed from the encode/decode round-trip and must be rehashed before any `checkRoot`). Productionized as the split, instance-bound `extractEncodedStateValue` + `toExecutionState` primitives (§4.1c, #1052).
  3. **Build + prove** a native ledger-9 `ContractCallPrototype` around the resulting POJO transcript — productionize [`assembleCallV9`](https://github.com/shieldedtech/spike-dapp-hf/blob/main/island-3/driver/src/assemble.ts) as the minimal `wrapTranscriptV9` wrap (§4.1c); `Intent`/`Transaction`/offer/dust composition stays in `contracts`. The proof version is selected by the resolved verifier-key/IR tag (**V2 → the migrated `co.v2` slot**), never hardcoded.

  The package does **not** dispatch between two compiled contract artifacts. Pre-fork operation is out of scope (D9). Keep-state applies to **calls** on contracts already deployed pre-fork only — it does not extend to new post-fork deploys (§3 Out of scope, §4.2).
- **FR5** — Provider APIs (`http-client-proof-provider`, `dapp-connector-proof-provider`, `indexer-public-data-provider`, and the provider interfaces in `types`) MUST consume the unified protocol APIs so they are version-agnostic; direct coupling to a single ledger version is removed.
- **FR6** — Serialization/deserialization MUST respect what actually exists on-chain: **historical blocks/transactions/events** decode with the version that produced them (per-record `protocolVersion`); **fetched `ContractState` after the fork is always current-envelope** (the protocol migrated it) — it is decoded with the current version and, for pre-fork contracts, down-converted for execution (FR4). A `ContractState` fetched **while the head is still pre-fork** (v6 envelope) throws a deterministic typed error (§6.2, SEC-9) rather than depending on the decoder to fail. No fixed-version decoding anywhere.
- **FR7** — **No impairment of native ledger-9 execution.** The v9-native call/deploy path stays the default and MUST remain behaviourally unaffected by the added dual-version dispatch and the v8 keep-state path (non-regression coverage required).

### Non-functional
- **NFR1 — Fail fast.** An unknown/unsupported protocol version, or a version-mismatch between a decoded artifact and the requested operation, MUST throw a clear, typed error immediately — never silently fall back to a default version.
- **NFR2 — Type safety.** No `any` casts and no `unknown` bridging to paper over v8/v9 type differences. Divergences are modelled explicitly (see §4.3).
- **NFR3 — KISS / YAGNI.** Only the two live versions (v8, v9) are supported. No generic "N-version" plugin framework. (See D8 for the standing support-window policy.)
- **NFR4 — Layering preserved.** `types` stays dependency-free of implementations; `protocol` remains the single seam through which ledger implementations enter the framework. Dependency direction `types → contracts/providers → protocol` is unchanged.
- **NFR5 — Testability.** Every version-dispatch path is covered by tests exercising **both** v8 and v9.
- **NFR6 — Lazy WASM instantiation.** Both ledger packages are WASM-backed. The inactive version MUST NOT be WASM-instantiated until the first `getLedger(thatVersion)` call. A single-version consumer (the common browser-dApp case away from the fork boundary) MUST incur only **one** WASM initialisation — eager double-init would be a startup/memory regression against the AC8 "no behavioural change" spirit. Both versions remain reachable via the accessor, so tree-shaking cannot drop either — laziness, not elimination, is the mechanism.
  - **Sync-vs-async — RESOLVED (OQ6, resolution (c)).** The ledger packages instantiate WASM **at import time** (observed on `ledger-v9@1.0.0-rc.3`: the node entry does `readFileSync` + `new WebAssembly.Module(...)` at module top level; the browser entry runs `__wbindgen_start()` on import), which rules out a lazily-initialised static import of the inactive version. Chosen model: **v9 stays sync/eager exactly as today** (retained static subpaths, D3); **v8 is gated behind one explicit `await initLedgerV8()`** that dynamic-imports the `protocol/v8` subpath, after which `getLedger('v8')` is synchronous. A sync `getLedger('v8')` before init throws a typed error naming the init call to make (fail-fast, DX-guiding). Residual check: confirm the `ledger-v8` npm package has the same wasm-bindgen at-import layout (it almost certainly does).

---

## 3. Scope

### In scope
- Adding `@midnight-ntwrk/ledger-v8` to the `protocol` package alongside v9 — **for decode/read of historical records only** (D9: this release never constructs v8 transactions). It is exposed behind an isolatable **`protocol/v8` subpath** reached via dynamic import inside the accessor (bundle isolation, §4.1). The retained execution stack (`onchain-runtime-v3` / compact-runtime `0.16`) is **not bundled by `protocol`** — it is the dApp's own instance (A2, §4.2 instance ownership); `protocol` ships instance-bound helpers that receive it. Exact pins: OQ2 (resolved, re-confirm at implementation).
- A version-dispatch mechanism in `protocol` (MJS-01).
- The **keep-state primitives** — POJO down-convert (`extractEncodedStateValue` + instance-bound `toExecutionState`, productionizing the spike's `downcastV9StateForExecution`/`rehashStateValue`) and the minimal native-v9 wrap (`wrapTranscriptV9`, productionizing the wrap inside the spike's `assembleCallV9`) — in `protocol` (decision D7); transaction composition stays in `contracts`.
- Contracts orchestration (MJS-02): per-operation protocol-version resolution (FR3 interpretation note), the typed pre-fork throw (D9), driving the keep-state path for pre-fork contracts post-fork, and leaving the v9-native path untouched (FR7).
- Migrating providers and provider interfaces to the unified APIs (MJS-03).
- Tests against both versions across all three packages, including across the transition.

### Out of scope
- Producing a v9-compiled contract variant — **no longer required by the model** (superseded dual-artifact approach, see Revision note). The framework never compiles contracts.
- Deploying a **new** ledger-8-compiled contract after the fork. Keep-state covers calls on already-deployed pre-fork contracts — the only case #1005 requires and the only case the spike proved. A post-fork deploy attempt with ledger-8 artifacts throws a typed error (NFR1; negative test §9); new post-fork deploys require a v9-compiled contract.
- Pre-fork **operation** (construct/submit while the network head is v8) — **D9**. The codebase is and always was v9-pinned; there is no v8-native construct/execute pipeline to "route unchanged", and building one would be a major hidden workstream serving only the shrinking pre-fork window. dApps that must transact pre-fork stay on the last v8-based midnight-js major; this release targets the fork boundary and after. Attempting construct/submit with a v8 head throws a typed error (§6.2).
- Wallet-side keep-state migration. The Wallet SDK's `migrateState` is an unimplemented stub; the spike works around it by reconstructing the v9 wallet's dust/shielded state from the migrated on-chain state. That work belongs to the **Wallet SDK track**, not midnight-js — but the midnight-js e2e "post-fork transaction pays its v9 dust fee" depends on it (cross-team dependency, OQ7).
- Changes to the indexer/GraphQL schema — the `protocolVersion` field already exists and is consumed as-is.
- ZK-config providers (`node-zk-config-provider`, `fetch-zk-config-provider`) — confirmed ledger-agnostic; no code changes. **Their trust role changes under keep-state** (sec review): the artifacts they deliver anchor local V2 proving, so their output is integrity-checked against the on-chain `co.v2` key before proving (§4.2 step 5, §6.1 table).
- Any protocol version beyond v8/v9.
- Proof-server infrastructure changes outside the JS framework.

---

## 4. Architecture & Components

Three workstreams, layered by dependency. MJS-01 is foundational; MJS-02 and MJS-03 depend on it.

### 4.1 MJS-01 — `protocol` package: unified dispatch (foundational)

The `protocol` package gains both ledger implementations as dependencies and exposes a version-parameterised accessor rather than a fixed re-export.

**Seam asymmetry (v2).** The "v8 side" of the seam is **not** a mirror image of the v9 side, and it is deliberately narrow (D9): `ledger-v8` is used for **decode/read of historical records only**, exposed behind a dedicated **`protocol/v8` subpath** reached exclusively via dynamic `import()` inside the accessor — bundlers can code-split or drop it, so a post-window v9-only dApp ships one WASM stack, and the subpath is the natural deletion unit when v10 enters scope (D8, §11 removal path). The post-fork keep-state path executes circuits on the **dApp's own retained compact-runtime 0.16 / onchain-runtime-v3 instance** (§4.2 instance ownership) while assembling and submitting through **ledger-v9**; the keep-state primitives (D7) are `protocol` exports that *bridge* the two sides, not a third "version". The bridge is safe because the POJO layer (`EncodedStateValue`, transcript/`Op`/`AlignedValue`) is byte-identical across the packages (§1) — a bucket-(1) fact to be machine-checked where the type system allows (§4.3).

**Full subpath surface (ARCH audit).** `protocol` exports ~9 subpaths today (`/ledger`, `/onchain-runtime`, `/compact-runtime`, `/compact-js`, `/compact-js/effect`, `/compact-js/effect/Contract`, `/platform-js`, …), and `contracts`' real execution seam is the **compact-js/compact-runtime pair** — `ContractExecutable`, `CircuitContext` and the `ContractState` used for execution come from `/compact-runtime` + `/compact-js` (pinned 0.18.x), not from `/ledger`. Per-subpath treatment under dual-version:
- `/ledger`, `/onchain-runtime` → version accessor (`getLedger`/`getOnchainRuntime`); the v8 implementations live behind `protocol/v8`.
- `/compact-runtime`, `/compact-js` (+`/effect*`) → stay **v9-pinned defaults** serving the v9-native pipeline only. Keep-state execution does **not** flow through them — it drives the dApp's retained 0.16 stack directly (§4.2); whether it needs any compact-js involvement at all is a freeze gate (**OQ13**).
- `/platform-js` and the remainder → audit as version-agnostic during MJS-01; record conclusions alongside OQ3.

The §4.1(a) alias example below is illustrative for `/ledger` symbols; consumers obtain the *execution* `ContractState` from `/compact-runtime`, so the alias inventory MUST be built **per subpath**, not only for `/ledger`.

**Implementation packaging (dev review).** How the two version trees coexist in the workspace and the published artifact:
- `protocol` gains `@midnight-ntwrk/ledger-v8` (+ `onchain-runtime-v3`) as **dependencies of the `/v8` subpath only**; `./v8` is added to the package `exports` map, and the accessor reaches it via a **relative dynamic `import()`** that rollup preserves — not a self-referencing bare specifier, which vite/webpack resolve differently (cf. the repo's Vite WASM guide).
- compact-runtime **0.16** enters as a **type-only aliased devDependency** (e.g. `compact-runtime-v16: npm:@midnight-ntwrk/compact-runtime@0.16.0`), imported exclusively with `import type` (lint-guarded) — the runtime instance is dApp-owned (§4.2) and never bundled.
- The ledger packages are ESM-only while `protocol` publishes dual `.mjs`/`.cjs`: lazy `/v8` loading is **guaranteed on the ESM artifact**; on CJS it is best-effort via Node ≥22 `require(esm)` — documented, with a §9 smoke test on the published `.cjs`. The "bundlers can drop `/v8`" claim is a **dated, owned verification record, not a standing guarantee** (QA review): re-run on every v8/v9 package pin change (tied to OQ2's re-confirm step), preferably as a scripted import-graph/bundle check committed next to the packaging config.
- Alias names, the org-scope discrepancy (`@midnight-ntwrk` vs `@midnightntwrk`) and a `resolutions` check are recorded with OQ2's re-confirm step so the v8 tree cannot drift.

**Version identity.** Introduce a small, closed type and constant set:

```ts
// packages/protocol/src/version.ts  (illustrative)
export const LEDGER_VERSIONS = ['v8', 'v9'] as const;
export type LedgerVersion = (typeof LEDGER_VERSIONS)[number];

/** Maps the numeric protocolVersion reported by the network to a ledger impl. */
export const protocolVersionToLedger = (protocolVersion: number): LedgerVersion => {
  // OPEN QUESTION (§8): concrete int → v8/v9 mapping to be confirmed.
  // Fail fast on anything unrecognised.
  ...
};
```

**The design has two orthogonal parts** — a compile-time *type* surface and a runtime *value* accessor. They must not be conflated: most consumers import ledger symbols in `import type` positions (e.g. `import type { ContractState, ProvingProvider } from '.../ledger'`), and a runtime function cannot appear in a type position. Only a minority of uses are runtime *values* (e.g. `CostModel.initialCostModel()`).

**(a) Compile-time type surface.** `protocol` exports a stable set of `type` aliases that are the shared shape (where v8/v9 are structurally identical) or the union/branded form (where they diverge — see §4.3):

```ts
// Identical across versions → single shared type:
export type ContractState = V9.ContractState; // === V8.ContractState structurally
// Construct/prove/submit pipeline is statically v9 (D9) — no union:
export type UnprovenTransaction = V9.UnprovenTransaction;
// Divergent AND read on a decode/read path → union or branded (see §4.3 buckets):
export type LedgerParameters = V8.LedgerParameters | V9.LedgerParameters; // illustrative
```

Consumers keep using `import type { … } from '@midnight-ntwrk/midnight-js-protocol/ledger'` for signatures — **naming a type never requires a runtime call.**

**Keeping the ~15 aliases honest (implementation note).** Hand-written aliases across two independently-versioned WASM `.d.ts` packages will silently drift. Two mechanisms guard against this:
- For every **bucket-(1) "identical"** symbol, add a compile-time equality assertion (e.g. a `type AssertEqual<A, B> = ...` helper that fails to compile when `V8.X` and `V9.X` diverge). "Identical" is then machine-checked, not asserted in a comment — a supposedly-shared type that drifts breaks the build instead of mis-decoding at runtime.
- `LedgerModule` (the runtime facade type) is **derived** from a ledger module's type (e.g. `typeof import('@midnightntwrk/ledger-v9')` narrowed by `Pick`) rather than re-declared by hand, so the required-symbol set stays in sync with the upstream package. If a fully-derived facade proves impractical, the hand-maintained alternative is explicitly accepted and its maintenance cost owned.
- Note: the ACL test (§9) checks **runtime keys** only; the type side is covered by these compile-time assertions, not by `toEqual`.

**(b) Runtime value accessor.** For constructors, statics and helper functions the package exposes a **version-bound accessor** returning the correct implementation namespace:

```ts
// Returns the ledger module bound to a specific version. Used only where a
// runtime VALUE was previously referenced (constructors/statics/decoders).
// Version-generic (DEV): the return type varies by argument — one flat
// `LedgerModule` cannot serve both versions once any member diverges.
export const getLedger = <V extends LedgerVersion>(version: V): LedgerModule<V> => { ... };
export const getOnchainRuntime = <V extends LedgerVersion>(version: V): OnchainRuntimeModule<V> => { ... };
// v8 is async-gated (OQ6 (c)): one explicit init, after which getLedger('v8') is sync.
// A pre-init getLedger('v8') throws a typed error naming this call.
export const initLedgerV8 = async (): Promise<void> => { ... };
```

- `LedgerModule<V>` = the shared bucket-(1) surface plus per-version divergent members resolved by conditional type (two overloads are the fallback shape). Only the bucket-(1) part is derivable from one package's `typeof`; divergent members are declared per version. The OQ3 classification **lands as this type**, not beside it (OQ3 done-definition).
- The returned object is a stable, typed facade covering the runtime symbols the framework actually uses (from the consumption map: `CostModel`, `ProvingProvider`, `parseHex*` decoders, `sample*` helpers, and the constructors behind `UnprovenTransaction`, `Intent`, `ContractDeploy`, `ContractCallPrototype`, etc.).
- Callers thread `version` in explicitly (FR2). No module-level mutable state.
- A consumer calls `getLedger` **only** where it previously referenced a runtime value; type-only sites are unaffected (see AC9).

**(c) Keep-state primitives (v2 — D7, minimally scoped).** `protocol` additionally exports the productionized bridge primitives:

```ts
// v9-enveloped bytes → the byte-identical POJO state (impact-state-value[v2]).
// Needs only ledger-v9. Throws on malformed input or a lost StateValue type (NFR1).
export const extractEncodedStateValue = (bytes: Uint8Array): EncodedStateValue => { ... };
// Instance-bound: decodes + rehashes INSIDE the executing runtime instance the caller
// passes in, so no WASM-backed object ever crosses package instances (#1052).
export const toExecutionState = (rt: OcrtV3Module, encoded: EncodedStateValue): V8Exec.ContractState => { ... };
// Minimal cross-version wrap: old-stack POJO transcript + resolved key tag → v9 ContractCallPrototype.
export const wrapTranscriptV9 = (transcript: ..., keyTag: ...): V9.ContractCallPrototype => { ... };
```

These live in `protocol` because they bridge `ledger-v9` ↔ the retained execution stack — exactly the implementation coupling NFR4/D2 confine to the `protocol` seam — but the boundary is deliberately **minimal**: `protocol` owns only the cross-version *wrap* (transcript → `ContractCallPrototype`); `Intent`/`Transaction`/offer/dust composition stays in `contracts`, reusing the existing `zswap-utils` path (the spike's offer assembly was itself adapted from `contracts`' `zswapStateToSegmentedOffer`/`createZswapOutput`). A full-transaction assembler in `protocol` would either duplicate zswap/offer logic across two packages or invert the layer. `contracts` orchestrates but never touches a ledger implementation directly. (This resolves the "down-convert primitive may live in `protocol` or `contracts` — decide during MJS-01" note on #1005.) Down-convert carries **only `.data`** (the `StateValue`): the spike established empirically that blank `.balance`/`.operations` are harmless — the ledger checks claimed unshielded spends against the real migrated on-chain state at apply, never against the local down-converted copy.

**Backward compatibility.** The existing subpath exports (`/ledger`, `/onchain-runtime`, …) are retained but re-point to the **default/current** version so existing static-type imports keep compiling. New version-aware behaviour is opt-in via `getLedger(version)`. This is a **breaking-ish** change managed by a major/beta bump; the ACL parity test (`protocol-acl.test.ts`) is extended to assert both version facades expose the required symbol set.

### 4.2 MJS-02 — `contracts` package: protocol-version orchestration (v2 — keep-state)

**Version sources.** The protocol version is a **per-block / per-record** property, not a session constant. Two distinct dispatch sources remain:
- **Read / decode paths** for **blocks/transactions/events** dispatch on the `protocolVersion` attached to the *specific* fetched record, mapped via `protocol.protocolVersionToLedger(...)`. Historical v8 records decode with v8 regardless of the current network head.
  - **Exception — contract state (v2):** fetched `ContractState` after the fork is *always* v9-enveloped (the protocol migrated it). It is decoded with the **current** version; the per-record rule does not apply to it.
- **Construct / submit paths** (deploy, call) build a *new* transaction whose version is **not yet on-chain**. These dispatch on a separately-sourced **network-head version** — the `protocolVersion` of the latest block from the `publicDataProvider`, or an explicit caller-supplied target version. Outbound construction never depends on reading its own not-yet-existing record.

**Execution-path selection.** `contracts` resolves the protocol version per operation (FR3 interpretation note) and routes each contract operation down exactly one of the paths:

| Network head | Contract | Path |
|---|---|---|
| v8 (pre-fork) | any | **out of scope (D9)** — construct/submit with a v8 head throws a typed error (§6.2); pre-fork operation stays on the last v8-based midnight-js major. Decode/read of v8 records works. |
| v9 (post-fork) | compiled for ledger-9 | **v9-native** — the default path, untouched (FR7) |
| v9 (post-fork) | **call** on a contract deployed pre-fork (ledger-8 artifacts) | **keep-state** (FR4, below) |
| v9 (post-fork) | **deploy** with ledger-8 artifacts | **rejected** — typed fail-fast error; new post-fork deploys require a v9-compiled contract (§3) |

**Path detection & developer contract (AC12).** How `contracts` recognises a pre-fork contract is not a flag the dApp sets. Detection has **two sources by operation kind**:
- **Calls** route on the **operation verifier-key set of the fetched (migrated) `ContractState`**. The truth table is **total** (QA review) — all four key-set shapes are decided, not left to if-ordering, because the shape is an adversarial input (§6.1): `co.v2`-only (`v3`/`ir` empty — exactly what the protocol migration produces for pre-fork contracts) ⇒ **keep-state**; `v3`/`ir` present, no `co.v2` ⇒ **v9-native**; **both** populated (reachable via post-fork maintenance-authority key rotation on a migrated contract) ⇒ **v9-native**, with a breadcrumb noting the dual key set (AC13); **neither**/unrecognised ⇒ the typed unsupported-key-set error (NFR1). For calls, routing and proof-version selection read the same key/IR tag, so they cannot disagree.
- **Deploys** have no fetched state to inspect; they route on the **version tag of the dApp-supplied artifacts** (zkir/verifier-key version — the exact artifact field carrying the tag is a freeze-gate discovery item alongside OQ3), rejecting ledger-8 artifacts post-fork with the typed error of §3/§6.2.

Developer contract (**opt-in by design** — dev review): the framework cannot reach inside the dApp's generated contract JS to obtain its runtime instance — #1052 rules out instantiating a second copy, the generated code does not re-export its runtime module, and Node-resolution tricks do not survive bundlers. Keep-state is therefore enabled by **one documented config object on the call-entry API**, e.g. `keepState: { compactRuntime: CompactRuntime016Module, onchainRuntime: OcrtV3Module }` — the dApp passes handles to the modules it already imports. Beyond that one object: no contract changes, no artifact changes, no recompilation. If a call routes to keep-state and no retained stack was supplied, `contracts` fail-fasts with a typed error that names the missing config and shows the exact snippet to add (§6.2 remediation rule). If implementation later discovers a sound zero-config mechanism, that is an upgrade — the design does not depend on it.

**The keep-state path** (per post-fork call on a pre-fork contract):
1. Fetch the migrated `ContractState` (v9 envelope) from the public data provider.
2. Down-convert via the split primitives (§4.1c): `extractEncodedStateValue` (v9 side) hands over a **POJO**; `toExecutionState` decodes + rehashes it **inside the dApp's runtime instance**.
3. Execute the circuit on the **dApp's** retained ledger-8 stack (`createCircuitContext(executionState, …)` + invoke) → POJO transcript (`publicTranscript`, `privateTranscriptOutputs`, `input`, `output`).
4. `wrapTranscriptV9` — wrap the POJO transcript into a ledger-v9 `ContractCallPrototype`; `contracts` composes `Intent` → `Transaction` (offer/dust via the existing `zswap-utils` path). No re-encoding (byte-identical POJOs), no v8-tx carrier, no re-bind: the intent binding is v9-native from the start.
5. Prove — a **V2** proof, selected by the resolved verifier-key/IR tag. **Pre-proving consistency check (SEC-5):** the locally-resolved verifier key MUST byte-match the fetched migrated state's `co.v2` slot — a typed mismatch error naming both sources is thrown **before any proving starts** (a tampered/stale/wrong-contract artifact set otherwise burns minutes of proving on a doomed submission). Ledger-9 then dispatches the proof to the preserved `co.v2` slot, replays the transcript, requires effects equality. Populating `v3`/`ir` or proving as V3 would fail verification (negative test, §9).

**Instance ownership at the execution boundary (#1052).** The dApp's generated contract JS is compiled against — and class-bound to — the dApp's **own** `compact-runtime` 0.16 instance (A2). `protocol` therefore MUST NOT instantiate a second copy of that stack and hand its objects across: two live WASM instances of one package in one process is the known class-identity/`instanceof` failure mode this repo already tracks (#1052; upstream compact#611 / midnight-ledger#644) — the spike itself hit it (its DAO assembler needed a cross-instance re-decode, which re-strips Merkle hashes and forces a second rehash). The handoff contract is **POJO-only**: everything crossing the boundary is `EncodedStateValue` / transcript POJOs; decode + rehash happen inside the executing (dApp) instance via the instance-bound `toExecutionState(rt, …)` (§4.1c). A cross-instance integration test is mandatory (§9).

**Pipeline integration.** The keep-state execution leg **deliberately bypasses** the compact-js `ContractExecutable` pipeline that serves v9-native calls — it drives raw `createCircuitContext` + invoke on the dApp's retained stack, exactly as the spike does. `contracts` presents one entry API and routes to either pipeline per the table above; whether keep-state needs *any* compact-js involvement (a shim compatible with 0.16) is a freeze gate (**OQ13**).

**Dual-artifact selection — removed (v2).** The former FR4/D6/AC4 design (accept `{ v8?: Contract; v9?: Contract }`, select by active version) is superseded by the 2026-07-23 rework of #1005: no v9-compiled variant exists in the model. Contract-interaction entry points keep accepting a single contract definition.

State read paths (`get-states`, `tx-model`, `ledger-utils`, `zswap-utils`) decode per FR6: per-record version for blocks/txs/events, current version for migrated contract state.

### 4.3 Handling type divergence between v8 and v9

The unified facade `LedgerModule` type is the contract between `protocol` and its consumers. A blanket "discriminated union per divergent symbol" does **not** scale: with ~15+ ledger symbols crossing the boundary, union types force every consumer to narrow (`if (version === 'v8')`) at every hop — pushing exhaustive branching into `contracts` *and* every provider, which contradicts FR5's "version-agnostic" goal, and a union flowing through `proveTx → balanceTx → submitTx` invites the `any`/`unknown` bridging NFR2 forbids.

Instead, **every boundary-crossing symbol is classified into exactly one of three buckets** (OQ3 must complete this classification before MJS-01 design freeze):

1. **Identical** — structurally the same across v8/v9. Exposed as a single shared type; **no union, stays version-agnostic.** Expected to be the common case. The keep-state POJO bridge types (`EncodedStateValue` / `impact-state-value[v2]`, transcript/`Op`/`AlignedValue` / `contract-transcript[v4]`) are known members of this bucket (spike-established byte-identity) — machine-check them with the `AssertEqual` mechanism of §4.1 where the `.d.ts` surfaces allow, and with round-trip fixtures where they don't.
2. **Divergent but opaque** — shape differs, but the framework never *reads* the divergent fields (the value flows through opaquely, e.g. an `UnprovenTransaction` handed from contracts to the proof provider). Modelled as an **opaque branded/nominal type carrying a `version` discriminant**, narrowed **only at the `protocol` seam** — never by consumers. Consumers stay version-agnostic.
   - **Scope narrowed by D9 (dev review).** Bucket-(2) analysis applies to **decode/read outputs only** — under D9 every value entering the construct→prove→submit pipeline is statically v9, so no transaction-version brand exists there (a v8 `UnprovenTransaction` reaching `proveTx` is a path that throws at construction, §6.2). Expect OQ3 to find bucket (2) at-or-near empty; if a future fork reintroduces a mixed-version pipeline, D8's per-fork revalidation is the moment to add brands (YAGNI, NFR3).
   - **Security invariant (SEC-2, simplified — mechanism pinned in sec review).** The proving seam performs one cheap **fail-fast guard**, exported from `protocol` as a single helper `assertV9Transaction()`. Mechanism: a **deterministic discriminant** — round-trip byte-equality re-serialize (the probe's output must byte-equal its input) or a version discriminant the v9 ledger exposes. Explicitly **not** a bare `instanceof` (unreliable under dual WASM instantiation, #1052 — false throws on bundler-duplicated ledger-v9 create pressure to strip the guard) and **not** a throws-based decode probe (QA-9: cross-decode may fail open with a structurally-valid-but-wrong object). Placement: `ProofProvider` is a pluggable interface with several shipped implementations, so the guard is **mandatorily invoked by every shipped proving entry** — `createProofProvider` in `types`, `http-client-proof-provider`, `dapp-connector-proof-provider`, and the keep-state contract-leg route wherever OQ11 lands — enforced by a lint/ACL gate, and documented for custom `ProofProvider` authors. A #1052 false positive fails **closed** with a remediation-bearing error pointing at the dual-instantiation guide. Keep-state transactions are native v9 from assembly and pass by construction. Any bucket-(2) symbol that *does* survive on a read path MUST have its runtime discriminant validated at the seam that narrows it — see the DEV-6 gate for the carrier mechanism.
3. **Divergent and read** — the framework actually reads divergent fields. **Only here** is a true discriminated union with an exhaustive `switch` justified. No `any`/`unknown` (NFR2).

Bucket (3) is the **KISS budget**: it must be kept as small as possible; a large bucket (3) signals the abstraction is wrong. Where a bucket-(3) symbol would surface in a public provider interface, the interface carries the version discriminant (see §4.4, gated on OQ3).

> The per-symbol classification is a discovery task during MJS-01 and a precondition of freeze (§8, OQ3).

**Bucket-(2) feasibility gate (DEV-6 — conditional on OQ3).** Runs only if OQ3 yields a non-empty bucket (2) on read paths. Branding two structurally-different WASM types under one nominal brand *often requires a cast*, which the repo forbids (NFR2) — and a type-level brand has **no runtime presence**, while WASM-backed class instances cannot safely carry a stamped property. Before design freeze, produce **one worked end-to-end example** of a bucket-(2) symbol that (a) type-checks with **no** `any`/`unknown` cast, and (b) includes the chosen **runtime carrier mechanism** — a `{ version, value }` wrapper object (honest, but a signature change consumers will see) or a WeakMap side-table (invisible, but silently misses values that never passed the wrap seam) — justified, with a **passing runtime test** of the SEC-2 mismatch throw, not just a compiling type. If the carrier is a wrapper, §4.3 and the affected provider signatures say so openly. **If the WeakMap carrier is chosen (sec review): a missing side-table entry at any narrowing seam MUST throw the typed unknown-provenance error — never default to a version** (a miss⇒v9 default is the fail-open the SEC-2 guard exists to prevent, reintroduced one layer down); the required runtime test includes the missing-entry case, not only the mismatch case. **If it cannot be done without a cast, bucket (2) collapses into an explicit union handled at the seam.**

### 4.4 MJS-03 — provider API updates

- `http-client-proof-provider` / `dapp-connector-proof-provider`: obtain `CostModel`, `ProvingProvider`, `UnprovenTransaction` via the unified accessor bound to the operation's version instead of importing from a single ledger.
- **Keep-state proving is hybrid (v2 — ownership OQ11).** For a keep-state transaction the proving legs route by key location (spike `contract-proving.ts`): the contract circuits prove with **locally-sourced, retained pre-fork key triples** (producing V2 proofs against zkir-v2), while the native dust/zswap legs go to the proof server as usual. **Disambiguation (sec review):** "local" refers to where the keys are *sourced*, not where proving executes — the spike reads the local triples and ships them **with the private witness to the proof server** (`8.0.3`). The witness leaves the process; which server(s) receive it during the transition is an explicit output of OQ12 (§6.1 trust-boundary table). Whether this routing lands in MJS-02 (orchestration) or MJS-03 (proof providers) is OQ11 — decide before MJS-03 freeze. **Proof-server version matrix is unresolved (OQ12):** the spike proved its keep-state legs against proof server `8.0.3`; given zkir/prover version coupling, a v9-era proof server may not produce valid V2 proofs. Which server version(s) a dApp operator must run during the transition — for the contract legs vs the native dust/zswap legs — must be pinned before MJS-03 freeze and stated as an operator requirement (§11).
- `indexer-public-data-provider` (`codec.ts`): the `parseHex*` decoders select the decoder for the version indicated by the accompanying `protocolVersion` metadata, rather than a fixed import. (Contract-state exception per FR6.) The codecs stay synchronous: v8-record decode paths require the one-time `await initLedgerV8()` first (OQ6 (c)); a pre-init v8 decode throws the typed error naming the init call.
- `level-private-state-provider` (security-critical): audited as **version-agnostic** — it stores opaque, contract-defined values that the envelope migration never touches, and under keep-state they keep being written by the unchanged 0.16 stack. Confirm and record this conclusion during MJS-03; if it does not hold, private-state read/write enters the version-dispatch surface (see also OQ7).
- **`midnight-js` barrel:** the new public surface (version types, `getLedger`, DEV-4/5 helpers, keep-state primitives) is consumed directly from `@midnight-ntwrk/midnight-js-protocol`; the barrel gains a `./protocol` sub-path re-export in MJS-03 so barrel-only consumers are not stranded. Verify sub-path exports per the repo's downstream-impact table; sequenced in §11's landing order.
**Known runtime-value site in `types`.** `types` is *not* purely type-only today: `packages/types/src/proof-provider.ts` imports `CostModel` as a **runtime value** and calls `CostModel.initialCostModel()` as a default parameter in `createProofProvider` (~line 67). Resolution (chosen, revised twice in review — final): **under D9 the default is correct as-is.** Every transaction that reaches `proveTx` in this release is statically v9, so the v9 `CostModel.initialCostModel()` is the right value and **no `createProofProvider` signature change ships**. (The two earlier review resolutions — an explicit constructor `version` parameter, then per-operation brand derivation — are superseded; both served a mixed-version proving pipeline that D9 rules out.) The seam instead gains the simplified SEC-2 guard (§4.3): `proveTx` asserts the received transaction is a v9 instance and throws a typed error otherwise. Before MJS-01 freeze, **audit `types` for any other runtime ledger values** reaching it (the SEC-4 lint gate stays). AC5 is correspondingly **non-breaking** for `types`.

- `types` provider interfaces (`public-data-provider.ts`, `proof-provider.ts`, `wallet-provider.ts`, `midnight-types.ts`): reference the unified facade types. **Changing `types` breaks every downstream package (a coordinated breaking change), so its surface change is kept minimal and conditional:** a version discriminant is introduced into a provider interface **only if OQ3 confirms a divergent symbol actually surfaces at that interface boundary**. If no divergent symbol reaches the provider interface, `types` changes reduce to referencing unified facade types with **no discriminant** — no breaking change. `types` MUST NOT gain a dependency on a ledger implementation (NFR4) — it depends only on `protocol`'s type surface.

---

### 4.5 Developer ergonomics & guardrails

`getLedger(version)` is the **low-level seam**. On its own it is a footgun: nothing in the type system ties `version` to the data being operated on, so a developer can call `getLedger('v9')` to decode a v8 record and only find out via the runtime decode-mismatch throw (§6). Two ergonomic layers keep app code safe:

- **Version binding (DEV-4).** A `bindLedger(version)` helper returns a version-bound facade object once (`{ CostModel, decode, … }`), so call sites do not re-pass a literal `'v9'` everywhere (which invites stale copy-paste). Most application code uses a bound facade — typically obtained from a `contracts`-level helper that derives the version from the fetched record and hands back an already-bound facade — and rarely touches raw `getLedger`.
- **Distinct sourcing helpers (DEV-5).** The two version sources of §4.2 are made **syntactically distinct at the API level**, not just prose, so a wrong pairing is visible in review:
  - `versionOfRecord(record)` — derives the version from a fetched block/tx/event record, for **read/decode** paths. (Not applicable to fetched contract state, which is always current-envelope post-fork — FR6.)
  - `networkHeadVersion(publicDataProvider)` — reads the latest block's version, for **construct/submit** paths.

  Because the read and construct paths call different helpers, decoding a historical v8 record with the network-head version (or building an outbound tx from a stale per-record version) becomes a spot-the-wrong-call error rather than a silent mis-encode.

## 5. Data Flow

Resolution across the fork:

```
Network/indexer ──protocolVersion:int──▶ publicDataProvider ──▶ contracts resolves LedgerVersion
        │                                       (protocol.protocolVersionToLedger)
        │
        ├─ network @ v8 (pre-fork) ─────────▶ decode/read only; construct/submit throws (D9)
        │
        └─ network @ v9 (post-fork)
             ├─ v9-native contract ─────────▶ default v9 path (untouched — FR7)
             │
             └─ pre-fork (ledger-8) contract — KEEP-STATE:
                  fetch migrated ContractState (v9 envelope)
                    │  extractEncodedStateValue → POJO → toExecutionState (decode+rehash in dApp's runtime instance)
                    ▼
                  dApp's ledger-8 stack executes circuit ──▶ POJO transcript (byte-identical layer)
                    │  wrapTranscriptV9 → ContractCallPrototype; contracts composes Intent → Transaction (zswap-utils)
                    ▼
                  prove (V2 — selected by verifier-key/IR tag, verifies against preserved co.v2)
                    │
                    ▼
                  proofProvider ──▶ walletProvider ──▶ midnightProvider
```

Version source differs by direction (§4.2): **read/decode** of blocks/txs/events dispatches on the `protocolVersion` of the *specific fetched record*; **construct/submit** dispatches on the *network-head* version (latest block) or an explicit caller-supplied target; **fetched contract state** post-fork is always current-envelope.

The existing transaction flow (`UnprovenTransaction → proveTx → balanceTx → submitTx`) is unchanged in shape; each step now operates through a version-bound ledger facade.

---

## 6. Error Handling

### 6.1 Threat model & trust boundaries

The indexer is a **network service outside the dApp's trust boundary** (semi-trusted at best; subject to compromise or MITM). The version int it reports drives how outbound transactions are *encoded*, how state is *decoded*, and which *cost model / proof shape* is produced — so a wrong version is not merely a bug but an attacker-influenceable choice with financial/privacy consequences.

**Trust-boundary table (sec review) — keep-state reshapes more boundaries than the indexer:**

| Boundary | Data crossing it | Trusted for | Failure mode |
|---|---|---|---|
| Indexer (GraphQL) | `protocolVersion` ints; records; fetched `ContractState` (key-set shape **and** state bytes) | version selection, path routing, execution input | mis-route / garbage execution input — **bounded to DoS/griefing by the effects-equality backstop (below)** |
| Proof server(s) | the **full private witness** + locally-sourced key triples | proof generation; witness confidentiality | witness exfiltration if compromised. The transition may run an old `8.0.3` server (past its patch window) or **two servers side by side** — doubled exposure; which server(s) see the witness is an explicit output of OQ12 |
| zk-config artifact source (`fetch-zk-config-provider` over HTTP / node FS) | prover/verifier/zkir triples | integrity of proving keys — **role changes under keep-state** (retained artifacts anchor V2 proving) | tampered/stale artifacts → griefing; bounded by the `co.v2` consistency check (§4.2) |
| DApp-connector proving leg | witness, wallet-mediated | same as proof server, delegated | same, behind the connector's own trust model |
| dApp-supplied `keepState` handles | runtime module references | correct execution stack | in-process, same trust domain as the dApp's own code — no new boundary, but a wrong module is a documented typed failure (§4.2) |

**Attacker-influenceable routing/execution input (sec review).** The fetched `ContractState` is not just decoded — its **key-set shape** drives AC12 routing and its **bytes** become the execution input over the user's private state as witness. A malicious indexer can flip the key-set shape (mis-route keep-state ↔ v9-native) or supply arbitrary state contents. **The integrity backstop is the ledger itself:** at apply, ledger-9 replays the transcript against the *real* on-chain state and requires effects equality — so state/routing tampering is bounded to **DoS/griefing** (minutes of wasted proving, doomed submissions), never fund or verification compromise. This invariant is load-bearing and is asserted by a §9 negative test (tampered-state fixture ⇒ typed error or on-chain rejection, never a silently accepted transition).

- **Residual risk — plausible-but-wrong (downgrade) version.** `protocolVersionToLedger` guards only against *unknown* ints; a malicious indexer reporting `v8` when the network head is actually `v9` (or vice-versa) is inside the closed `{v8, v9}` set and passes narrowing cleanly. On a **construct/submit** path this silently selects the attacker-chosen encoding/cost-model/proof shape — enabling a forced downgrade across the fork boundary, a proof/verifier-key mismatch, mis-encoded value fields, or a griefing tx the honest network rejects. *(Under D9 a construct-path downgrade to v8 collapses to a fail-fast throw — a DoS at worst; the remaining live risk is mis-routing a contract call between the keep-state and v9-native execution paths.)*
- **Mitigation stance (construct/submit path).** Before the network-head version selects outbound encoding or the execution path, **cross-check it against an independent signal** — e.g. the wallet / proof-server / DApp-connector's expected version, or a fork-height/block-height sanity check — and **fail-fast on disagreement** rather than trusting a lone indexer value. Decode/read of *historical* records still dispatches on the per-record version (a wrong value there mis-decodes and is caught by the decode-mismatch throw, §6.2), but outbound encoding must not rest on a single untrusted source. If cross-checking cannot land in the first slice, it is tracked as **OQ8** with an owner — not silently accepted under A1.

### 6.2 Error handling rules

- **Trust boundary.** `FinalizedTxData.protocolVersion` is typed `number` and originates from the indexer (A1 trusts it *only after* the §6.1 cross-check on outbound paths). `protocolVersionToLedger` is the **sole narrowing point** from that untyped `number` to the closed `LedgerVersion` set.
- **Unknown protocol version** (int not in the mapping table): `protocolVersionToLedger` throws a typed error naming the observed int and the supported set. No default. Within the v8/v9-only scope (YAGNI), **both** read and write paths throw — but the two are named distinctly so the *next* fork does not silently inherit brittle behaviour:
  - *Unknown version on a decode/read path* (indexer reports a newer version than the framework supports, e.g. v10 after the next fork): throw. Revisit this to a graceful "read-only degrade" only when a future version is actually in scope — flagged here so it is a conscious decision, not an accident (see D8).
  - *Unknown version on a construct/submit path*: always a hard throw — the framework must never build a transaction it cannot encode correctly.
- **Pre-fork head (D9)**: a construct/submit attempted while the network head resolves to v8 throws a typed pre-fork-unsupported error — this release never builds v8 transactions; pre-fork operation stays on the previous major.
- **Stale-head version (fork-boundary race)**: between `networkHeadVersion(...)` resolution and submit, the head can cross the fork (proving alone takes seconds-to-minutes). A submit rejection consistent with a version flip is surfaced as a dedicated typed error advising re-resolution and rebuild — no silent auto-retry (fail-fast). Exercised in the §9 fork-boundary scenario.
- **Down-convert failure (v2)**: the down-convert primitives (§4.1c) throw on malformed input, a genuine cross-version decode failure, or a lost/unexpected `StateValue` type — they never silently return a wrong or empty state (NFR1; matches the spike's documented behaviour).
- **Proof-version invariant (v2)**: the proof version is derived from the resolved verifier-key/IR tag, never hardcoded. Producing a V3 proof (or repopulating `v3`/`ir`) for a contract whose migrated key set is `co.v2`-only fails verification on-chain; the framework MUST select V2 in that case and MUST surface a typed error if the resolved key set matches no supported proof version.
- **Version/artifact mismatch**: requesting an operation that no available execution path supports (e.g. an unsupported key/IR tag, or a version outside the closed set) throws immediately, identifying both the requested version and what was actually available.
- **Artifact ↔ on-chain key mismatch (SEC-5)**: a keep-state proving attempt where the locally-resolved verifier key does not byte-match the fetched state's `co.v2` slot throws a typed error naming both sources, before proving starts.
- **Pre-migration contract state (SEC-9)**: fetching `ContractState` while the head is pre-fork returns a v6-envelope payload; the framework throws a **deterministic typed error** ("pre-migration state — requires fork height H, or stay on the previous major") rather than relying on the v9 decoder to happen to fail (QA-9: cross-decode is not guaranteed to throw).
- **Decode mismatch**: attempting to decode v8-encoded bytes with the v9 decoder (or vice-versa) surfaces the underlying decoder error wrapped with `{ cause }`, adding the version context — never swallowed.
- **Remediation-bearing messages (DX).** Every typed error named in this section MUST tell the developer what happened, why, and the **one next step** — with concrete version numbers / fork height / config keys where known. Examples: pre-fork head → "stay on midnight-js vX until fork height H"; post-fork v8 deploy → "recompile with compactc ≥ Z"; keep-state without config → the exact `keepState` snippet to add; pre-init v8 decode → "call `await initLedgerV8()` first"; unknown version → "upgrade the framework". Subject to the privacy constraint below — remediation text never includes payloads or keys.
- All errors follow the repo convention: re-throw with `{ cause: error }`, no `catch { log(e) }`.
- **Error-content constraint (privacy).** These errors may reach the `loggerProvider` (Pino) and be shipped off-device. Messages and wrapped `cause` chains MAY include the version int, the supported version set, and artifact key **identifiers** (names, version tags such as `co.v2`, hashes) — but MUST NOT include key bytes or artifact contents, decoded state contents, key material (signing/coin/encryption keys), or raw payload bytes. For diagnostics use only lengths/offsets/type names. Applies especially to wrapped decoder errors over `ContractState`/`ZswapChainState`/`Transaction`.

### 6.3 Observability (QA-4)

Throws catch the *failing* cases; the dangerous §6.1 downgrade is a plausible-but-wrong version that **passes narrowing without throwing** and leaves no trail. Positive-path breadcrumbs are therefore required for post-hoc diagnosis:

- Every version-dispatch decision — record **decode**, network-**head** resolution, **execution-path selection** (v8-native / v9-native / keep-state), and **construct/submit** encoding — MUST emit a debug/trace-level `loggerProvider` breadcrumb recording the selected `LedgerVersion` (and path), the **source** (per-record vs network-head vs explicit), and the raw `protocolVersion` int.
- These breadcrumbs are subject to the §6.2 privacy constraint (no payload/keys). They are the mechanism by which a wrong-dispatch that produced a rejected-on-chain transaction is diagnosed after the fact — and, with the SEC-1/OQ8 prevention deferred post-slice (§11), they are the **only** §6.1-mis-dispatch signal during the fork window. **Slice-gated and AC-anchored (AC13)** for that reason.
- **No-logger case (QA review):** `loggerProvider` is optional — a dApp that configures none has zero mis-dispatch detection in the field. The migration guide instructs operators to enable debug logging during the fork window, and the no-logger gap is explicitly part of OQ8's residual-risk sign-off (it is not silently assumed away).

---

## 7. Key Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | **Explicit version parameter**, not a `network-id`-style mutable global. | v8 and v9 operations coexist during the fork; a shared mutable global is racy across concurrent/mixed-version operations. Explicit threading is safe and fail-fast-friendly. |
| D2 | `protocol` depends on **both** ledger dependency sets and dispatches; it stays the single seam. | Preserves layering (NFR4); keeps implementation coupling out of `types`/consumers. |
| D3 | **Retain existing subpath exports**, pinned explicitly to **v9** (the post-fork target). | Minimises churn; existing static-type imports keep compiling while version-aware paths are adopted incrementally. "Default" is pinned to v9 (not an ambiguous "current"): the framework was always single-version (v9), so AC8's "no regression" is scoped to today's v9-pinned consumers only. No legacy v8-pinned behaviour ever existed, so none is owed. |
| D4 | Version source = **indexer `protocolVersion`** (already present). | No schema change; single source of truth from the network. |
| D5 | Divergent types modelled **explicitly** (discriminated by version). | Type safety (NFR2); no `any`/`unknown`. |
| D6 | ~~Dual-contract support is dispatch-only inside MJS-02~~ **Superseded (v2).** Post-fork support for pre-fork contracts is the **keep-state path** (FR4): no recompile, no v9 variant, no artifact selection. | The 2026-07-23 rework of #1005 (based on the DApp-HF spike) supersedes the original open question this decision answered. The protocol migration preserves the pre-fork `co.v2` verifier key and the state/transcript *data* is byte-identical v8↔v9 — so wrapping the unchanged ledger-8 execution in a native v9 tx is both sufficient and strictly simpler than orchestrating two compiled artifacts. KISS. |
| D7 | **Keep-state primitives live in `protocol`, minimally scoped** — the split, instance-bound forms of §4.1c (`extractEncodedStateValue`, `toExecutionState`, `wrapTranscriptV9`); `Intent`/`Transaction`/offer/dust composition stays in `contracts` (existing `zswap-utils`); the executing 0.16 stack is the dApp's own instance, never bundled by `protocol`. | The primitives bridge `ledger-v9` ↔ the retained execution stack — coupling NFR4/D2 confine to the `protocol` seam — while transaction composition remains `contracts`' responsibility (no inverted layer, no duplicated zswap logic) and WASM instance identity is preserved (#1052). Resolves the placement question deferred to MJS-01 by #1005. |
| D8 | **Support-window policy: current + previous** — proposed as standing policy, pending team confirmation (**OQ10**). Split by direction: **construct/submit** = current only (D9: the previous version is never constructed by this release); **decode/read** = current + previous; **proof verification** (V2 against preserved `co.v2`) = a *ledger* policy the framework depends on but does not control. | Matches market practice (Cosmos-style N-1 for writes; longer windows only for reads). Keeps dependency, bundle and test-matrix growth bounded — implies dropping v8 when v10 enters scope (removal path: §11). Keep-state soundness rests on fork-specific facts (byte-identity, key preservation, V2 acceptance) and MUST be re-validated per fork (a spike is the playbook), never assumed. |
| D9 | **Pre-fork operation out of scope:** this release targets the fork boundary and after — v8 capability is decode/read + the keep-state bridge; construct/submit is v9-only, and a v8 network head fail-fasts (§6.2). dApps that must transact pre-fork stay on the last v8-based midnight-js major. | The codebase is and always was v9-pinned — there is no v8-native construct/execute pipeline to "route unchanged", and building one would be a major hidden workstream serving only the shrinking pre-fork window. KISS/YAGNI; keeps the #1005-derived sizing honest. |

---

## 8. Open Questions & Assumptions

- **OQ1 — BLOCKER (owner: ledger/protocol team — name the accountable contact at MJS-01 kickoff; resolve-by: MJS-01 design freeze; escalation: if unanswered by resolve-by, raise to SOW-Q3-10 steering via product#119):** What is the concrete mapping from the numeric `protocolVersion` returned by the indexer to `v8` / `v9`? (Exact int values / ranges, and the fork-boundary value.) This is the top project risk: MJS-01 is foundational and blocks MJS-02/03 (15–25 pd total), so an unanswered OQ1 stalls all three workstreams.
  - **Interim strategy:** the mapping lives solely behind `protocolVersionToLedger`. The rest of MJS-01 (both-version facades, dispatch plumbing, tests using an injected/provisional mapping) can proceed against a stub. **No MJS-01 code that depends on the concrete int→version mapping may merge until OQ1 is answered.**
- **OQ2 — RESOLVED (v2, spike pins; re-confirm at implementation — RC tags churn):** Ledger v8 = `@midnight-ntwrk/ledger-v8@8.1.0` for the type/decode surface (the spike's `8.0.3` alias served its pre-fork proving path — not needed under D9) + **onchain-runtime-v3**; the keep-state execution stack (dApp-owned, §4.2) is compact `0.31.1` / compact-runtime `0.16.0`. v9 = `@midnightntwrk/ledger-v9@1.0.0-rc.3` / `onchain-runtime-v4@4.0.0-rc.3`. Coexistence/aliasing strategy: §4.1 Implementation packaging. **Supply-chain checklist (sec review) — the re-confirm step is not a footnote:** (a) verify with the organisation the ownership of **both** npm scopes (`@midnight-ntwrk` and `@midnightntwrk` — two near-identical active scopes for WASM packages in the state/proving path is a typosquat-shaped risk, and the new aliases + dynamic-import subpath are exactly where a wrong scope hides in review); (b) exact-version pins with lockfile integrity for the whole v8 tree (the repo's `resolutions` pin pattern); (c) a CI gate asserting only the audited scopes/versions appear in `protocol`'s resolved dependency tree, including test aliases (`onchain-runtime-v3-alt`, `compact-runtime-v16`).
- **OQ3:** Which ledger symbols **diverge structurally** between v8 and v9 (vs. identical)? Determines the size of the discriminated-union surface in §4.3. The spike pre-answers part of it: `EncodedStateValue` and the transcript POJO layer are bucket-(1).
- **OQ4 — RESOLVED (v2, reformulated):** The original question ("can a single logical transaction span both versions?") assumed any intra-tx version mix is a hazard to reject. The keep-state model **requires exactly one sanctioned cross-version composition**: a ledger-8 execution transcript wrapped in a native ledger-9 transaction with a V2 proof (§4.2). The security gate is therefore inverted: the seam MUST reject any intra-tx version mix **other than** the sanctioned keep-state composition (negative test, §9). The sanctioned path itself is sound because the transcript/state-data layer is byte-identical (bucket-1) and the ledger enforces the V2 ↔ `co.v2` proof/key pairing at verification.
- **OQ5 (owner: product/PO — assign the named owner now; resolve-by: before MJS-01 design freeze):** What is the network fork date/height? Every §11 slice/priority decision hangs on it; an unanswered OQ5 means scope cannot be cut deliberately if the fork lands early.
- **OQ6 — RESOLVED (dev review, evidence from `node_modules`):** the packages instantiate WASM **at import time** on both targets (verified on `ledger-v9@1.0.0-rc.3` — node entry: top-level `readFileSync` + `new WebAssembly.Module(...)`; browser entry: `__wbg_set_wasm(wasm); wasm.__wbindgen_start()` on import), so the ARCH amendment's criterion eliminates resolution (a). **Chosen: resolution (c)** — v9 sync/eager as today; v8 behind one explicit `await initLedgerV8()` (dynamic import of `protocol/v8`); sync `getLedger('v8')` pre-init throws a typed error naming the call. Consequence (recorded in §4.4): the synchronous `parseHex*` codecs stay sync — v8-record decode paths require the one-time init first and throw the typed pre-init error otherwise. Residual: confirm the same wasm-bindgen layout on the `ledger-v8` package — recorded as a dated verification and re-run on every pin change (OQ2), not a one-off.
- **OQ7 — CONFIRMED REAL (v2; owner: Wallet SDK track):** Wallet state is **not** version-invariant in practice: the Wallet SDK's `migrateState` is an unimplemented stub, and the spike had to reconstruct the v9 wallet's dust/shielded state from the migrated on-chain state (the migration emits no wallet events). This is Wallet SDK scope, not midnight-js — but the midnight-js e2e "post-fork transaction pays its v9 dust fee" **depends on it**. Name the Wallet SDK owner and a decision date at the next cross-team sync. **Fallback (so the midnight-js slice is acceptable independently):** port the spike's reconstruct-from-on-chain wallet shim (`facade-builder.ts` / `sim-reads.ts`) into `testkit-js-e2e` as test-only scaffolding — the cross-fork e2e then passes without shipping wallet code, and the shim is deleted when the Wallet SDK lands `migrateState`.
- **OQ8 — SECURITY, downgrade cross-check (owner: TBD; resolve-by: **hard-tied to OQ5's fork height**, with a named owner formally accepting the residual risk for any window it remains open):** What independent signal is used to cross-check the indexer's network-head `protocolVersion` on construct/submit paths (§6.1)? Post-slice by decision (§11) — during the open window the §6.3 breadcrumbs (slice-gated) provide detection; this question closes the prevention side before broad rollout.
- **OQ9 — PARTIALLY RESOLVED (v2):** Fixture provenance: the spike (`island-1/2/3`) is the canonical source of v8+v9 fixtures — reproducible generators (ledger-8 encoders, migrated-state dumps) already exist there. Remaining work: port/mint them into this repo per §9 (preferred: devDependency generators; fallback: committed golden hex). Still blocks the decode/round-trip test slice until ported.
- **OQ10 — support-window policy confirmation (v2; owner: team/PO):** Is "current + previous" (D8) confirmed as the standing policy? Asked on [#1005](https://github.com/midnightntwrk/midnight-js/issues/1005#issuecomment-5166550550). Until answered, D8 is a proposal.
- **OQ11 — hybrid-proving ownership (v2; owner: TBD; before MJS-03 freeze):** Keep-state proving routes by key location — contract circuits prove locally with retained pre-fork keys (V2), native dust/zswap legs via the proof server (§4.4). Does this routing land in MJS-02 (contracts orchestration) or MJS-03 (proof providers)?
- **OQ12 — proof-server version matrix (owner: TBD; resolve-by: before MJS-03 freeze):** Which proof-server version(s) must a dApp operator run during the transition window for keep-state transactions? The spike proved V2 contract legs against proof server `8.0.3`; zkir/prover coupling means a v9-era server may not produce valid V2 proofs. Pin the matrix (contract legs vs native dust/zswap legs; one server or two side by side) and document the operator-facing requirement in §11.
- **OQ13 — compact-js involvement in keep-state execution (owner: TBD; resolve-by: MJS-01 design freeze):** The spike drives execution via raw `createCircuitContext` + invoke on the retained 0.16 stack, bypassing the compact-js `ContractExecutable` pipeline entirely (§4.2). Confirm keep-state needs **no** compact-js involvement (the generated pre-fork contract JS pairs directly with its own compact-runtime); if any compact-js shim is required, pin a version compatible with 0.16 — compact-js is known to lag `createCircuitContext` signature changes across compact-runtime versions. Also record here the artifact field carrying the version tag for deploy-path detection (§4.2, AC12).
- **OQ14 — fork-capable e2e environment (owner: TBD; resolve-by: before the fork-boundary e2e is declared done):** the testkit compose stack is v9-only today; define/build the node + indexer + proof-server image matrix that starts at v8 and migrates at a set height (or adopt the spike simulator for the boundary cases). Until it exists, proof/apply-level ACs rely on the §9 verification harness at unit/integration level — recorded, not implied.

**Freeze-gate done-definitions (QA-6).** Each "before-freeze" gate closes only when a concrete artifact is merged and its test is green:
- **OQ1** → the concrete int→version map committed behind `protocolVersionToLedger`, with a table test.
- **OQ3** → a checked-in `symbol-buckets.md` (or a typed const) enumerating every boundary-crossing symbol with its bucket (1/2/3), referenced by the ACL test's per-version lists. The classification also lands as the `LedgerModule<V>` conditional type (§4.1b) — the type is the artifact, the doc is commentary.
- **OQ4** → *(resolved)* the sanctioned keep-state composition documented (§4.2) + the reject-other-mixes throw path with its negative test.
- **OQ6** → *(resolved)* at-import instantiation documented + resolution (c) recorded (NFR6); residual: same-layout confirmation for `ledger-v8`.
- **DEV-6** → a compiling `bucket2-brand.example.ts` (or type-level test) that CI type-checks with **no** `any`/`unknown` cast.
- **OQ9** → the full §9 fixture inventory (or its generators, ported from the spike) committed and consumed by the round-trip test, **plus the verification-harness decision recorded** (ledger-v9 local verify entry vs ported spike simulator) with its devDependency landed.
- **OQ10** → the policy answer recorded in D8 (proposal → decision). *(post-slice)*
- **OQ11** → the ownership decision recorded in §4.4 before MJS-03 freeze. *(slice-blocking)*
- **OQ12** → the documented proof-server matrix + the §11 operator requirement. *(slice-blocking)*
- **OQ13** → the recorded answer (no-compact-js confirmed, or the pinned compatible version) + the identified deploy-detection artifact field. *(slice-blocking)*
- **SEC-2 guard** → the `assertV9Transaction()` red-team fixture (specifically: a v8 value that **round-trips cleanly through the v9 codec** and MUST still be rejected) green + a **positive determinism check** (N genuine v9 transactions, including keep-state-assembled ones, round-trip byte-identically — zero false positives; if canonical re-serialization does not hold, the recorded fallback is an upstream version discriminant requested from the ledger team) + the lint/ACL gate that every shipped `proveTx` calls the guard. *(slice-blocking)*

Slice gating of the remaining gates: **OQ1, OQ3, OQ6, OQ9, DEV-6 = slice-blocking** (the fork slice cannot ship without them); see §11 for the full slice-gating classification.
- **A1 (assumption):** The indexer reliably tags every block/tx/event with a correct `protocolVersion`; the framework trusts it as the source of truth (subject to the §6.1 cross-check).
- **A2 (assumption, revised v2):** The dApp retains its pre-fork toolchain outputs unchanged — compiled artifacts, prover/verifier keys, and the old runtime. The framework never compiles contracts and never mutates artifacts. *(The v1 form of A2 — "both contract artifacts are supplied by the dApp" — is superseded with FR4.)*

---

## 9. Testing Strategy

Per repo convention: tests written first (TDD), Arrange-Act-Assert, meaningful negative scenarios, strict equality assertions, both versions exercised (NFR5).

**Fixture provenance (QA-1) — precondition of the MJS-01 test slice, gated with OQ2/OQ9.** The repo is currently v9-only, so a v8-encoded payload does not exist here yet. Every round-trip, decode-mismatch, and cross-fork test depends on canonical v8 *and* v9 fixtures — **and (v2) on a migrated-state fixture** (a `ContractState` in the v9 envelope whose data originated pre-fork) for the keep-state tests. Provenance:
- **Preferred:** port the spike's generators — install `@midnight-ntwrk/ledger-v8` (and onchain-runtime-v3) as a **devDependency** and mint fixtures at test time via its `sample*`/encoders; same for v9; produce the migrated-state fixture via the spike's migrate flow (or a captured dump). Fixtures are then reproducible, not opaque blobs.
- **Fallback:** commit **golden hex fixtures** captured from the spike / a v8 network, each stored with its `protocolVersion` int.
- "v8 + migrated-state fixtures available" is a named precondition (**OQ9**) blocking the decode/round-trip/keep-state test slices.
- **Fixture inventory (QA review)** — beyond v8/v9/migrated, the promised tests need: a **v6-envelope** pre-migration `ContractState` (SEC-9); **tampered** variants (SEC-4: key set flipped both ways, perturbed bytes); the SEC-2 **red-team fixture** (a v8 value that round-trips cleanly through the v9 codec — characterising that shape is a discovery sub-task of the SEC-2 freeze gate, not a capture); a **both-keys** fixture (AC12 truth table); a **Merkle-bearing** migrated fixture (rehash tests). Provenance recorded per fixture (generator vs golden hex vs hand-crafted). **Minimal-size mandate:** the smallest contract exhibiting each property — one tiny Merkle tree, not the DAO — per this repo's WASM-fixture coverage-timeout precedent.

**Test levels (QA-5).** Each scenario is explicitly placed:
- **Unit (vitest):** fixture round-trip, dispatch/path selection, down-convert, and *all* negative throw paths (unknown version, unsupported key/IR tag, decode mismatch, brand-version mismatch *(conditional — only if DEV-6 runs)*, downgrade cross-check *(post-slice — ships with the OQ8 mechanism)*, unsanctioned intra-tx mixing, V3-vs-`co.v2`). Authoritative pre-fork gate.
  - **Coverage thresholds (QA review):** `packages/protocol` enforces 100% line/branch coverage, and the new accessor/init/keep-state code has branches unreachable in unit scope (dynamic-import failure, WASM-internal error surfaces). Identify those branches up front and handle them via explicit, justified ignore annotations or a deliberate per-file threshold carve-out — decided in the MJS-01 PR, not discovered at CI time. No coverage-padding tests.
- **Docker integration:** `indexer-public-data-provider` codec against a real indexer response carrying `protocolVersion`.
- **e2e testkit:** full deploy/call flow. The **fork-boundary e2e** (keep-state call on a pre-fork contract post-fork) generally **cannot run pre-fork** against a live network at the fork height; pre-fork it is exercised via migrated-state fixtures at unit/integration level, which are the authoritative gate until a fork-height network is available. The fee-paying cross-fork e2e uses the **test-only wallet shim** (OQ7/§11) until the Wallet SDK ships `migrateState`. Operational: keep-state proving e2e runs **serialized against its proof server** (`--test-concurrency=1`, or a dedicated server instance per shard) — the spike's documented contention finding; parallel cross-fork proving flakes.

**Verification harness (QA review).** Proof/apply-level assertions need a verifier; naming it is part of the design, not an implementation detail:
- **Unit/integration:** the V3-fails-verification negative (AC4), the keep-state V2 positive, and the apply-level SEC-4/SEC-5 outcomes are asserted against a **local verifier** — either ledger-v9's local verify entry point or a ported spike-simulator devDependency. **Which one is a freeze-gate decision alongside OQ9.**
- **e2e:** a fork-capable environment (node/indexer/proof-server images that start at v8 and migrate at a height) does not exist in this repo's testkit today — **OQ14**. Until it exists, AC3/AC4's proof/apply-level evidence is explicitly gated on the unit-harness tier (the authoritative pre-fork gate), and that gap is recorded, not implied.

- **protocol (MJS-01):**
  - `protocolVersionToLedger` maps known ints correctly (both versions) and **throws** on unknown ints (negative).
  - `getLedger('v8')` / `getLedger('v9')` each return a facade exposing the full required symbol set. Extend `protocol-acl.test.ts` with **two per-version expected symbol lists** (v8 and v9 may legitimately differ — these lists are **blocked on OQ3**). A single shared list is explicitly avoided — it would collapse to the intersection and weaken the guarantee. Split the assertion into: **(a) runtime** key-set equality via strict `toEqual` on sorted keys — against the facade's **complete** exported key set, not merely "contains the required symbols" (a required-*subset* framing would let a leaked/extra export on one version pass, reproducing the one-directional-assertion anti-pattern the repo forbids); **(b) compile-time** — each version facade is assignable to the unified `LedgerModule` type (a type-level assertion; `toEqual` on keys cannot see type drift). The bucket-(1) identity assertions (§4.1a) cover the shared-type side.
  - **Down-convert (v2, D7):** round-trip — a migrated-state fixture down-converts to an execution-ready ledger-8 `ContractState` whose `StateValue` equals the pre-migration reference; negative — malformed bytes / lost `StateValue` type **throws**; Merkle case — a tree-bearing fixture's root is readable after down-convert (i.e. the rehash step ran), and a deliberately non-rehashed decode **throws** on root access (validates the rehash step is load-bearing, not decorative).
  - **Instance identity (#1052):** an integration test asserts the keep-state boundary hands only POJOs across runtime instances. Mechanism (vitest cannot double-import one specifier — the module registry caches it): a devDependency npm alias of the same package/version (e.g. `onchain-runtime-v3-alt: npm:@midnightntwrk/onchain-runtime-v3@<pin>`); decode via one instance, execute via the other — positive: the POJO handoff succeeds (`extractEncodedStateValue` output feeds `toExecutionState` bound to the *other* instance); negative control: passing a WASM-backed object across instances fails.
  - **Sourcing guardrail (DEV-5)** — spy-based (a naive "not derived from the record" assertion is vacuous — nothing exists to derive from): mock the `publicDataProvider` and assert with strict call-count equality that `networkHeadVersion` is called exactly once per construct operation and `versionOfRecord` is never invoked on the construct path; optionally a type-level test that `versionOfRecord`'s parameter type rejects construct-path inputs.
  - **Proving-seam guard (SEC-2):** negative tests for `assertV9Transaction()` — (a) a non-v9 value (a v8 decode output, or a foreign object) fed into the proving/submit seam MUST throw the typed error; (b) **determinism red-team fixture:** a crafted v8 value that a naive decode-probe would accept (QA-9 fail-open shape) MUST still be rejected by the byte-equality mechanism; (c) the lint/ACL gate asserting every shipped `proveTx` implementation calls the guard is green.
  - **Downgrade cross-check (SEC-1) — post-slice, ships with the OQ8 mechanism:** a negative test where the indexer network-head version disagrees with the independent signal — the construct/submit path MUST fail-fast rather than encode with the indexer-reported version. (Not part of the slice suite; the slice's §6.3 breadcrumbs are the interim detection.)
  - Round-trip: a value sampled/encoded by v8 decodes via the v8 facade and **fails** via the v9 facade (negative).
    - **Determinism (QA-9):** cross-decoding is only a valid negative test if it *deterministically* fails. WASM decoders may instead emit garbage or a structurally-valid-but-wrong object (likely for bucket-(1) "identical" shapes). The test must assert a concrete failure signal — a thrown error where the decoder throws, otherwise a round-trip inequality (decoded→re-encoded bytes ≠ original) or a discriminant/checksum check. Where the decoder does not throw, the framework MUST add its own version-discriminant validation at the seam rather than relying on the decoder. Flag as a discovery item alongside OQ3 (identical shapes are exactly where cross-decode may not throw).
- **contracts (MJS-02, v2):**
  - Given a `publicDataProvider` reporting v9 at head with a v9-native contract, flows take the default v9 path; historical v8 records decode correctly regardless of head.
  - **Keep-state positive:** a contract "deployed" pre-fork (migrated-state fixture + retained ledger-8 artifacts) accepts a new call post-fork — POJO down-convert → execution in the dApp's runtime instance → `wrapTranscriptV9` + `contracts` composition → V2 proof — with **no recompilation and no v9 variant** involved anywhere in the flow.
  - **Proof-version negative:** a V3 proof / repopulated `v3`/`ir` against the preserved `co.v2` key **fails verification** (matches the #1005 AC).
  - **v9-native non-regression (FR7)** — mechanism defined (QA review), since "behavioural equality" is otherwise unmeasurable: (a) the existing v9-native vitest/e2e suites run **unmodified** — a diff gate on the test files themselves makes edits-to-pass visible; (b) golden-fixture byte equality on the **deterministic stages only**: serialized `UnprovenTransaction`/`Intent` bytes and decoded-state snapshots for a pinned scenario set, captured on `main` before the first MJS-01 PR and committed; (c) proof bytes are explicitly excluded (proving is nondeterministic).
  - **Pre-fork head (D9):** with the network head at v8, construct/submit throws the typed pre-fork-unsupported error; decode/read of v8 records still succeeds.
  - **Path detection (AC12):** calls — all **four** key-set shapes asserted strictly (`co.v2`-only ⇒ keep-state; `v3`-bearing ⇒ v9-native; **both** ⇒ v9-native + dual-key breadcrumb; **neither** ⇒ typed unsupported-key-set error); deploys — a post-fork **deploy** with ledger-8 artifacts (detected by the artifact version tag) throws the typed unsupported-deploy error; negative — a call routing to keep-state without the `keepState` config throws the guidance-bearing typed error.
  - **Unsanctioned mixing (OQ4):** assembling a transaction that mixes versions in any way *other than* the sanctioned keep-state composition **throws** a typed error at the seam.
  - **Tampered fetched state (SEC-4)** — one deterministic outcome per fixture, at one named level (an either/or matcher degrades silently): (a) key set flipped `co.v2`→`v3`-bearing ⇒ the typed error (mis-route lands on v9-native without artifacts / SEC-5 mismatch), **unit**; (b) key set flipped `v3`→`co.v2`-only ⇒ the typed keep-state-config or SEC-5 error, **unit**; (c) state bytes perturbed but well-formed ⇒ rejection at apply, **e2e** (verification harness / OQ14). Together they assert the effects-equality backstop of §6.1.
  - **Artifact ↔ `co.v2` mismatch (SEC-5):** a fixture whose locally-resolved verifier key differs from the fetched state's `co.v2` slot throws the typed mismatch error **before any proving starts**.
  - **Pre-migration state (SEC-9):** fetching a v6-envelope `ContractState` fixture (pre-fork head) throws the deterministic typed error of §6.2 — asserted as a throw, not left to decoder behaviour.
- **providers (MJS-03):**
  - Proof providers operate on the statically-v9 pipeline (D9); negative — the `proveTx` SEC-2 guard: a non-v9 value fed to the proving seam throws the typed error; keep-state proving selects **V2 by the resolved verifier-key/IR tag** (never hardcoded) and routes contract-circuit legs to local keys vs native legs to the server (placement per OQ11).
  - `indexer-public-data-provider` `codec` decodes v8- and v9-tagged payloads correctly and **throws** on a version/payload mismatch (negative).
- **Backward compatibility (AC8):** a consumer using only the legacy default-version subpath imports still compiles and produces identical results — i.e. the retained subpath exports (D3) behave exactly as before the change.
- **Cross-cutting:** the fork-boundary scenario — within one session: read v8 historical records, execute a keep-state call against a pre-fork contract, and run a v9-native flow, all succeeding side by side; plus the stale-head case — a head flip between version resolution and submit surfaces the dedicated typed error of §6.2, never a raw node rejection.
- **Single WASM init (AC10, QA-3):** because instantiation is an at-import side effect (OQ6), the authoritative assertion is **module-load based**, not a spy: a v9-only suite asserts the `protocol/v8` subpath is **never imported** (`vi.mock`/module-registry probe), plus a static grep/lint gate that no source file outside `protocol/v8` statically imports `@midnight-ntwrk/ledger-v8`. A memoisation test on `initLedgerV8()` (second call is a no-op) is secondary. Additionally: a smoke test that the **published `.cjs` artifact** can perform `await initLedgerV8()` + `getLedger('v8')` on Node ≥22 (§4.1 packaging) — homed as a `packages/protocol` **post-build CI step** (`yarn pack` → install into a temp project → run a CJS require script) on a named Node version matrix; a pipeline stage, not a one-off manual check; post-slice like the rest of AC10.
- **No unsafe casts (AC6, QA-2):** enforced by mechanism, not review judgment — ESLint `@typescript-eslint/no-explicit-any` plus a grep/lint gate rejecting `as unknown`. CI-enforced.
- **Type-only sites (AC9, QA-2):** an AST/grep assertion that no site importing a symbol purely as a type also calls `getLedger` for it — accessor calls occur only where a runtime value is used.

---

### 9.1 AC → test traceability (QA-2)

Every acceptance criterion maps to a concrete verification, and every §9 test anchors to an AC row below — security/robustness tests are listed against the AC they substantiate, so dropping one shows up red on this table.

| AC | Verified by |
|----|-------------|
| AC1 | `getLedger('v8'\|'v9')` return facades; ACL per-version key-set + `LedgerModule` assignability |
| AC2 | Negative: unknown int throws on **decode/read** path *and* on **construct/submit** path (the two §6.2-named paths, asserted separately); unsupported key/IR tag throw; down-convert failure throw; SEC-5 artifact↔`co.v2` mismatch throw; SEC-9 pre-migration v6-state throw; SEC-4 tampered-state unit fixtures |
| AC3 | contracts routes v9-native / keep-state / pre-fork-throw (D9) per reported version; fork-boundary cross-cutting test incl. stale-head; DEV-5 sourcing-guardrail spy test |
| AC4 | Keep-state positive (unit verification harness; e2e once OQ14 lands); V3-vs-`co.v2` negative; unsanctioned-mixing negative; #1052 instance-identity test; SEC-4(c) apply-level rejection |
| AC5 | Providers operate via unified APIs on decode/read paths (both versions); SEC-2 `assertV9Transaction()` negative suite at every shipped proving entry; V2-by-key-tag proving test; `types` unchanged-signature compile assertion |
| AC6 | ESLint `no-explicit-any` + grep gate on `as unknown` (CI-enforced) |
| AC7 | Both-version coverage across dispatch paths; `yarn lint` + build + vitest green |
| AC8 | Backward-compat: legacy v9 subpath imports compile + behave identically |
| AC9 | AST/grep: no type-only import site calls `getLedger` |
| AC10 | Module-load assertion: `/v8` never imported in a v9-only suite + static-import grep gate; `initLedgerV8` memoisation; published-`.cjs` smoke test |
| AC11 | v9-native non-regression suite: behavioural equality with pre-change baseline |
| AC12 | Path-detection routing test (calls: all four key-set shapes of the §4.2 truth table; deploys: artifact version tag) + post-fork v8-deploy negative + missing-`keepState`-config negative |
| AC13 | Injected-test-logger unit tests: all four breadcrumb emission points, strict equality on structured fields |

## 10. Acceptance Criteria

Ordered sequentially; each AC carries its slice-gating tag (see §11): **[slice]** = blocks the pre-fork minimum shippable slice, **[post-slice]** = deliberately non-blocking for the fork height.

- **AC1 [slice]** — `protocol` exposes unified, version-parameterised APIs that operate for both v8 and v9; internal dispatch selects the correct implementation. (FR1, FR2)
- **AC2 [slice]** — Unknown/unsupported protocol versions, unsupported key/IR tags, and down-convert failures throw typed errors with no silent fallback. (NFR1)
- **AC3 [slice]** — `contracts` reads the protocol version from the public data provider and routes each operation down exactly one path (v9-native / keep-state / typed pre-fork throw — D9); v9-native and keep-state flows succeed, including across the fork boundary, and v8 coverage is decode/read of historical records. (FR3, FR6, D9)
- **AC4 [slice]** — **Keep-state (replaces v1 dual-artifact AC):** a contract deployed under ledger-8 accepts a **new transaction after the fork with no recompilation and no v9 contract variant**; post-fork calls verify against the preserved `co.v2` key (negative: a V3 proof / repopulated `v3`/`ir` fails verification); any unsanctioned cross-version mix fails fast. (FR4, matches the reworked #1005 ACs)
- **AC5 [slice]** — Provider APIs and `types` provider interfaces operate via the unified APIs with no direct single-version coupling on decode/read paths; `types` gains no ledger-implementation dependency and **no breaking signature changes** (the `createProofProvider` cost-model default stays — §4.4, D9); the proving seam carries the SEC-2 v9 guard. Keep-state proving selects the proof version by key/IR tag. (FR5, NFR4)
- **AC6 [slice — CI-enforced from the first PR]** — No `any`/`unknown` casts introduced; divergent types modelled explicitly. (NFR2)
- **AC7 [slice]** — Both-version coverage exists for every dispatch path; `yarn lint` clean, build succeeds, tests pass. (NFR5)
- **AC8 [slice]** — **No regression for existing single-version dApps:** existing default-version (v9) subpath imports (`/ledger`, `/onchain-runtime`) continue to compile and behave identically; a consumer that adopts none of the version-aware APIs sees no behavioural change. (D3)
- **AC9 [post-slice — tooling assertion; the migration itself ships in the slice]** — **Type-only sites need no runtime call:** every consumer that referenced a ledger symbol purely as a type keeps a `import type` and calls no accessor; `getLedger` is invoked only where a runtime value was previously used. The known exception (`createProofProvider`, §4.4) is migrated deliberately, not left as a hidden runtime import. (§4.1a/b)
- **AC10 [post-slice assertion — the lazy-init behaviour itself ships in the slice]** — **Single WASM init:** a single-version consumer incurs exactly one ledger WASM instantiation; the v8 stack is not loaded until the explicit `await initLedgerV8()` (OQ6 (c)). (NFR6)
- **AC11 [slice]** — **Native ledger-9 execution is not impaired:** v9-native call/deploy flows behave exactly as before the dual-version changes — verified by a non-regression suite, not by absence of complaints. (FR7, matches #1005)
- **AC12 [slice]** — **Path detection & developer contract:** for **calls**, `contracts` derives the execution path from the fetched contract's verifier-key/IR tag via the total four-shape truth table of §4.2 (`co.v2`-only ⇒ keep-state; `v3`/`ir` present ⇒ v9-native; both ⇒ v9-native + breadcrumb; neither ⇒ typed error); for **deploys**, from the version tag of the supplied artifacts (post-fork deploy with ledger-8 artifacts ⇒ typed error); a dApp enables keep-state with **one documented opt-in config object** (the retained-stack handles, §4.2) — no contract changes, no artifact changes, no recompilation; a keep-state route without the config fail-fasts with a guidance-bearing typed error. (FR4, §4.2)
- **AC13 [slice]** — **Observability of version dispatch:** every version-dispatch decision (record decode, network-head resolution, execution-path selection, construct/submit encoding) emits a `loggerProvider` breadcrumb carrying the selected `LedgerVersion`, the source (per-record / network-head / explicit), and the raw `protocolVersion` int — verified by unit tests with an injected test logger asserting all four emission points and the structured field content with strict equality (no payloads/keys, §6.2). (§6.3)

---

## 11. Rollout & Versioning

- **Fork deadline (business driver):** this is a hard-fork migration with a network fork date/height — see **OQ5**. Delivery must be prioritised against it.
- **Minimum shippable slice before the fork (v2):** the keep-state capability — *a pre-fork (ledger-8) contract accepts a post-fork call (down-convert → old-stack execution → native v9 tx → V2 proof), the v9-native path is untouched, and v8 historical records decode* — the §9 cross-cutting scenario. Everything required for that path must ship before the fork height or pre-fork dApps break on-chain; refinements (e.g. exhaustive divergent-type coverage) can follow.
- **Slice gating.** Slice-blocking: **AC1–AC8, AC11, AC12, AC13**; the **OQ7 wallet-shim port** (named work item); freeze gates **OQ1, OQ3, OQ9 (incl. the verification-harness decision), DEV-6, OQ11, OQ12, OQ13**; **§6.3 version-dispatch breadcrumbs** (moved into the slice in sec review — they are the *only* detection of the §6.1 mis-dispatch during the one window it exists, and they are cheap: debug-level logger calls at four decision points). Post-slice (deliberately non-blocking for the fork height): **AC9/AC10** tooling assertions, the **SEC-1/OQ8** downgrade cross-check — an explicitly-accepted residual risk with a **hard resolve-by tied to OQ5's fork height and a named owner accepting it** (§6.1); its §9 negative test ships **with the OQ8 mechanism**, not with the slice — and **OQ10** policy confirmation. Moving an item between these lists is a conscious re-scope decision, not drift.
- **MJS-01 sub-slices (sizing note).** MJS-01 splits into (a) **accessor + dispatch** — publishing this unblocks MJS-02/03 — and (b) **keep-state primitives** (D7), consumed only by the keep-state path. The issue sizings (#1005: 6–10 pd, #1006: 3–5 pd) predate the keep-state rework and D7's reallocation into `protocol`; re-confirm all three sizings against the reworked scope.
- **Proof-server operator requirement (OQ12).** The transition-window proof-server version matrix for keep-state is unresolved; once pinned, it becomes a documented operator-facing requirement of the rollout (which server version(s) to run, for which proving legs — and, explicitly, **which server(s) receive the private witness** during the window, §6.1).
- **Documentation deliverable [slice].** The migration guide (the `keepState` opt-in config with a copy-paste snippet, the proof-server operator matrix once OQ12 resolves, the D9 pre-fork stance), a TROUBLESHOOTING section for the new typed errors, and the llms.txt/API-doc updates ship **with** the fork slice, not after — AC12's own contract references the guide, so the guide gates the slice.
- **Support window (D8/OQ10):** current + previous, dropped forward at the next fork — pending confirmation on #1005. Keep-state soundness is re-validated per fork via a spike (the §8 freeze-gate list is the reusable playbook); it is never assumed to transfer.
- **v8 removal path (D8).** The v8 side and the keep-state primitives are **fork-lifetime-scoped, transitional API**: they live behind the isolatable `protocol/v8` subpath (§4.1), are documented as transitional from day one, and their deletion is pre-announced as the major bump that accompanies v10 entering scope. `LedgerVersion` (widening, then shrinking) is the single compile-time signal downstream packages key on for both transitions — no scattered per-symbol deprecations.
- **Silent-default-downgrade audit (SEC-4).** The v9-pinned default subpath (D3) does not fail-fast, so an un-migrated **runtime-value** call site silently operates at v9 while the data may be v8. Before the fork height, enumerate every remaining runtime-value import from the default subpath and confirm each is genuinely single-version-safe; any runtime-value site on a cross-fork path MUST migrate to explicit `getLedger(version)`. Add a lint/grep gate flagging runtime-value imports from the default subpath so a silent-default downgrade cannot ship unreviewed. (Type-only default imports are unaffected.)
- Coordinated change touching `protocol` → `contracts`/providers/`types` in the correct dependency order; providers and contracts land only after the `protocol` accessor is published. The `midnight-js` barrel's `./protocol` sub-path re-export lands with MJS-03 and is verified against the repo's sub-path export table (§4.4).
- Public API change → major/beta version bump on affected packages, per repo release conventions.
- Retaining default-version subpath exports (D3) keeps the blast radius on consuming dApps to opt-in adoption of the version-aware paths.
- **Wallet SDK dependency (OQ7):** the cross-fork e2e "post-fork tx pays its v9 dust fee" cannot pass until the Wallet SDK ships `migrateState` (or the reconstruct-from-on-chain equivalent). Track jointly; do not let it silently gate the midnight-js slice at the fork height. **The shim port is a named slice-blocking work item (QA review):** port the spike's `facade-builder.ts`/`sim-reads.ts` reconstruct-from-on-chain shim into `testkit-js`/`testkit-js-e2e` as test-only scaffolding (owner: named at kickoff; deleted when the Wallet SDK lands `migrateState`); the resulting e2e is listed in §9. Without this, the fee-paying cross-fork e2e silently degrades to `test.skip` — a failure mode this repo has already lived through.
