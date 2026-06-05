# Feature Specification — Issue #816 (v2)

**Title:** Turn deserialization errors into versioning errors when possible
**Issue:** [midnightntwrk/midnight-js#816](https://github.com/midnightntwrk/midnight-js/issues/816)
**Solution variant:** C′′ (Hybrid + typed deserialization façade + full Layer 1 source coverage)
**Author:** Szymon Paluchowski
**Status:** Draft for review
**Target:** midnight-js Q2 2026
**Supersedes:** `issue-816-deserialization-errors.md` (v1)

**Diff vs v1:** patterns for `compact-runtime` and `onchain-runtime` sources promoted from "deferred to follow-up" to "ship in first PR". Justification: code audit (§8.5) shows 2 of 7 production deserialization call sites use `compact-runtime` — deferring would leave 29% of call sites with `classification: 'unknown'`. Verification of shared `serialize` crate (§7.1) confirms patterns are identical across sources.

**Diff vs v2.0 (rev v2.1):** three refinements adopted from PoC review:
- **Pattern #1 regex** now extracts struct name (`dataType`), generic specifiers, and both versions in named capture groups. Classifier overrides `context.dataType` from the regex match when available (eliminates literal-drift risk on type rename).
- **New `Classification` value:** `'generic-param-mismatch'` for cases where structural version matches but generic params (e.g. `(proof-preimage)` vs `(pre-proof)`) differ.
- **`DeserializationCallSite.callee`** added as optional field, giving 2-way direction info (`caller → callee`) in formatted message.

**Diff vs v2.1 (rev v2.2, this revision):** 12 fixes from senior architect review (C1–C4 critical, M1–M8 major):
- **C1:** `PatternEntry.classification` now accepts a function form for dynamic-classification patterns (Pattern #1 dispatches between `'version-mismatch'` and `'generic-param-mismatch'`).
- **C2:** G2 updated to enumerate all 4 `Classification` values.
- **C3:** §7.6 added — full `formatMessage` template with stable block structure.
- **C4 / D12:** Mitigation now keyed on `(classification, source)` — `format-mismatch` no longer points to version pins.
- **M1 / D14:** `withDeserializationContext` runtime-guards against thenable returns (TypeError if fn() returns a Promise).
- **M2 / D15:** `withRuntimeContext` preserves inner `callee`, overwriting only `caller`.
- **M3 / D13:** `isDeserializationError` includes brand-check fallback for cross-realm scenarios.
- **M4 / D16:** §7.7 added — `DeserializationError` does not auto-log; consumer responsibility documented.
- **M5:** `extracted` field semantics specified (default `undefined`, first-match-wins, preserved through `withRuntimeContext`).
- **M6:** §8.7 added — TypeScript strict-mode flag expectations + pre-implementation verification step.
- **M7:** §8.6 added — ES2022 / Node 16.9 minimum target documented (required by `Error.cause`).
- **M8 / R11:** Bundler smoke-test against reference dApp `midnight-wallet-dapp` added to R5/R11 mitigation.

---

## 1. Problem statement

DApp developers encounter cryptic errors from `ledger-v8` / `compact-runtime` / `onchain-runtime-v3` during deserialization. In virtually all cases the root cause is a version mismatch between the dApp and a data source (indexer, network protocol, peer dApp). Current messages are implementation-level (e.g. *"invalid tag at offset 12"*) and omit:

- which data type was being deserialized,
- where in the codebase the call originated,
- whether the failure is a version mismatch or genuine data corruption,
- what the dApp developer should check.

## 2. Goals

| #  | Goal |
|----|------|
| G1 | Every ledger/runtime deserialization call site throws an error with structured context. Applies to **all three sources** (ledger, compact-runtime, onchain-runtime). |
| G2 | The error classifies the cause as one of `version-mismatch` / `generic-param-mismatch` / `format-mismatch` / `unknown` (full `Classification` union in §6). **Patterns for all three sources ship in the first PR**, since they share the same underlying `serialize` crate (see §7.1). |
| G3 | The error carries an actionable mitigation checklist. Source-specific guidance for all three sources. |
| G4 | Around contract `call` / `deploy` / `find` flows, deserialization errors are enriched with circuit + contract context. Enrichment is source-agnostic. |
| G5 | New unsafe call sites are blocked at ESLint level to prevent regression. Forbids raw `.deserialize`/`.decode` on every wrapped type, every source. |

## 3. Non-goals

| #  | Out of scope |
|----|--------------|
| N1 | Errors thrown inside `WalletProvider.balanceTx()` (third-party boundary). |
| N2 | Errors thrown inside `MidnightProvider.submitTx()` (network layer). |
| N3 | Direction inference (`data-newer-than-code` vs `data-older-than-code`) is *deterministic when the error contains a parseable structural version tag* and *omitted otherwise*. The classifier does not guess. |
| N4 | Message localization (always English). |
| N5 | New public API in `@midnight-ntwrk/midnight-js-types` — the error type lives in `utils`. |
| N6 | **Layer 2 (runtime error promotion):** catching plain `Error` from `op.execute(...)` etc. and promoting to `DeserializationError`. This is a separate follow-up; current scope is deserialization at typed-boundary call sites only. |

## 4. Acceptance criteria mapping

| Acceptance criterion (from issue) | Covered by |
|-----------------------------------|------------|
| Wrapper capturing contextual info for deserialization call sites | Typed wrappers in `utils/deserialization/typed-wrappers.ts` (primary) + `withDeserializationContext` HOF (escape hatch). All 7 production call sites covered. |
| Catches & turns to user-friendly errors (data type, caller, classification, direction, mitigation) | `DeserializationError` + `classify` with pattern table covering all three sources. |
| Used consistently around all ledger/runtime deserialization | All raw `.deserialize`/`.decode` calls relocated into typed wrappers; ESLint forbids raw calls elsewhere. |
| Used around contract calls (compact-runtime & onchain-runtime) | `withRuntimeContext` in `contracts/internal/`. Source-agnostic enrichment. |

## 5. Architecture

Two layers in `packages/utils/src/deserialization/`:

- **Inner layer:** `withDeserializationContext` HOF — generic try/classify/throw.
- **Outer layer:** `typed-wrappers.ts` — one typed function per ledger/runtime data type. Each typed wrapper is the **single** place where the raw `.deserialize`/`.decode` call lives. Consumer packages never call ledger/runtime types' static methods directly.

```
┌────────────────────────────────────────────────────────────────────────┐
│                packages/utils/src/deserialization/                     │
│                                                                        │
│  versions.ts                ← PINNED_VERSIONS (single source)          │
│  patterns.ts                ← pattern table per source (3 sources)     │
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
                          │   on every wrapped type              │
                          └──────────────────────────────────────┘
```

**Design intent:** the *only* file in the repo allowed to call `ContractState.deserialize(...)`, `ZswapChainState.deserialize(...)`, `StateValue.decode(...)`, etc. is `typed-wrappers.ts`. This is enforced by ESLint. Everything else imports `deserializeContractState`, `deserializeZswapChainState`, … from `@midnight-ntwrk/midnight-js-utils`.

## 6. Type contracts

```ts
// utils/src/deserialization/deserialization-error.ts

export type SourceLibrary = 'ledger' | 'compact-runtime' | 'onchain-runtime';

export type Classification =
  | 'version-mismatch'
  | 'generic-param-mismatch'   // structural version equal, generic params differ — e.g. (proof-preimage) vs (pre-proof)
  | 'format-mismatch'
  | 'unknown';

export type Direction = 'data-newer-than-code' | 'data-older-than-code';

// Fields the classifier may extract from the error message.
// Used to override or enrich the caller-supplied DeserializationCallSite.
export interface ExtractedInfo {
  readonly dataType?: string;             // from regex group "what"
  readonly expectedVersion?: number;
  readonly receivedVersion?: number;
  readonly expectedSpecifiers?: string;
  readonly receivedSpecifiers?: string;
}

export interface PatternEntry {
  readonly regex: RegExp;
  /**
   * Static value for patterns whose classification is fixed (most patterns).
   * Function form for patterns whose classification depends on captured groups
   * (e.g. Pattern #1: 'version-mismatch' vs 'generic-param-mismatch' based on version/specifiers comparison).
   */
  readonly classification: Classification | ((match: RegExpExecArray) => Classification);
  readonly inferDirection?: (match: RegExpExecArray) => Direction | undefined;
  readonly extract?: (match: RegExpExecArray) => ExtractedInfo;
}

export interface DeserializationCallSite {
  readonly dataType: string;          // open string — diagnostic field; may be overridden by classifier if regex extracts a name
  readonly source: SourceLibrary;     // strict union — stable semantics
  readonly caller: string;            // fully-qualified: '@midnight-ntwrk/<package>:<function>'
  readonly callee?: string;           // optional: target library identifier; defaults to source pin name (e.g. '@midnight-ntwrk/ledger-v8')
}

export interface DeserializationContext extends DeserializationCallSite {
  readonly classification: Classification;
  readonly direction?: Direction;
  readonly mitigation: readonly string[];
  readonly pinnedVersions: {
    readonly ledger: string;
    readonly compactRuntime: string;
    readonly onchainRuntime: string;
  };
  readonly extracted?: ExtractedInfo;  // populated when classifier matched a pattern with extract logic
}

export class DeserializationError extends Error {
  readonly context: DeserializationContext;
  constructor(context: DeserializationContext, cause: Error);
}

/**
 * Discriminator with brand-check fallback for cross-realm scenarios
 * (web workers, npm hoist mismatches). See M3 in §11.
 */
export const isDeserializationError: (e: unknown) => e is DeserializationError;
```

Reference `isDeserializationError` implementation:

```ts
export const isDeserializationError = (e: unknown): e is DeserializationError =>
  e instanceof DeserializationError ||
  (e !== null &&
    typeof e === 'object' &&
    (e as { name?: unknown }).name === 'DeserializationError' &&
    'context' in (e as object));
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
  readonly caller: string;
  readonly callee?: string;  // optional override; default per-wrapper is the source pin name (e.g. '@midnight-ntwrk/ledger-v8')
}

// Six typed wrappers covering all 7 production call sites.
// (Two call sites map to the same wrapper: ContractState from compact-runtime
// is invoked from two locations.)
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

**Source of truth:** patterns derived from a direct audit of `midnight-ledger` source (`serialize/`, `serialize-macros/`, `ledger/`, `ledger-wasm/`, `onchain-runtime/`, `onchain-runtime-wasm/`, `onchain-state/`). Patterns are **literal strings from the Rust code**, not hypothetical.

**Shared serialize crate (verified):**

- `serialize/` crate in `midnight-ledger` provides the `Deserializable` trait, `tagged_deserialize`, and the canonical error formats used by every Rust crate listed above.
- `onchain-runtime/src/transcript.rs:20` imports `use serialize::{Deserializable, Serializable, Tagged}` — same crate.
- `onchain-runtime/src/context.rs:51` imports `use serialize::{Deserializable, Serializable, Tagged, tag_enforcement_test}` — same crate.
- `onchain-state/src/state.rs:727` uses `#[tag = "contract-state[v6]"]` — same tagged-serialization convention.
- `@midnight-ntwrk/compact-runtime` (npm) `package.json` declares `@midnight-ntwrk/onchain-runtime-v3` as a dependency — compact-runtime is layered on top of onchain-runtime and inherits its serialization.
- The WASM wrapper `format!("Unable to deserialize {struct_name}. Error: {inner}", ...)` is identical in `ledger-wasm/src/conversions.rs` and `onchain-runtime-wasm/src/lib.rs`.

**Conclusion:** the pattern table is **shared across all three sources**. The classifier dispatches by `source` to the same pattern list; the dispatch exists for future per-source divergence and for mitigation generation (§7.2), not for distinct pattern strings.

**WASM wrapping note:** every WASM-exposed `.deserialize(Uint8Array)` / `.decode(Uint8Array)` call wraps the inner Rust error via `format!("Unable to deserialize {struct_name}. Error: {inner}", ...)`. The classifier uses `RegExp.test()` substring matching, so the prefix is transparent.

#### Shared pattern table (active for all three sources)

The pattern table is ordered: more specific patterns come first.

| # | Pattern (regex, case-insensitive unless noted) | Classification | Direction | Source in `midnight-ledger` repo |
|---|------------------------------------------------|----------------|-----------|----------------------------------|
| 1 | **Two-stage match.** Primary: `/(?:Unable to deserialize (?<what>[A-Za-z]+)\. Error: )?expected header tag '(?<expectedType>[A-Za-z:-]+)\[v(?<expectedVersion>\d+)\](?:\((?<expectedSpecifiers>[^)]+)\))?:', got '(?<got>[^']*)'/` — permissive on `got`. Secondary (applied to `got`): `/^(?<gotType>[A-Za-z:-]+)\[v(?<gotVersion>\d+)\](?:\((?<gotSpecifiers>[^)]+)\))?:$/`. | `version-mismatch` (default); **`generic-param-mismatch`** if secondary matches AND versions equal AND specifiers differ | If secondary matches: `gotVersion < expectedVersion` → `data-older-than-code`; `gotVersion > expectedVersion` → `data-newer-than-code`; equal → `undefined`. **If secondary fails (got is empty/garbage/truncated): `undefined`.** | `serialize/src/deserializable.rs:67` |
| 3 | `/invalid old discriminant/` | `version-mismatch` | `data-older-than-code` | `ledger/src/structure.rs:253,315,2559` |
| 4 | `/unknown discriminant/` | `version-mismatch` | `data-newer-than-code` | `ledger/src/structure.rs:260,323,2564` |
| 5 | `/unrecognised discriminant/` | `version-mismatch` | *(undefined)* | `serialize-macros/src/lib.rs:455` (auto-derived) |
| 6 | `/unsupported (proof\|guaranteed transcript\|fallible transcript) version/` | `version-mismatch` | *(undefined)* | `ledger/src/error.rs:977-985` |
| 7 | `/Not all bytes read/` | `format-mismatch` | *(undefined)* | `serialize/src/deserializable.rs:86`, `ledger-wasm/src/conversions.rs:132` |
| 8 | `/exceeded recursion depth/` | `format-mismatch` | *(undefined)* | `serialize/src/deserializable.rs:106` |
| 9 | `/non-canonical scale encoding/` | `format-mismatch` | *(undefined)* | `serialize/src/util.rs:277,290,304` |
| 10 | `/out of range for /` | `format-mismatch` | *(undefined)* | `serialize/src/util.rs:180` |
| 11 | `/cannot deserialize \S+ as bool/` | `format-mismatch` | *(undefined)* | `serialize/src/util.rs:103` |
| 12 | `/Invalid discriminant: /` (case-sensitive — distinguishes from #3/#4) | `format-mismatch` | *(undefined)* | `serialize/src/deserializable.rs:166` (Option::deserialize) |
| 13 | `/failed to fill whole buffer/` | `format-mismatch` | *(undefined)* | Rust std `io::ErrorKind::UnexpectedEof` |
| — | *(no match)* | `unknown` | *(undefined)* | — |

**Implementation notes:**
- Patterns live in `patterns.ts` as a readonly array of `PatternEntry`, keyed internally so that future source-specific divergence is a one-file change.
- First matching pattern wins.
- Tag format `<type-name>[vN]` is governed by `serialize/src/tagged.rs` convention (line 28: *"Square brackets are used to denote the version of a given type"*). The ledger and onchain-state crates have `tag_enforcement_test!` macros guaranteeing tag stability per type — structural backing for pattern #1.
- **Pattern #1 extracts** `dataType` (from `what` group, when present), both versions, and both specifiers. Returned via `ExtractedInfo`. The classifier writes these to `DeserializationContext.extracted` and **overrides** `context.dataType` with the regex value when the regex captured one — eliminates literal-drift risk on type rename. Caller-supplied `dataType` (from typed wrappers) is used as fallback.
- **Pattern #1 uses the function-form `classification`** (per `PatternEntry` type in §6) with a two-stage match (primary + secondary on `got`):
  ```ts
  // patterns.ts
  const GOT_SUBPATTERN =
    /^(?<gotType>[A-Za-z:-]+)\[v(?<gotVersion>\d+)\](?:\((?<gotSpecifiers>[^)]+)\))?:$/;

  classification: (m: RegExpExecArray): Classification => {
    const got = m.groups?.got ?? '';
    const sec = got.match(GOT_SUBPATTERN);
    if (!sec) return 'version-mismatch'; // got is empty/garbage/truncated — still a tag mismatch
    const expVer = Number(m.groups?.expectedVersion);
    const gotVer = Number(sec.groups?.gotVersion);
    if (expVer !== gotVer) return 'version-mismatch';
    if (m.groups?.expectedSpecifiers !== sec.groups?.gotSpecifiers) return 'generic-param-mismatch';
    return 'version-mismatch';  // unreachable in practice — defensive fallback
  }
  ```
  **Why two-stage:** verified against real `ledger-v8@8.1.0` errors — 3 of 6 production scenarios have empty/garbage/truncated `got` values (empty buffer → `got ''`, wrong type → `got 'midnight:zswap-ledger-state['` truncated). A single regex requiring well-formed `got[vN]` would miss these. The primary regex captures the always-well-formed `expected` portion; secondary regex opportunistically parses `got` for direction/specifier detection.
  All other patterns use the static-value form (`classification: 'version-mismatch'`, etc.).
- **`extracted` field rules:**
  - Default value is `undefined`, not `{}`.
  - When `pattern.extract` is defined and returns an `ExtractedInfo`, the classifier copies it into `context.extracted`.
  - First match wins — no merging of results from multiple patterns.
  - `withRuntimeContext` (§7.5) preserves `extracted` through the spread `{...e.context}` — enrichment does not clobber extraction.

### 7.2 Mitigation generation

Mitigation is a function of **`classification × source`**. Different classifications need different guidance — pointing to "verify version pin" for a `format-mismatch` would mislead the developer.

```ts
import { PINNED_VERSIONS } from './versions';

const versionMismatchBaseline = (): readonly string[] => [
  `Confirm @midnight-ntwrk/midnight-js-protocol pinned versions match the network protocol of the target environment ` +
    `(ledger=${PINNED_VERSIONS.ledger}, compact-runtime=${PINNED_VERSIONS.compactRuntime}, onchain-runtime=${PINNED_VERSIONS.onchainRuntime}).`,
  'If reading data from an indexer, confirm the indexer protocol version matches the dApp.',
];

const formatMismatchBaseline = (): readonly string[] => [
  'This error indicates malformed or truncated bytes — not necessarily a version mismatch.',
  'Verify the source produces canonical encoding (no double-encoding, no trailing bytes, no truncation).',
  'Check intermediate transports (HTTP gateways, GraphQL serialization) for byte corruption.',
];

const unknownBaseline = (): readonly string[] => [
  'Classification could not be determined from the error message.',
  'Inspect the underlying error (Caused by:) for context.',
  'If the cause looks version-related, verify pinned versions in @midnight-ntwrk/midnight-js-protocol.',
];

const perSource = (): Record<SourceLibrary, string> => ({
  'ledger':
    `Each ledger type has a structural version tag (e.g. "contract-state[v6]") that is independent of the ` +
    `@midnight-ntwrk/ledger-${PINNED_VERSIONS.ledger} npm package version. ` +
    `Inspect the error's "expected ... got" tag to identify the mismatched type and version, then either ` +
    `align the data source to that structural version or pin a ledger npm version that supports the data's tag.`,
  'compact-runtime':
    'Verify the compactc compiler version used to build the contract matches the compact-runtime pinned in @midnight-ntwrk/midnight-js-protocol. ' +
    'Compact-runtime depends on onchain-runtime — version drift in either propagates here.',
  'onchain-runtime':
    `Verify @midnight-ntwrk/onchain-runtime-${PINNED_VERSIONS.onchainRuntime} pin matches the contract operations runtime. ` +
    'Structural version tags (e.g. "state-value[vN]") may diverge from the npm package version.',
});

// classify.ts mitigation builder — dispatches on (classification, source)
const buildMitigation = (
  classification: Classification,
  source: SourceLibrary,
): readonly string[] => {
  switch (classification) {
    case 'version-mismatch':
    case 'generic-param-mismatch':
      return [...versionMismatchBaseline(), perSource()[source]];
    case 'format-mismatch':
      return formatMismatchBaseline();  // source hint omitted — irrelevant for byte corruption
    case 'unknown':
      return [...unknownBaseline(), perSource()[source]];
  }
};
```

Mitigation is deterministic — depends only on `classification`, `source`, and `PINNED_VERSIONS`. No runtime external lookup. Exhaustive `switch` on `Classification` ensures any new classification value forces a deliberate decision about mitigation copy (compile-time error if missed).

**Structural vs npm version distinction** (verified against `midnight-ledger`): the npm package versions (ledger `v8`, onchain-runtime `v3`) are independent of per-type structural version tags (`[vN]` embedded in serialized payloads). Mitigation explicitly calls this out so devs don't conflate the two.

### 7.3 `withDeserializationContext` semantics

| Scenario | Behavior |
|----------|----------|
| `fn()` returns value `v` (non-thenable) | Wrapper returns `v` (no overhead). |
| `fn()` throws `e instanceof Error` | Wrapper throws `new DeserializationError(classify(callSite, e), e)`. |
| `fn()` throws non-Error | Wrapper re-throws unchanged. |
| `fn()` returns a thenable | Wrapper **throws synchronously** with a `TypeError` — see runtime guard below. |

**Sync-only enforcement (M1 from review).** TypeScript can't prevent `T = Promise<U>` at the call site. The wrapper must reject async usage at runtime to avoid silent failure (Promise rejection escapes the try/catch):

```ts
export const withDeserializationContext = <T>(
  callSite: DeserializationCallSite,
  fn: () => T,
): T => {
  let result: T;
  try {
    result = fn();
  } catch (cause) {
    if (!(cause instanceof Error)) throw cause;
    throw new DeserializationError(classify(callSite, cause), cause);
  }
  if (isThenable(result)) {
    throw new TypeError(
      `withDeserializationContext is sync-only; received a thenable from ${callSite.caller}. ` +
      `Wrap the .deserialize call (not the awaited value) inside the thunk, or handle async deserialization with try/catch.`
    );
  }
  return result;
};

const isThenable = (v: unknown): v is PromiseLike<unknown> =>
  v !== null && typeof v === 'object' && typeof (v as { then?: unknown }).then === 'function';
```

Status: this HOF is an **escape hatch**, not the primary API. Consumers should reach for typed wrappers (§7.4). The HOF stays exported for ad-hoc cases that fall outside the predefined typed wrappers.

### 7.4 Typed wrappers semantics

Each typed wrapper:

1. Accepts `(bytes: Uint8Array, ctx: { caller: string })`.
2. Calls `withDeserializationContext(callSite, () => Class.deserialize(bytes))` internally — `dataType` and `source` are hard-coded inside the wrapper.
3. Returns the deserialized value with the correct return type.

Reference implementation pattern:

```ts
import { PINNED_VERSIONS } from './versions';

const LEDGER_CALLEE = `@midnight-ntwrk/ledger-${PINNED_VERSIONS.ledger}`;

export const deserializeContractState = (
  bytes: Uint8Array,
  ctx: CallSiteContext,
): LedgerContractState =>
  withDeserializationContext(
    {
      dataType: 'ContractState',
      source: 'ledger',
      caller: ctx.caller,
      callee: ctx.callee ?? LEDGER_CALLEE,  // default callee = source pin name
    },
    () => LedgerContractState.deserialize(bytes),
  );
```

Each wrapper has a hardcoded default `callee` matching its `source`:

| source | default `callee` |
|--------|------------------|
| `ledger` | `@midnight-ntwrk/ledger-${PINNED_VERSIONS.ledger}` |
| `compact-runtime` | `@midnight-ntwrk/compact-runtime` |
| `onchain-runtime` | `@midnight-ntwrk/onchain-runtime-${PINNED_VERSIONS.onchainRuntime}` |

Callers can override via `ctx.callee` for unusual cases (e.g. testing).

The full set of wrappers covers the 7 production call sites:

| Typed wrapper | Underlying call | Source attribution |
|---------------|-----------------|--------------------|
| `deserializeContractState` | `ledger.ContractState.deserialize` | `ledger` |
| `deserializeCompactContractState` | `compact-runtime.ContractState.deserialize` | `compact-runtime` |
| `deserializeZswapChainState` | `ledger.ZswapChainState.deserialize` | `ledger` |
| `deserializeLedgerTransaction` | `ledger.LedgerTransaction.deserialize` | `ledger` |
| `deserializeLedgerParameters` | `ledger.LedgerParameters.deserialize` | `ledger` |
| `decodeLedgerStateValue` | `ledger.StateValue.decode` (re-exports onchain-runtime semantics) | `onchain-runtime` |

**Source attribution note for `decodeLedgerStateValue`:** the type is imported via `protocol/ledger` (as `StateValue` aliased to `LedgerStateValue`), but `StateValue` is the onchain-runtime primitive re-exported through ledger. We attribute by **underlying library** because mitigation strings refer to runtime pins, not import paths. This gives the developer the correct package to inspect.

### 7.5 `withRuntimeContext` semantics

**Granularity:** the wrapper covers the **entire body** of each contract entrypoint (`call`, `deploy`, `find`). Because the wrapper filters by `isDeserializationError(e)`, every non-deserialization error (proof, wallet, network) passes through untouched.

| Scenario | Behavior |
|----------|----------|
| `fn()` resolves to `v` | Returns `v`. |
| `fn()` throws non-`DeserializationError` | Re-throws unchanged. |
| `fn()` throws `DeserializationError e` | Throws new `DeserializationError` with: `caller` = `@midnight-ntwrk/midnight-js-contracts:${operation}(${circuitId ?? '-'})`; **`callee` = `e.context.callee` preserved** (still points to inner library, e.g. `@midnight-ntwrk/ledger-v8`); `dataType`, `source`, `classification`, `direction`, `mitigation`, `extracted`, `pinnedVersions` all preserved via `{...e.context}` spread; `cause` = `e.cause` (NOT `e`) — flat chain. |

**Reasoning for `callee` preservation:** the inner library is where the actual mismatch lives. After enrichment, the message renders `@midnight-ntwrk/midnight-js-contracts:call(mint) → @midnight-ntwrk/ledger-v8` — both ends of the diagnostic chain visible.

**Stack trace depth:** outer `DeserializationError` → root ledger Error. Inner `DeserializationError` is absorbed.

### 7.6 `formatMessage` output specification

`DeserializationError.message` is built by `formatMessage(context)`. The format is **stable** — tests and consumer log parsers may rely on the block structure (but **not** on exact whitespace).

```
Failed to deserialize <dataType> (<source>).
  <caller> → <callee>
  Classification: <classification>[ (direction: <direction>)]
  Pinned versions: ledger=<L>, compact-runtime=<C>, onchain-runtime=<O>
[  Extracted: dataType=<extDataType>, expected=<expVer>(<expSpec>), got=<gotVer>(<gotSpec>)]
  Mitigation:
    - <mitigation[0]>
    - <mitigation[1]>
[    - <mitigation[N]>]
```

Rules:
- `<dataType>` is `context.dataType` (already overridden by classifier if regex extracted a `what` group — D9).
- `<callee>` is `context.callee` (defaulted by typed wrapper if omitted — D10).
- `(direction: ...)` line suffix appears only when `context.direction !== undefined`.
- `Extracted:` line appears only when `context.extracted !== undefined`; format includes whichever sub-fields are present.
- Mitigation entries one-per-line, dash-prefixed, two-space indent under `Mitigation:` header.
- Empty `mitigation` array → render `Mitigation: (none)` on a single line.
- `cause` is **not** included in `message` — Node/V8 renders `Caused by:` from `Error.cause` automatically when the error is printed/stacked.

Reference implementation:

```ts
const formatMessage = (ctx: DeserializationContext): string => {
  const lines: string[] = [
    `Failed to deserialize ${ctx.dataType} (${ctx.source}).`,
    `  ${ctx.caller} → ${ctx.callee ?? defaultCallee(ctx.source)}`,
    `  Classification: ${ctx.classification}` + (ctx.direction ? ` (direction: ${ctx.direction})` : ''),
    `  Pinned versions: ledger=${ctx.pinnedVersions.ledger}, ` +
      `compact-runtime=${ctx.pinnedVersions.compactRuntime}, ` +
      `onchain-runtime=${ctx.pinnedVersions.onchainRuntime}`,
  ];
  if (ctx.extracted) lines.push(`  Extracted: ${formatExtracted(ctx.extracted)}`);
  if (ctx.mitigation.length === 0) {
    lines.push('  Mitigation: (none)');
  } else {
    lines.push('  Mitigation:');
    for (const m of ctx.mitigation) lines.push(`    - ${m}`);
  }
  return lines.join('\n');
};
```

### 7.7 Logging integration

`DeserializationError` does **not** auto-log on construction. Decision rationale: coupling error-shape to logger violates SRP, hurts unit-test ergonomics, and makes the error usable in contexts without a logger (e.g. raw scripts, deno).

**Consumer responsibility:**
```ts
try {
  await contract.submit('mint', [...]);
} catch (e) {
  if (isDeserializationError(e)) loggerProvider?.error(e, e.context);
  throw e;
}
```

The provider architecture's `loggerProvider` is the natural sink, but the wrapper code does **not** depend on it. dApps without a logger pin still get rich `error.message` and `error.context` for inspection.

## 8. File changes inventory

### 8.1 New files

| File | Lines (est.) | Purpose |
|------|--------------|---------|
| `packages/utils/src/deserialization/versions.ts` | 15 | `PINNED_VERSIONS` const |
| `packages/utils/src/deserialization/patterns.ts` | 50 | Pattern table — shared across all three sources |
| `packages/utils/src/deserialization/classify.ts` | 60 | `classify(callSite, cause)` — source-dispatched |
| `packages/utils/src/deserialization/deserialization-error.ts` | 80 | `DeserializationError` + `isDeserializationError` + `formatMessage` |
| `packages/utils/src/deserialization/with-deserialization-context.ts` | 30 | HOF (escape hatch) |
| `packages/utils/src/deserialization/typed-wrappers.ts` | 80 | ★ Primary API — 6 typed wrappers ★ |
| `packages/utils/src/deserialization/index.ts` | 10 | Re-exports |
| `packages/contracts/src/internal/with-runtime-context.ts` | 40 | Async HOF |
| `packages/utils/src/test/deserialization-error.test.ts` | 100 | Unit tests |
| `packages/utils/src/test/classify-deserialization-error.test.ts` | 120 | Pattern table tests |
| `packages/utils/src/test/with-deserialization-context.test.ts` | 80 | HOF tests |
| `packages/utils/src/test/typed-wrappers.test.ts` | 100 | Typed wrapper unit tests |
| `packages/utils/src/test/classify-integration.test.ts` | 130 | Real ledger/compact-runtime/onchain-runtime canaries |
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

**Total estimate:** ~930 LOC new + modifications. Majority is tests.

### 8.3 Dependencies

| Package | Change |
|---------|--------|
| `@midnight-ntwrk/midnight-js-utils` | No new deps (already depends on `protocol`). |
| `@midnight-ntwrk/midnight-js-contracts` | No new deps (already depends on `utils`). |
| Root workspace `package.json` | Unchanged. |

### 8.4 GitNexus impact analysis

Run on `2026-06-03` against the stale index (last full index: commit `36d5aee`; current branch tip: `f35cbe7`). All commits between are `ci(testkit-js):`-scoped and do not modify `packages/`, so the impact data is current for our targets.

| Symbol | Risk | Direct callers (d=1) | d=2 | Processes affected |
|--------|------|-----------------------|-----|---------------------|
| `deserializeContractState` (indexer) | **CRITICAL** | 5 — `queryContractState`, `queryZSwapAndContractState`, `queryDeployContractState`, `transactionToContractState$`, `blockToContractState$` | 1 — `contractStateObservable` | 10 (4 modules) |
| `deserializeTransaction` (indexer) | **HIGH** | 2 — `watchForDeployTxData`, `watchForTxData` | — | 3 |
| `deserializeZswapState` (indexer) | LOW | 1 — `queryZSwapAndContractState` | — | 2 |
| `deserializeLedgerParameters` (indexer) | LOW | 1 — used inline in `queryZSwapAndContractState` | — | 2 |
| `toLedgerContractState`, `fromLedgerContractState`, `toLedgerQueryContext` (contracts/utils) | LOW (in-repo) | called by `createUnprovenLedgerDeployTx`, `createUnprovenLedgerCallTx` in same file | — | — |
| `submitCallTx`, `submitDeployTx`, `deployContract`, `findDeployedContract` | LOW **in-repo only** | external dApp consumers not visible to the midnight-js index — **public-API risk: HIGH** | — | — |

**Risk interpretation:** refactor is signature-preserving (typed wrapper hides argument-list and generic-param complexity from callers). No d=1 dependant needs updates. No HIGH/CRITICAL warnings ignored.

### 8.5 Call site audit by source

Audit run on `2026-06-03`. Excludes `dist/`, `*.test.ts`, `*.d.ts`. Source attribution by **underlying library** (where the error originates), not import path — relevant for `decodeLedgerStateValue` whose type is imported via `protocol/ledger` but originates in onchain-runtime.

| Source | Call sites | Locations |
|--------|-----------|-----------|
| `ledger` | 4 | `indexer-public-data-provider.ts:141` (ZswapChainState), `:144` (LedgerTransaction), `:147` (LedgerParameters); `ledger-utils.ts:49` (LedgerContractState) |
| `compact-runtime` | 2 | `indexer-public-data-provider.ts:138` (ContractState); `ledger-utils.ts:52` (ContractState) |
| `onchain-runtime` | 1 | `ledger-utils.ts:55` (LedgerStateValue.decode — type re-exported through ledger) |
| **Total** | **7** | |

Implication: deferring `compact-runtime` or `onchain-runtime` patterns would leave 3 of 7 call sites (43%) producing `classification: 'unknown'`. v2 spec ships all three sources in PR A.

### 8.6 Build target

- **Minimum ES target: ES2022** (required for `Error.cause` constructor option).
- **Minimum Node target: 16.9** (matches ES2022 `Error.cause` support; aligns with repo `.nvmrc`).
- **Browser target: evergreen** (Chrome ≥ 93, Firefox ≥ 91, Safari ≥ 15.4 — all support `Error.cause`).

Verification step before commit 1: inspect `tsconfig.build.json` / root `tsconfig.json` for `compilerOptions.target`. Must be `ES2022` or later. If lower, this spec cannot ship as designed (`cause` would be silently stripped — R9).

### 8.7 TypeScript strict-mode compatibility

Spec-level expectations for `packages/utils/tsconfig.json`:

| Flag | Required state | Reason |
|------|----------------|--------|
| `strict` | `true` | Standard for production TS in this repo |
| `noImplicitAny` | `true` (implied by `strict`) | Prevents accidental `any` in pattern callbacks |
| `strictNullChecks` | `true` (implied by `strict`) | Required for `Direction \| undefined` and `extracted?: ExtractedInfo` semantics |
| `useUnknownInCatchVariables` | `true` (TS 4.4+ default) | `catch (cause)` typed as `unknown`; classifier must narrow before access |
| `noUncheckedIndexedAccess` | document current state; **adjust regex group access if enabled** | If enabled, `regexResult.groups.what` is `string \| undefined` — use `regexResult.groups?.what` everywhere |
| `exactOptionalPropertyTypes` | document current state; **adjust optional fields if enabled** | If enabled, `callee?: string` is not the same as `callee: string \| undefined` — implementation must match repo convention |

Pre-PR-A action: run `tsc --showConfig -p packages/utils` and capture relevant flags in PR description. If `exactOptionalPropertyTypes: true`, replace `?:` with `| undefined` throughout type contracts in §6.

## 9. Implementation sequence

Each step = one commit following the repo's `feat(<scope>): ...` convention.

| #  | Commit | Scope | Test first |
|----|--------|-------|------------|
| 1  | `feat(utils): add DeserializationError and context types` | utils | ✅ |
| 2  | `feat(utils): add deserialization error pattern table and classifier` | utils | ✅ |
| 3  | `feat(utils): add withDeserializationContext HOF` | utils | ✅ |
| 4  | `feat(utils): add typed deserialization wrappers` | utils | ✅ |
| 5  | `test(utils): integration tests against real ledger/runtime errors` | utils | (test is the artifact) |
| 6  | `refactor(indexer-public-data-provider): replace raw deserialize with typed wrappers` | provider | regression smoke |
| 7  | `refactor(contracts): replace raw deserialize/decode in ledger-utils with typed wrappers` | contracts | regression smoke |
| 8  | `feat(contracts): add withRuntimeContext internal helper` | contracts | ✅ |
| 9  | `refactor(contracts): wrap call/deploy/find pipelines with withRuntimeContext` | contracts | regression |
| 10 | `test(protocol): forbid raw ledger/runtime deserialize outside typed wrappers via ESLint` | protocol | (test is the artifact) |

**Suggested PR split:**

- **PR A:** commits 1–5 (utils foundation incl. typed wrappers, isolated, no consumer changes).
- **PR B:** commits 6–7 (call site refactor — mechanical 1:1 replacement of raw calls with typed wrappers).
- **PR C:** commits 8–9 (runtime context for contract entrypoints).
- **PR D:** commit 10 (ESLint enforcement — needs A–C merged first).

**No follow-up issue** required for pattern coverage (v1's Phase 5 is eliminated in v2). A follow-up could still be considered for **Layer 2** (runtime error promotion in `withRuntimeContext`, N6) if usage feedback indicates value.

## 10. Testing strategy

### 10.1 Unit tests

- `DeserializationError`: message rendering (`caller → callee` form), name, cause, context exposure, `instanceof` semantics, `extracted` field population.
- `classify`: pattern table coverage — one test per pattern row + fallback to `unknown`. Tests run once for `source: 'ledger'` and parametrically for `compact-runtime` and `onchain-runtime` to lock the shared-pattern contract. **Specific tests for D9 (dataType override) and D11 (generic-param-mismatch classification).**
- `withDeserializationContext`: sync pass-through, Error wrapping, non-Error re-throw, cause chain.
- `typed-wrappers`: each wrapper called on valid input returns expected type; on invalid input throws `DeserializationError` with correct `dataType`, `source`, and **default `callee`** baked in.
- `withRuntimeContext`: pass-through, non-`DeserializationError` re-throw, caller overwrite + flat cause chain.

### 10.2 Integration tests

`classify-integration.test.ts` invokes the **actual WASM bindings** and asserts classifier output across all three sources:

| Scenario | Source exercised | Expected classification | Expected direction |
|---|---|---|---|
| Ledger tag mismatch, parseable versions (`[v6]` vs `[v5]`) | `ledger` | `version-mismatch` | `data-older-than-code` |
| Ledger tag mismatch, newer version (`[v7]`) | `ledger` | `version-mismatch` | `data-newer-than-code` |
| Ledger tag mismatch, empty `got` (deserialize on empty buffer) | `ledger` | `version-mismatch` (primary matched, secondary failed) | `undefined` |
| Ledger tag mismatch, garbage `got` (e.g. random bytes — `got '?????'`) | `ledger` | `version-mismatch` (primary matched, secondary failed) | `undefined` |
| Ledger tag mismatch, truncated `got` (e.g. wrong-type bytes — `got 'midnight:zswap-ledger-state['`) | `ledger` | `version-mismatch` (primary matched, secondary failed) | `undefined` |
| Ledger tag mismatch, same version, different generic params (e.g. `(proof-preimage)` vs `(pre-proof)`) | `ledger` | **`generic-param-mismatch`** | `undefined` |
| Ledger tag mismatch, regex extracts `dataType` from WASM prefix — verify `context.dataType` overridden | `ledger` | `version-mismatch` | as parsed |
| Versioned-enum old discriminant (ProofVersioned) | `ledger` | `version-mismatch` | `data-older-than-code` |
| Versioned-enum unknown discriminant | `ledger` | `version-mismatch` | `data-newer-than-code` |
| Auto-derived enum overflow | `ledger` | `version-mismatch` | `undefined` |
| Trailing bytes after valid payload | `ledger` | `format-mismatch` | `undefined` |
| Truncated input | `ledger` | `format-mismatch` | `undefined` |
| Recursion overflow | `ledger` | `format-mismatch` | `undefined` |
| Empty input | `ledger` | `format-mismatch` | `undefined` |
| Compact-runtime ContractState — tag mismatch | `compact-runtime` | `version-mismatch` | parseable if `[vN]` present |
| Compact-runtime ContractState — truncated | `compact-runtime` | `format-mismatch` | `undefined` |
| Onchain-runtime StateValue — truncated | `onchain-runtime` | `format-mismatch` | `undefined` |
| Onchain-runtime StateValue — invalid format | `onchain-runtime` | `format-mismatch` or `version-mismatch` per pattern hit | as inferred |

Test acts as canary: if any of the three source libraries changes error message strings, one or more rows fail loudly, forcing a refresh of `patterns.ts`.

### 10.3 Regression tests

Existing tests in `indexer-public-data-provider` and `contracts` must continue to pass — wrappers are transparent on the success path. Verified by `yarn test` green run pre/post each commit.

### 10.4 ESLint test

- `eslint-restriction.test.ts` extension verifies that raw `\.deserialize\(` / `\.decode\(` calls on identifiers originating from `ledger-v8` / `compact-runtime` / `onchain-runtime-v3` are **blocked everywhere** except:
  - `packages/utils/src/deserialization/typed-wrappers.ts` (the single sanctioned site),
  - `**/*.test.ts` and `**/*.spec.ts` (test fixtures may craft raw calls intentionally),
  - `testkit-js/**/*.ts` (test infrastructure for external dApp consumers — may legitimately use raw `.deserialize` for setup/teardown and for variants not covered by production typed wrappers, e.g. `LedgerTransaction<…, …, PreBinding>` for unsealed transactions).

## 11. Risks

| #  | Risk | Mitigation |
|----|------|------------|
| R1 | A ledger/runtime patch changes error message → classification breaks silently. | (a) Patterns are sourced from real source code, not guessed. (b) Tag format `<type>[vN]` is guarded by `tag_enforcement_test!` macros. (c) Integration test (§10.2) exercises every pattern row across all three sources in CI. |
| R2 | Mitigation hints become outdated (e.g. wrong package name). | Mitigation deterministic, generated from `PINNED_VERSIONS` const. |
| R3 | `withRuntimeContext` catches a non-deserialization error and unintentionally drops stack frames. | Filter `isDeserializationError(e)` first — non-deser errors re-thrown untouched. |
| R4 | ESLint rule false-positives in new tests. | Rule explicitly exempts `**/*.test.ts`. |
| R5 | Sub-path imports from `protocol` may not be wired in `utils`. | Verify `protocol/package.json` exports map before PR A. (All three sub-paths needed: `/ledger`, `/compact-runtime`, `/onchain-runtime`.) |
| R6 | Direction inference may mislead developers. | Only set when high-confidence (parseable structural tag); otherwise `undefined`. |
| R7 | Compact-runtime and onchain-runtime might emit error formats subtly different from ledger despite shared `serialize` crate (e.g. extra WASM-wrapper layer). | (a) Verified shared crate usage in §7.1. (b) Integration test (§10.2) exercises real WASM bindings for each source — drift is detected pre-merge. (c) `classify.ts` dispatches by source, so any future divergence can be addressed with a per-source pattern table without API change. |
| R8 | Cross-realm `instanceof DeserializationError` returns false when the error crosses a Web Worker `postMessage` boundary or hits an npm-hoist module duplication. dApps using workers for proof generation would lose the discriminator. | `isDeserializationError` includes a structural brand-check fallback (`name === 'DeserializationError' && 'context' in e`). Tested via §10.1 unit test that constructs a structurally-cloned mock. Consumers using workers should still prefer transferring `e.context` rather than the Error instance. |
| R9 | `Error.cause` requires ES2022; `new Error(msg, { cause })` silently drops `cause` in older targets. The flat-chain design (§7.5) depends on `cause` propagating. | Spec mandates ES2022 build target (see §8.6). Verified that `packages/utils/tsconfig.json` and root `tsconfig.json` target ES2022 or higher before commit 1. |
| R10 | TypeScript strict-mode flags in `utils/tsconfig.json` may reject type signatures with `?:`-style optional fields when `exactOptionalPropertyTypes` is enabled, or require explicit non-null assertions for `regexResult.groups` access when `noUncheckedIndexedAccess` is enabled. | Verify enabled strict flags before commit 1. Adjust signatures to use `field: T \| undefined` instead of `field?: T` if `exactOptionalPropertyTypes` is on. Guard `regexResult.groups?.field` everywhere — never bare `.groups.field`. |
| R11 | Consumer dApp bundlers (vite, webpack, esbuild, parcel) may handle `@midnight-ntwrk/midnight-js-protocol` sub-path exports inconsistently — tree-shaking, dual-package hazard, or outright resolution failure. | Pre-PR-B smoke test: build `midnight-wallet-dapp` (reference dApp) against the merged `utils` package and confirm: (a) bundle resolves; (b) only the source-libs actually used end up in the bundle; (c) error message renders correctly in the dApp's runtime. Capture bundle-size delta in PR description. |

## 12. Resolved decisions

| #  | Decision | Rationale |
|----|----------|-----------|
| D1 | **Pattern coverage:** ledger, compact-runtime, and onchain-runtime patterns **all ship in the first PR**. | Code audit (§8.5) shows 3 of 7 production call sites use compact-runtime or onchain-runtime; deferring those would silently classify 43% of call sites as `'unknown'`. Shared `serialize` crate (verified §7.1) means patterns are identical across sources — incremental cost is ~0.5 day. |
| D2 | **Caller naming:** fully qualified — `@midnight-ntwrk/<package>:<function>`. | Unambiguous, grep-friendly, survives package renames better than short names. |
| D3 | **`withRuntimeContext` granularity:** wrap the entire entrypoint body. The `isDeserializationError(e)` filter ensures non-deserialization errors pass through unchanged. | Wide wrap and narrow wrap are functionally equivalent for enrichment; the wide wrap is simpler and harder to regress against. |
| D4 | **Public re-export of `DeserializationError` and `isDeserializationError`** from `@midnight-ntwrk/midnight-js` barrel. | Consumer dApps need to discriminate this error type via `catch (e) { if (isDeserializationError(e)) ... }`. |
| D5 | **Typed wrappers as primary API**. `withDeserializationContext` HOF retained as an exported escape hatch. | Co-locates `dataType` literal with the actual class; call sites reduce to 1 line; ESLint rule simplifies to *"raw `.deserialize`/`.decode` only allowed in `typed-wrappers.ts`."* |
| D6 | **Direction inference uses structured tag parsing**, not keyword matching. | Tag format `[vN]` is documented and stability-tested in ledger source. Keyword fallback only when version isn't parseable. |
| D7 | **G4 enrichment is source-agnostic, classification is source-scoped.** Every `DeserializationError` flowing through `withRuntimeContext` gets enriched with circuit/contract context regardless of source. | Clarifies separation between enrichment and classification. |
| D8 | **Source attribution for `decodeLedgerStateValue` = `onchain-runtime`**, despite import via `protocol/ledger`. | Attributes by underlying library so mitigation hints point to the correct package pin. The TypeScript import path is incidental. |
| D9 | **Pattern #1 regex extracts `dataType` from WASM wrapper prefix and classifier overrides `context.dataType` when extraction succeeds.** Hardcoded `dataType` in typed wrapper is the fallback. | Eliminates literal drift on type rename — refactor moving `ContractState` → `LedgerContractState` no longer requires also updating a string literal in the wrapper. Auto-extraction also pulls generic specifiers, enabling `'generic-param-mismatch'` detection. |
| D10 | **`callee` added to `DeserializationCallSite`** as optional field with per-source default. Formatted error message renders `caller → callee` for 2-way direction context. | Resolves ambiguity in error messages of form *"call site: X.Y.Z"* — readers couldn't tell what's on the other end of the call. PoC review surfaced this gap; cheap to add, materially improves diagnostic clarity. |
| D11 | **New classification `'generic-param-mismatch'`** for tag-match where structural version is equal but generic params (e.g. `(proof-preimage)` vs `(pre-proof)`) differ. | Avoids misclassifying generic-param incompatibility as `'unknown'`. Surfaces a distinct failure mode that a developer should diagnose differently from version mismatch. |
| D12 | **Mitigation dispatched on `(classification, source)`**, not just `source`. `format-mismatch` skips version-related hints entirely; `unknown` produces a generic "inspect cause" message. | A `format-mismatch` (e.g. recursion overflow, non-canonical scale) is byte-corruption, not a version mismatch — telling the dev to "check version pins" actively misleads. Exhaustive `switch` on `Classification` makes future additions compile-error if mitigation is forgotten. |
| D13 | **`isDeserializationError` includes structural brand-check fallback**, not just `instanceof`. | `instanceof` fails across Web Worker boundaries and on npm-hoist module duplication. Midnight dApps use workers for proof generation — `instanceof`-only would silently misdiscriminate in production. |
| D14 | **`withDeserializationContext` throws a `TypeError` at runtime when `fn()` returns a thenable.** | TypeScript can't prevent `T = Promise<U>` at the call site. Without a runtime guard, async usage leads to silent Promise-rejection escapes. Throwing fast is the fail-safe behavior. |
| D15 | **`withRuntimeContext` preserves `callee` from inner `DeserializationError`**, overwriting only `caller`. | Inner library is where the actual incompatibility lives; the formatted message shows both ends of the diagnostic chain (`midnight-js-contracts → ledger-v8`). |
| D16 | **`DeserializationError` does not auto-log**; logging is the consumer's responsibility via try/catch + `loggerProvider`. | Coupling error-shape to logger violates SRP and hurts unit-test ergonomics. Caller has full context — they decide when/where to log. |

## 13. Rollout

- **Phase 1 (PR A):** merge foundation. No consumer changes — safe.
- **Phase 2 (PR B):** call site refactor. Error message shape changes; successful flows unaffected. **CHANGELOG warning:** consumers parsing legacy error strings (e.g. `e.message.includes('invalid tag')`) should migrate to `isDeserializationError(e) + e.context`.
- **Phase 3 (PR C):** runtime context. Behavioral change visible only on errors; successful txs unchanged.
- **Phase 4 (PR D):** ESLint rule. Could fail lint on unrelated PRs touching raw ledger/runtime deserialize. Communicate via the midnight-js channel before merge.

**No further phases** — v2 ships full Layer 1 coverage in PR A. Layer 2 (runtime error promotion, N6) is a separate future initiative pending usage feedback.

**Versioning:** No breaking API change (new exports only). Semver: `minor` bump for `utils`, `contracts`, and `midnight-js` (new re-exports).

## 14. Ready-to-implement checklist

- [ ] Spec approved by **Adam Reynolds** (issue author) as external reviewer
- [x] Open questions resolved (see Resolved decisions D1–D16)
- [x] Ledger/runtime error patterns verified against real source (see §7.1 "Source of truth")
- [x] Call site audit complete (see §8.5)
- [x] `gitnexus_impact` run for each modified symbol (see §8.4)
- [ ] Verified `protocol/package.json` exports map includes all three sub-paths (R5)
- [ ] Verified `packages/utils/tsconfig.json` strict-mode flags (§8.7) — adjust type signatures if `exactOptionalPropertyTypes` is enabled
- [ ] Verified `tsconfig.build.json` target is `ES2022` or later (R9, §8.6)
- [ ] Bundler smoke test against `midnight-wallet-dapp` pre-PR-B (R11) — capture bundle-size delta in PR description
- [ ] Test files committed first (TDD red phase)
- [ ] JSDoc on all public exports (`DeserializationError`, `isDeserializationError`, 6 typed wrappers, `withDeserializationContext`, `withRuntimeContext`)
- [ ] CHANGELOG entry drafted for Phase 2 (PR B) noting error-message-shape change for consumers
- [ ] PR description references issue #816 and follows repo template
