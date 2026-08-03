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
- **FR1** — The `protocol` package MUST expose a unified API surface that can operate against either Ledger v8 or v9, dispatching internally to the correct version-specific implementation.
- **FR2** — Version selection MUST be **explicit**: unified APIs receive the target protocol version as an argument (or via a version-bound accessor object). No hidden mutable global drives dispatch. (Decision — see §7.)
- **FR3** — The `contracts` package MUST determine the active protocol version from the public data provider (the indexer already returns `protocolVersion` on blocks/transactions/events) and switch behaviour once v9 is active, so contract flows remain correct across the fork.
- **FR4** — **Keep-state (replaces the superseded dual-artifact requirement).** The `contracts` package MUST let an **already-deployed, ledger-8-compiled contract keep transacting after the fork with no recompilation and no v9-compiled variant**. Three moves, per post-fork call (reference implementation: spike island-3):
  1. **Keep** the deployed ledger-8 artifacts and the old execution runtime — no recompile.
  2. **Down-convert** the on-chain state (migrated by the protocol into the v9 envelope) back to the ledger-8 shape for execution — productionize [`downcastV9StateForExecution`](https://github.com/shieldedtech/spike-dapp-hf/blob/main/island-3/driver/src/downcast.ts), including the contract-agnostic `rehashStateValue` step (bounded Merkle trees come back non-rehashed from the encode/decode round-trip and must be rehashed before any `checkRoot`).
  3. **Build + prove** a native ledger-9 `ContractCallPrototype` around the resulting POJO transcript — productionize [`assembleCallV9`](https://github.com/shieldedtech/spike-dapp-hf/blob/main/island-3/driver/src/assemble.ts). The proof version is selected by the resolved verifier-key/IR tag (**V2 → the migrated `co.v2` slot**), never hardcoded.

  The package does **not** dispatch between two compiled contract artifacts. Pre-fork (v8-native) contract calls are routed unchanged.
- **FR5** — Provider APIs (`http-client-proof-provider`, `dapp-connector-proof-provider`, `indexer-public-data-provider`, and the provider interfaces in `types`) MUST consume the unified protocol APIs so they are version-agnostic; direct coupling to a single ledger version is removed.
- **FR6** — Serialization/deserialization MUST respect what actually exists on-chain: **historical blocks/transactions/events** decode with the version that produced them (per-record `protocolVersion`); **fetched `ContractState` after the fork is always current-envelope** (the protocol migrated it) — it is decoded with the current version and, for pre-fork contracts, down-converted for execution (FR4). No fixed-version decoding anywhere.
- **FR7** — **No impairment of native ledger-9 execution.** The v9-native call/deploy path stays the default and MUST remain behaviourally unaffected by the added dual-version dispatch and the v8 keep-state path (non-regression coverage required).

### Non-functional
- **NFR1 — Fail fast.** An unknown/unsupported protocol version, or a version-mismatch between a decoded artifact and the requested operation, MUST throw a clear, typed error immediately — never silently fall back to a default version.
- **NFR2 — Type safety.** No `any` casts and no `unknown` bridging to paper over v8/v9 type differences. Divergences are modelled explicitly (see §4.3).
- **NFR3 — KISS / YAGNI.** Only the two live versions (v8, v9) are supported. No generic "N-version" plugin framework. (See D8 for the standing support-window policy.)
- **NFR4 — Layering preserved.** `types` stays dependency-free of implementations; `protocol` remains the single seam through which ledger implementations enter the framework. Dependency direction `types → contracts/providers → protocol` is unchanged.
- **NFR5 — Testability.** Every version-dispatch path is covered by tests exercising **both** v8 and v9.
- **NFR6 — Lazy WASM instantiation.** Both ledger packages are WASM-backed. The inactive version MUST NOT be WASM-instantiated until the first `getLedger(thatVersion)` call. A single-version consumer (the common browser-dApp case away from the fork boundary) MUST incur only **one** WASM initialisation — eager double-init would be a startup/memory regression against the AC8 "no behavioural change" spirit. Both versions remain reachable via the accessor, so tree-shaking cannot drop either — laziness, not elimination, is the mechanism.
  - **Sync-vs-async caveat (must resolve before MJS-01 freeze — OQ6).** A *synchronous* `getLedger(version): LedgerModule` cannot internally `await import()`; `import()` and async WASM instantiation are Promises. The two cannot both be true as originally stated. The accessor signature is therefore **gated on OQ6** (the ledger packages' actual init model), with three candidate resolutions:
    - **(a) sync init available** — if the packages instantiate WASM synchronously, use a static `import` + memoised sync init; "lazy" means the sync init is *deferred to first access*, not a dynamic `import()`. `getLedger` stays synchronous. *(Preferred if feasible — smallest ripple.)*
    - **(b) async init** — `getLedger` returns `Promise<LedgerModule>`; the async ripple through providers/contracts is designed for and reflected in the ACs.
    - **(c) explicit init step** — a separate `await initLedger(version)` performs async instantiation once, after which a sync `getLedger(version)` returns the ready module (throws if not yet initialised — fail-fast).

---

## 3. Scope

### In scope
- Adding the ledger **v8** dependency set to the `protocol` package alongside v9. Per the spike this is **not one package** (see §4.1 seam asymmetry): `@midnight-ntwrk/ledger-v8` for pre-fork construct/decode and the v8 proving path, plus the retained execution stack (`onchain-runtime-v3` / compact-runtime `0.16`) for keep-state circuit execution. Exact pins: OQ2 (resolved, re-confirm at implementation).
- A version-dispatch mechanism in `protocol` (MJS-01).
- The **keep-state primitives** — down-convert (`downcastV9StateForExecution` + `rehashStateValue`) and native-v9 assembly (`assembleCallV9`) — productionized from the spike into `protocol` (decision D7).
- Contracts orchestration (MJS-02): subscribing to the protocol version, routing pre-fork v8-native calls unchanged, driving the keep-state path for pre-fork contracts post-fork, and leaving the v9-native path untouched (FR7).
- Migrating providers and provider interfaces to the unified APIs (MJS-03).
- Tests against both versions across all three packages, including across the transition.

### Out of scope
- Producing a v9-compiled contract variant — **no longer required by the model** (superseded dual-artifact approach, see Revision note). The framework never compiles contracts.
- Wallet-side keep-state migration. The Wallet SDK's `migrateState` is an unimplemented stub; the spike works around it by reconstructing the v9 wallet's dust/shielded state from the migrated on-chain state. That work belongs to the **Wallet SDK track**, not midnight-js — but the midnight-js e2e "post-fork transaction pays its v9 dust fee" depends on it (cross-team dependency, OQ7).
- Changes to the indexer/GraphQL schema — the `protocolVersion` field already exists and is consumed as-is.
- ZK-config providers (`node-zk-config-provider`, `fetch-zk-config-provider`) — confirmed ledger-agnostic; no changes.
- Any protocol version beyond v8/v9.
- Proof-server infrastructure changes outside the JS framework.

---

## 4. Architecture & Components

Three workstreams, layered by dependency. MJS-01 is foundational; MJS-02 and MJS-03 depend on it.

### 4.1 MJS-01 — `protocol` package: unified dispatch (foundational)

The `protocol` package gains both ledger implementations as dependencies and exposes a version-parameterised accessor rather than a fixed re-export.

**Seam asymmetry (v2).** The "v8 side" of the seam is **not** a mirror image of the v9 side. Pre-fork construct/decode uses `ledger-v8`; but the post-fork keep-state path executes circuits on the retained **compact-runtime 0.16 / onchain-runtime-v3** stack while assembling and submitting through **ledger-v9**. `getLedger`/`getOnchainRuntime` remain the accessor shape for the symmetric cases; the keep-state primitives (down-convert, assemble — D7) are additional `protocol` exports that *bridge* the two sides, not a third "version". The bridge is safe because the POJO layer (`EncodedStateValue`, transcript/`Op`/`AlignedValue`) is byte-identical across the packages (§1) — a bucket-(1) fact to be machine-checked where the type system allows (§4.3).

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
// Divergent → union or branded (see §4.3 buckets):
export type UnprovenTransaction = V8.UnprovenTransaction | V9.UnprovenTransaction;
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
export const getLedger = (version: LedgerVersion): LedgerModule => { ... };
export const getOnchainRuntime = (version: LedgerVersion): OnchainRuntimeModule => { ... };
```

- The returned object is a stable, typed facade (`LedgerModule`) covering the runtime symbols the framework actually uses (from the consumption map: `CostModel`, `ProvingProvider`, `parseHex*` decoders, `sample*` helpers, and the constructors behind `UnprovenTransaction`, `Intent`, `ContractDeploy`, `ContractCallPrototype`, etc.).
- Callers thread `version` in explicitly (FR2). No module-level mutable state.
- A consumer calls `getLedger` **only** where it previously referenced a runtime value; type-only sites are unaffected (see AC9).

**(c) Keep-state primitives (v2 — D7).** `protocol` additionally exports the productionized bridge primitives:

```ts
// v9-enveloped bytes → execution-ready ledger-8 ContractState (throws on malformed
// input, genuine cross-version decode failure, or a lost StateValue type — NFR1).
export const downcastV9StateForExecution = (bytes: Uint8Array): V8Exec.ContractState => { ... };
// Generic StateValue walk that rehashes every bounded Merkle tree (no-op for tree-free state).
export const rehashStateValue = (sv: V8Exec.StateValue): V8Exec.StateValue => { ... };
// Old-stack POJO transcript → native ledger-9 ContractCallPrototype/Intent/Transaction.
export const assembleCallV9 = (transcript: ..., ...): V9.Transaction => { ... };
```

These live in `protocol` because they bridge `ledger-v9` ↔ `onchain-runtime-v3` — exactly the implementation coupling NFR4/D2 confine to the `protocol` seam. `contracts` orchestrates them but never touches a ledger implementation directly. (This resolves the "down-convert primitive may live in `protocol` or `contracts` — decide during MJS-01" note on #1005.) Down-convert carries **only `.data`** (the `StateValue`): the spike established empirically that blank `.balance`/`.operations` are harmless — the ledger checks claimed unshielded spends against the real migrated on-chain state at apply, never against the local down-converted copy.

**Backward compatibility.** The existing subpath exports (`/ledger`, `/onchain-runtime`, …) are retained but re-point to the **default/current** version so existing static-type imports keep compiling. New version-aware behaviour is opt-in via `getLedger(version)`. This is a **breaking-ish** change managed by a major/beta bump; the ACL parity test (`protocol-acl.test.ts`) is extended to assert both version facades expose the required symbol set.

### 4.2 MJS-02 — `contracts` package: protocol-version orchestration (v2 — keep-state)

**Version sources.** The protocol version is a **per-block / per-record** property, not a session constant. Two distinct dispatch sources remain:
- **Read / decode paths** for **blocks/transactions/events** dispatch on the `protocolVersion` attached to the *specific* fetched record, mapped via `protocol.protocolVersionToLedger(...)`. Historical v8 records decode with v8 regardless of the current network head.
  - **Exception — contract state (v2):** fetched `ContractState` after the fork is *always* v9-enveloped (the protocol migrated it). It is decoded with the **current** version; the per-record rule does not apply to it.
- **Construct / submit paths** (deploy, call) build a *new* transaction whose version is **not yet on-chain**. These dispatch on a separately-sourced **network-head version** — the `protocolVersion` of the latest block from the `publicDataProvider`, or an explicit caller-supplied target version. Outbound construction never depends on reading its own not-yet-existing record.

**Execution-path selection.** `contracts` subscribes to the protocol version and routes each contract operation down exactly one of three paths:

| Network head | Contract | Path |
|---|---|---|
| v8 (pre-fork) | any (ledger-8) | **v8-native** — today's flow, routed unchanged |
| v9 (post-fork) | compiled for ledger-9 | **v9-native** — the default path, untouched (FR7) |
| v9 (post-fork) | deployed pre-fork, ledger-8 artifacts | **keep-state** (FR4, below) |

**The keep-state path** (per post-fork call on a pre-fork contract):
1. Fetch the migrated `ContractState` (v9 envelope) from the public data provider.
2. `downcastV9StateForExecution` (incl. `rehashStateValue`) → execution-ready ledger-8 state.
3. Execute the circuit on the retained ledger-8 stack (`createCircuitContext(downcastedState, …)` + invoke) → POJO transcript (`publicTranscript`, `privateTranscriptOutputs`, `input`, `output`).
4. `assembleCallV9` — feed the POJO transcript straight into a ledger-v9 `ContractCallPrototype` → `Intent` → `Transaction`. No re-encoding (byte-identical POJOs), no v8-tx carrier, no re-bind: the intent binding is v9-native from the start.
5. Prove — a **V2** proof, selected by the resolved verifier-key/IR tag. Ledger-9 dispatches it to the contract's preserved `co.v2` slot, replays the transcript, requires effects equality. Populating `v3`/`ir` or proving as V3 would fail verification (negative test, §9).

**Dual-artifact selection — removed (v2).** The former FR4/D6/AC4 design (accept `{ v8?: Contract; v9?: Contract }`, select by active version) is superseded by the 2026-07-23 rework of #1005: no v9-compiled variant exists in the model. Contract-interaction entry points keep accepting a single contract definition.

State read paths (`get-states`, `tx-model`, `ledger-utils`, `zswap-utils`) decode per FR6: per-record version for blocks/txs/events, current version for migrated contract state.

### 4.3 Handling type divergence between v8 and v9

The unified facade `LedgerModule` type is the contract between `protocol` and its consumers. A blanket "discriminated union per divergent symbol" does **not** scale: with ~15+ ledger symbols crossing the boundary, union types force every consumer to narrow (`if (version === 'v8')`) at every hop — pushing exhaustive branching into `contracts` *and* every provider, which contradicts FR5's "version-agnostic" goal, and a union flowing through `proveTx → balanceTx → submitTx` invites the `any`/`unknown` bridging NFR2 forbids.

Instead, **every boundary-crossing symbol is classified into exactly one of three buckets** (OQ3 must complete this classification before MJS-01 design freeze):

1. **Identical** — structurally the same across v8/v9. Exposed as a single shared type; **no union, stays version-agnostic.** Expected to be the common case. The keep-state POJO bridge types (`EncodedStateValue` / `impact-state-value[v2]`, transcript/`Op`/`AlignedValue` / `contract-transcript[v4]`) are known members of this bucket (spike-established byte-identity) — machine-check them with the `AssertEqual` mechanism of §4.1 where the `.d.ts` surfaces allow, and with round-trip fixtures where they don't.
2. **Divergent but opaque** — shape differs, but the framework never *reads* the divergent fields (the value flows through opaquely, e.g. an `UnprovenTransaction` handed from contracts to the proof provider). Modelled as an **opaque branded/nominal type carrying a `version` discriminant**, narrowed **only at the `protocol` seam** — never by consumers. Consumers stay version-agnostic.
   - **Security invariant (SEC-2): brand `version` == producing version == consuming version.** The `version` stamped at `wrap` time MUST be the version that actually produced/encoded the bytes, and MUST equal the version used downstream at `proveTx`/`balanceTx`/`submitTx`. The brand is a *label*, not a proof — so every seam that **unwraps** a bucket-(2) value MUST perform a **runtime** assertion comparing the carried `version` against the operation's requested version and throw a typed error (`{ cause }`, naming both) on mismatch. This is independent of the type-level brand (DEV-6 only checks the brand type-checks; it does not validate the runtime discriminant). It blocks a mis-stamped or cross-session-reused value (v8 bytes stamped `v9`, or a v8 `UnprovenTransaction` carried into a v9 construct path within one fork-window session) from silently reaching proving/signing and producing a proof against the wrong verifier key or a signature over mis-encoded data.
   - **Keep-state carve-out (v2):** the sanctioned keep-state composition (§4.2) is *not* a SEC-2 violation — its transcript POJOs are bucket-(1) byte-identical data entering a v9 transaction through the dedicated `assembleCallV9` seam, and its proof/verifier pairing is enforced by the ledger itself (V2 ↔ `co.v2`). SEC-2 guards every *other* cross-version flow.
3. **Divergent and read** — the framework actually reads divergent fields. **Only here** is a true discriminated union with an exhaustive `switch` justified. No `any`/`unknown` (NFR2).

Bucket (3) is the **KISS budget**: it must be kept as small as possible; a large bucket (3) signals the abstraction is wrong. Where a bucket-(3) symbol would surface in a public provider interface, the interface carries the version discriminant (see §4.4, gated on OQ3).

> The per-symbol classification is a discovery task during MJS-01 and a precondition of freeze (§8, OQ3).

**Bucket-(2) feasibility gate (DEV-6).** Branding two structurally-different WASM types under one nominal brand *often requires a cast*, which the repo forbids (NFR2). Before design freeze, produce **one worked end-to-end example** of a bucket-(2) symbol — brand type, seam `wrap` (stamps `version`), seam `unwrap`/narrow (reads it) — and demonstrate it type-checks with **no** `any`/`unknown` cast. State the expected per-symbol boilerplate and whether a shared generic brand helper absorbs it. **If it cannot be done without a cast, the bucket-(2) approach conflicts with NFR2 and must be revisited** (e.g. collapse into an explicit union handled at the seam).

### 4.4 MJS-03 — provider API updates

- `http-client-proof-provider` / `dapp-connector-proof-provider`: obtain `CostModel`, `ProvingProvider`, `UnprovenTransaction` via the unified accessor bound to the operation's version instead of importing from a single ledger.
- **Keep-state proving is hybrid (v2 — ownership OQ11).** For a keep-state transaction the proving legs route by key location (spike `contract-proving.ts`): the contract circuits prove with the **local, retained pre-fork keys** (producing V2 proofs against zkir-v2), while the native dust/zswap legs go to the proof server as usual. Whether this routing lands in MJS-02 (orchestration) or MJS-03 (proof providers) is OQ11 — decide before MJS-03 freeze.
- `indexer-public-data-provider` (`codec.ts`): the `parseHex*` decoders select the decoder for the version indicated by the accompanying `protocolVersion` metadata, rather than a fixed import. (Contract-state exception per FR6.)
**Known runtime-value site in `types`.** `types` is *not* purely type-only today: `packages/types/src/proof-provider.ts` imports `CostModel` as a **runtime value** and calls `CostModel.initialCostModel()` as a default parameter in `createProofProvider` (~line 67). Under the version-aware model this default cannot stand — it hard-codes one version. Resolution (chosen): **`createProofProvider` gains an explicit `version: LedgerVersion` parameter** and derives the cost model via `getLedger(version).CostModel.initialCostModel()`, consistent with the explicit-version decision (D1/FR2). This is a breaking signature change on `types`, called out here so it is planned, not discovered mid-implementation. Before MJS-01 freeze, **audit `types` for any other runtime ledger values** reaching it and apply the same treatment. This is the one place AC9's "type-only sites need no runtime call" does not apply — and it is why AC5 is *reduced-but-not-zero* breaking, not zero-breaking.

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
        ├─ network @ v8 (pre-fork) ─────────▶ v8-native build/execute path (routed unchanged)
        │
        └─ network @ v9 (post-fork)
             ├─ v9-native contract ─────────▶ default v9 path (untouched — FR7)
             │
             └─ pre-fork (ledger-8) contract — KEEP-STATE:
                  fetch migrated ContractState (v9 envelope)
                    │  downcastV9StateForExecution (+ rehashStateValue)
                    ▼
                  ledger-8 stack executes circuit ──▶ POJO transcript (byte-identical layer)
                    │  assembleCallV9 → ContractCallPrototype → Intent → Transaction (v9-native)
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

- **Residual risk — plausible-but-wrong (downgrade) version.** `protocolVersionToLedger` guards only against *unknown* ints; a malicious indexer reporting `v8` when the network head is actually `v9` (or vice-versa) is inside the closed `{v8, v9}` set and passes narrowing cleanly. On a **construct/submit** path this silently selects the attacker-chosen encoding/cost-model/proof shape — enabling a forced downgrade across the fork boundary, a proof/verifier-key mismatch, mis-encoded value fields, or a griefing tx the honest network rejects. In the keep-state model it can also mis-route a contract call down the wrong execution path (v8-native vs keep-state).
- **Mitigation stance (construct/submit path).** Before the network-head version selects outbound encoding or the execution path, **cross-check it against an independent signal** — e.g. the wallet / proof-server / DApp-connector's expected version, or a fork-height/block-height sanity check — and **fail-fast on disagreement** rather than trusting a lone indexer value. Decode/read of *historical* records still dispatches on the per-record version (a wrong value there mis-decodes and is caught by the decode-mismatch throw, §6.2), but outbound encoding must not rest on a single untrusted source. If cross-checking cannot land in the first slice, it is tracked as **OQ8** with an owner — not silently accepted under A1.

### 6.2 Error handling rules

- **Trust boundary.** `FinalizedTxData.protocolVersion` is typed `number` and originates from the indexer (A1 trusts it *only after* the §6.1 cross-check on outbound paths). `protocolVersionToLedger` is the **sole narrowing point** from that untyped `number` to the closed `LedgerVersion` set.
- **Unknown protocol version** (int not in the mapping table): `protocolVersionToLedger` throws a typed error naming the observed int and the supported set. No default. Within the v8/v9-only scope (YAGNI), **both** read and write paths throw — but the two are named distinctly so the *next* fork does not silently inherit brittle behaviour:
  - *Unknown version on a decode/read path* (indexer reports a newer version than the framework supports, e.g. v10 after the next fork): throw. Revisit this to a graceful "read-only degrade" only when a future version is actually in scope — flagged here so it is a conscious decision, not an accident (see D8).
  - *Unknown version on a construct/submit path*: always a hard throw — the framework must never build a transaction it cannot encode correctly.
- **Down-convert failure (v2)**: `downcastV9StateForExecution` throws on malformed input, a genuine cross-version decode failure, or a lost/unexpected `StateValue` type — it never silently returns a wrong or empty state (NFR1; matches the spike's documented behaviour).
- **Proof-version invariant (v2)**: the proof version is derived from the resolved verifier-key/IR tag, never hardcoded. Producing a V3 proof (or repopulating `v3`/`ir`) for a contract whose migrated key set is `co.v2`-only fails verification on-chain; the framework MUST select V2 in that case and MUST surface a typed error if the resolved key set matches no supported proof version.
- **Version/artifact mismatch**: requesting an operation that no available execution path supports (e.g. an unsupported key/IR tag, or a version outside the closed set) throws immediately, identifying both the requested version and what was actually available.
- **Decode mismatch**: attempting to decode v8-encoded bytes with the v9 decoder (or vice-versa) surfaces the underlying decoder error wrapped with `{ cause }`, adding the version context — never swallowed.
- All errors follow the repo convention: re-throw with `{ cause: error }`, no `catch { log(e) }`.
- **Error-content constraint (privacy).** These errors may reach the `loggerProvider` (Pino) and be shipped off-device. Messages and wrapped `cause` chains MAY include the version int, the supported version set, and artifact keys — but MUST NOT include decoded state contents, key material (signing/coin/encryption keys), or raw payload bytes. For diagnostics use only lengths/offsets/type names. Applies especially to wrapped decoder errors over `ContractState`/`ZswapChainState`/`Transaction`.

### 6.3 Observability (QA-4)

Throws catch the *failing* cases; the dangerous §6.1 downgrade is a plausible-but-wrong version that **passes narrowing without throwing** and leaves no trail. Positive-path breadcrumbs are therefore required for post-hoc diagnosis:

- Every version-dispatch decision — record **decode**, network-**head** resolution, **execution-path selection** (v8-native / v9-native / keep-state), and **construct/submit** encoding — MUST emit a debug/trace-level `loggerProvider` breadcrumb recording the selected `LedgerVersion` (and path), the **source** (per-record vs network-head vs explicit), and the raw `protocolVersion` int.
- These breadcrumbs are subject to the §6.2 privacy constraint (no payload/keys). They are the mechanism by which a wrong-dispatch that produced a rejected-on-chain transaction is diagnosed after the fact.

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
| D7 | **Keep-state primitives live in `protocol`** (`downcastV9StateForExecution`, `rehashStateValue`, `assembleCallV9`); `contracts` orchestrates only. | The primitives bridge `ledger-v9` ↔ `onchain-runtime-v3` — implementation coupling that NFR4/D2 confine to the `protocol` seam. Resolves the placement question deferred to MJS-01 by #1005. |
| D8 | **Support-window policy: current + previous** — proposed as standing policy, pending team confirmation (**OQ10**). Split by direction: **construct/submit** = current only (previous accepted until fork height); **decode/read** = current + previous; **proof verification** (V2 against preserved `co.v2`) = a *ledger* policy the framework depends on but does not control. | Matches market practice (Cosmos-style N-1 for writes; longer windows only for reads). Keeps dependency, bundle and test-matrix growth bounded — implies dropping v8 when v10 enters scope. Keep-state soundness rests on fork-specific facts (byte-identity, key preservation, V2 acceptance) and MUST be re-validated per fork (a spike is the playbook), never assumed. |

---

## 8. Open Questions & Assumptions

- **OQ1 — BLOCKER (owner: TBD ledger/protocol team; resolve-by: TBD, before MJS-01 merge):** What is the concrete mapping from the numeric `protocolVersion` returned by the indexer to `v8` / `v9`? (Exact int values / ranges, and the fork-boundary value.) This is the top project risk: MJS-01 is foundational and blocks MJS-02/03 (15–25 pd total), so an unanswered OQ1 stalls all three workstreams.
  - **Interim strategy:** the mapping lives solely behind `protocolVersionToLedger`. The rest of MJS-01 (both-version facades, dispatch plumbing, tests using an injected/provisional mapping) can proceed against a stub. **No MJS-01 code that depends on the concrete int→version mapping may merge until OQ1 is answered.**
- **OQ2 — RESOLVED (v2, spike pins; re-confirm at implementation — RC tags churn):** Ledger v8 = `@midnight-ntwrk/ledger-v8@8.0.3` (proving path; `8.1.0` for the type surface, aliased in the spike) + **onchain-runtime-v3**; the keep-state execution stack is compact `0.31.1` / compact-runtime `0.16.0`. v9 = `@midnightntwrk/ledger-v9@1.0.0-rc.3` / `onchain-runtime-v4@4.0.0-rc.3`. Note the org-scope discrepancy (`@midnight-ntwrk` vs `@midnightntwrk`) — confirm the canonical scope when pinning.
- **OQ3:** Which ledger symbols **diverge structurally** between v8 and v9 (vs. identical)? Determines the size of the discriminated-union surface in §4.3. The spike pre-answers part of it: `EncodedStateValue` and the transcript POJO layer are bucket-(1).
- **OQ4 — RESOLVED (v2, reformulated):** The original question ("can a single logical transaction span both versions?") assumed any intra-tx version mix is a hazard to reject. The keep-state model **requires exactly one sanctioned cross-version composition**: a ledger-8 execution transcript wrapped in a native ledger-9 transaction with a V2 proof (§4.2). The security gate is therefore inverted: the seam MUST reject any intra-tx version mix **other than** the sanctioned keep-state composition (negative test, §9). The sanctioned path itself is sound because the transcript/state-data layer is byte-identical (bucket-1) and the ledger enforces the V2 ↔ `co.v2` proof/key pairing at verification.
- **OQ5 (owner: TBD product/PO):** What is the network fork date/height? Needed to prioritise the minimum shippable slice (§11) against the deadline.
- **OQ6 — gates the `getLedger` signature (owner: TBD; before MJS-01 freeze):** Do the `ledger-v8`/`ledger-v9` packages instantiate WASM **synchronously or asynchronously**? The answer selects resolution (a)/(b)/(c) in NFR6 and determines whether the accessor is sync or `Promise`-returning — a decision that ripples through every consumer, so it must be settled before the accessor is designed.
- **OQ7 — CONFIRMED REAL (v2; owner: Wallet SDK track):** Wallet state is **not** version-invariant in practice: the Wallet SDK's `migrateState` is an unimplemented stub, and the spike had to reconstruct the v9 wallet's dust/shielded state from the migrated on-chain state (the migration emits no wallet events). This is Wallet SDK scope, not midnight-js — but the midnight-js e2e "post-fork transaction pays its v9 dust fee" **depends on it**. Track as a cross-team dependency with an owner; without it the cross-fork e2e cannot pass against a real wallet.
- **OQ8 — SECURITY, downgrade cross-check (owner: TBD):** What independent signal is used to cross-check the indexer's network-head `protocolVersion` on construct/submit paths (§6.1)? If none is available in the first slice, this is the explicitly-accepted residual risk to be closed before broad rollout.
- **OQ9 — PARTIALLY RESOLVED (v2):** Fixture provenance: the spike (`island-1/2/3`) is the canonical source of v8+v9 fixtures — reproducible generators (ledger-8 encoders, migrated-state dumps) already exist there. Remaining work: port/mint them into this repo per §9 (preferred: devDependency generators; fallback: committed golden hex). Still blocks the decode/round-trip test slice until ported.
- **OQ10 — support-window policy confirmation (v2; owner: team/PO):** Is "current + previous" (D8) confirmed as the standing policy? Asked on [#1005](https://github.com/midnightntwrk/midnight-js/issues/1005#issuecomment-5166550550). Until answered, D8 is a proposal.
- **OQ11 — hybrid-proving ownership (v2; owner: TBD; before MJS-03 freeze):** Keep-state proving routes by key location — contract circuits prove locally with retained pre-fork keys (V2), native dust/zswap legs via the proof server (§4.4). Does this routing land in MJS-02 (contracts orchestration) or MJS-03 (proof providers)?

**Freeze-gate done-definitions (QA-6).** Each "before-freeze" gate closes only when a concrete artifact is merged and its test is green:
- **OQ1** → the concrete int→version map committed behind `protocolVersionToLedger`, with a table test.
- **OQ3** → a checked-in `symbol-buckets.md` (or a typed const) enumerating every boundary-crossing symbol with its bucket (1/2/3), referenced by the ACL test's per-version lists.
- **OQ4** → *(resolved)* the sanctioned keep-state composition documented (§4.2) + the reject-other-mixes throw path with its negative test.
- **OQ6** → the documented sync/async answer plus the chosen NFR6 resolution (a/b/c) recorded inline.
- **DEV-6** → a compiling `bucket2-brand.example.ts` (or type-level test) that CI type-checks with **no** `any`/`unknown` cast.
- **OQ9** → the v8+v9 fixtures (or their generators, ported from the spike) committed and consumed by the round-trip test.
- **OQ10** → the policy answer recorded in D8 (proposal → decision).
- **OQ11** → the ownership decision recorded in §4.4 before MJS-03 freeze.
- **A1 (assumption):** The indexer reliably tags every block/tx/event with a correct `protocolVersion`; the framework trusts it as the source of truth (subject to the §6.1 cross-check).
- **A2 (assumption, revised v2):** The dApp retains its pre-fork toolchain outputs unchanged — compiled artifacts, prover/verifier keys, and the old runtime. The framework never compiles contracts and never mutates artifacts. *(The v1 form of A2 — "both contract artifacts are supplied by the dApp" — is superseded with FR4.)*

---

## 9. Testing Strategy

Per repo convention: tests written first (TDD), Arrange-Act-Assert, meaningful negative scenarios, strict equality assertions, both versions exercised (NFR5).

**Fixture provenance (QA-1) — precondition of the MJS-01 test slice, gated with OQ2/OQ9.** The repo is currently v9-only, so a v8-encoded payload does not exist here yet. Every round-trip, decode-mismatch, and cross-fork test depends on canonical v8 *and* v9 fixtures — **and (v2) on a migrated-state fixture** (a `ContractState` in the v9 envelope whose data originated pre-fork) for the keep-state tests. Provenance:
- **Preferred:** port the spike's generators — install `@midnight-ntwrk/ledger-v8` (and onchain-runtime-v3) as a **devDependency** and mint fixtures at test time via its `sample*`/encoders; same for v9; produce the migrated-state fixture via the spike's migrate flow (or a captured dump). Fixtures are then reproducible, not opaque blobs.
- **Fallback:** commit **golden hex fixtures** captured from the spike / a v8 network, each stored with its `protocolVersion` int.
- "v8 + migrated-state fixtures available" is a named precondition (**OQ9**) blocking the decode/round-trip/keep-state test slices.

**Test levels (QA-5).** Each scenario is explicitly placed:
- **Unit (vitest):** fixture round-trip, dispatch/path selection, down-convert, and *all* negative throw paths (unknown version, unsupported key/IR tag, decode mismatch, brand-version mismatch, downgrade cross-check, unsanctioned intra-tx mixing, V3-vs-`co.v2`). Authoritative pre-fork gate.
- **Docker integration:** `indexer-public-data-provider` codec against a real indexer response carrying `protocolVersion`.
- **e2e testkit:** full deploy/call flow. The **fork-boundary e2e** (keep-state call on a pre-fork contract post-fork) generally **cannot run pre-fork** against a live network at the fork height; pre-fork it is exercised via migrated-state fixtures at unit/integration level, which are the authoritative gate until a fork-height network is available.

- **protocol (MJS-01):**
  - `protocolVersionToLedger` maps known ints correctly (both versions) and **throws** on unknown ints (negative).
  - `getLedger('v8')` / `getLedger('v9')` each return a facade exposing the full required symbol set. Extend `protocol-acl.test.ts` with **two per-version expected symbol lists** (v8 and v9 may legitimately differ — these lists are **blocked on OQ3**). A single shared list is explicitly avoided — it would collapse to the intersection and weaken the guarantee. Split the assertion into: **(a) runtime** key-set equality via strict `toEqual` on sorted keys — against the facade's **complete** exported key set, not merely "contains the required symbols" (a required-*subset* framing would let a leaked/extra export on one version pass, reproducing the one-directional-assertion anti-pattern the repo forbids); **(b) compile-time** — each version facade is assignable to the unified `LedgerModule` type (a type-level assertion; `toEqual` on keys cannot see type drift). The bucket-(1) identity assertions (§4.1a) cover the shared-type side.
  - **Down-convert (v2, D7):** round-trip — a migrated-state fixture down-converts to an execution-ready ledger-8 `ContractState` whose `StateValue` equals the pre-migration reference; negative — malformed bytes / lost `StateValue` type **throws**; Merkle case — a tree-bearing fixture's root is readable after down-convert (i.e. `rehashStateValue` ran), and a deliberately non-rehashed decode **throws** on root access (validates the rehash step is load-bearing, not decorative).
  - **Sourcing guardrail (DEV-5):** a negative test asserting a **construct/submit** path derives its version from `networkHeadVersion(...)` and **not** from the record being constructed (which does not exist yet).
  - **Brand-version invariant (SEC-2):** a negative test where a branded **v8** value is fed into a **v9**-bound proof/submit seam *outside* the sanctioned keep-state composition — it MUST throw at the seam, not silently proceed.
  - **Downgrade cross-check (SEC-1):** a negative test where the indexer network-head version disagrees with the independent signal — the construct/submit path MUST fail-fast rather than encode with the indexer-reported version.
  - Round-trip: a value sampled/encoded by v8 decodes via the v8 facade and **fails** via the v9 facade (negative).
    - **Determinism (QA-9):** cross-decoding is only a valid negative test if it *deterministically* fails. WASM decoders may instead emit garbage or a structurally-valid-but-wrong object (likely for bucket-(1) "identical" shapes). The test must assert a concrete failure signal — a thrown error where the decoder throws, otherwise a round-trip inequality (decoded→re-encoded bytes ≠ original) or a discriminant/checksum check. Where the decoder does not throw, the framework MUST add its own version-discriminant validation at the seam rather than relying on the decoder. Flag as a discovery item alongside OQ3 (identical shapes are exactly where cross-decode may not throw).
- **contracts (MJS-02, v2):**
  - Given a `publicDataProvider` reporting v8, contract flows build/decode via the v8-native path; reporting v9 with a v9-native contract, via the default v9 path.
  - **Keep-state positive:** a contract "deployed" pre-fork (migrated-state fixture + retained ledger-8 artifacts) accepts a new call post-fork — down-convert → old-stack execution → `assembleCallV9` → V2 proof — with **no recompilation and no v9 variant** involved anywhere in the flow.
  - **Proof-version negative:** a V3 proof / repopulated `v3`/`ir` against the preserved `co.v2` key **fails verification** (matches the #1005 AC).
  - **v9-native non-regression (FR7):** the v9-native deploy/call suite passes unchanged under the dual-version code — strict behavioural equality with the pre-change baseline, not merely "still green".
  - **Pre-fork routing:** with the network at v8, calls take the v8-native path unchanged (no down-convert, no assembly wrapping).
  - **Unsanctioned mixing (OQ4):** assembling a transaction that mixes versions in any way *other than* the sanctioned keep-state composition **throws** a typed error at the seam.
- **providers (MJS-03):**
  - Proof providers request `CostModel`/`ProvingProvider` for the correct version; keep-state proving selects **V2 by the resolved verifier-key/IR tag** (never hardcoded) and routes contract-circuit legs to local keys vs native legs to the server (placement per OQ11).
  - `indexer-public-data-provider` `codec` decodes v8- and v9-tagged payloads correctly and **throws** on a version/payload mismatch (negative).
- **Backward compatibility (AC8):** a consumer using only the legacy default-version subpath imports still compiles and produces identical results — i.e. the retained subpath exports (D3) behave exactly as before the change.
- **Cross-cutting:** the fork-boundary scenario — within one session: read v8 historical records, execute a keep-state call against a pre-fork contract, and run a v9-native flow, all succeeding side by side.
- **Single WASM init (AC10, QA-3):** WASM instantiation routes through an injectable/memoised internal `initOnce(version)` the test can spy on. Assert: `getLedger('v9')` triggers exactly one init; a second `getLedger('v9')` triggers zero; with `getLedger('v8')` never called, the v8 init count is 0. Assertion form depends on OQ6 (sync vs async) — marked blocked accordingly.
- **No unsafe casts (AC6, QA-2):** enforced by mechanism, not review judgment — ESLint `@typescript-eslint/no-explicit-any` plus a grep/lint gate rejecting `as unknown`. CI-enforced.
- **Type-only sites (AC9, QA-2):** an AST/grep assertion that no site importing a symbol purely as a type also calls `getLedger` for it — accessor calls occur only where a runtime value is used.

---

### 9.1 AC → test traceability (QA-2)

Every acceptance criterion maps to a concrete verification. No AC without a test; no orphan test.

| AC | Verified by |
|----|-------------|
| AC1 | `getLedger('v8'\|'v9')` return facades; ACL per-version key-set + `LedgerModule` assignability |
| AC2 | Negative: unknown int throws on **decode/read** path *and* on **construct/submit** path (the two §6.2-named paths, asserted separately); unsupported key/IR tag throw; down-convert failure throw |
| AC3 | contracts routes v8-native / v9-native / keep-state per reported version; fork-boundary cross-cutting test |
| AC4 | Keep-state positive e2e (no recompile, no v9 variant); V3-vs-`co.v2` negative; unsanctioned-mixing negative |
| AC5 | Providers/`types` operate via unified APIs (both); `createProofProvider` version-param migration test; V2-by-key-tag proving test |
| AC6 | ESLint `no-explicit-any` + grep gate on `as unknown` (CI-enforced) |
| AC7 | Both-version coverage across dispatch paths; `yarn lint` + build + vitest green |
| AC8 | Backward-compat: legacy v9 subpath imports compile + behave identically |
| AC9 | AST/grep: no type-only import site calls `getLedger` |
| AC10 | Spy on `initOnce(version)`: exactly one init for the active version, zero for the inactive (blocked on OQ6) |
| AC11 | v9-native non-regression suite: behavioural equality with pre-change baseline |

## 10. Acceptance Criteria

- **AC1** — `protocol` exposes unified, version-parameterised APIs that operate for both v8 and v9; internal dispatch selects the correct implementation. (FR1, FR2)
- **AC2** — Unknown/unsupported protocol versions, unsupported key/IR tags, and down-convert failures throw typed errors with no silent fallback. (NFR1)
- **AC3** — `contracts` reads the protocol version from the public data provider and routes each operation down exactly one path (v8-native / v9-native / keep-state); contract flows succeed against both v8 and v9, including across the fork boundary. (FR3, FR6)
- **AC4** — **Keep-state (replaces v1 dual-artifact AC):** a contract deployed under ledger-8 accepts a **new transaction after the fork with no recompilation and no v9 contract variant**; post-fork calls verify against the preserved `co.v2` key (negative: a V3 proof / repopulated `v3`/`ir` fails verification); any unsanctioned cross-version mix fails fast. (FR4, matches the reworked #1005 ACs)
- **AC11** — **Native ledger-9 execution is not impaired:** v9-native call/deploy flows behave exactly as before the dual-version changes — verified by a non-regression suite, not by absence of complaints. (FR7, matches #1005)
- **AC8** — **No regression for existing single-version dApps:** existing default-version (v9) subpath imports (`/ledger`, `/onchain-runtime`) continue to compile and behave identically; a consumer that adopts none of the version-aware APIs sees no behavioural change. (D3)
- **AC9** — **Type-only sites need no runtime call:** every consumer that referenced a ledger symbol purely as a type keeps a `import type` and calls no accessor; `getLedger` is invoked only where a runtime value was previously used. The known exception (`createProofProvider`, §4.4) is migrated deliberately, not left as a hidden runtime import. (§4.1a/b)
- **AC10** — **Single WASM init:** a single-version consumer incurs exactly one ledger WASM instantiation; the inactive version is not instantiated until first `getLedger(thatVersion)`. (NFR6)
- **AC5** — Provider APIs and `types` provider interfaces operate via the unified APIs for both versions with no direct single-version coupling; `types` gains no ledger-implementation dependency. The one known runtime-value site (`createProofProvider` / `CostModel.initialCostModel()`) is migrated to an explicit `version` parameter (§4.4). Keep-state proving selects the proof version by key/IR tag. (FR5, NFR4)
- **AC6** — No `any`/`unknown` casts introduced; divergent types modelled explicitly. (NFR2)
- **AC7** — Both-version coverage exists for every dispatch path; `yarn lint` clean, build succeeds, tests pass. (NFR5)

---

## 11. Rollout & Versioning

- **Fork deadline (business driver):** this is a hard-fork migration with a network fork date/height — see **OQ5**. Delivery must be prioritised against it.
- **Minimum shippable slice before the fork (v2):** the keep-state capability — *a pre-fork (ledger-8) contract accepts a post-fork call (down-convert → old-stack execution → native v9 tx → V2 proof), the v9-native path is untouched, and v8 historical records decode* — the §9 cross-cutting scenario. Everything required for that path must ship before the fork height or pre-fork dApps break on-chain; refinements (e.g. exhaustive divergent-type coverage) can follow.
- **Support window (D8/OQ10):** current + previous, dropped forward at the next fork — pending confirmation on #1005. Keep-state soundness is re-validated per fork via a spike (the §8 freeze-gate list is the reusable playbook); it is never assumed to transfer.
- **Silent-default-downgrade audit (SEC-4).** The v9-pinned default subpath (D3) does not fail-fast, so an un-migrated **runtime-value** call site silently operates at v9 while the data may be v8. Before the fork height, enumerate every remaining runtime-value import from the default subpath and confirm each is genuinely single-version-safe; any runtime-value site on a cross-fork path MUST migrate to explicit `getLedger(version)`. Add a lint/grep gate flagging runtime-value imports from the default subpath so a silent-default downgrade cannot ship unreviewed. (Type-only default imports are unaffected.)
- Coordinated change touching `protocol` → `contracts`/providers/`types` in the correct dependency order; providers and contracts land only after the `protocol` accessor is published.
- Public API change → major/beta version bump on affected packages, per repo release conventions.
- Retaining default-version subpath exports (D3) keeps the blast radius on consuming dApps to opt-in adoption of the version-aware paths.
- **Wallet SDK dependency (OQ7):** the cross-fork e2e "post-fork tx pays its v9 dust fee" cannot pass until the Wallet SDK ships `migrateState` (or the reconstruct-from-on-chain equivalent). Track jointly; do not let it silently gate the midnight-js slice at the fork height.
