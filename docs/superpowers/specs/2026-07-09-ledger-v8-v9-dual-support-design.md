# Design Spec — Simultaneous Ledger v8 / v9 Support in Midnight.js

**Status:** Draft (spec review in progress)
**Date:** 2026-07-09
**Author:** Systems architecture (spec workflow)
**Source issues:**
- [#1004 — MJS-01 protocol package: unified v8/v9 dispatch APIs](https://github.com/midnightntwrk/midnight-js/issues/1004)
- [#1005 — MJS-02 contracts package: protocol-version orchestration](https://github.com/midnightntwrk/midnight-js/issues/1005)
- [#1006 — MJS-03 provider API updates to unified APIs](https://github.com/midnightntwrk/midnight-js/issues/1006)

Part of the **Ledger v8→v9 Hard Fork Migration** (SOW-Q3-10 / product#119).

---

## 1. Problem & Why

The Midnight blockchain is undergoing a hard fork from Ledger protocol **v8** to **v9**. During the transition window, the network — and therefore any dApp built on Midnight.js — must interoperate with **both** protocol versions simultaneously:

- Historical blocks/transactions on-chain are encoded with **v8**.
- New blocks past the fork height are encoded with **v9**.
- A single dApp session may read v8 state and submit v9 transactions (or vice-versa) across the fork boundary.

Today the framework is hard-pinned to a single ledger version. The `@midnight-ntwrk/midnight-js-protocol` package is a thin re-export facade wired exclusively to `@midnightntwrk/ledger-v9` and `@midnightntwrk/onchain-runtime-v4`:

```ts
// packages/protocol/src/ledger.ts
export * from '@midnightntwrk/ledger-v9';
// packages/protocol/src/onchain-runtime.ts
export * from '@midnightntwrk/onchain-runtime-v4';
```

Every downstream package (`contracts`, `types`, proof providers, `indexer-public-data-provider`) imports ledger types transitively through this facade. There is **no runtime version selection** anywhere in the framework. A dApp built against this cannot decode v8 data once the network is on v9, and cannot have been built against v8 while producing v9 transactions.

**Goal:** introduce a version-aware protocol layer so the framework can decode, construct, and submit transactions against either ledger version, selecting the correct implementation at runtime based on the protocol version reported by the network.

---

## 2. Requirements

### Functional
- **FR1** — The `protocol` package MUST expose a unified API surface that can operate against either Ledger v8 or v9, dispatching internally to the correct version-specific implementation.
- **FR2** — Version selection MUST be **explicit**: unified APIs receive the target protocol version as an argument (or via a version-bound accessor object). No hidden mutable global drives dispatch. (Decision — see §7.)
- **FR3** — The `contracts` package MUST determine the active protocol version from the public data provider (the indexer already returns `protocolVersion` on blocks/transactions/events) and orchestrate dispatch accordingly, so contract flows remain correct across the fork.
- **FR4** — The `contracts` package MUST support accepting **two contract artifacts** (a v8-compatible and a v9-compatible definition) and selecting the one matching the active protocol version at dispatch time. Minimal/dispatch-only treatment (see §5, Out of scope).
- **FR5** — Provider APIs (`http-client-proof-provider`, `dapp-connector-proof-provider`, `indexer-public-data-provider`, and the provider interfaces in `types`) MUST consume the unified protocol APIs so they are version-agnostic; direct coupling to a single ledger version is removed.
- **FR6** — Serialization/deserialization of on-chain data (`ContractState`, `ZswapChainState`, `LedgerParameters`, `Transaction`) MUST decode data with the version that produced it, not a fixed version.

### Non-functional
- **NFR1 — Fail fast.** An unknown/unsupported protocol version, or a version-mismatch between a decoded artifact and the requested operation, MUST throw a clear, typed error immediately — never silently fall back to a default version.
- **NFR2 — Type safety.** No `any` casts and no `unknown` bridging to paper over v8/v9 type differences. Divergences are modelled explicitly (see §4.3).
- **NFR3 — KISS / YAGNI.** Only the two live versions (v8, v9) are supported. No generic "N-version" plugin framework.
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
- Adding `@midnightntwrk/ledger-v8` (+ its matching `onchain-runtime`) as a second dependency of the `protocol` package, alongside v9.
- A version-dispatch mechanism in `protocol` (MJS-01).
- Contracts orchestration: reading protocol version from the public data provider and dispatching (MJS-02), including dual-artifact selection (dispatch-only).
- Migrating providers and provider interfaces to the unified APIs (MJS-03).
- Tests against both versions across all three packages.

### Out of scope
- The Compact **compilation/packaging** story for producing two contract artifacts (v8 + v9). This spec assumes both artifacts are supplied to the framework; how they are produced is a separate concern.
- Changes to the indexer/GraphQL schema — the `protocolVersion` field already exists and is consumed as-is.
- ZK-config providers (`node-zk-config-provider`, `fetch-zk-config-provider`) — confirmed ledger-agnostic; no changes.
- Any protocol version beyond v8/v9.
- Wallet/proof-server infrastructure changes outside the JS framework.

---

## 4. Architecture & Components

Three workstreams, layered by dependency. MJS-01 is foundational; MJS-02 and MJS-03 depend on it.

### 4.1 MJS-01 — `protocol` package: unified dispatch (foundational)

The `protocol` package gains both ledger implementations as dependencies and exposes a version-parameterised accessor rather than a fixed re-export.

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

**Backward compatibility.** The existing subpath exports (`/ledger`, `/onchain-runtime`, …) are retained but re-point to the **default/current** version so existing static-type imports keep compiling. New version-aware behaviour is opt-in via `getLedger(version)`. This is a **breaking-ish** change managed by a major/beta bump; the ACL parity test (`protocol-acl.test.ts`) is extended to assert both version facades expose the required symbol set.

### 4.2 MJS-02 — `contracts` package: protocol-version orchestration

- The protocol version is a **per-block / per-record** property, not a session constant (that is the whole point of the fork window). Two distinct dispatch sources:
  - **Read / decode paths** dispatch on the `protocolVersion` attached to the *specific* fetched record (the block/tx/event/state being decoded), mapped via `protocol.protocolVersionToLedger(...)`. Historical v8 records decode with v8 regardless of the current network head.
  - **Construct / submit paths** (deploy, call) build a *new* transaction whose version is **not yet on-chain** and therefore not readable from any indexer record. These dispatch on a separately-sourced **network-head version** — the `protocolVersion` of the latest block from the `publicDataProvider`, or an explicit caller-supplied target version. This closes the bootstrapping gap: outbound construction never depends on reading its own not-yet-existing record.
- `contracts` maps the resolved int to a `LedgerVersion` via `protocol.protocolVersionToLedger(...)` and calls the unified accessors with that version when assembling/decoding transactions and state.
- **Dual-artifact selection (FR4):** the contract-interaction entry points accept a v8-compatible and a v9-compatible contract definition; the active protocol version selects which is used for a given operation. If only one is supplied and it does not match the active version, fail fast (NFR1).
  - **API shape (DEV-8):** the entry points accept a **partial record keyed by version**, e.g. `{ v8?: Contract; v9?: Contract }`, rather than a positional pair or array. Rationale: a single-version dApp passes just one key (`{ v9: myContract }`) and existing single-contract call sites degrade cleanly — they are not forced to wrap. Selection reads the active `LedgerVersion`; if that version's key is absent, throw a typed error naming **both** the requested version and the keys actually supplied. (An overload accepting today's bare `Contract` may be retained as sugar for the single-version case, treated as `{ <defaultVersion>: contract }`.)
- State read paths (`get-states`, `tx-model`, `ledger-utils`, `zswap-utils`) decode using the version that produced the data (FR6), not a fixed version.

### 4.3 Handling type divergence between v8 and v9

The unified facade `LedgerModule` type is the contract between `protocol` and its consumers. A blanket "discriminated union per divergent symbol" does **not** scale: with ~15+ ledger symbols crossing the boundary, union types force every consumer to narrow (`if (version === 'v8')`) at every hop — pushing exhaustive branching into `contracts` *and* every provider, which contradicts FR5's "version-agnostic" goal, and a union flowing through `proveTx → balanceTx → submitTx` invites the `any`/`unknown` bridging NFR2 forbids.

Instead, **every boundary-crossing symbol is classified into exactly one of three buckets** (OQ3 must complete this classification before MJS-01 design freeze):

1. **Identical** — structurally the same across v8/v9. Exposed as a single shared type; **no union, stays version-agnostic.** Expected to be the common case.
2. **Divergent but opaque** — shape differs, but the framework never *reads* the divergent fields (the value flows through opaquely, e.g. an `UnprovenTransaction` handed from contracts to the proof provider). Modelled as an **opaque branded/nominal type carrying a `version` discriminant**, narrowed **only at the `protocol` seam** — never by consumers. Consumers stay version-agnostic.
   - **Security invariant (SEC-2): brand `version` == producing version == consuming version.** The `version` stamped at `wrap` time MUST be the version that actually produced/encoded the bytes, and MUST equal the version used downstream at `proveTx`/`balanceTx`/`submitTx`. The brand is a *label*, not a proof — so every seam that **unwraps** a bucket-(2) value MUST perform a **runtime** assertion comparing the carried `version` against the operation's requested version and throw a typed error (`{ cause }`, naming both) on mismatch. This is independent of the type-level brand (DEV-6 only checks the brand type-checks; it does not validate the runtime discriminant). It blocks a mis-stamped or cross-session-reused value (v8 bytes stamped `v9`, or a v8 `UnprovenTransaction` carried into a v9 construct path within one fork-window session) from silently reaching proving/signing and producing a proof against the wrong verifier key or a signature over mis-encoded data.
3. **Divergent and read** — the framework actually reads divergent fields. **Only here** is a true discriminated union with an exhaustive `switch` justified. No `any`/`unknown` (NFR2).

Bucket (3) is the **KISS budget**: it must be kept as small as possible; a large bucket (3) signals the abstraction is wrong. Where a bucket-(3) symbol would surface in a public provider interface, the interface carries the version discriminant (see §4.4, gated on OQ3).

> The per-symbol classification is a discovery task during MJS-01 and a precondition of freeze (§8, OQ3).

**Bucket-(2) feasibility gate (DEV-6).** Branding two structurally-different WASM types under one nominal brand *often requires a cast*, which the repo forbids (NFR2). Before design freeze, produce **one worked end-to-end example** of a bucket-(2) symbol — brand type, seam `wrap` (stamps `version`), seam `unwrap`/narrow (reads it) — and demonstrate it type-checks with **no** `any`/`unknown` cast. State the expected per-symbol boilerplate and whether a shared generic brand helper absorbs it. **If it cannot be done without a cast, the bucket-(2) approach conflicts with NFR2 and must be revisited** (e.g. collapse into an explicit union handled at the seam).

### 4.4 MJS-03 — provider API updates

- `http-client-proof-provider` / `dapp-connector-proof-provider`: obtain `CostModel`, `ProvingProvider`, `UnprovenTransaction` via the unified accessor bound to the operation's version instead of importing from a single ledger.
- `indexer-public-data-provider` (`codec.ts`): the `parseHex*` decoders select the decoder for the version indicated by the accompanying `protocolVersion` metadata, rather than a fixed import.
**Known runtime-value site in `types`.** `types` is *not* purely type-only today: `packages/types/src/proof-provider.ts` imports `CostModel` as a **runtime value** and calls `CostModel.initialCostModel()` as a default parameter in `createProofProvider` (~line 67). Under the version-aware model this default cannot stand — it hard-codes one version. Resolution (chosen): **`createProofProvider` gains an explicit `version: LedgerVersion` parameter** and derives the cost model via `getLedger(version).CostModel.initialCostModel()`, consistent with the explicit-version decision (D1/FR2). This is a breaking signature change on `types`, called out here so it is planned, not discovered mid-implementation. Before MJS-01 freeze, **audit `types` for any other runtime ledger values** reaching it and apply the same treatment. This is the one place AC9's "type-only sites need no runtime call" does not apply — and it is why AC5 is *reduced-but-not-zero* breaking, not zero-breaking.

- `types` provider interfaces (`public-data-provider.ts`, `proof-provider.ts`, `wallet-provider.ts`, `midnight-types.ts`): reference the unified facade types. **Changing `types` breaks every downstream package (a coordinated breaking change), so its surface change is kept minimal and conditional:** a version discriminant is introduced into a provider interface **only if OQ3 confirms a divergent symbol actually surfaces at that interface boundary**. If no divergent symbol reaches the provider interface, `types` changes reduce to referencing unified facade types with **no discriminant** — no breaking change. `types` MUST NOT gain a dependency on a ledger implementation (NFR4) — it depends only on `protocol`'s type surface.

---

### 4.5 Developer ergonomics & guardrails

`getLedger(version)` is the **low-level seam**. On its own it is a footgun: nothing in the type system ties `version` to the data being operated on, so a developer can call `getLedger('v9')` to decode a v8 record and only find out via the runtime decode-mismatch throw (§6). Two ergonomic layers keep app code safe:

- **Version binding (DEV-4).** A `bindLedger(version)` helper returns a version-bound facade object once (`{ CostModel, decode, … }`), so call sites do not re-pass a literal `'v9'` everywhere (which invites stale copy-paste). Most application code uses a bound facade — typically obtained from a `contracts`-level helper that derives the version from the fetched record and hands back an already-bound facade — and rarely touches raw `getLedger`.
- **Distinct sourcing helpers (DEV-5).** The two version sources of §4.2 are made **syntactically distinct at the API level**, not just prose, so a wrong pairing is visible in review:
  - `versionOfRecord(record)` — derives the version from a fetched record, for **read/decode** paths.
  - `networkHeadVersion(publicDataProvider)` — reads the latest block's version, for **construct/submit** paths.

  Because the read and construct paths call different helpers, decoding a historical v8 record with the network-head version (or building an outbound tx from a stale per-record version) becomes a spot-the-wrong-call error rather than a silent mis-encode.

## 5. Data Flow

Transaction / state resolution across the fork:

```
Network/indexer  ──protocolVersion:int──▶  publicDataProvider
                                              │
                              contracts reads protocolVersion
                                              │
                        protocol.protocolVersionToLedger(int) ─▶ LedgerVersion (v8 | v9)
                                              │
        ┌─────────────────────────────────────┼─────────────────────────────────────┐
        ▼                                       ▼                                      ▼
 contracts: select v8/v9         providers: getLedger(version)          decode state/tx with the
 contract artifact + build tx     for CostModel / decoders               producing version (FR6)
        │                                       │
        └───────────────▶ UnprovenTransaction (version-correct) ──▶ proofProvider ──▶ walletProvider ──▶ midnightProvider
```

Version source differs by direction (§4.2): **read/decode** dispatches on the `protocolVersion` of the *specific fetched record*; **construct/submit** dispatches on the *network-head* version (latest block) or an explicit caller-supplied target, since the outbound transaction has no on-chain record yet.

The existing transaction flow (`UnprovenTransaction → proveTx → balanceTx → submitTx`) is unchanged in shape; each step now operates through a version-bound ledger facade.

---

## 6. Error Handling

### 6.1 Threat model & trust boundaries

The indexer is a **network service outside the dApp's trust boundary** (semi-trusted at best; subject to compromise or MITM). The version int it reports drives how outbound transactions are *encoded*, how state is *decoded*, and which *cost model / proof shape* is produced — so a wrong version is not merely a bug but an attacker-influenceable choice with financial/privacy consequences.

- **Residual risk — plausible-but-wrong (downgrade) version.** `protocolVersionToLedger` guards only against *unknown* ints; a malicious indexer reporting `v8` when the network head is actually `v9` (or vice-versa) is inside the closed `{v8, v9}` set and passes narrowing cleanly. On a **construct/submit** path this silently selects the attacker-chosen encoding/cost-model/proof shape — enabling a forced downgrade across the fork boundary, a proof/verifier-key mismatch, mis-encoded value fields, or a griefing tx the honest network rejects.
- **Mitigation stance (construct/submit path).** Before the network-head version selects outbound encoding, **cross-check it against an independent signal** — e.g. the wallet / proof-server / DApp-connector's expected version, or a fork-height/block-height sanity check — and **fail-fast on disagreement** rather than trusting a lone indexer value. Decode/read of *historical* records still dispatches on the per-record version (a wrong value there mis-decodes and is caught by the decode-mismatch throw, §6.2), but outbound encoding must not rest on a single untrusted source. If cross-checking cannot land in the first slice, it is tracked as **OQ8** with an owner — not silently accepted under A1.

### 6.2 Error handling rules

- **Trust boundary.** `FinalizedTxData.protocolVersion` is typed `number` and originates from the indexer (A1 trusts it *only after* the §6.1 cross-check on outbound paths). `protocolVersionToLedger` is the **sole narrowing point** from that untyped `number` to the closed `LedgerVersion` set.
- **Unknown protocol version** (int not in the mapping table): `protocolVersionToLedger` throws a typed error naming the observed int and the supported set. No default. Within the v8/v9-only scope (YAGNI), **both** read and write paths throw — but the two are named distinctly so the *next* fork does not silently inherit brittle behaviour:
  - *Unknown version on a decode/read path* (indexer reports a newer version than the framework supports, e.g. v10 after the next fork): throw. Revisit this to a graceful "read-only degrade" only when a future version is actually in scope — flagged here so it is a conscious decision, not an accident.
  - *Unknown version on a construct/submit path*: always a hard throw — the framework must never build a transaction it cannot encode correctly.
- **Version/artifact mismatch**: requesting an operation for v9 while only a v8 contract artifact is supplied (or vice-versa) throws immediately, identifying both the requested version and the available artifact(s).
- **Decode mismatch**: attempting to decode v8-encoded bytes with the v9 decoder (or vice-versa) surfaces the underlying decoder error wrapped with `{ cause }`, adding the version context — never swallowed.
- All errors follow the repo convention: re-throw with `{ cause: error }`, no `catch { log(e) }`.
- **Error-content constraint (privacy).** These errors may reach the `loggerProvider` (Pino) and be shipped off-device. Messages and wrapped `cause` chains MAY include the version int, the supported version set, and artifact keys — but MUST NOT include decoded state contents, key material (signing/coin/encryption keys), or raw payload bytes. For diagnostics use only lengths/offsets/type names. Applies especially to wrapped decoder errors over `ContractState`/`ZswapChainState`/`Transaction`.

### 6.3 Observability (QA-4)

Throws catch the *failing* cases; the dangerous §6.1 downgrade is a plausible-but-wrong version that **passes narrowing without throwing** and leaves no trail. Positive-path breadcrumbs are therefore required for post-hoc diagnosis:

- Every version-dispatch decision — record **decode**, network-**head** resolution, and **construct/submit** encoding — MUST emit a debug/trace-level `loggerProvider` breadcrumb recording the selected `LedgerVersion`, the **source** (per-record vs network-head vs explicit), and the raw `protocolVersion` int.
- These breadcrumbs are subject to the §6.2 privacy constraint (no payload/keys). They are the mechanism by which a wrong-dispatch that produced a rejected-on-chain transaction is diagnosed after the fact.

---

## 7. Key Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | **Explicit version parameter**, not a `network-id`-style mutable global. | v8 and v9 operations coexist during the fork; a shared mutable global is racy across concurrent/mixed-version operations. Explicit threading is safe and fail-fast-friendly. |
| D2 | `protocol` depends on **both** ledger packages and dispatches; it stays the single seam. | Preserves layering (NFR4); keeps implementation coupling out of `types`/consumers. |
| D3 | **Retain existing subpath exports**, pinned explicitly to **v9** (the post-fork target). | Minimises churn; existing static-type imports keep compiling while version-aware paths are adopted incrementally. "Default" is pinned to v9 (not an ambiguous "current"): the framework was always single-version (v9), so AC8's "no regression" is scoped to today's v9-pinned consumers only. No legacy v8-pinned behaviour ever existed, so none is owed. |
| D4 | Version source = **indexer `protocolVersion`** (already present). | No schema change; single source of truth from the network. |
| D5 | Divergent types modelled **explicitly** (discriminated by version). | Type safety (NFR2); no `any`/`unknown`. |
| D6 | Dual-contract support is **dispatch-only**, kept inside MJS-02 (not split to a separate ticket). | Resolves the open product question raised by @kapke on #1005 ("this also requires to accept 2 contracts … not sure whether to tackle here or as a separate ticket"). Decision: dispatch/selection is small and belongs with the orchestration in MJS-02; the heavier Compact **compilation/packaging** of two artifacts is the part that is deferred (§3 out of scope). KISS/YAGNI. |

---

## 8. Open Questions & Assumptions

- **OQ1 — BLOCKER (owner: TBD ledger/protocol team; resolve-by: TBD, before MJS-01 merge):** What is the concrete mapping from the numeric `protocolVersion` returned by the indexer to `v8` / `v9`? (Exact int values / ranges, and the fork-boundary value.) This is the top project risk: MJS-01 is foundational and blocks MJS-02/03 (15–25 pd total), so an unanswered OQ1 stalls all three workstreams.
  - **Interim strategy:** the mapping lives solely behind `protocolVersionToLedger`. The rest of MJS-01 (both-version facades, dispatch plumbing, tests using an injected/provisional mapping) can proceed against a stub. **No MJS-01 code that depends on the concrete int→version mapping may merge until OQ1 is answered.**
- **OQ2:** Which exact npm package + version provides Ledger **v8** and its matching `onchain-runtime`? (v9 is `@midnightntwrk/ledger-v9@1.0.0-rc.3` / `onchain-runtime-v4@4.0.0-rc.3`.)
- **OQ3:** Which ledger symbols **diverge structurally** between v8 and v9 (vs. identical)? Determines the size of the discriminated-union surface in §4.3.
- **OQ4 — DESIGN-CRITICAL & SECURITY (owner: TBD; confirm alongside OQ1 before MJS-01 design freeze):** Is there a window where a single logical transaction spans both versions, or is every individual transaction/state wholly one version? (Assumed: wholly one version per artifact — dispatch is per-operation, not intra-transaction.) A "no" answer invalidates the per-operation dispatch granularity and forces rework. **Security dimension:** if per-operation dispatch is assumed but an operation actually mixes versions, part of a transaction could be encoded/proved under one version and part under another — a malformed/partially-mis-encoded transaction that could be rejected, replayed, or mis-interpreted (correctness/financial hazard). Therefore, if any intra-tx multi-version possibility exists, the seam MUST reject (throw), not best-effort encode.
- **OQ5 (owner: TBD product/PO):** What is the network fork date/height? Needed to prioritise the minimum shippable slice (§11) against the deadline.
- **OQ6 — gates the `getLedger` signature (owner: TBD; before MJS-01 freeze):** Do the `ledger-v8`/`ledger-v9` packages instantiate WASM **synchronously or asynchronously**? The answer selects resolution (a)/(b)/(c) in NFR6 and determines whether the accessor is sync or `Promise`-returning — a decision that ripples through every consumer, so it must be settled before the accessor is designed.
- **OQ7 — SECURITY, before the cross-fork slice ships (owner: TBD):** Are `privateStateProvider` records and derived keys (signing / coin / encryption) **version-invariant** across v8/v9? §11 makes the v8-decode + v9-construct session mandatory; if private state or key derivation is *not* version-invariant, a v8-derived value silently consumed by a v9 construct path is a privacy/correctness hazard that the ledger-record-based dispatch would not catch — private-state read/write would then need to enter the version-dispatch surface.
- **OQ8 — SECURITY, downgrade cross-check (owner: TBD):** What independent signal is used to cross-check the indexer's network-head `protocolVersion` on construct/submit paths (§6.1)? If none is available in the first slice, this is the explicitly-accepted residual risk to be closed before broad rollout.
- **OQ9 — test-fixture provenance (owner: TBD; blocks the decode/round-trip test slice):** How is a canonical v8-encoded fixture produced (devDependency `ledger-v8` encoders vs committed golden hex)? See §9. Blocks every round-trip / decode-mismatch / cross-fork test.

**Freeze-gate done-definitions (QA-6).** Each "before-freeze" gate closes only when a concrete artifact is merged and its test is green:
- **OQ1** → the concrete int→version map committed behind `protocolVersionToLedger`, with a table test.
- **OQ3** → a checked-in `symbol-buckets.md` (or a typed const) enumerating every boundary-crossing symbol with its bucket (1/2/3), referenced by the ACL test's per-version lists.
- **OQ4** → a one-line recorded answer (spans-versions? yes/no) plus the mandated throw path (or its documented structural impossibility).
- **OQ6** → the documented sync/async answer plus the chosen NFR6 resolution (a/b/c) recorded inline.
- **DEV-6** → a compiling `bucket2-brand.example.ts` (or type-level test) that CI type-checks with **no** `any`/`unknown` cast.
- **OQ9** → the v8+v9 fixtures (or their generators) committed and consumed by the round-trip test.
- **A1 (assumption):** The indexer reliably tags every block/tx/event with a correct `protocolVersion`; the framework trusts it as the source of truth.
- **A2 (assumption):** Both contract artifacts, when dual-artifact mode is used, are supplied by the dApp; the framework does not compile them.

---

## 9. Testing Strategy

Per repo convention: tests written first (TDD), Arrange-Act-Assert, meaningful negative scenarios, strict equality assertions, both versions exercised (NFR5).

**Fixture provenance (QA-1) — precondition of the MJS-01 test slice, gated with OQ2/OQ9.** The repo is currently v9-only, so a v8-encoded payload does not exist yet. Every round-trip, decode-mismatch, and cross-fork test depends on a canonical v8 fixture *and* a v9 fixture. Provenance must be fixed before those tests can be written:
- **Preferred:** install `@midnightntwrk/ledger-v8` (and its onchain-runtime) as a **devDependency** and mint fixtures at test time via its `sample*`/encoders; same for v9. Fixtures are then reproducible, not opaque blobs.
- **Fallback:** commit **golden hex fixtures** captured from a v8 network/indexer, each stored with its `protocolVersion` int.
- "v8 fixture available" is a named precondition (**OQ9**) blocking the decode/round-trip test slice.

**Test levels (QA-5).** Each scenario is explicitly placed:
- **Unit (vitest):** fixture round-trip, dispatch/version selection, and *all* negative throw paths (unknown version, artifact mismatch, decode mismatch, brand-version mismatch, downgrade cross-check, intra-tx mixing). Authoritative pre-fork gate.
- **Docker integration:** `indexer-public-data-provider` codec against a real indexer response carrying `protocolVersion`.
- **e2e testkit:** full deploy/call flow. The **fork-boundary e2e** (read v8 + submit v9 in one session) generally **cannot run pre-fork** against a live network at the fork height; pre-fork it is exercised via recorded/golden v8+v9 fixtures at unit/integration level, which are the authoritative gate until a fork-height network is available.

- **protocol (MJS-01):**
  - `protocolVersionToLedger` maps known ints correctly (both versions) and **throws** on unknown ints (negative).
  - `getLedger('v8')` / `getLedger('v9')` each return a facade exposing the full required symbol set. Extend `protocol-acl.test.ts` with **two per-version expected symbol lists** (v8 and v9 may legitimately differ — these lists are **blocked on OQ3**). A single shared list is explicitly avoided — it would collapse to the intersection and weaken the guarantee. Split the assertion into: **(a) runtime** key-set equality via strict `toEqual` on sorted keys — against the facade's **complete** exported key set, not merely "contains the required symbols" (a required-*subset* framing would let a leaked/extra export on one version pass, reproducing the one-directional-assertion anti-pattern the repo forbids); **(b) compile-time** — each version facade is assignable to the unified `LedgerModule` type (a type-level assertion; `toEqual` on keys cannot see type drift). The bucket-(1) identity assertions (§4.1a) cover the shared-type side.
  - **Sourcing guardrail (DEV-5):** a negative test asserting a **construct/submit** path derives its version from `networkHeadVersion(...)` and **not** from the record being constructed (which does not exist yet).
  - **Brand-version invariant (SEC-2):** a negative test where a branded **v8** value is fed into a **v9**-bound proof/submit seam — it MUST throw at the seam, not silently proceed.
  - **Downgrade cross-check (SEC-1):** a negative test where the indexer network-head version disagrees with the independent signal — the construct/submit path MUST fail-fast rather than encode with the indexer-reported version.
  - Round-trip: a value sampled/encoded by v8 decodes via the v8 facade and **fails** via the v9 facade (negative).
    - **Determinism (QA-9):** cross-decoding is only a valid negative test if it *deterministically* fails. WASM decoders may instead emit garbage or a structurally-valid-but-wrong object (likely for bucket-(1) "identical" shapes). The test must assert a concrete failure signal — a thrown error where the decoder throws, otherwise a round-trip inequality (decoded→re-encoded bytes ≠ original) or a discriminant/checksum check. Where the decoder does not throw, the framework MUST add its own version-discriminant validation at the seam rather than relying on the decoder. Flag as a discovery item alongside OQ3 (identical shapes are exactly where cross-decode may not throw).
- **contracts (MJS-02):**
  - Given a `publicDataProvider` reporting v8, contract flows build/decode via v8; same for v9.
  - Dual-artifact: correct artifact selected per active version; **throws** when the only supplied artifact mismatches the active version (negative).
- **providers (MJS-03):**
  - Proof providers request `CostModel`/`ProvingProvider` for the correct version.
  - `indexer-public-data-provider` `codec` decodes v8- and v9-tagged payloads correctly and **throws** on a version/payload mismatch (negative).
- **Backward compatibility (AC8):** a consumer using only the legacy default-version subpath imports still compiles and produces identical results — i.e. the retained subpath exports (D3) behave exactly as before the change.
- **Cross-cutting:** the fork-boundary scenario — read v8 historical state, then build+submit a v9 transaction within one session.
- **Single WASM init (AC10, QA-3):** WASM instantiation routes through an injectable/memoised internal `initOnce(version)` the test can spy on. Assert: `getLedger('v9')` triggers exactly one init; a second `getLedger('v9')` triggers zero; with `getLedger('v8')` never called, the v8 init count is 0. Assertion form depends on OQ6 (sync vs async) — marked blocked accordingly.
- **No unsafe casts (AC6, QA-2):** enforced by mechanism, not review judgment — ESLint `@typescript-eslint/no-explicit-any` plus a grep/lint gate rejecting `as unknown`. CI-enforced.
- **Type-only sites (AC9, QA-2):** an AST/grep assertion that no site importing a symbol purely as a type also calls `getLedger` for it — accessor calls occur only where a runtime value is used.
- **Intra-tx mixing (OQ4, QA-7 — conditional):** if OQ4 resolves to "a tx can span versions," a negative test asserts that assembling one transaction referencing two different `LedgerVersion`s **throws** a typed error at the seam. If OQ4 resolves to "wholly one version per tx," record explicitly that this path is structurally impossible and needs no test — so the absence is deliberate.

---

### 9.1 AC → test traceability (QA-2)

Every acceptance criterion maps to a concrete verification. No AC without a test; no orphan test.

| AC | Verified by |
|----|-------------|
| AC1 | `getLedger('v8'\|'v9')` return facades; ACL per-version key-set + `LedgerModule` assignability |
| AC2 | Negative: unknown int throws on **decode/read** path *and* on **construct/submit** path (the two §6.2-named paths, asserted separately); artifact-mismatch throw |
| AC3 | contracts flow builds/decodes via reported version (both); fork-boundary cross-cutting test |
| AC4 | Dual-artifact selection drives a **successful end-to-end** deploy/call per version; missing-active-artifact throws |
| AC5 | Providers/`types` operate via unified APIs (both); `createProofProvider` version-param migration test |
| AC6 | ESLint `no-explicit-any` + grep gate on `as unknown` (CI-enforced) |
| AC7 | Both-version coverage across dispatch paths; `yarn lint` + build + vitest green |
| AC8 | Backward-compat: legacy v9 subpath imports compile + behave identically |
| AC9 | AST/grep: no type-only import site calls `getLedger` |
| AC10 | Spy on `initOnce(version)`: exactly one init for the active version, zero for the inactive (blocked on OQ6) |

## 10. Acceptance Criteria

- **AC1** — `protocol` exposes unified, version-parameterised APIs that operate for both v8 and v9; internal dispatch selects the correct implementation. (FR1, FR2)
- **AC2** — Unknown/unsupported protocol versions and version/artifact mismatches throw typed errors with no silent fallback. (NFR1)
- **AC3** — `contracts` reads the protocol version from the public data provider and dispatches correctly; contract flows succeed against both v8 and v9, including across the fork boundary. (FR3, FR6)
- **AC4** — `contracts` selects the correct artifact when both v8- and v9-compatible definitions are supplied, and the selected artifact drives a **successful end-to-end contract flow (deploy/call)** for its matching version; supplying only a mismatching artifact fails fast. (FR4, matches #1005 "flows succeed across the transition")
- **AC8** — **No regression for existing single-version dApps:** existing default-version (v9) subpath imports (`/ledger`, `/onchain-runtime`) continue to compile and behave identically; a consumer that adopts none of the version-aware APIs sees no behavioural change. (D3)
- **AC9** — **Type-only sites need no runtime call:** every consumer that referenced a ledger symbol purely as a type keeps a `import type` and calls no accessor; `getLedger` is invoked only where a runtime value was previously used. The known exception (`createProofProvider`, §4.4) is migrated deliberately, not left as a hidden runtime import. (§4.1a/b)
- **AC10** — **Single WASM init:** a single-version consumer incurs exactly one ledger WASM instantiation; the inactive version is not instantiated until first `getLedger(thatVersion)`. (NFR6)
- **AC5** — Provider APIs and `types` provider interfaces operate via the unified APIs for both versions with no direct single-version coupling; `types` gains no ledger-implementation dependency. The one known runtime-value site (`createProofProvider` / `CostModel.initialCostModel()`) is migrated to an explicit `version` parameter (§4.4). (FR5, NFR4)
- **AC6** — No `any`/`unknown` casts introduced; divergent types modelled explicitly. (NFR2)
- **AC7** — Both-version coverage exists for every dispatch path; `yarn lint` clean, build succeeds, tests pass. (NFR5)

---

## 11. Rollout & Versioning

- **Fork deadline (business driver):** this is a hard-fork migration with a network fork date/height — see **OQ5**. Delivery must be prioritised against it.
- **Minimum shippable slice before the fork:** the cross-boundary capability — *decode v8 historical state + construct & submit a v9 transaction within one session* (the §9 cross-cutting scenario). Everything required for that path must ship before the fork height or dApps break on-chain; refinements (e.g. exhaustive divergent-type coverage) can follow.
- **Silent-default-downgrade audit (SEC-4).** The v9-pinned default subpath (D3) does not fail-fast, so an un-migrated **runtime-value** call site silently operates at v9 while the data may be v8. Before the fork height, enumerate every remaining runtime-value import from the default subpath and confirm each is genuinely single-version-safe; any runtime-value site on a cross-fork path MUST migrate to explicit `getLedger(version)`. Add a lint/grep gate flagging runtime-value imports from the default subpath so a silent-default downgrade cannot ship unreviewed. (Type-only default imports are unaffected.)
- Coordinated change touching `protocol` → `contracts`/providers/`types` in the correct dependency order; providers and contracts land only after the `protocol` accessor is published.
- Public API change → major/beta version bump on affected packages, per repo release conventions.
- Retaining default-version subpath exports (D3) keeps the blast radius on consuming dApps to opt-in adoption of the version-aware paths.
