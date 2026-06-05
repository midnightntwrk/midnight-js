# Feature Specification — Issue #816

**Title:** Turn deserialization errors into versioning errors when possible
**Issue:** [midnightntwrk/midnight-js#816](https://github.com/midnightntwrk/midnight-js/issues/816)
**Solution variant:** C′ (Hybrid + typed deserialization façade)
**Author:** Szymon Paluchowski
**Status:** Draft for review
**Target:** midnight-js Q2 2026

---

## 1. Problem statement

DApp developers encounter cryptic errors from `ledger-v8` / `compact-runtime` / `onchain-runtime-v3` during deserialization. In ~95% of cases the root cause is a ledger version mismatch between the dApp and a data source (indexer, network protocol, peer dApp). Current messages are implementation-level (e.g. *"invalid tag at offset 12"*) and omit:

- which data type was being deserialized,
- where in the codebase the call originated,
- whether the failure is a version mismatch or genuine data corruption,
- what the dApp developer should check.

## 2. Goals

| #  | Goal |
|----|------|
| G1 | Every ledger/runtime deserialization call site throws an error with structured context. **Applies to all three sources** (ledger, compact-runtime, onchain-runtime). |
| G2 | The error classifies the cause (`version-mismatch` / `format-mismatch` / `unknown`). **In first PR, classification rules ship for `ledger` source only** (per D1); for `compact-runtime` and `onchain-runtime`, classifier returns `'unknown'` but the error still carries the rest of the context. |
| G3 | The error carries an actionable mitigation checklist. **Applies to all three sources** (mitigation strings ship in the first PR for all three). |
| G4 | Around contract `call` / `deploy` / `find` flows, deserialization errors are **enriched with circuit + contract context**. Enrichment is source-agnostic — every `DeserializationError` flowing through `withRuntimeContext` gets the entrypoint caller appended, regardless of whether classification succeeded or fell back to `'unknown'`. |
| G5 | New unsafe call sites are blocked at ESLint level to prevent regression. **Applies to all three sources** — ESLint forbids raw `.deserialize`/`.decode` on every wrapped type. |

## 3. Non-goals

| #  | Out of scope |
|----|--------------|
| N1 | Errors thrown inside `WalletProvider.balanceTx()` (third-party boundary). |
| N2 | Errors thrown inside `MidnightProvider.submitTx()` (network layer). |
| N3 | Inferring direction (`data-newer-than-code` vs `data-older-than-code`) is *deterministic when the error contains a parseable structural version tag* (e.g. `[v6]` vs `[v7]`) and *omitted otherwise*. The classifier does not guess. |
| N4 | Message localization (always English). |
| N5 | New public API in `@midnight-ntwrk/midnight-js-types` — the error type lives in `utils`. |

## 4. Acceptance criteria mapping

| Acceptance criterion (from issue) | Covered by |
|-----------------------------------|------------|
| Wrapper capturing contextual info for deserialization call sites | Typed wrappers in `utils/deserialization/typed-wrappers.ts` (primary) + `withDeserializationContext` HOF (escape hatch) |
| Catches & turns to user-friendly errors (data type, caller, classification, direction, mitigation) | `DeserializationError` + `classify` |
| Used consistently around all ledger/runtime deserialization | All raw `.deserialize`/`.decode` calls relocated into typed wrappers; ESLint forbids raw calls elsewhere |
| Used around contract calls (compact-runtime & onchain-runtime) | `withRuntimeContext` in `contracts/internal/` |

## 5. Architecture

Two layers in `packages/utils/src/deserialization/`:

- **Inner layer:** `withDeserializationContext` HOF — generic try/classify/throw.
- **Outer layer:** `typed-wrappers.ts` — one typed function per ledger/runtime data type. Each typed wrapper is the **single** place where the raw `.deserialize`/`.decode` call lives. Consumer packages never call ledger types' static methods directly.

```
┌────────────────────────────────────────────────────────────────────────┐
│                packages/utils/src/deserialization/                     │
│                                                                        │
│  versions.ts                ← PINNED_VERSIONS (single source)          │
│  patterns.ts                ← message-string patterns per source       │
│  classify.ts                ← pattern → classification + direction     │
│  deserialization-error.ts   ← typed Error                              │
│  with-deserialization-context.ts ← HOF (escape hatch)                  │
│  typed-wrappers.ts          ← ★ PRIMARY API — one fn per data type ★   │
│  index.ts                   ← public re-export                         │
└─────────────────────────┬──────────────────────────────────────────────┘
                          │ consumers import typed wrappers
   ┌──────────────────────┼─────────────────────────┬────────────────────┐
   │                      │                         │                    │
   ▼                      ▼                         ▼                    ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────────┐
│ indexer-public-  │ │ contracts/utils/ │ │ contracts/internal/  │
│ data-provider    │ │ ledger-utils.ts  │ │ with-runtime-context │
│ (4 call sites)   │ │ (3 call sites)   │ │ (NEW)                │
└──────────────────┘ └──────────────────┘ └──────┬───────────────┘
                                                 │ used by
                                                 ▼
                          ┌──────────────────────────────────────┐
                          │ submit-call-tx.ts                    │
                          │ deploy-contract.ts                   │
                          │ find-deployed-contract.ts            │
                          └──────────────────────────────────────┘

                          ┌──────────────────────────────────────┐
                          │ protocol/src/test/                   │
                          │ eslint-restriction.test.ts (EXTEND)  │
                          │ — forbids raw .deserialize/.decode   │
                          │   on ledger types everywhere except  │
                          │   utils/deserialization/             │
                          └──────────────────────────────────────┘
```

**Design intent:** the *only* file in the repo allowed to call `ContractState.deserialize(...)`, `ZswapChainState.deserialize(...)`, etc. is `typed-wrappers.ts`. This is enforced by ESLint. Everything else imports `deserializeContractState`, `deserializeZswapChainState`, … from `@midnight-ntwrk/midnight-js-utils`.

## 6. Type contracts

```ts
// utils/src/deserialization/deserialization-error.ts

export type SourceLibrary = 'ledger' | 'compact-runtime' | 'onchain-runtime';

export type Classification = 'version-mismatch' | 'format-mismatch' | 'unknown';

export type Direction = 'data-newer-than-code' | 'data-older-than-code';

// Internal pattern shape — direction can be either static (set by author) or
// computed from regex match groups (e.g. parsing structural version tags).
export interface PatternEntry {
  readonly regex: RegExp;
  readonly classification: Classification;
  readonly inferDirection?: (match: RegExpExecArray) => Direction | undefined;
}

export interface DeserializationCallSite {
  readonly dataType: string;          // open string — diagnostic field
  readonly source: SourceLibrary;     // strict union — stable semantics
  readonly caller: string;            // fully-qualified: '@midnight-ntwrk/<package>:<function>'
}

export interface DeserializationContext extends DeserializationCallSite {
  readonly classification: Classification;
  readonly direction?: Direction;     // best-effort, only when confidently inferred
  readonly mitigation: readonly string[];
  readonly pinnedVersions: {
    readonly ledger: string;
    readonly compactRuntime: string;
    readonly onchainRuntime: string;
  };
}

export class DeserializationError extends Error {
  readonly context: DeserializationContext;
  constructor(context: DeserializationContext, cause: Error);
}

export const isDeserializationError: (e: unknown) => e is DeserializationError;
```

```ts
// utils/src/deserialization/with-deserialization-context.ts

export const withDeserializationContext: <T>(
  callSite: DeserializationCallSite,
  fn: () => T,
) => T;
```

```ts
// utils/src/deserialization/typed-wrappers.ts  ★ PRIMARY API ★

import type {
  ContractState as LedgerContractState,
  ZswapChainState,
  LedgerParameters,
  LedgerTransaction,
  StateValue as LedgerStateValue,
  SignatureEnabled, Proof, Binding,
} from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type { ContractState as CompactContractState } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';

export interface CallSiteContext {
  readonly caller: string;   // fully-qualified per D2
}

// One function per (data type, source) pair.
// Each is the SOLE place where the raw .deserialize/.decode call lives.
export const deserializeContractState:        (bytes: Uint8Array, ctx: CallSiteContext) => LedgerContractState;
export const deserializeCompactContractState: (bytes: Uint8Array, ctx: CallSiteContext) => CompactContractState;
export const deserializeZswapChainState:      (bytes: Uint8Array, ctx: CallSiteContext) => ZswapChainState;
export const deserializeLedgerTransaction:    (bytes: Uint8Array, ctx: CallSiteContext) => LedgerTransaction<SignatureEnabled, Proof, Binding>;
export const deserializeLedgerParameters:     (bytes: Uint8Array, ctx: CallSiteContext) => LedgerParameters;
export const decodeLedgerStateValue:          (encoded: Uint8Array, ctx: CallSiteContext) => LedgerStateValue;
```

```ts
// contracts/src/internal/with-runtime-context.ts

export interface RuntimeCallContext {
  readonly operation: 'call' | 'deploy' | 'find';
  readonly circuitId?: string;
  readonly contractAddress?: string;
}

export const withRuntimeContext: <T>(
  context: RuntimeCallContext,
  fn: () => Promise<T>,
) => Promise<T>;
```

## 7. Behavior specification

### 7.1 `classify(callSite, cause)` rules

**Source of truth:** patterns derived from a direct audit of `midnight-ledger` source (`serialize/`, `serialize-macros/`, `ledger/`, `ledger-wasm/`, `onchain-runtime-wasm/`). Patterns are **literal strings from the Rust code**, not hypothetical.

**Scope (first PR):** ledger source only. `compact-runtime` and `onchain-runtime` patterns are deferred to a follow-up issue (see §13). Until that issue ships, classifier returns `classification: 'unknown'` for any error originating from those sources, with mitigation still rendered.

**WASM wrapping note:** every WASM-exposed `.deserialize(Uint8Array)` call wraps the inner Rust error via `format!("Unable to deserialize {struct_name}. Error: {inner}", ...)` (see `onchain-runtime-wasm/src/lib.rs:64-71`, `ledger-wasm/src/conversions.rs`). The classifier uses `RegExp.test()` substring matching, so the prefix is transparent.

#### Ledger patterns (active) — sourced from real ledger code

The pattern table is ordered: more specific patterns come first.

| # | Pattern (regex, case-insensitive unless noted) | Classification | Direction | Source in ledger repo |
|---|------------------------------------------------|----------------|-----------|------------------------|
| 1 | `/expected header tag '[^']*\[v(\d+)\][^']*', got '[^']*\[v(\d+)\][^']*'/` | `version-mismatch` | **parsed from match groups**: `received < expected` → `data-older-than-code`; `received > expected` → `data-newer-than-code` | `serialize/src/deserializable.rs:67` |
| 2 | `/expected header tag '[^']*', got '[^']*'/` (fallback when no `[vN]` parseable) | `version-mismatch` | *(undefined)* | same |
| 3 | `/invalid old discriminant/` | `version-mismatch` | `data-older-than-code` | `ledger/src/structure.rs:253,315,2559` |
| 4 | `/unknown discriminant/` | `version-mismatch` | `data-newer-than-code` | `ledger/src/structure.rs:260,323,2564` |
| 5 | `/unrecognised discriminant/` | `version-mismatch` | *(undefined)* | `serialize-macros/src/lib.rs:455` (auto-derived) |
| 6 | `/unsupported (proof\|guaranteed transcript\|fallible transcript) version/` | `version-mismatch` | *(undefined)* | `ledger/src/error.rs:977-985` |
| 7 | `/Not all bytes read/` | `format-mismatch` | *(undefined)* | `serialize/src/deserializable.rs:86`, `ledger-wasm/src/conversions.rs:132` |
| 8 | `/exceeded recursion depth/` | `format-mismatch` | *(undefined)* | `serialize/src/deserializable.rs:106` |
| 9 | `/non-canonical scale encoding/` | `format-mismatch` | *(undefined)* | `serialize/src/util.rs:277,290,304` |
| 10 | `/out of range for /` | `format-mismatch` | *(undefined)* | `serialize/src/util.rs:180` |
| 11 | `/cannot deserialize \S+ as bool/` | `format-mismatch` | *(undefined)* | `serialize/src/util.rs:103` |
| 12 | `/Invalid discriminant: /` (note: capital I — case-sensitive distinguishes from #3/#4) | `format-mismatch` | *(undefined)* | `serialize/src/deserializable.rs:166` (Option::deserialize) |
| 13 | `/failed to fill whole buffer/` | `format-mismatch` | *(undefined)* | Rust std `io::ErrorKind::UnexpectedEof` |
| — | *(no match)* | `unknown` | *(undefined)* | — |

**Implementation notes:**
- Patterns live in `patterns.ts` as a readonly array of `{ regex, classification, inferDirection? }`, where `inferDirection` is a function `(match: RegExpExecArray) => Direction | undefined`. Static patterns return a constant; dynamic patterns (e.g. #1) parse the match groups.
- First matching pattern wins.
- Tag format `<type-name>[vN]` is governed by `serialize/src/tagged.rs` convention (line 28: *"Square brackets are used to denote the version of a given type"*). The ledger crate has `tag_enforcement_test!` macros guaranteeing tag stability per type — this gives us **structural backing** for pattern #1, reducing R1 risk.

#### Compact-runtime / onchain-runtime patterns (deferred)

- No patterns shipped in the first PR.
- Pattern table is structured to accept additional `source` entries without API change.
- A follow-up issue (created at PR D merge) tracks adding `compact-runtime` and `onchain-runtime` patterns.

### 7.2 Mitigation generation

Mitigation = constant baseline + source-specific hint, parameterized by `PINNED_VERSIONS` (no hardcoded version strings).

```ts
import { PINNED_VERSIONS } from './versions';

const baseline = (): readonly string[] => [
  `Confirm @midnight-ntwrk/midnight-js-protocol pinned versions match the network protocol of the target environment ` +
    `(ledger=${PINNED_VERSIONS.ledger}, compact-runtime=${PINNED_VERSIONS.compactRuntime}, onchain-runtime=${PINNED_VERSIONS.onchainRuntime}).`,
  'If reading data from an indexer, confirm the indexer protocol version matches the dApp.',
];

const perSource = (): Record<SourceLibrary, string> => ({
  'ledger':
    `Each ledger type has a structural version tag (e.g. "contract-state[v6]") that is independent of the ` +
    `@midnight-ntwrk/ledger-${PINNED_VERSIONS.ledger} npm package version. ` +
    `Inspect the error's "expected ... got" tag to identify the mismatched type and version, then either ` +
    `align the data source to that structural version or pin a ledger npm version that supports the data's tag.`,
  'compact-runtime':
    'Verify the compactc compiler version used to build the contract matches the compact-runtime pinned in @midnight-ntwrk/midnight-js-protocol.',
  'onchain-runtime':
    `Verify @midnight-ntwrk/onchain-runtime-${PINNED_VERSIONS.onchainRuntime} pin matches the contract operations runtime.`,
});
```

Mitigation is deterministic — depends only on `source`, `classification`, and `PINNED_VERSIONS`. No runtime external lookup. Bumping `PINNED_VERSIONS` automatically refreshes mitigation strings.

**Structural vs npm version distinction** (verified against `midnight-ledger`): the ledger npm package version (`v8`) is independent of per-type structural version tags (`[vN]` embedded in serialized payloads). E.g. `ContractState` has `#[tag = "contract-state[v6]"]` in `onchain-state/src/state.rs:727`. Mitigation explicitly calls this out so devs don't conflate the two.

### 7.3 `withDeserializationContext` semantics

| Scenario | Behavior |
|----------|----------|
| `fn()` returns value `v` | Wrapper returns `v` (no overhead). |
| `fn()` throws `e instanceof Error` | Wrapper throws `new DeserializationError(classify(callSite, e), e)`. |
| `fn()` throws non-Error (`string`, `number`, `null`, object) | Wrapper re-throws unchanged — no wrapping. |
| `fn()` returns `Promise<T>` | **Unsupported** — sync wrapper only. Use try/catch for async. |

Async variant is **not offered** — every current call site is synchronous. YAGNI.

Status in C′: this HOF is now an **escape hatch**, not the primary API. Consumers should reach for typed wrappers (§7.4). The HOF stays exported for ad-hoc cases that fall outside the predefined typed wrappers (e.g. a future data type that's added in a single place and not yet promoted to a typed wrapper).

### 7.4 Typed wrappers semantics

Each typed wrapper:

1. Accepts `(bytes: Uint8Array, ctx: { caller: string })`.
2. Calls `withDeserializationContext(callSite, () => Class.deserialize(bytes))` internally — `dataType` and `source` are hard-coded inside the wrapper.
3. Returns the deserialized value with the correct return type.

Reference implementation pattern (one entry per data type):

```ts
export const deserializeContractState = (
  bytes: Uint8Array,
  ctx: CallSiteContext,
): LedgerContractState =>
  withDeserializationContext(
    { dataType: 'ContractState', source: 'ledger', caller: ctx.caller },
    () => LedgerContractState.deserialize(bytes),
  );
```

Properties:

- `dataType` literal is **co-located** with the actual class — no string drift on rename refactors.
- `source` is hard-coded per wrapper — no chance of misclassification at call site.
- Consumer call site reduces to `deserializeContractState(buf, { caller: '@midnight-ntwrk/…:…' })` — single line, no boilerplate.
- TypeScript infers the return type — call site does not need explicit type annotation.

The full set of wrappers covers the 7 known call sites today:

| Typed wrapper | Underlying call | Source |
|---------------|-----------------|--------|
| `deserializeContractState` | `ledger.ContractState.deserialize` | `ledger` |
| `deserializeCompactContractState` | `compact-runtime.ContractState.deserialize` | `compact-runtime` |
| `deserializeZswapChainState` | `ledger.ZswapChainState.deserialize` | `ledger` |
| `deserializeLedgerTransaction` | `ledger.LedgerTransaction.deserialize` | `ledger` |
| `deserializeLedgerParameters` | `ledger.LedgerParameters.deserialize` | `ledger` |
| `decodeLedgerStateValue` | `onchain-runtime.StateValue.decode` | `onchain-runtime` |

### 7.5 `withRuntimeContext` semantics

**Granularity:** the wrapper covers the **entire body** of each contract entrypoint (`call`, `deploy`, `find`). Because the wrapper filters by `isDeserializationError(e)`, every non-deserialization error (proof, wallet, network) passes through untouched — a wide wrap and a narrow wrap are functionally equivalent for enrichment, and the wide wrap is simpler and harder to regress against.

| Scenario | Behavior |
|----------|----------|
| `fn()` resolves to `v` | Returns `v`. |
| `fn()` throws non-`DeserializationError` | Re-throws unchanged. |
| `fn()` throws `DeserializationError e` | Throws new `DeserializationError` with: `caller` = `@midnight-ntwrk/midnight-js-contracts:${operation}(${circuitId ?? '-'})`; rest of `context` preserved; `cause` = `e.cause` (NOT `e`) — flat chain. |

**Stack trace depth:** outer `DeserializationError` → root ledger Error. Inner `DeserializationError` is absorbed.

## 8. File changes inventory

### 8.1 New files

| File | Lines (est.) | Purpose |
|------|--------------|---------|
| `packages/utils/src/deserialization/versions.ts` | 15 | `PINNED_VERSIONS` const |
| `packages/utils/src/deserialization/patterns.ts` | 30 | Pattern table — ledger source only (first PR) |
| `packages/utils/src/deserialization/classify.ts` | 60 | `classify(callSite, cause)` |
| `packages/utils/src/deserialization/deserialization-error.ts` | 80 | `DeserializationError` + `isDeserializationError` + `formatMessage` |
| `packages/utils/src/deserialization/with-deserialization-context.ts` | 30 | HOF (escape hatch) |
| `packages/utils/src/deserialization/typed-wrappers.ts` | 80 | ★ Primary API — typed wrappers per data type ★ |
| `packages/utils/src/deserialization/index.ts` | 10 | Re-exports |
| `packages/contracts/src/internal/with-runtime-context.ts` | 40 | Async HOF |
| `packages/utils/src/test/deserialization-error.test.ts` | 100 | Unit tests |
| `packages/utils/src/test/classify-deserialization-error.test.ts` | 120 | Pattern table tests |
| `packages/utils/src/test/with-deserialization-context.test.ts` | 80 | HOF tests |
| `packages/utils/src/test/typed-wrappers.test.ts` | 100 | Typed wrapper unit tests |
| `packages/utils/src/test/classify-integration.test.ts` | 100 | Real ledger error canaries |
| `packages/contracts/src/test/with-runtime-context.test.ts` | 90 | Runtime wrapper tests |

### 8.2 Modified files

| File | Change | Diff (est.) |
|------|--------|-------------|
| `packages/utils/src/index.ts` | Add `export * from './deserialization';` | +1 |
| `packages/midnight-js/src/index.ts` | Re-export `DeserializationError` + `isDeserializationError` from barrel | +2 |
| `packages/indexer-public-data-provider/src/indexer-public-data-provider.ts:137-147` | Replace 4 raw `.deserialize` calls with typed wrappers | ~12 |
| `packages/contracts/src/utils/ledger-utils.ts:48-55` | Replace 3 raw `.deserialize`/`.decode` calls with typed wrappers | ~10 |
| `packages/contracts/src/submit-call-tx.ts` | Wrap pipeline in `withRuntimeContext` | ~10 |
| `packages/contracts/src/deploy-contract.ts` | Same | ~10 |
| `packages/contracts/src/find-deployed-contract.ts` | Same | ~10 |
| `packages/protocol/src/test/eslint-restriction.test.ts` | Add forbid rule for raw `.deserialize` / `.decode` outside the wrapper | ~30 |

**Total estimate:** ~900 LOC new + modifications. Majority is tests. Call site diff (§8.2) is smaller than C — typed wrappers absorb the boilerplate.

### 8.3 Dependencies

| Package | Change |
|---------|--------|
| `@midnight-ntwrk/midnight-js-utils` | No new deps (already depends on `protocol`). |
| `@midnight-ntwrk/midnight-js-contracts` | No new deps (already depends on `utils`). |
| Root workspace `package.json` | Unchanged. |

### 8.4 GitNexus impact analysis (per `CLAUDE.md` requirement)

Run on `2026-06-02` against the stale index (last full index: commit `36d5aee`; current branch tip: `f35cbe7`). All commits between are `ci(testkit-js):`-scoped and do not modify `packages/`, so the impact data is current for our targets.

| Symbol | Risk | Direct callers (d=1) | d=2 | Processes affected |
|--------|------|-----------------------|-----|---------------------|
| `deserializeContractState` (indexer) | **CRITICAL** | 5 — `queryContractState`, `queryZSwapAndContractState`, `queryDeployContractState`, `transactionToContractState$`, `blockToContractState$` | 1 — `contractStateObservable` | 10 (4 modules) |
| `deserializeTransaction` (indexer) | **HIGH** | 2 — `watchForDeployTxData`, `watchForTxData` | — | 3 |
| `deserializeZswapState` (indexer) | LOW | 1 — `queryZSwapAndContractState` | — | 2 |
| `deserializeLedgerParameters` (indexer) | LOW | 1 — used inline in `queryZSwapAndContractState` | — | 2 |
| `toLedgerContractState` (contracts/utils) | LOW (in-repo) | 0 in-repo; called by `createUnprovenLedgerDeployTx`, `createUnprovenLedgerCallTx` in same file | — | — |
| `fromLedgerContractState` (contracts/utils) | LOW (in-repo) | same module only | — | — |
| `toLedgerQueryContext` (contracts/utils) | LOW (in-repo) | same module only | — | — |
| `submitCallTx`, `submitDeployTx`, `deployContract`, `findDeployedContract` | LOW **in-repo only** | external dApp consumers not visible to the midnight-js index — treat as **public-API risk: HIGH** | — | — |

**Risk interpretation:**

- **CRITICAL** on `deserializeContractState` means 5 d=1 dependants must keep working post-refactor. Mitigated by: refactor is a 1-to-1 replacement of `ContractState.deserialize(...)` with `deserializeContractState(...)` — same return type, same throw semantics (except richer Error). No callers need updates.
- **HIGH** on `deserializeTransaction`: same mitigation — call signature preserved (typed wrapper hides the 4-arg complexity `('signature', 'proof', 'binding', bytes)` from callers).
- **Public-API HIGH** on contract entrypoints: behavior change is *error shape only*. Successful flows unaffected. Documented in §13 Phase 2 with CHANGELOG note.
- Functions in `contracts/utils/ledger-utils.ts` show LOW because gitnexus traces only inter-function calls, and these helpers are wrapped by other helpers in the same file before exiting the module. No external risk.

**No HIGH/CRITICAL warnings ignored** — refactors are signature-preserving, so dependants compile and run identically.

## 9. Implementation sequence

Each step = one commit following the repo's `feat(<scope>): ...` convention.

| #  | Commit | Scope | Test first |
|----|--------|-------|------------|
| 1  | `feat(utils): add DeserializationError and context types` | utils | ✅ |
| 2  | `feat(utils): add ledger error pattern table and classifier` | utils | ✅ |
| 3  | `feat(utils): add withDeserializationContext HOF` | utils | ✅ |
| 4  | `feat(utils): add typed deserialization wrappers` | utils | ✅ |
| 5  | `test(utils): integration tests against real ledger-v8 errors` | utils | (test is the artifact) |
| 6  | `refactor(indexer-public-data-provider): replace raw deserialize with typed wrappers` | provider | regression smoke |
| 7  | `refactor(contracts): replace raw deserialize/decode in ledger-utils with typed wrappers` | contracts | regression smoke |
| 8  | `feat(contracts): add withRuntimeContext internal helper` | contracts | ✅ |
| 9  | `refactor(contracts): wrap call/deploy/find pipelines with withRuntimeContext` | contracts | regression |
| 10 | `test(protocol): forbid raw ledger deserialize/decode outside typed wrappers via ESLint` | protocol | (test is the artifact) |

**Suggested PR split:**

- **PR A:** commits 1–5 (utils foundation incl. typed wrappers, isolated, no consumer changes).
- **PR B:** commits 6–7 (call site refactor — mechanical 1:1 replacement of raw calls with typed wrappers).
- **PR C:** commits 8–9 (runtime context for contract entrypoints).
- **PR D:** commit 10 (ESLint enforcement — needs A–C merged first).

## 10. Testing strategy

### 10.1 Unit tests

- `DeserializationError`: message rendering, name, cause, context exposure, `instanceof` semantics.
- `classify`: pattern table coverage — one test per pattern row + fallback to `unknown`.
- `withDeserializationContext`: sync pass-through, Error wrapping, non-Error re-throw, cause chain.
- **`typed-wrappers`** *(new)*: each wrapper called on valid input returns expected type; on invalid input throws `DeserializationError` with correct `dataType` and `source` baked in. One small test per wrapper (~10 tests total) to lock the type↔source contract.
- `withRuntimeContext`: pass-through, non-`DeserializationError` re-throw, caller overwrite + flat cause chain.

### 10.2 Integration tests

`classify-integration.test.ts` invokes the actual `ledger-v8` WASM and asserts classifier output for **every** pattern in §7.1. Required scenarios:

| Scenario | How to craft input | Expected classification | Expected direction |
|---|---|---|---|
| Tag mismatch with parseable structural versions | Serialize a `ContractState` (`[v6]` tag), manually edit the version digit in the byte buffer to `[v5]`, then deserialize | `version-mismatch` | `data-older-than-code` |
| Tag mismatch, version newer than code | Edit to `[v7]` | `version-mismatch` | `data-newer-than-code` |
| Tag mismatch, type renamed (no `[vN]`) | Edit type-name bytes instead of version | `version-mismatch` | `undefined` |
| Versioned-enum old discriminant | Serialize `ProofVersioned::V2`, patch discriminant byte to `0` | `version-mismatch` | `data-older-than-code` |
| Versioned-enum unknown discriminant | Patch discriminant byte to `2` | `version-mismatch` | `data-newer-than-code` |
| Auto-derived enum overflow | Use a generic enum with > variants and overflow discriminant | `version-mismatch` | `undefined` |
| Trailing bytes | Serialize valid type + append junk bytes | `format-mismatch` | `undefined` |
| Truncated input | Serialize valid type, truncate last N bytes | `format-mismatch` (UnexpectedEof) | `undefined` |
| Recursion overflow | Construct a deeply nested type beyond `RECURSION_LIMIT` | `format-mismatch` | `undefined` |
| Empty input | Pass `new Uint8Array(0)` | `format-mismatch` | `undefined` |

This test acts as the canary: if `midnight-ledger` changes error message strings (e.g. ledger-v9 bump), one or more rows fail loudly. The CI signal forces a human to refresh `patterns.ts` per §7.1.

**Test coverage of typed wrappers via integration:** the test runs each of the 6 typed wrappers through at least one bad-input scenario, locking the `(dataType, source)` baked into each wrapper.

### 10.3 Regression tests

- Existing tests in `indexer-public-data-provider` and `contracts` must continue to pass — wrappers are transparent on the success path.

### 10.4 ESLint test

- `eslint-restriction.test.ts` extension verifies that raw `\.deserialize\(` / `\.decode\(` calls on identifiers originating from `ledger-v8` / `compact-runtime` / `onchain-runtime-v3` are **blocked everywhere** except:
  - `packages/utils/src/deserialization/typed-wrappers.ts` (the single sanctioned site),
  - `**/*.test.ts` (test fixtures may craft raw calls intentionally).
- The rule is significantly simpler than under bare-HOF design C — typed wrappers concentrate the allow-list to one file path, so the rule reduces to: *"raw `.deserialize`/`.decode` on ledger types is forbidden everywhere except `typed-wrappers.ts` and tests."*

## 11. Risks

| #  | Risk | Mitigation |
|----|------|------------|
| R1 | A ledger-v8 patch changes error message → classification breaks silently. | (a) Patterns are sourced from real ledger code, not guessed. (b) Tag format `<type>[vN]` is guarded by `tag_enforcement_test!` macros in the ledger crate (`onchain-state/src/state.rs:734` etc.), so pattern #1 has structural backing. (c) Integration test (§10.2) exercises every pattern row in CI; bump = test failure → human review. |
| R2 | Mitigation hints become outdated (e.g. wrong package name). | Mitigation deterministic, generated from `PINNED_VERSIONS` const. |
| R3 | `withRuntimeContext` catches a non-deserialization error and unintentionally drops stack frames. | Filter `isDeserializationError(e)` first — non-deser errors re-thrown untouched. |
| R4 | ESLint rule false-positives in new tests. | Rule explicitly exempts `**/*.test.ts`. |
| R5 | Sub-path imports from `protocol` may not be wired in `utils` (currently using main barrel?). | Verify `protocol` sub-path exports in `package.json` before PR B. |
| R6 | Direction inference may mislead developers. | Only set when high-confidence; mitigation message labels it best-effort. |

## 12. Resolved decisions

| #  | Decision | Rationale |
|----|----------|-----------|
| D1 | **Pattern coverage:** ledger only in first PR. `compact-runtime` and `onchain-runtime` patterns deferred to a follow-up issue. | ~90% of current call sites hit `ledger`. Pattern table is structured to accept additional sources without API change. |
| D2 | **Caller naming:** fully qualified — `@midnight-ntwrk/<package>:<function>`. | Unambiguous, grep-friendly, survives package renames better than short names. |
| D3 | **`withRuntimeContext` granularity:** wrap the entire entrypoint body. The `isDeserializationError(e)` filter ensures non-deserialization errors pass through unchanged. | Wide wrap and narrow wrap are functionally equivalent for enrichment; the wide wrap is simpler and harder to regress against. |
| D4 | **Public re-export of `DeserializationError` and `isDeserializationError`** from `@midnight-ntwrk/midnight-js` barrel. | Consumer dApps need to discriminate this error type via `catch (e) { if (isDeserializationError(e)) ... }`. |
| D5 | **Typed wrappers as primary API** (`deserializeContractState`, `deserializeZswapChainState`, …). `withDeserializationContext` HOF retained as an exported escape hatch. | Co-locates `dataType` literal with the actual class (no string drift on rename); call sites reduce to 1 line; ESLint rule simplifies to *"raw `.deserialize`/`.decode` only allowed in `typed-wrappers.ts`."* |
| D6 | **Direction inference uses structured tag parsing**, not keyword matching. Pattern #1 (`expected header tag '...[v(\d+)]...', got '...[v(\d+)]...'`) extracts both versions and compares numerically. | Verified against `midnight-ledger` source: tag format is documented convention (`serialize/src/tagged.rs:28`) and stability-tested (`tag_enforcement_test!` macro). Heuristic keyword matching is reserved as fallback only. |
| D7 | **G4 enrichment is source-agnostic, classification is source-scoped.** Every `DeserializationError` flowing through `withRuntimeContext` gets enriched with circuit/contract context regardless of source. Classification by ledger patterns ships in PR A; classification for compact-runtime / onchain-runtime is deferred per D1. | Clarifies the previously-ambiguous goal G4 vs decision D1. Both AC #1 (typed-wrapper coverage) and AC #4 (contract-call wrapping) are satisfied for all three sources in the first PR. Only AC #2 sub-aspect (precise classification text) is partially deferred. |

## 13. Rollout

- **Phase 1 (PR A):** merge foundation. No consumer changes — safe.
- **Phase 2 (PR B):** call site refactor. Error message shape changes; successful flows unaffected. Existing consumer code unchanged.
- **Phase 3 (PR C):** runtime context. Behavioral change visible only on errors; successful txs unchanged.
- **Phase 4 (PR D):** ESLint rule. Could fail lint on unrelated PRs touching raw ledger deserialize. Communicate via the midnight-js channel before merge.
- **Phase 5 (follow-up issue):** add `compact-runtime` and `onchain-runtime` pattern coverage to `patterns.ts` and refresh `classify-integration.test.ts` accordingly. Tracked by an issue created at PR D merge.

**Versioning:** No breaking API change (new exports only). Semver: `minor` bump for `utils`, `contracts`, and `midnight-js` (new re-exports).

## 14. Ready-to-implement checklist

- [ ] Spec approved by reviewer
- [x] Open questions in §12 resolved (see Resolved decisions D1–D7)
- [x] Ledger error patterns verified against `midnight-ledger` source (see §7.1 "Source of truth")
- [ ] Test files committed first (TDD red phase)
- [x] `gitnexus_impact` run for each modified symbol (per `CLAUDE.md`) — results captured in §8.4
- [ ] PR description references issue #816 and follows repo template
- [ ] Follow-up issue created for compact-runtime / onchain-runtime patterns (after PR D)