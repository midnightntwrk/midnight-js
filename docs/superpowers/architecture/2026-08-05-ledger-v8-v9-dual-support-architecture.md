# Architecture Document — Ledger v8/v9 Support in Midnight.js (Hard-Fork Transition)

**Status:** Derived from Design Spec Draft v3.5 (2026-08-06) · helper names aligned with spec v3.8 (`isDecodedTxData()` / `createRawFinalizedTxData()`)
**Source spec:** [`docs/superpowers/specs/2026-07-09-ledger-v8-v9-dual-support-design.md`](../specs/2026-07-09-ledger-v8-v9-dual-support-design.md)
**Related issues:** [#1004](https://github.com/midnightntwrk/midnight-js/issues/1004) · [#1005](https://github.com/midnightntwrk/midnight-js/issues/1005) · [#1006](https://github.com/midnightntwrk/midnight-js/issues/1006)
**Program:** Ledger v8→v9 Hard Fork Migration (SOW-Q3-10 / product#119)

---

## Table of Contents

1. [Purpose & Context](#1-purpose--context)
2. [Architecture Overview](#2-architecture-overview)
3. [Package & Component View](#3-package--component-view)
4. [Runtime Views](#4-runtime-views)
5. [Data & Type Boundaries](#5-data--type-boundaries)
6. [Security View](#6-security-view)
7. [Error Handling Strategy](#7-error-handling-strategy)
8. [Key Architectural Decisions](#8-key-architectural-decisions)
9. [Quality Attributes & Verification](#9-quality-attributes--verification)
10. [Lifecycle & Removal Plan](#10-lifecycle--removal-plan)
11. [Glossary](#11-glossary)

---

## 1. Purpose & Context

The Midnight blockchain performs a hard fork from Ledger protocol **v8** to **v9**. After the fork:

- On-chain history (blocks, transactions, events) before the fork height is encoded with **v8**; everything after with **v9**. One dApp session may read both.
- At the fork, the protocol **migrates every deployed contract's `ContractState` into the ledger-9 envelope**, preserving the pre-fork verifier key (`co.v2`). State *data* and call transcripts are **byte-identical** across versions — only the envelope changes. These migration facts are **contractual upstream guarantees** (#1005 answer 1).
- Pre-fork contracts stay compiled and executable only on the ledger-8 toolchain (compact-runtime 0.16 / onchain-runtime-v3).

Midnight.js today is hard-pinned to v9: `@midnight-ntwrk/midnight-js-protocol` re-exports `ledger-v9` / `onchain-runtime-v4` exclusively. The solution adds exactly three capabilities:

| Capability | Mechanism |
|---|---|
| **(a) Decode historical v8 records** | Framework surfaces v8 records as **raw bytes + protocol version**; the dApp decodes them with an opt-in compat codec |
| **(b) Construct & submit v9 transactions** | Unchanged — the pipeline stays statically v9 (decision D9) |
| **(c) Keep pre-fork contracts transacting post-fork** | **Keep-state**: down-convert migrated state, execute on the dApp's retained ledger-8 stack, wrap the transcript in a native v9 transaction with a V2 proof |

**Explicit non-goal:** this is *not* a generic multi-version framework. At most two ledger versions are ever live (support window: current + previous, D8), so version dispatch is a two-case switch at the few places that need it — no facades, no parameterised accessors (D10).

---

## 2. Architecture Overview

### 2.1 System context

```mermaid
flowchart TB
    subgraph external["External systems (outside trust boundary)"]
        indexer["Indexer (GraphQL)<br/>reports protocolVersion per record<br/>+ network head"]
        proofserver["Proof server (v9-era)<br/>ONE dual-capable instance<br/>ZKIR v2 + v3, server-side dispatch"]
        node["Midnight node<br/>ledger-9 apply:<br/>transcript replay + effects equality"]
    end

    subgraph dapp["dApp process (single trust domain)"]
        app["dApp code<br/>+ retained ledger-8 stack<br/>(compact-runtime 0.16, onchain-runtime-v3)"]
        mjs["Midnight.js framework<br/>(statically v9)"]
        compat["@midnight-ntwrk/midnight-js-ledger-v8-compat<br/>(transitional, opt-in, dApp-installed)"]
    end

    app -->|"config: keepState bridge<br/>+ codec imports"| compat
    app --> mjs
    compat -->|"injected inward as<br/>KeepStateBridge (POJOs + v9 types only)"| mjs
    mjs <-->|"records, head version,<br/>raw contract state"| indexer
    mjs -->|"witness + key triples"| proofserver
    mjs -->|submit v9 tx| node
```

Key structural facts:

- **The framework core never gains a v8 dependency** (FR5). All v8 capability lives in one transitional leaf package installed and injected by the dApp.
- **The integrity backstop is the ledger itself**: at apply, ledger-9 replays the transcript against real on-chain state and requires effects equality. Any indexer/state tampering is bounded to DoS/griefing — never fund or verification compromise.

### 2.2 The keep-state idea in one picture

```mermaid
flowchart LR
    A["Migrated ContractState<br/>(v9 envelope, co.v2 key preserved,<br/>data byte-identical)"]
    B["Down-convert<br/>(extract POJO → decode + rehash<br/>in dApp's 0.16 instance)"]
    C["Execute circuit<br/>on unchanged ledger-8 stack<br/>(no recompilation)"]
    D["Wrap POJO transcript<br/>→ native v9 ContractCallPrototype"]
    E["v9 Intent → Transaction<br/>→ V2 proof (key-tag selected)<br/>→ submit"]

    A --> B --> C --> D --> E
```

No recompilation, no v9-compiled variant, no artifact selection. The contract, its keys, and its executing runtime all stay on ledger-8; only the transaction envelope and proof wrapping are v9-native.

---

## 3. Package & Component View

### 3.1 Package dependency diagram

```mermaid
flowchart BT
    subgraph core["Core packages (v9-only, zero v8 knowledge)"]
        protocol["protocol<br/>+ version.ts (additive)<br/>re-exports ledger-v9 (unchanged)"]
        types["types — declarations ONLY:<br/>rawTx field, generic KeepStateBridge<br/>family, 2 provider queries"]
        utils["utils — runtime helpers:<br/>isDecodedTxData(), createRawFinalizedTxData()"]
        contracts["contracts<br/>routing, dedicated keep-state entry<br/>(consumes KeepStateBridge from types)"]
        indexerprov["indexer-public-data-provider<br/>raw surfacing for v8 records,<br/>queryRawContractState,<br/>queryLatestProtocolVersion"]
        barrel["midnight-js (barrel)<br/>re-exports version utils + isDecodedTxData;<br/>compat NOT re-exported"]
    end

    subgraph leaf["Transitional leaf (dApp-side only)"]
        compat["ledger-v8-compat<br/>entry '.': keep-state bridge<br/>entry './codec': v8 decoders"]
    end

    subgraph wasm["WASM stacks"]
        v9["ledger-v9 / onchain-runtime-v4"]
        v8["ledger-v8 (codec entry only)"]
    end

    types --> protocol
    utils --> types
    contracts --> types
    indexerprov --> types
    indexerprov --> utils
    barrel --> contracts
    barrel --> indexerprov
    protocol --> v9
    compat -. "peerDependencies:<br/>protocol (v9 via protocol/ledger ONLY)<br/>+ types (implements KeepStateBridge)" .-> protocol
    compat -.-> types
    compat -- "regular dependency<br/>(./codec entry only)" --> v8
```

CI dependency-graph gates enforce the arrows that must **not** exist:

1. No core package resolves `ledger-v8` or the compat package.
2. The compat package resolves **no direct `ledger-v9`** — v9 enters it exclusively through the `protocol` peerDependency, which guarantees a **single v9 WASM instance** in the process (closes the #1052 dual-instantiation axis by construction).

### 3.2 Component responsibilities

#### `protocol` (MJS-01) — version identity only

One new module, nothing else changes. No new dependencies, no WASM change, no subpath change.

```ts
export const LEDGER_VERSIONS = ['v8', 'v9'] as const;
export type LedgerVersion = (typeof LEDGER_VERSIONS)[number];

// Maps the indexer's protocolVersion int (encodes NODE version:
// major·1_000_000 + minor·1_000) to a LedgerVersion via BOUNDED PER-MAJOR
// ranges (same major ⇒ same era, #1005 answer 6). Fail-fast ONLY on an
// unknown major; an unseen minor within a known major maps automatically.
export const protocolVersionToLedger = (protocolVersion: number): LedgerVersion => { ... };

// Two syntactically distinct sourcing helpers — wrong pairing is visible in review:
export const versionOfRecord = (record: { protocolVersion: number }): LedgerVersion;      // read paths
export const networkHeadVersion = (source: { queryLatestProtocolVersion(): Promise<number> }): Promise<LedgerVersion>; // construct paths
```

Layering note: `types` depends on `protocol`, so `protocol` takes **structural parameters** — it cannot import provider interfaces. `protocolVersionToLedger` is the **sole narrowing point** from an untrusted `number` to the closed `LedgerVersion` set.

Version-int mapping (per-major bounded ranges — spec v3.5/BC-1; deliberately coarser than the indexer's per-minor table so a routine node minor upgrade never bricks dApps):

| protocolVersion range | Node version | LedgerVersion |
|---|---|---|
| 22 000 ≤ v < 23 000 | 0.22 (major-0 historical exception) | v8 |
| 1 000 000 ≤ v < 2 000 000 | 1.x | v8 |
| 2 000 000 ≤ v < 3 000 000 | 2.x | v9 |
| unknown **major** | — | **typed error** (designed maintenance signal — a new major genuinely can be a new era; no open-ended `>=`) |

#### `@midnight-ntwrk/midnight-js-ledger-v8-compat` (new, D11) — the transitional package

One package per fork window, named for the version it retires with. Two entry points, so a keep-state-only consumer never pays the v8 WASM cost:

| Entry | Purpose | Dependencies |
|---|---|---|
| `.` (root) | `createKeepStateBridge({ compactRuntime, onchainRuntime })` — the keep-state implementation | peerDependencies: `protocol` (v9 **only via `protocol/ledger`**) + `types` (implements `KeepStateBridge`); 0.16 runtimes are dApp-supplied instances |
| `./codec` | v8 historical-record decoders (`decodeTransaction`, `decodeLedgerParameters`, `decodeZswapState`; final list = OQ3) | `@midnight-ntwrk/ledger-v8` as the **only regular v8 dependency in the whole tree**; importing the entry instantiates the v8 WASM — **the import is the opt-in** |

Internals of the root entry (exported only for the package's own tests):

- `extractEncodedStateValue` — v9-enveloped bytes → byte-identical POJO; throws on malformed input.
- `toExecutionState` — decode **and rehash** inside the dApp's own 0.16 runtime instance (bounded Merkle trees return non-rehashed and must be rehashed before any `checkRoot`).
- `wrapTranscriptV9` — POJO transcript + key tag → native v9 `ContractCallPrototype` (same v9 instance as the host app, guaranteed by peer resolution).

The 0.16 runtime types (`CompactRuntime016`, `OnchainRuntimeV3`) are **hand-maintained structural interfaces** covering only the members the package calls; a CI compile test against the real packages (devDependencies) detects drift.

#### `contracts` (MJS-02) — protocol-version orchestration

- Resolves the active version **per operation** (memoised within the operation only — no session-level subscription).
- Consumes the `KeepStateBridge` interface **declared in `types`** (a provider-shaped seam, like the seven provider interfaces) at `executeCall` granularity — **only POJOs and v9 types in signatures**; no 0.16 type ever appears in a core-package signature. Witness/private-state shapes are **opaque generics**, so closing OQ13 cannot churn the published `types` surface:

```ts
export interface KeepStateBridge<TArgs, TWitnesses, TPrivateState> {
  usesSameLedgerInstance(probe: typeof ContractState): boolean; // typed probe — wrong symbol = compile error (#1052 guard)
  executeCall(
    input: KeepStateCallInput<TArgs, TWitnesses, TPrivateState>
  ): Promise<KeepStateCallResult<TPrivateState>>;
}
```

- Ships keep-state as a **dedicated entry point** (e.g. `submitKeepStateCallTx`): pre-fork contracts are typed against the 0.16 toolchain and generally cannot satisfy the v9-pinned generics of the existing call entry. The `keepState` bridge attaches as a **typed options field of this entry** (not on the global providers object), so keep-state stays invisible to v9-only code paths. The v9-native entry's signatures and generics are **untouched** (FR7).
- **Single state snapshot per operation:** one `queryRawContractState` fetch; `contracts` decodes those bytes itself for the routing key-set and the SEC-5 pre-check, then hands the identical bytes to `bridge.executeCall` — no intra-operation TOCTOU window.
- Runs the ledger-instance identity check at `keepState` attach; mismatch throws `KeepStateLedgerInstanceMismatchError` at configuration time. The probe is the `ContractState` constructor from `protocol/ledger`, compared by constructor-reference equality on both sides.

#### Providers (MJS-03) — shrunk scope

| Provider | Change |
|---|---|
| `indexer-public-data-provider` | v8-tagged records populate the additive `rawTx: Uint8Array` field — the **sole** additive field (`protocolVersion` pre-exists on every record); `rawTx` is populated on v8 records only, so its presence is the runtime discriminant. Accessing the v9-typed `tx` on a v8 record throws a typed error naming the compat codec — via a **non-enumerable accessor** (serialization/spread/deep-equality never trip it) installed by the mandatory `createRawFinalizedTxData()` factory from `utils`; consumers narrow with `isDecodedTxData()` instead of try/catch. Additive `queryRawContractState` returns the **serialized** migrated state (bytes, never a WASM object across the package boundary; works pre-fork too — only *decoded* state reads throw SEC-9). Additive `queryLatestProtocolVersion()` backs `networkHeadVersion`. Both new members are implementer-facing breaking — all in-repo implementations and testkit mocks update in the same PR. |
| Proof providers | **Unchanged.** The transition runs against one dual-capable proof server; ZKIR self-describes its version; retained pre-fork key triples pass through the existing configured `proofProvider` (delivery API = OQ12). |
| `level-private-state-provider` | Expected version-agnostic (stores opaque values the migration never touches); confirmed during MJS-03. |
| `types` | **Consumer-compile-compatible, declarations only** — `rawTx` field, generic `KeepStateBridge` family + keep-state entry options type, two provider queries. Three recorded runtime caveats: `.tx` throw on v8 records, SEC-9 pre-fork throw on decoded state queries, implementer-facing provider members. |
| `utils` | Runtime helpers `isDecodedTxData()` + `createRawFinalizedTxData()` (`types` stays implementation-free per NFR4). |
| `midnight-js` barrel | Re-exports the new version utils + `isDecodedTxData()`. The compat package is deliberately **not** re-exported. |

### 3.3 How compat is injected into the existing transaction flow

The compat package is **not** spliced into the middle of the existing pipeline. Injection happens through one config object and one dedicated entry point; the v9-native flow is untouched end to end.

```mermaid
flowchart TB
    subgraph dappcode["dApp code (owns the injection)"]
        create["createKeepStateBridge({ compactRuntime, onchainRuntime })<br/>— dApp's OWN retained 0.16 instances"]
        codec["import 'ledger-v8-compat/codec'<br/>(history decode — never enters the tx flow)"]
    end
    subgraph fw["Framework"]
        entry["dedicated entry submitKeepStateCallTx<br/>options: { keepState: bridge }<br/>(typed in types — NOT the global providers object)"]
        attach["attach-time check:<br/>usesSameLedgerInstance(probe)"]
        route["per-call routing on key set:<br/>co.v2-only → keep-state<br/>(same bytes feed routing, SEC-5, executeCall)"]
        pipe["UNCHANGED pipeline:<br/>Intent → Transaction → proveTx<br/>→ balanceTx → submitTx"]
    end

    create --> entry --> attach --> route
    route -->|"bytes in / v9 ContractCallPrototype out"| pipe
```

**1. Injection point — the `keepState` option of the dedicated entry (the only seam).** The dApp installs the compat package, constructs the bridge with its **own** retained 0.16 runtime instances, and passes it in the dedicated entry's typed options — keep-state never touches the global providers object, so it stays invisible to v9-only code paths:

```ts
import { createKeepStateBridge } from '@midnight-ntwrk/midnight-js-ledger-v8-compat';

const keepState = createKeepStateBridge({ compactRuntime, onchainRuntime });
await submitKeepStateCallTx(providers, { /* call options */, keepState });
```

This is dependency inversion: `types` declares the generic `KeepStateBridge` interface (POJOs + v9 types only — a provider-shaped seam, like the seven provider interfaces); the compat package implements it via its `types` peerDependency; the framework never imports compat — it receives an instance from outside. The constraint is hard: the framework cannot reach the dApp's runtime module instances (#1052 WASM dual-instantiation), so the dApp must bring them.

**2. Attach time — fail-fast validation.** When the option is attached, `contracts` calls `bridge.usesSameLedgerInstance(probe)` — passing the `ContractState` constructor from `protocol/ledger` (the parameter is typed `typeof ContractState`, so a wrong symbol is a compile error). One reference-equality check that compat and the host app share the same ledger-v9 module instance (guaranteed by the `protocol` peerDependency, but defeatable by bundler misconfiguration). A mismatch throws `KeepStateLedgerInstanceMismatchError` **at configuration time**, not as a mysterious proof failure minutes later.

**3. Use time — per-operation routing into a dedicated entry.** The existing v9 call/deploy entry is untouched (FR7). Keep-state ships as a separate entry (e.g. `submitKeepStateCallTx`) because a pre-fork contract's generated types target the 0.16 toolchain and cannot satisfy the v9-pinned generics of the existing entry. On each call, `contracts` fetches the raw migrated state **once** (`queryRawContractState`), decodes those bytes itself for the verifier-key set, and routes: `co.v2`-only → keep-state (only here is the bridge touched; a missing `keepState` option throws a typed error containing the exact snippet above plus both plausible causes — a migrated pre-fork contract, or a v9-era ZKIR-v2 deploy mis-hitting the route while assumption A4 is unconfirmed); `v3`/`ir` present → v9-native, bridge never invoked. Routing, the SEC-5 pre-check, and `executeCall` all consume the **same fetched bytes** — a single state snapshot per operation.

**4. Division of labour — bridge vs existing pipeline.** The bridge receives **bytes** (the raw migrated state from the provider's additive `queryRawContractState`) and returns a native v9 object:

```
contracts ──serializedContractState (Uint8Array)──▶ bridge.executeCall(...)
   ◀── { transcript (POJO), callPrototype: ContractCallPrototype (v9), nextPrivateState }
```

From that point the transaction re-enters the **unchanged** pipeline: `Intent → Transaction` (existing `zswap-utils`) → `proveTx` (existing `proofProvider`; V2 proof selected from the key tag, server dispatches on the ZKIR's embedded version) → `balanceTx` → `submitTx`. Proof, wallet, and midnight providers are unaware compat exists — the only addition is passing the retained pre-fork key triples through the existing `proofProvider` (delivery API = OQ12).

**5. The non-injection: `./codec`.** The v8 history decoders never enter the transaction flow or the providers. The provider surfaces v8 records as `rawTx + protocolVersion`; the dApp imports `ledger-v8-compat/codec` and decodes on its own side. Importing that entry *is* the opt-in (it instantiates the v8 WASM).

Summary: one seam (`keepState` in the config), one dedicated entry, fail-fast validation at attach, data crossing the boundary only as bytes/POJOs — and the prove→balance→submit chain stays exactly what runs today.

---

## 4. Runtime Views

### 4.1 Operation routing (decision view)

```mermaid
flowchart TD
    start(["Operation requested"]) --> head{"networkHeadVersion?"}
    head -->|"v8 (pre-fork)"| prefork{"Operation type?"}
    prefork -->|"read records / raw contract state"| readok["OK — read works<br/>(v8 records + contract state<br/>surface as raw bytes; decoded<br/>state reads throw SEC-9)"]
    prefork -->|"construct / submit"| err1["✗ typed pre-fork error (D9)<br/>'stay on midnight-js vX'"]
    head -->|"v9 (post-fork)"| op{"Call or deploy?"}

    op -->|deploy| dep{"Artifact version tag?"}
    dep -->|ledger-9| v9dep["✓ v9-native deploy (default)"]
    dep -->|ledger-8| err2["✗ typed error —<br/>new deploys require v9 artifacts"]

    op -->|call| keys{"Verifier key set of fetched<br/>(migrated) ContractState?"}
    keys -->|"co.v2 only"| ks["→ KEEP-STATE path"]
    keys -->|"v3/ir present, no co.v2"| v9call["→ v9-native path (default, untouched)"]
    keys -->|"both populated<br/>(post-fork key rotation)"| both["→ v9-native + dual-key breadcrumb"]
    keys -->|neither| err3["✗ typed unsupported-key-set error"]

    ks --> cfg{"keepState config attached?"}
    cfg -->|no| err4["✗ typed error with the exact<br/>config snippet to add"]
    cfg -->|yes| bridge["bridge.executeCall(...)"]
```

The key-set truth table is **total** (the shape is an adversarial input) and routing and proof-version selection read the **same key tag**, so they can never disagree.

### 4.2 Keep-state call (sequence view)

```mermaid
sequenceDiagram
    autonumber
    participant D as dApp
    participant C as contracts<br/>(dedicated keep-state entry)
    participant P as indexer-public-data-provider
    participant B as KeepStateBridge<br/>(ledger-v8-compat, root entry)
    participant PP as proofProvider →<br/>proof server (dual-ZKIR)
    participant W as walletProvider
    participant M as midnightProvider

    Note over D: bridge = createKeepStateBridge({ compactRuntime, onchainRuntime })
    D->>C: submitKeepStateCallTx(providers, { circuitId, args, witnesses, keepState: bridge })
    C->>B: usesSameLedgerInstance(probe)
    alt instance mismatch (bundler misconfig)
        B-->>C: false
        C-->>D: ✗ KeepStateLedgerInstanceMismatchError (at attach, before any work)
    end
    C->>P: networkHeadVersion → v9
    C->>P: queryRawContractState(address)
    P-->>C: serialized migrated state (Uint8Array, v9 envelope)
    Note over C: ONE fetch per operation — contracts decodes these bytes<br/>for the routing key-set + SEC-5, then hands the identical<br/>bytes to executeCall (no intra-operation TOCTOU)
    C->>B: executeCall({ serializedContractState, circuitId, args, witnesses, privateState })
    Note over B: extract POJO → decode + rehash in dApp's 0.16 instance<br/>→ execute circuit on retained ledger-8 stack<br/>→ wrap POJO transcript → v9 ContractCallPrototype
    B-->>C: { transcript, callPrototype, nextPrivateState }
    C->>C: compose Intent → Transaction (existing zswap-utils, v9-native binding)
    C->>C: SEC-5 pre-check: local verifier key ≟ fetched co.v2 slot (throw before proving)
    C->>PP: proveTx — V2 proof, selected by resolved key tag (never hardcoded)
    PP-->>C: proven tx
    C->>W: balanceTx
    W-->>C: finalized tx
    C->>M: submitTx
    M-->>D: TransactionId
    Note over M: ledger-9 apply: dispatch to preserved co.v2,<br/>replay transcript, require effects equality (backstop)
```

The overall transaction flow shape (`UnprovenTransaction → proveTx → balanceTx → submitTx`) is unchanged and statically v9.

### 4.3 Historical v8 record read (sequence view)

```mermaid
sequenceDiagram
    autonumber
    participant D as dApp
    participant P as indexer-public-data-provider
    participant K as ledger-v8-compat/codec<br/>(dApp-side import = opt-in)

    D->>P: query historical records
    P->>P: per-record dispatch on protocolVersion
    alt record tagged v9
        P-->>D: FinalizedTxData with decoded tx (static path, unchanged)
    else record tagged v8
        P-->>D: FinalizedTxData with rawTx: Uint8Array populated (sole additive field —<br/>protocolVersion pre-exists on every record)
        Note over D: direct .tx access throws a typed error naming the compat codec<br/>(non-enumerable accessor — stringify/spread never trip it)<br/>narrow with isDecodedTxData() from utils instead of try/catch
        D->>K: decodeTransaction(rawTx)
        K-->>D: decoded v8 object (distinct type, lives dApp-side only)
    end
```

The provider carries **zero v8 knowledge** — no injection seam, no v8 decode in core. Decoded v8 objects never inhabit v9-typed core interfaces.

### 4.4 Transition timeline (state view)

```mermaid
stateDiagram-v2
    direction LR
    PreFork: Network head = v8
    PostFork: Network head = v9
    Retired: Compat retired (framework v10)

    PreFork --> PostFork: hard fork —<br/>protocol migrates all ContractState<br/>to v9 envelope (co.v2 preserved)
    PostFork --> Retired: midnight-js policy decision (OQ10) —<br/>npm deprecate compat package,<br/>shrink LedgerVersion

    note right of PreFork
        Framework: read-capable only.
        Raw records + raw contract state
        work (decode via compat codec).
        decoded state reads throw SEC-9.
        construct/submit throws typed
        pre-fork error (D9).
    end note
    note right of PostFork
        v9-native: default, untouched.
        Keep-state: pre-fork contracts
        keep transacting (opt-in).
        v8 history: raw + dApp-side decode.
    end note
```

A **stale-head race** exists at the fork boundary: the head can flip between version resolution and submit (proving takes minutes). A submit rejection consistent with a flip surfaces a dedicated typed error advising re-resolution — never a silent auto-retry.

---

## 5. Data & Type Boundaries

There is **no unified v8/v9 type surface**. The type discipline is enforced by placement, not discriminants:

```mermaid
flowchart LR
    subgraph core["Core packages — 100% v9-typed"]
        v9types["v9 types (via protocol)<br/>+ raw bytes + version int<br/>for v8 records"]
    end
    subgraph bridge["Bridge interface (contracts ↔ compat)"]
        pojo["POJOs + v9 types ONLY<br/>(executeCall granularity)"]
    end
    subgraph dappside["dApp side only"]
        v8types["decoded v8 objects (codec output)<br/>0.16 runtime types (structural)"]
    end

    core --- bridge --- dappside
```

| Layer | Rule |
|---|---|
| Core interfaces | Carry v8 data **only** as the additive `rawTx: Uint8Array` (v8 records only; `protocolVersion` pre-exists on every record). No unions, no brands, no casts. The declared `tx` stays required — a documented lying type on v8 records (weak compile-time signal by design); mitigations: non-enumerable throwing accessor, `isDecodedTxData()` guard narrowing on `rawTx` absence, mandatory `createRawFinalizedTxData()` factory (`utils`). |
| `KeepStateBridge` | Declared in `types`, generic over `TArgs`/`TWitnesses`/`TPrivateState` (opaque — OQ13 closes without churning `types`); POJOs + v9 types in signatures; no retained-stack (0.16) type crosses into core. |
| Shared keep-state POJO layer | `EncodedStateValue`, transcript/`Op`/`AlignedValue` — **byte-identical across versions** (spike-established, contractual). Fixtures are the authoritative check. |
| Package boundary | Raw serialized state crosses as **bytes**, never as a WASM-backed object. |

---

## 6. Security View

### 6.1 Trust boundaries

```mermaid
flowchart TB
    subgraph trusted["dApp process (trusted)"]
        mjs[Midnight.js + compat + dApp code]
    end
    subgraph untrusted["Outside trust boundary"]
        idx["Indexer<br/>(version ints, records, state bytes + key shapes)"]
        ps["Proof server<br/>(receives full private witness)"]
        zk["zk-config artifact source<br/>(prover/verifier/zkir triples)"]
    end
    ledger["Ledger-9 apply<br/>(effects-equality backstop)"]

    idx -->|adversarial input| mjs
    mjs -->|witness| ps
    zk -->|artifacts| mjs
    mjs -->|tx| ledger
```

| Boundary | Data crossing | Failure mode → bound |
|---|---|---|
| Indexer | `protocolVersion` ints; records; `ContractState` key-set shape + bytes | Mis-route / garbage execution input → **bounded to DoS/griefing** by the effects-equality backstop |
| Proof server | Private witness + key triples | Witness exfiltration if compromised; single dual-capable instance is the sole witness recipient |
| zk-config source | Artifact triples | Tampered/stale artifacts → griefing; bounded by the SEC-5 `co.v2` byte-match pre-check |
| dApp-supplied runtime handles | Module references | Same trust domain; wrong module = typed failure (attach-time identity check) |

### 6.2 Defence layers

1. **Sole narrowing point:** `protocolVersionToLedger` is the only place the untrusted int becomes a `LedgerVersion`; unknown ints fail fast.
2. **Total routing truth table:** all four key-set shapes have a deterministic outcome; routing and proof-version selection read the same tag.
3. **SEC-5 pre-proving check:** locally-resolved verifier key must byte-match the fetched state's `co.v2` slot — throws **before** proving starts.
4. **Attach-time instance identity:** one `===` reference check catches bundler-induced dual v9 instances at config time instead of as a proof failure minutes later.
5. **Ledger backstop:** transcript replay + effects equality at apply bounds all upstream tampering to DoS.
6. **Observability breadcrumbs (§6.3 of spec):** a plausible-but-wrong version passes narrowing silently, so every version-dispatch decision emits a debug-level `loggerProvider` breadcrumb (selected version, path, source, raw int). Residual risk (indexer head-version downgrade cross-check) is tracked as **OQ8** with a named risk owner.
7. **Privacy constraint on errors/logs:** version ints, sets, and key *identifiers* allowed; key bytes, decoded state contents, and raw payloads never.

---

## 7. Error Handling Strategy

Fail-fast, typed, remediation-bearing — never a silent default. Every new error class carries a stable `code` discriminant (the repo dual-publishes under two npm scopes; `instanceof` across mixed scopes fails silently).

| Condition | Error behaviour |
|---|---|
| Unknown `protocolVersion` int | Typed error naming the observed int + supported set (distinct names for read vs construct paths) |
| Construct/submit with v8 head | Typed pre-fork-unsupported error ("stay on midnight-js vX for pre-fork operation") |
| Head flips between resolve and submit | Dedicated stale-head typed error; advise re-resolve + rebuild; no auto-retry |
| `.tx` access on a v8-tagged record | Typed error: "decode `rawTx` with `@midnight-ntwrk/midnight-js-ledger-v8-compat/codec`" — non-enumerable accessor (stringify/spread/clone never trip it); prefer `isDecodedTxData()` |
| v9 instance mismatch at `keepState` attach | `KeepStateLedgerInstanceMismatchError` → dual-instantiation guide |
| Down-convert failure (malformed bytes, lost `StateValue` type) | Throw — never a silently wrong or empty state |
| Key set matches no supported proof version | Typed error (proof version always derived from key tag, never hardcoded) |
| Local verifier key ≠ on-chain `co.v2` (SEC-5) | Typed error naming both sources, **before proving** |
| Pre-migration (v6-envelope) state fetched (SEC-9) | Deterministic typed error on **decoded** reads only — the raw query + compat codec stay available pre-fork; never left to the v9 decoder happening to fail |
| Keep-state route without `keepState` option | Typed error containing the exact config snippet **and both plausible causes** (migrated pre-fork contract, or a v9-era ZKIR-v2 deploy while A4 is unconfirmed) |
| Post-fork deploy with ledger-8 artifacts | Typed rejection — new deploys require v9-compiled contracts |
| Wrong-version decode | Decoder error re-thrown with `{ cause }` + version context; fail-open decoders get a codec-side discriminant/round-trip check |

---

## 8. Key Architectural Decisions

| # | Decision | Rationale (condensed) |
|---|----------|----------------------|
| D1 | Explicit version handling; no mutable global | v8/v9 coexist in one session; a shared global is racy |
| D2 | `protocol` stays the single v9 seam — **including for the compat package** (peerDependency) | One v9 WASM instance by construction; layering preserved |
| D3 | Existing `protocol` exports unchanged | Backward compatibility is trivial — nothing moves |
| D4 | Version source = indexer `protocolVersion` | Already present; subject to the OQ8 cross-check stance |
| D5 | v8 types never unified with v9; core carries v8 data as raw bytes + int | Compile-time separation replaces runtime discriminants |
| D6 | Pre-fork contract support = **keep-state** | Spike-proven and contractual upstream; strictly simpler than recompile-and-upgrade |
| D7 | Keep-state lives in the compat package behind `KeepStateBridge` (declared in `types` — a provider-shaped seam); tx composition stays in `contracts` | Core stays 100% v9-typed; WASM identity preserved; no duplicated zswap logic |
| D8 | Support window: **current + previous** (policy, pending OQ10) | Bounds dependency/test growth; upstream imposes no ceiling — it is a midnight-js maintenance choice |
| D9 | **Pre-fork operation out of scope**; construct/submit is v9-only | No v8 construct pipeline exists; building one serves a shrinking window (KISS/YAGNI) |
| D10 | **No generic version-dispatch layer** | N never exceeds 2; a generic facade encodes an axis of variation an unknown v10 won't honour |
| D11 | Transitional package `…-ledger-v8-compat`, one per fork window, named for the version it retires with | Isolation is structural (don't install it); deletion is a package deprecation, not a breaking `exports` change |
| D12 | Fork date is not a design/priority driver | Delivery sequenced by dependency order; the date changes no line of the design |

---

## 9. Quality Attributes & Verification

| Attribute | How the architecture delivers it | How it is verified |
|---|---|---|
| **v9-native non-regression (FR7)** | Keep-state is a *dedicated* entry; v9 signatures untouched | Existing v9 suites run **unmodified** (diff gate); golden-fixture byte equality on deterministic stages captured on `main` before the first PR |
| **Structural isolation (FR5/NFR6)** | v8 confined to the compat package; v9 via peerDependency only | CI dependency-graph gates (both directions); export-surface strict-equality test |
| **Type safety (NFR2)** | Raw-bytes surfacing; POJO-only bridge; structural 0.16 interfaces | ESLint `no-explicit-any` + `as unknown` grep gate; compile-level test that 0.16 contract types fit the dedicated entry (and are *not* required to fit the v9 entry) |
| **Fail-fast (NFR1)** | Total truth tables; sole narrowing point; attach-time checks | Every §7 error path negative-tested |
| **Dual-instance safety (#1052)** | Peer resolution + reference-equality probe | npm-alias tests on **both axes** (0.16 `onchain-runtime-v3-alt`; v9 `ledger-v9-alt`) |
| **Keep-state correctness** | Byte-identical POJO layer; rehash step; SEC-5 pre-check; ledger backstop | Round-trip fixtures (migrated, v6-envelope, tampered, both-keys, Merkle-bearing — minimal size); rehash-omission negative; effects-equality negative at the harness tier |
| **Cross-fork behaviour** | Per-operation version resolution | Fork-boundary scenario: one session reads v8 history + keep-state call + v9-native flow side by side; stale-head negative |
| **Observability** | Breadcrumbs at all four dispatch decision points | Injected-logger unit tests, strict equality on structured fields |

Test-tier note: a fork-capable e2e environment (node/indexer/proof-server migrating at a height) does not exist yet (OQ14) — until it does, proof/apply-level acceptance criteria are authoritatively gated at the unit/integration tier (recorded explicitly, not implied).

### Delivery sequence (dependency order, D12)

```mermaid
flowchart LR
    s1["1. protocol<br/>version utils"] --> s2["2. types + utils<br/>bridge interface + options type,<br/>rawTx, guard + factory,<br/>provider members"]
    s2 --> s3["3. ledger-v8-compat<br/>(keep-state, then codec)"]
    s3 --> s4["4. contracts<br/>routing, dedicated entry"]
    s4 --> s5["5. indexer provider<br/>raw surfacing + both queries;<br/>barrel re-exports"]
    s5 --> s6["6. Hardening<br/>OQ8 cross-check, OQ15 assert,<br/>fork-capable e2e (OQ14)"]
```

`types`/`utils` must precede the compat package, which implements the bridge interface via its `types` peerDependency.

---

## 10. Lifecycle & Removal Plan

The compat package is **born with its retirement plan**:

- **Versioning:** core packages take additive/minor changes only; the compat package versions independently and fast during the window (peer range on `protocol` tracks the framework major).
- **At framework v10:** `npm deprecate` the compat package and shrink `LedgerVersion` — the single compile-time signal downstream code keys on. Pre-announced in the package README from day one.
- **Caveat:** upstream keeps V2 proofs and ZKIR-v2 contracts supported indefinitely — retirement is a **midnight-js policy act** (OQ10). It strands any keep-state contract that has not graduated (post-fork key rotation installing v9 artifacts — the "both keys" routing shape); the graduation mechanism is still unconfirmed upstream and is confirmed together with the window policy.
- **Next fork:** whether a (v9, v10) transition needs its own compat package is decided by *that fork's spike* — never assumed.

### Open items that gate rollout

| Item | What remains | Blocks |
|---|---|---|
| OQ8 | Independent cross-check of the indexer head version (+ named risk owner meanwhile) | Production-readiness declaration for the transition window |
| OQ10 | Confirm "current + previous" window + graduation path | Retirement policy |
| OQ12 | Supported key-delivery API + confirmed dual-ZKIR proof-server version | MJS-03 freeze; operator-facing rollout requirement |
| OQ13 | Final `executeCall` signature (witness/private-state typing — binds only the dApp-side generic instantiation, not the published `types` surface) + deploy-artifact version-tag field + **A4 confirmation** (does every v9-era deploy populate `v3`/`ir`?) | Compat API freeze; routing-provenance soundness |
| OQ14 | Fork-capable e2e environment (or spike simulator adoption) | Proof/apply-level AC promotion from unit/integration tier |
| OQ7 | Wallet SDK `migrateState` (owner assigned); test-only shim port is a named work item | Fee-paying cross-fork e2e |

---

## 11. Glossary

| Term | Meaning |
|---|---|
| **Keep-state** | The post-fork execution path for pre-fork contracts: down-convert migrated state → execute on the retained ledger-8 stack → wrap the transcript in a native v9 transaction with a V2 proof. No recompilation. |
| **Migrated state** | A contract's on-chain state after the fork: re-versioned into the v9 envelope with the pre-fork verifier key preserved in `co.v2`; data bytes unchanged. |
| **`co.v2` / `v3` / `ir`** | Slots in a `ContractState`'s operation verifier-key set. `co.v2`-only ⇒ pre-fork (keep-state); `v3`/`ir` ⇒ v9-native. |
| **V2 / V3 proof** | Proof versions tied to ZKIR v2 (pre-fork toolchain) and v3 (v9 toolchain). Selected from the resolved key tag, never hardcoded. |
| **Retained stack** | The dApp's own unchanged pre-fork toolchain outputs: compiled artifacts, keys, compact-runtime 0.16, onchain-runtime-v3. Owned and supplied by the dApp; the framework never touches them. |
| **`KeepStateBridge`** | The `executeCall`-granular generic interface (declared in `types`, implemented by the compat package) through which keep-state execution is injected via the dedicated entry's options. POJOs + v9 types only. |
| **Effects-equality backstop** | Ledger-9's apply-time invariant: replay the transcript against real on-chain state and require identical effects — bounds all upstream tampering to DoS. |
| **#1052** | The WASM dual-instantiation issue: two module instances of the same WASM package break `instanceof`. Addressed by peer resolution + attach-time reference check. |
| **D9** | The decision that construct/submit is v9-only; pre-fork operation is out of scope. |
