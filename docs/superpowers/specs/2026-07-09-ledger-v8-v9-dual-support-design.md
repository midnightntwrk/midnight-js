# Design Spec — Ledger v8 / v9 Support in Midnight.js (Hard-Fork Transition)

**Status:** Draft v3 (architecture simplification)
**Date:** 2026-07-09 (v1) · 2026-08-03 (v2 — keep-state rework) · 2026-08-04 (v3 — simplification rework)
**Author:** Systems architecture (spec workflow)
**Source issues:**
- [#1004 — MJS-01 protocol package: unified v8/v9 dispatch APIs](https://github.com/midnightntwrk/midnight-js/issues/1004)
- [#1005 — MJS-02 contracts package: protocol-version orchestration](https://github.com/midnightntwrk/midnight-js/issues/1005)
- [#1006 — MJS-03 provider API updates to unified APIs](https://github.com/midnightntwrk/midnight-js/issues/1006)

Part of the **Ledger v8→v9 Hard Fork Migration** (SOW-Q3-10 / product#119).

> **Revision note (v2, 2026-08-03, compressed).** The v1 dual-artifact model (accept a v8- and a v9-compiled contract, select at dispatch) was superseded after the DApp-HF spike ([`shieldedtech/spike-dapp-hf`](https://github.com/shieldedtech/spike-dapp-hf)): deployed pre-fork contracts keep transacting after the fork **with no recompilation and no v9-compiled variant** via a *keep-state* path — down-convert the migrated state, execute on the unchanged ledger-8 stack, wrap in a native ledger-9 transaction with a V2 proof. The protocol migrates all contract state to the v9 envelope at the fork; state *data* and transcripts are byte-identical across versions.
>
> **Revision note (v3, 2026-08-04).** Architecture review removed the generic dual-version machinery that decision D9 (construct/submit is v9-only) had already made redundant. The keep-state model itself is **unchanged**. What changed:
> 1. **No version-parameterised accessor.** `getLedger<V>` / `LedgerModule<V>` / `bindLedger` are dropped. v9 stays on today's static imports, untouched. The v8 decode surface is a handful of concrete functions (the repo's only raw-decode site is `indexer-public-data-provider/codec.ts` — 4 functions), not a mirrored module facade.
> 2. **Type-divergence taxonomy dissolved.** The v2 three-bucket classification, DEV-6 branding/WeakMap gate, and per-version ACL parity lists are removed. Under D9 no v8 value ever enters the v9 pipeline, so there is no unified type surface to design.
> 3. **Transitional package (D11).** v8 decode + keep-state primitives ship as `@midnight-ntwrk/midnight-js-fork-bridge` (name is a proposal), not as a `protocol/v8` subpath. Core packages never depend on it; dApps inject it. Deletion at v10 = deprecating one package.
> 4. **SEC-2 reduced.** The byte-equality `assertV9Transaction()` guard program (red-team fixtures, determinism checks, per-prover lint gates) is replaced by a types-first stance plus an optional upstream version discriminant (OQ15). The ledger's effects-equality check remains the documented integrity backstop.
> 5. **Fork date withdrawn as a driver (OQ5).** The date changes no line of this design; delivery is sequenced by dependency order, not by fork height. Cross-team lead times (OQ7, OQ12) are tracked against their own milestones.

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
- **FR1** — `protocol` MUST expose **version identity** utilities: the closed `LedgerVersion` type, `protocolVersionToLedger(int)` (OQ1 range table, fail-fast on unknown), and the sourcing helpers `versionOfRecord(record)` / `networkHeadVersion(publicDataProvider)`. No unified dispatch facade (D10); `protocol`'s existing v9 exports are unchanged.
- **FR2** — Version handling MUST be **explicit**: helpers take the record / provider as arguments; no hidden mutable global (D1).
- **FR3** — `contracts` MUST resolve the active protocol version from the `publicDataProvider` **per operation** (resolved at operation start, memoised within that operation only — no session-level subscription, which would reintroduce stale bindings).
- **FR4** — **Keep-state.** `contracts` MUST let an already-deployed, ledger-8-compiled contract keep transacting after the fork with no recompilation and no v9 variant: down-convert the migrated state, execute on the dApp's retained ledger-8 stack, wrap the transcript in a native ledger-9 transaction with a V2 proof (proof version selected by the resolved verifier-key tag, never hardcoded). Enabled by **one opt-in config object** carrying a `KeepStateBridge` instance (§4.3). Applies to **calls** on pre-fork contracts only; post-fork deploys with ledger-8 artifacts throw.
- **FR5** — **No core package gains a v8 dependency.** `protocol`, `contracts`, `types` and all providers stay free of `ledger-v8` and of the bridge package; v8 capability enters only by dApp-side injection (`keepState` config; the indexer provider's optional `v8Codec`). Proof providers are unchanged under D9 (keep-state proving routing per OQ11/OQ12).
- **FR6** — Serialization respects what exists on-chain: **historical blocks/txs/events** decode with the version that produced them (per-record `protocolVersion`); **fetched `ContractState` after the fork is always current-envelope** (migrated) and decodes with v9. A `ContractState` fetched while the head is pre-fork (v6 envelope) throws a deterministic typed error (SEC-9). No fixed-version decoding of records.
- **FR7** — **No impairment of native ledger-9 execution.** The v9-native call/deploy path stays the default and MUST remain behaviourally unaffected (non-regression coverage required).

### Non-functional
- **NFR1 — Fail fast.** Unknown/unsupported protocol versions, version/artifact mismatches, and missing opt-in config throw clear, typed, remediation-bearing errors immediately. Never a silent default.
- **NFR2 — Type safety.** No `any` casts, no `unknown` bridging. v8 decode outputs are distinct V8 types that no v9 pipeline API accepts — the separation is compile-time.
- **NFR3 — KISS / YAGNI.** Only v8 and v9. No generic N-version layer (D10); at most two versions live at once (D8).
- **NFR4 — Layering preserved.** `types` stays implementation-free; `protocol` remains the single seam for the v9 implementation. The bridge is a **leaf** package consumed only by dApps and injected inward — no core package depends on it.
- **NFR5 — Testability.** Every dual-behaviour path (routing, codec dispatch, keep-state) is covered by tests exercising both versions.
- **NFR6 — Single WASM stack for core (structural, not promised).** Core packages never import v8 WASM, so a v9-only dApp ships exactly today's single stack — verified by a dependency-graph gate, not by bundler behaviour. The bridge's `./v8` entry instantiates the v8 WASM at import (upstream wasm-bindgen behaviour); **importing that entry is itself the opt-in** — no init choreography, no lazy-load machinery (v2's OQ6 apparatus withdrawn).

---

## 3. Scope

### In scope
- `protocol`: additive version-identity exports (FR1). No dependency or subpath changes.
- New transitional package `@midnight-ntwrk/midnight-js-fork-bridge` (D11): keep-state primitives (root entry) + the v8 historical-record decoders (`./v8` entry).
- `contracts` (MJS-02): per-operation version resolution, routing table (§4.3), the `KeepStateBridge` interface and opt-in config, typed pre-fork/deploy throws.
- `indexer-public-data-provider` (MJS-03): per-record codec dispatch with optional injected `v8Codec`.
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

/** Sourcing helpers — the two version sources are syntactically distinct so a
 *  wrong pairing is a spot-the-wrong-call error in review, not a silent mis-decode: */
export const versionOfRecord = (record: { protocolVersion: number }): LedgerVersion => { ... }; // read/decode paths
export const networkHeadVersion = (pdp: PublicDataProvider): Promise<LedgerVersion> => { ... }; // construct/submit paths
```

`LedgerVersion` (widening at a future fork, then shrinking on removal) is the single compile-time signal downstream packages key on (D8).

### 4.2 `@midnight-ntwrk/midnight-js-fork-bridge` — transitional package (new, D11)

Fork-lifetime-scoped: documented as transitional from day one; **removal at v10 = deprecating this package**, with no major bump on `protocol`. Two entry points so a keep-state-only consumer never pays the v8 WASM cost:

**Root entry (`.`) — keep-state.** Depends on `ledger-v9` (values) and on compact-runtime `0.16` / `onchain-runtime-v3` **as type-only aliased devDependencies** (lint-guarded `import type`); the executing instances are the dApp's own (A2, #1052).

```ts
export interface KeepStateBridgeConfig {
  compactRuntime: CompactRuntime016Module;  // the dApp's own imported instances —
  onchainRuntime: OcrtV3Module;             // the framework cannot reach them itself (#1052)
}
export const createKeepStateBridge = (cfg: KeepStateBridgeConfig): KeepStateBridge => { ... };
```

The bridge **encapsulates every touch of the retained ledger-8 stack**; `contracts` exchanges only POJOs and v9 objects with it (a strictly cleaner statement of the #1052 invariant than v2, where `contracts` drove `createCircuitContext` itself):
- **Down-convert:** `extractEncodedStateValue` (v9-enveloped bytes → byte-identical POJO; throws on malformed input or a lost `StateValue` type) + `toExecutionState` (decode **and rehash** inside the dApp's runtime instance — bounded Merkle trees come back non-rehashed from the round-trip and must be rehashed before any `checkRoot`). Down-convert carries only `.data`; blank `.balance`/`.operations` are harmless — the ledger checks claimed spends against the real migrated on-chain state at apply.
- **Execution leg:** drives `createCircuitContext` + invoke on the dApp's instances, returning the POJO transcript. Exact signature (and whether any compact-js shim is involved) is finalised with **OQ13**.
- **Wrap:** `wrapTranscriptV9` — POJO transcript + resolved key tag → native v9 `ContractCallPrototype`. `Intent`/`Transaction`/offer/dust composition stays in `contracts` (existing `zswap-utils`); a full-transaction assembler here would duplicate zswap logic or invert the layer.

**`./v8` entry — historical decode.** Depends on `@midnight-ntwrk/ledger-v8` and exports the concrete decoders the indexer codec actually needs — `decodeTransaction`, `decodeLedgerParameters`, `decodeZswapState` (final list is OQ3; fetched contract state post-fork is v9-enveloped per FR6, so a v8 contract-state decoder is needed only for the SEC-9 detection path, if at all). Importing this entry instantiates the v8 WASM — that import is the opt-in (NFR6).

**Packaging.** ESM-only is acceptable (only transition-window dApps install it — no dual `.cjs` artifact, no `require(esm)` smoke tests, no bundler-can-drop-it verification records: isolation is the package boundary). The OQ2 supply-chain checklist (two near-identical npm scopes, exact pins, lockfile integrity, CI scope/version gate) applies to **this package's** dependency tree; core-repo CI asserts no core package resolves `ledger-v8` or the bridge (NFR6/FR5 gate).

### 4.3 MJS-02 — `contracts`: protocol-version orchestration (substance unchanged from v2)

**Version sources.** Read/decode of blocks/txs/events dispatches on the **per-record** `protocolVersion` (`versionOfRecord`). Construct/submit dispatches on the **network-head** version (`networkHeadVersion`) or an explicit caller-supplied target. Fetched contract state post-fork is always current-envelope (FR6 exception).

**Routing.** `contracts` resolves the version per operation and routes each operation down exactly one path:

| Network head | Contract | Path |
|---|---|---|
| v8 (pre-fork) | any | **out of scope (D9)** — construct/submit throws typed pre-fork error; decode/read of v8 records works |
| v9 | compiled for ledger-9 | **v9-native** — default, untouched (FR7) |
| v9 | **call** on a pre-fork contract | **keep-state** (FR4) |
| v9 | **deploy** with ledger-8 artifacts | **rejected** — typed fail-fast error |

**Path detection (total truth table — the key-set shape is an adversarial input, §6.1).** Calls route on the operation verifier-key set of the fetched (migrated) `ContractState`: `co.v2`-only ⇒ **keep-state**; `v3`/`ir` present, no `co.v2` ⇒ **v9-native**; **both** populated (post-fork key rotation on a migrated contract) ⇒ **v9-native** + a dual-key breadcrumb; **neither** ⇒ typed unsupported-key-set error. Routing and proof-version selection read the same key tag, so they cannot disagree. Deploys route on the version tag of the supplied artifacts (exact artifact field: discovery item with OQ13).

**Developer contract (opt-in by design).** The framework cannot reach the dApp's runtime instances (#1052: no second WASM copy; generated code doesn't re-export its runtime; resolution tricks don't survive bundlers). Keep-state is enabled by one documented config object on the call-entry API:

```ts
import { createKeepStateBridge } from '@midnight-ntwrk/midnight-js-fork-bridge';
// ...
{ keepState: createKeepStateBridge({ compactRuntime, onchainRuntime }) }
```

The `KeepStateBridge` **interface** is declared in `contracts` (or `types`); the bridge package implements it — so `contracts` stays 100% v9-typed with zero bridge dependency (NFR4). A call routing to keep-state without the config fail-fasts with a typed error containing the exact snippet above. A zero-config mechanism discovered later is an upgrade, not a dependency of this design.

**The keep-state path** (per post-fork call on a pre-fork contract):
1. Fetch the migrated `ContractState` (v9 envelope) from the public data provider.
2. `bridge.extractEncodedStateValue` → POJO → `bridge.toExecutionState` (decode + rehash inside the dApp's instance).
3. Bridge executes the circuit on the dApp's retained stack → POJO transcript.
4. `bridge.wrapTranscriptV9` → `ContractCallPrototype`; `contracts` composes `Intent` → `Transaction` (existing `zswap-utils`). The intent binding is v9-native from the start — no v8-tx carrier, no re-bind.
5. Prove — **V2**, selected by the resolved key tag. **Pre-proving consistency check (SEC-5):** the locally-resolved verifier key MUST byte-match the fetched state's `co.v2` slot; mismatch throws **before proving starts** (a tampered/stale artifact set otherwise burns minutes of proving on a doomed submission). The ledger dispatches verification to the preserved `co.v2` slot, replays the transcript, requires effects equality.

State read paths (`get-states`, `tx-model`, `ledger-utils`, `zswap-utils`) decode per FR6.

### 4.4 MJS-03 — providers (shrunk)

Under D9 the proving pipeline is statically v9, so **most providers change nothing**:
- **Proof providers** (`http-client-proof-provider`, `dapp-connector-proof-provider`): unchanged. Keep-state **hybrid proving** routes by key location (spike `contract-proving.ts`): contract circuits prove with locally-sourced retained pre-fork key triples (V2), native dust/zswap legs via the proof server. "Local" = where keys are *sourced*; the witness still ships to the proof server (`8.0.3` in the spike) — which server(s) see it during the transition is an output of **OQ12**. Whether the routing lands in MJS-02 or MJS-03 is **OQ11**.
- **`indexer-public-data-provider`** (`codec.ts`) — **the single historical-record dispatch point in the framework**: each `parseHex*` call selects the decoder by the record's `protocolVersion`; v9 → existing static decoders (unchanged); v8 → the injected optional `v8Codec` (interface exported by the provider, implemented by the bridge's `./v8` entry). No codec injected + a v8 record encountered ⇒ typed error naming the bridge package and config key. Codecs stay synchronous (the codec is injected already-initialised). Contract-state exception per FR6.
- **`level-private-state-provider`** (security-critical): expected version-agnostic — it stores opaque contract-defined values the envelope migration never touches, and under keep-state they keep being written by the unchanged 0.16 stack. Confirm and record during MJS-03.
- **`types`**: **unchanged.** Under D9 every transaction reaching `proveTx` is statically v9, so the existing `CostModel.initialCostModel()` default in `createProofProvider` is correct as-is — no signature change ships. Audit `types` for any other runtime ledger values during MJS-01 (lint gate stays).
- **`midnight-js` barrel**: re-exports `protocol`'s new version utilities. The bridge is **deliberately not re-exported** — it is transitional, opt-in, and its deletion must not touch the barrel.

### 4.5 Type divergence — dissolved (replaces v2 §4.3)

There is no unified v8/v9 type surface to design:
- The construct→prove→submit pipeline is statically v9 (D9) — no unions, no brands, no discriminants.
- v8 decode outputs are plain types from the bridge's `./v8` entry, returned to callers as **read leaves**. No v9 pipeline API accepts them; the separation is enforced by the type system with no runtime carrier needed.
- The shared keep-state POJO layer (`EncodedStateValue` / `impact-state-value[v2]`, transcript/`Op`/`AlignedValue`) is byte-identical across versions (spike-established). Machine-check with compile-time `AssertEqual` assertions where the `.d.ts` surfaces allow, and with round-trip fixtures where they don't.

The v2 three-bucket taxonomy, DEV-6 branding gate, WeakMap side-tables, and per-version ACL parity lists are withdrawn — they solved a problem D9 had already removed.

---

## 5. Data Flow

```
Network/indexer ──protocolVersion:int──▶ publicDataProvider ──▶ contracts resolves LedgerVersion
        │                                       (protocol.protocolVersionToLedger)
        │
        ├─ network @ v8 (pre-fork) ─────────▶ decode/read only; construct/submit throws (D9)
        │
        └─ network @ v9 (post-fork)
             ├─ v9-native contract ─────────▶ default v9 path (untouched — FR7)
             │
             └─ pre-fork (ledger-8) contract — KEEP-STATE (via injected bridge):
                  fetch migrated ContractState (v9 envelope)
                    │  bridge: extractEncodedStateValue → POJO → toExecutionState (decode+rehash in dApp instance)
                    ▼
                  bridge executes circuit on dApp's ledger-8 stack ──▶ POJO transcript
                    │  bridge.wrapTranscriptV9 → ContractCallPrototype; contracts composes Intent → Transaction
                    ▼
                  prove (V2 — selected by key tag; verifies against preserved co.v2)
                    ▼
                  proofProvider ──▶ walletProvider ──▶ midnightProvider

Historical records: indexer codec.ts dispatches per-record — v9 → static decoders; v8 → injected v8Codec.
```

The transaction flow (`UnprovenTransaction → proveTx → balanceTx → submitTx`) is unchanged in shape and statically v9.

---

## 6. Error Handling

### 6.1 Threat model & trust boundaries

The indexer is a network service **outside the dApp's trust boundary**. The version int it reports drives decode selection and path routing; the fetched `ContractState`'s key-set shape drives AC-routing and its bytes become execution input.

| Boundary | Data crossing it | Failure mode |
|---|---|---|
| Indexer (GraphQL) | `protocolVersion` ints; records; fetched `ContractState` (key-set shape **and** bytes) | mis-route / garbage execution input — **bounded to DoS/griefing by the effects-equality backstop** |
| Proof server(s) | full private witness + locally-sourced key triples | witness exfiltration if compromised; the transition may run an old `8.0.3` server or two servers side by side — which server(s) see the witness is an output of OQ12 |
| zk-config artifact source | prover/verifier/zkir triples | tampered/stale artifacts → griefing; bounded by the SEC-5 `co.v2` consistency check |
| dApp-supplied bridge/runtime handles | module references | in-process, same trust domain as the dApp's own code; a wrong module is a documented typed failure |

**The integrity backstop is the ledger itself:** at apply, ledger-9 replays the transcript against the real on-chain state and requires effects equality — state/routing tampering is bounded to **DoS/griefing** (wasted proving, doomed submissions), never fund or verification compromise. This invariant is load-bearing and asserted by a §8 negative test.

**Residual risk — plausible-but-wrong version (SEC-1/OQ8).** `protocolVersionToLedger` guards only against *unknown* ints; a malicious indexer reporting a wrong-but-valid version passes narrowing. Under D9 a construct-path downgrade to v8 collapses to the fail-fast throw (DoS at worst); the remaining live risk is mis-routing a call between keep-state and v9-native — also bounded by the backstop. Mitigation (cross-check the head version against an independent signal — wallet/proof-server expectation or a block-height sanity check) is tracked as **OQ8** with a named owner; until it lands, the §6.3 breadcrumbs are the detection mechanism.

**Wrong-version-into-proving (formerly SEC-2, reduced in v3).** Under D9 plus the no-cast policy (NFR2, CI-enforced), a v8 value cannot reach `proveTx` without the developer defeating the type system first. The proportionate defence is: (a) the compile-time separation of §4.5; (b) the on-chain effects-equality/verifier backstop; (c) **if** the ledger exposes a cheap version discriminant, a one-line assert at the proving seam (**OQ15**, requested from the ledger team, non-blocking). The v2 byte-equality round-trip guard, red-team fixture programme, and per-prover lint/ACL gates are withdrawn as disproportionate to this threat model.

### 6.2 Error handling rules

- `protocolVersionToLedger` is the **sole narrowing point** from the untrusted `number` to the closed `LedgerVersion` set. Unknown int ⇒ typed error naming the observed int and the supported set — on read **and** construct paths (named distinctly so the next fork inherits a conscious decision, not an accident — D8).
- **Pre-fork head (D9):** construct/submit with a v8 head ⇒ typed pre-fork-unsupported error ("stay on midnight-js vX for pre-fork operation").
- **Stale-head race:** the head can cross the fork between `networkHeadVersion` resolution and submit (proving takes minutes). A submit rejection consistent with a version flip ⇒ dedicated typed error advising re-resolution and rebuild; no silent auto-retry.
- **Down-convert failure:** malformed input, cross-version decode failure, or a lost `StateValue` type ⇒ throw; never a silently wrong or empty state.
- **Proof-version invariant:** proof version derives from the resolved key tag, never hardcoded; a key set matching no supported proof version ⇒ typed error.
- **Artifact ↔ on-chain key mismatch (SEC-5):** locally-resolved verifier key ≠ fetched state's `co.v2` slot ⇒ typed error naming both sources, **before proving starts**.
- **Pre-migration contract state (SEC-9):** fetching a v6-envelope `ContractState` (pre-fork head) ⇒ deterministic typed error — never left to the v9 decoder happening to fail (cross-decode is not guaranteed to throw).
- **Missing opt-in config:** a call routing to keep-state without a `keepState` bridge ⇒ typed error containing the exact config snippet; a v8 record hitting the indexer codec with no `v8Codec` injected ⇒ typed error naming the bridge package.
- **Decode mismatch:** wrong-version decode surfaces the decoder error wrapped with `{ cause }` plus version context — never swallowed. Where a WASM decoder fails **open** (returns a structurally-valid-but-wrong object instead of throwing — plausible for byte-identical shapes), the codec seam adds its own discriminant/round-trip check; flagged as a discovery item with OQ3.
- **Remediation-bearing messages (DX):** every typed error states what happened, why, and the one next step, with concrete versions/heights/config keys.
- Repo conventions: re-throw with `{ cause }`; **privacy constraint** — errors may reach an off-device logger: version ints, version sets, and key *identifiers* (names, tags, hashes) are allowed; key bytes, decoded state contents, key material, and raw payloads are not.

### 6.3 Observability

Throws catch failing cases; a plausible-but-wrong version passes narrowing silently — so positive-path breadcrumbs are required. Every version-dispatch decision (record **decode**, network-**head** resolution, **execution-path selection**, construct/submit **encoding**) emits a debug-level `loggerProvider` breadcrumb: selected `LedgerVersion`, path, source (per-record / network-head / explicit), raw int. Subject to the §6.2 privacy constraint. `loggerProvider` is optional — the migration guide instructs operators to enable debug logging during the transition window, and the no-logger gap is part of OQ8's residual-risk sign-off.

---

## 7. Key Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | **Explicit version handling**, no mutable global. | v8/v9 operations coexist during the transition; a shared global is racy. Fail-fast-friendly. |
| D2 | `protocol` stays the single seam for the **v9** implementation; the v8/bridge side is a separate leaf package (D11). | Layering (NFR4) with a smaller core: `protocol` is untouched except additive version utils. |
| D3 | Existing `protocol` subpath exports stay **exactly as today** (v9). | v3 strengthens v2's D3: nothing is re-pointed because nothing moves. AC8 is trivial. |
| D4 | Version source = indexer `protocolVersion` (already present). | No schema change; subject to the §6.1 cross-check stance (OQ8). |
| D5 | v8 types stay **separate types**, never unified with v9. | Read leaves need no shared surface (§4.5); compile-time separation replaces runtime discriminants. |
| D6 | Post-fork support for pre-fork contracts = **keep-state** (no recompile, no v9 variant, no artifact selection). | Spike-proven: migration preserves `co.v2`; state/transcript data byte-identical; wrapping unchanged ledger-8 execution in a native v9 tx is sufficient and strictly simpler. |
| D7 | Keep-state primitives live in the **bridge package**, encapsulating every touch of the retained stack; `Intent`/`Transaction`/offer composition stays in `contracts`. | (Supersedes v2's placement in `protocol`.) `contracts` stays 100% v9-typed; WASM instance identity preserved (#1052); no duplicated zswap logic. |
| D8 | **Support window: current + previous** (pending confirmation, OQ10). Construct/submit = current only (D9); decode/read = current + previous. Keep-state soundness is re-validated **per fork** via a spike, never assumed. | Bounds dependency/test growth; implies dropping v8 (deprecating the bridge) when v10 enters scope. |
| D9 | **Pre-fork operation out of scope:** v8 capability = decode/read + keep-state bridge; construct/submit is v9-only; a v8 head fail-fasts. | No v8-native construct pipeline exists; building one would be a major hidden workstream for a shrinking window. KISS/YAGNI. |
| D10 | **No generic version-dispatch layer** (v3): no `getLedger<V>`, no unified `LedgerModule` facade, no type-bucket taxonomy. Two concrete modules + a two-case switch at each of the few dispatch points (indexer codec; contracts routing). | Under D9 the pipeline is statically v9 and the raw v8-decode surface is ~4 functions in one file. N never exceeds 2 (D8). A generic facade encodes an assumed axis of variation an unknown v10 will not honour — abstraction is added *when* a future fork's shape is known, not before (NFR3). |
| D11 | **Transitional package** `midnight-js-fork-bridge` instead of a `protocol/v8` subpath (v3). | Bundle isolation is structural (don't install it) instead of promised (dynamic-import + bundler verification records); deletion at v10 is a package deprecation, not a breaking `exports`-map change on `protocol`; the v8 supply-chain surface (two npm scopes, aliases, pins) is confined to one `package.json`. |
| D12 | **Fork date is not a design or priority driver** (v3). Delivery is sequenced by dependency order (§10); cross-team items (OQ7, OQ12) track their own milestones. | The date changes no line of this design. (Supersedes v2's OQ5-driven slice gating.) |

---

## 8. Testing Strategy

Repo conventions: TDD, Arrange-Act-Assert, meaningful negatives, strict equality, both versions exercised where behaviour is dual (NFR5).

**Fixture provenance (precondition of the decode/keep-state test slices — OQ9).** The repo is v9-only today. Preferred: port the spike's generators (`ledger-v8` + `onchain-runtime-v3` as devDependencies; mint fixtures at test time; migrated-state fixture via the spike's migrate flow). Fallback: committed golden hex with its `protocolVersion` int. Inventory beyond v8/v9/migrated: a **v6-envelope** pre-migration state (SEC-9); **tampered** variants (key set flipped both ways; perturbed bytes); a **both-keys** fixture (truth table); a **Merkle-bearing** migrated fixture (rehash). **Minimal-size mandate:** the smallest contract exhibiting each property (repo precedent: WASM-fixture coverage timeouts).

**Verification harness.** Proof/apply-level assertions need a local verifier — ledger-v9's local verify entry or a ported spike-simulator devDependency; **which one is decided with OQ9**. A fork-capable e2e environment (node/indexer/proof-server starting at v8, migrating at a height) does not exist in the testkit — **OQ14**; until it does, proof/apply-level ACs are authoritatively gated at the unit/integration tier (recorded, not implied).

- **protocol:** `protocolVersionToLedger` table test mirroring the indexer's ranges incl. the fail-fast else-branch; sourcing-guardrail spy test — `networkHeadVersion` called exactly once per construct operation, `versionOfRecord` never on the construct path.
- **fork-bridge:**
  - Down-convert round-trip: migrated-state fixture → execution-ready state whose `StateValue` equals the pre-migration reference; negatives throw (malformed bytes, lost `StateValue` type).
  - Merkle rehash: a tree-bearing fixture's root is readable after down-convert; a deliberately non-rehashed decode **throws** on root access (proves the rehash step is load-bearing).
  - **Instance identity (#1052):** devDependency npm alias of the same runtime package (`onchain-runtime-v3-alt`); decode via one instance, execute via the other — POJO handoff succeeds; negative control: a WASM-backed object across instances fails.
  - `./v8` codec: v8 fixtures decode; a v9-tagged payload fed to the v8 decoder yields a **deterministic** failure signal — a throw where the decoder throws, otherwise a round-trip inequality or discriminant check added at the seam (decoders may fail open; discovery item with OQ3).
- **contracts:**
  - Routing truth table: all four key-set shapes asserted strictly (`co.v2`-only ⇒ keep-state; `v3`-bearing ⇒ v9-native; both ⇒ v9-native + breadcrumb; neither ⇒ typed error); post-fork v8-artifact **deploy** ⇒ typed error; keep-state route without config ⇒ guidance-bearing typed error.
  - Keep-state positive: pre-fork contract (migrated-state fixture + retained artifacts) accepts a post-fork call end-to-end with no recompilation and no v9 variant.
  - Proof-version negative: a V3 proof / repopulated `v3`/`ir` against the preserved `co.v2` key fails verification; **unsanctioned mixing** — any intra-tx version mix other than the sanctioned keep-state composition throws (OQ4).
  - Tampered fetched state (one deterministic outcome per fixture): key set flipped either way ⇒ the respective typed error (unit); state bytes perturbed but well-formed ⇒ rejection at apply (harness/OQ14 tier) — together asserting the §6.1 effects-equality backstop.
  - SEC-5: local verifier key ≠ `co.v2` slot ⇒ typed error **before proving**. SEC-9: v6-envelope fixture ⇒ deterministic typed throw.
  - Pre-fork head (D9): construct/submit throws; decode/read of v8 records still succeeds.
  - **v9-native non-regression (FR7):** (a) existing v9 suites run **unmodified** (diff gate on the test files); (b) golden-fixture byte equality on deterministic stages (serialized `UnprovenTransaction`/`Intent`, decoded-state snapshots) captured on `main` before the first PR; (c) proof bytes excluded (nondeterministic).
  - Cross-cutting fork-boundary scenario: one session reads v8 history, runs a keep-state call, and runs a v9-native flow side by side; stale-head flip ⇒ the dedicated typed error.
- **providers:** indexer codec dispatches per-record (v9 static / injected v8Codec) and throws typed on missing codec + v8 record (docker integration against a real indexer response); keep-state proving selects V2 by key tag and routes legs per OQ11.
- **Structural gates (CI):** dependency-graph assertion that no core package resolves `ledger-v8` or the bridge (NFR6/FR5); ESLint `no-explicit-any` + grep gate on `as unknown` (NFR2); bridge-package export test (strict `toEqual` on sorted keys — full key set, not a subset). Coverage: `packages/protocol` keeps 100%; bridge branches unreachable in unit scope (WASM-internal error surfaces) get explicit, justified carve-outs decided in the PR, not at CI time. No coverage-padding tests.
- **Operational:** keep-state proving e2e runs serialized against its proof server (spike-documented contention; parallel cross-fork proving flakes). The fee-paying cross-fork e2e uses the test-only wallet shim (OQ7) — the shim port is a named work item so the e2e never silently degrades to `test.skip`.

---

## 9. Acceptance Criteria

AC numbering restarts in v3 (v2 mapping: AC4→AC3, AC11→AC4, AC12→AC5, AC13→AC8; v2 AC1/AC9/AC10 and the DEV-6/SEC-2 gates are withdrawn with the accessor layer).

- **AC1** — `protocol` exposes the version-identity utilities (FR1); `protocolVersionToLedger` maps the OQ1 ranges and throws typed on unknown ints; the package's pre-existing surface is byte-for-byte unchanged.
- **AC2** — All typed error paths of §6.2 exist and are negative-tested: unknown version (read and construct, separately), pre-fork head, post-fork v8 deploy, down-convert failure, SEC-5 mismatch, SEC-9 pre-migration state, stale-head, missing `keepState` config, missing `v8Codec`, unsanctioned mixing. No silent fallback anywhere (NFR1).
- **AC3** — **Keep-state:** a contract deployed under ledger-8 accepts a new transaction after the fork with **no recompilation and no v9 variant**; post-fork calls verify against the preserved `co.v2` key (negative: V3 proof fails verification); the #1052 POJO-only boundary holds under the dual-instance test. (FR4)
- **AC4** — **v9-native non-regression:** v9 call/deploy flows behave exactly as before — verified by the FR7 mechanism (unmodified suites + golden fixtures), not by absence of complaints. (FR7)
- **AC5** — **Routing & developer contract:** calls route via the total four-shape truth table; deploys via the artifact version tag; keep-state is enabled by the single documented `keepState` config with no contract/artifact changes; missing config fail-fasts with the snippet-bearing error. (FR3, FR4)
- **AC6** — **Structural isolation:** no core package resolves `ledger-v8` or the bridge (CI dependency-graph gate); a v9-only dApp ships exactly today's single WASM stack. (FR5, NFR6)
- **AC7** — Historical v8 records decode correctly through the injected codec, per-record; v9 records through the static path; `yarn lint` clean, build succeeds, tests pass, no `any`/`unknown` casts (CI-enforced from the first PR). (FR6, NFR2, NFR5)
- **AC8** — **Observability:** all four version-dispatch decision points emit the §6.3 breadcrumb (selected version, path, source, raw int) — unit-tested with an injected logger, strict equality on structured fields, no payloads/keys.
- **AC9** — **Documentation ships with the feature:** migration guide (the `keepState` snippet, the OQ12 proof-server operator matrix once pinned, the D9 pre-fork stance), TROUBLESHOOTING entries for the new typed errors, llms.txt/API-doc updates.

---

## 10. Rollout & Sequencing

Sequenced by **dependency order** (D12 — the fork date is not a scheduling input for this spec):

1. **`protocol` version utils** (small, additive, unblocks everything).
2. **`fork-bridge` package** — keep-state primitives first (root entry), `./v8` codec second; each independently testable against fixtures.
3. **`contracts` routing** (consumes 1 + the interface; bridge injected in tests).
4. **`indexer-public-data-provider` codec dispatch** + barrel re-export of the version utils.
5. **Hardening:** OQ8 cross-check mechanism (with its negative test), OQ15 discriminant assert if upstream provides one, fork-capable e2e when OQ14 lands.

Notes:
- **Versioning:** core packages take additive/minor changes only (nothing existing moves — D3); the bridge versions independently and fast during the window. Public-API additions follow repo release conventions.
- **Removal path (D8):** at v10, deprecate the bridge package and shrink `LedgerVersion` — the single compile-time signal downstream code keys on. Pre-announced from day one in the bridge's README.
- **Operator requirement (OQ12):** the transition-window proof-server matrix (which versions, for which proving legs, which server(s) receive the witness) becomes a documented operator-facing requirement once pinned.
- **Wallet SDK dependency (OQ7):** the fee-paying cross-fork e2e depends on wallet state migration; the test-only shim port (spike `facade-builder.ts`/`sim-reads.ts` → testkit) is a named work item with an owner, deleted when the Wallet SDK lands `migrateState`.
- **Issue updates:** #1004's "unified v8/v9 dispatch APIs" framing and the #1005/#1006 sizings predate v3 — re-scope all three issues against D10/D11 (MJS-01 shrinks substantially; MJS-03 shrinks to the codec injection + OQ11 routing).

---

## 11. Open Questions

Gates close only when a concrete artifact is merged with a green test. Mirror the open items as tracker issues (owners + resolve-by) rather than growing this document.

- **OQ1 — RESOLVED.** `protocolVersion` int encodes the **node** version (`major·1_000_000 + minor·1_000`); authoritative mapping in [`midnight-indexer/.../protocol_version.rs`](https://github.com/midnightntwrk/midnight-indexer/blob/main/indexer-common/src/domain/protocol_version.rs): node 0.22 & 1.0 → v8; node 2.0 & 2.1 → v9; anything else → error. Implemented as ranges with a fail-fast else-branch + table test. Outstanding: node/ledger team confirms the table is a *contract* and future ranges extend the convention.
- **OQ2 — RESOLVED (pins; re-confirm at implementation — RC tags churn).** v8 decode surface: `@midnight-ntwrk/ledger-v8@8.1.0` + `onchain-runtime-v3`; retained execution stack (dApp-owned): compact `0.31.1` / compact-runtime `0.16.0`; v9: `ledger-v9@1.0.0-rc.3` / `onchain-runtime-v4@4.0.0-rc.3`. **Supply-chain checklist** (scoped to the bridge package in v3): verify org ownership of both npm scopes (`@midnight-ntwrk` vs `@midnightntwrk` — a typosquat-shaped risk exactly where a wrong scope hides in review); exact pins + lockfile integrity for the v8 tree; CI gate asserting only audited scopes/versions in the bridge's resolved tree.
- **OQ3 — rescoped (v3):** (a) the final `./v8` decoder list — which historical record types dApps actually consume (product input; today's codec surface is 4 functions, and post-fork contract state is v9-enveloped, so the likely answer is 2–3); (b) byte-identity verification for the shared POJO layer (`AssertEqual` + fixtures); (c) which v8 decoders fail **open** on wrong-version input (drives the codec-seam discriminant checks, §6.2). Gate: the checked-in decoder list + identity assertions.
- **OQ4 — RESOLVED.** Exactly one sanctioned cross-version composition exists (keep-state: ledger-8 transcript in a native v9 tx with a V2 proof); the seam rejects any other intra-tx mix (negative test, §8).
- **OQ5 — WITHDRAWN (v3, D12).** The fork date/height is not a design or priority driver for this spec. It remains a business/planning datum tracked outside this document.
- **OQ6 — WITHDRAWN (v3).** The v2 lazy-init design (`initLedgerV8`, pre-init typed throws, CJS smoke tests) is moot under D11: the bridge's `./v8` import is the opt-in, and upstream at-import WASM instantiation (verified on `ledger-v9@1.0.0-rc.3`; confirm same layout on `ledger-v8` when pinning) is acceptable inside an explicitly-installed transitional package.
- **OQ7 — CONFIRMED REAL (owner: Wallet SDK track).** `migrateState` is an unimplemented stub; the spike reconstructed v9 wallet dust/shielded state from migrated on-chain state. Wallet SDK scope, but the midnight-js cross-fork fee e2e depends on it. Fallback (named work item, §10): port the spike's reconstruct shim into testkit as test-only scaffolding; delete when the SDK lands.
- **OQ8 — SECURITY, downgrade cross-check (owner: TBD — a named owner formally accepts the residual risk while open).** Independent signal to cross-check the indexer's head version on construct/submit (§6.1). Until it lands, §6.3 breadcrumbs are the detection; the negative test ships with the mechanism. Resolve before the release is declared production-ready for the transition window.
- **OQ9 — PARTIALLY RESOLVED.** Spike islands are the canonical fixture source (reproducible generators exist). Remaining: port/mint per §8 inventory + record the verification-harness decision (ledger-v9 local verify vs spike simulator). Blocks the decode/keep-state test slices.
- **OQ10 — support window (owner: team/PO).** Confirm "current + previous" (D8) as standing policy — asked on [#1005](https://github.com/midnightntwrk/midnight-js/issues/1005#issuecomment-5166550550). Until answered, D8 is a proposal.
- **OQ11 — hybrid-proving ownership (owner: TBD; before MJS-03 freeze).** Does keep-state proving routing (local key triples for contract legs, proof server for native legs) land in MJS-02 or MJS-03?
- **OQ12 — proof-server version matrix (owner: TBD; before MJS-03 freeze).** Which proof-server version(s) must an operator run during the transition (contract legs vs native legs; one server or two) — and which server(s) receive the private witness. Becomes an operator-facing rollout requirement (§10).
- **OQ13 — keep-state execution-leg shape (owner: TBD; before the bridge API freeze).** Confirm keep-state needs no compact-js involvement (the spike drives raw `createCircuitContext` + invoke); if a shim is needed, pin a 0.16-compatible version. Also record the artifact field carrying the version tag for deploy-path detection (§4.3).
- **OQ14 — fork-capable e2e environment (owner: TBD).** Define/build the node+indexer+proof-server matrix that starts at v8 and migrates at a height (or adopt the spike simulator). Until then, proof/apply-level ACs gate at the unit/integration harness tier.
- **OQ15 — NEW (v3; owner: ledger team; non-blocking).** Request a cheap, reliable version discriminant on transaction objects from the v9 ledger API, enabling a one-line assert at the proving seam (§6.1). Nice-to-have defence-in-depth; the design does not depend on it.

**Assumptions.** **A1:** the indexer tags every block/tx/event with a correct `protocolVersion`; trusted subject to the OQ8 cross-check stance. **A2:** the dApp retains its pre-fork toolchain outputs unchanged (artifacts, keys, runtime); the framework never compiles contracts and never mutates artifacts.
