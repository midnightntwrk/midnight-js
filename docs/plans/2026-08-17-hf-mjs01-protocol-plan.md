# HF v8/v9 — Plan 1 of 4: MJS-01 `protocol` Dual-Ledger Seam (#1004)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `protocol` becomes the single dual-ledger seam: version identity module, `./v8` subpath + memoised `loadV8()`, the ledger-8 execution engine, plus the `utils` error foundation (registry, `assertNever`, tag parse).

**Architecture:** Root of `protocol` stays v9-static (D3 — every existing export unchanged); all v8-era surface enters only through the `./v8` subpath, loaded lazily via a package self-reference dynamic import so the rollup single-file bundles never inline the v8 WASM (NFR6). Error codes live in `utils` (which depends on `protocol` — layering-legal); `protocol` never imports `utils`.

**Tech Stack:** TypeScript 6, vitest 4 (protocol thresholds 100/100/100/100, always enabled), rollup 4 per-entry file bundles, ledger-v8 8.1.x, compact-runtime 0.16 / onchain-runtime-v3 (engine era).

**Spec:** `docs/superpowers/specs/2026-07-09-ledger-v8-v9-dual-support-design.md` (v5.1) — §4.1, §4.2, §6.2, §8 (protocol slice).

**Ticket:** [#1004 MJS-01](https://github.com/midnightntwrk/midnight-js/issues/1004). Branch: `feat/1004-protocol-dual-ledger` (fresh `wt` worktree from clean `origin/main`; a new worktree per PR below).

**Companion plans (read the index):** `2026-08-17-ledger-v8-v9-dual-support-plan.md` links all four plans and the cross-plan PR rule.

## Global Constraints

- **Worktree rule:** every phase starts on a fresh `wt` worktree branched from clean `origin/main` (never off another feature branch). Branch names: `feat/1004-protocol-dual-ledger`, `feat/1006-types-d14-foundation`, `feat/1005-contracts-unified-entries`, `feat/1006-provider-dual-decode`.
- **Fresh worktree:** run `yarn && yarn build` before first push (pre-push lint needs `dist/`).
- Apache 2.0 license header on every new `.ts` file (copy from any existing `src/` file).
- Conventional commits, GPG-signed; PR title matches `<type>(<scope>): <subject>`.
- `yarn lint` clean; **no `any` casts, no `as unknown`** (NFR2 — CI-enforced from the first PR).
- TDD: test first, watch it fail, implement, watch it pass, commit. Arrange-Act-Assert. Every `expect()` has a matcher. Strict equality on export surfaces (`expect(actual.sort()).toEqual(expected.sort())`).
- Errors: never swallow; re-throw with `{ cause }`; every typed error carries a stable `code` and remediation text; cause chains sanitized before the logger seam (spec §6.2).
- Coverage: `packages/protocol` vitest thresholds are 100/100/100/100 and **coverage is always enabled** — every protocol task must keep 100% or add the glob-scoped carve-outs from Task 1.6. `packages/utils` thresholds: lines 97, functions 94, branches 93, statements 97.
- Exact versions (spec OQ2, re-confirm at implementation): v8 = `ledger-v8@8.1.0` + `onchain-runtime-v3`; retained dApp stack compact `0.31.1` / compact-runtime `0.16.0`; v9 = `ledger-v9@1.0.0-rc.3` / `onchain-runtime-v4@4.0.0-rc.3`. **Verify the ledger-v8 npm scope** (`@midnight-ntwrk` vs `@midnightntwrk`) before adding the dependency; record the literal in the OQ2 checklist.
- The spec's §6.2 privacy constraint applies to all error messages and breadcrumbs: version ints/sets and key identifiers allowed; key bytes, decoded state, raw payloads forbidden.

## Phase 0 — Discovery & unblockers (before the Phase 1/3 freezes; parallel to Tasks 1.1–1.4)

### Task 0.1: OQ13 discovery spike — engine freeze inputs

**Files:**
- Create: comment on #1004 + #1005 recording each answer; spec §11 OQ13 updated per answer (docs branch)

**Interfaces:**
- Consumes: `shieldedtech/spike-dapp-hf` (islands), a real 0.16-generated contract artifact
- Produces: the five decisions/answers every OQ13-gated task below names

- [ ] **Step 1: 0.16-runtime acquisition mechanism (BLOCKING).** Verify against a real 0.16-generated contract object whether the runtime handle is extractable from the object itself (candidate (c)); if not, decide (a) era-suffixed upstream publish vs (b) documented npm alias. Record the decision in spec §4.1(4) and OQ13. Deliverable: a runnable snippet in the ticket comment proving the chosen mechanism resolves the 0.16 instance the artifact imports.
- [ ] **Step 2: D11 engine-placement sub-decision.** With Step 1's answer, decide `protocol` vs internal-to-`contracts` placement (owner call — present both per spec D11). Tasks 1.7–1.9 assume `protocol`; if `contracts` wins, they move packages but keep identical interfaces/tests.
- [ ] **Step 3: era-tag field.** Identify the field on a 0.16 vs 0.18 contract object that discriminates pipeline era (spec §4.3 dispatch input). Deliverable: the exact property path + a type-level discriminator both `pipelineEraOf` (Task 3.3) and the overload split (Task 3.2) will use.
- [ ] **Step 4: A4 + A5 upstream questions.** File the two questions with upstream (tkerber thread on #1005): does every v9-era deploy populate `v3`/`ir`? are fresh v9-era ZKIR-v2 deploys sanctioned? is the proof binding envelope/era-specific (A5)? Record answers in spec Assumptions.
- [ ] **Step 5: engine leg shape.** Confirm raw `createCircuitContext` + invoke (no compact-js) against the spike, or pin a 0.16-compatible shim. Deliverable: the exact call sequence Task 1.8 implements.

### Task 0.2: OQ9 fixture port

**Files:**
- Create: `testkit-js/testkit-js/src/fixtures/hf/` (minted fixtures + generator scripts)

**Interfaces:**
- Produces: fixture files named exactly: `state-v8.hex`, `state-v8-v6-envelope.hex`, `state-migrated-v9.hex`, `state-migrated-v9-merkle.hex`, `state-tampered-keyset-v8to9.hex`, `state-tampered-keyset-v9to8.hex`, `state-tampered-bytes.hex`, `state-both-keys.hex`, `state-co-v2-only-foreign.hex` (A4 mis-dispatch), plus the v9-compiled twin artifact dir `twin-contract/` and each fixture's `protocolVersion` int in `fixtures.json`

- [ ] **Step 1:** Port the spike's generators (`ledger-v8` + `onchain-runtime-v3` as testkit devDependencies; mint at test time where cheap, commit golden hex where not). Minimal-size mandate: fixture contract = the spike's counter (repo precedent: WASM-fixture coverage timeouts).
- [ ] **Step 2:** Record the verification-harness decision (ledger-v9 local verify vs ported spike simulator) in spec OQ9, **plus the item-by-item ruling on the §6.1 harness-gated security-negative list** (perturbed-bytes apply, A5 rewrap, double-submit): hard release gate vs owner-signed residual risk.
- [ ] **Step 3:** Commit fixtures with a generator README (how each was minted, from which spike island).

### Task 0.3: OQ3 discovery — decode surfaces & indexer facts

- [ ] **Step 1:** Enumerate the final `protocol/v8` decode/construct surface (input to Task 1.4's export-surface test — the sorted key list).
- [ ] **Step 2:** Build the decoder fail-open matrix: which v8 decoders accept v9 bytes without throwing, and whether the v9 `deserializeCompactContractState` accepts v8 bytes (drives nothing at runtime — the Task 4.2 tag check covers it — but records the risk).
- [ ] **Step 3:** Identify the indexer GraphQL field backing `queryLatestProtocolVersion` (OQ3d) and confirm the snapshot/consistency semantics of multi-root-field queries (OQ3e). Record in spec.

---

## Phase 1 — #1004 MJS-01: `protocol` dual-ledger seam (+ `utils` error foundation)

Branch: `feat/1004-protocol-dual-ledger`. Tasks 1.1–1.6 need nothing from Phase 0; 1.7–1.9 are OQ13-gated.

### Task 1.1: `protocol` version module + typed errors

**Files:**
- Create: `packages/protocol/src/version.ts`, `packages/protocol/src/errors.ts`, `packages/protocol/src/test/version.test.ts`, `packages/protocol/src/test/errors.test.ts`
- Modify: `packages/protocol/src/index.ts` (additive exports only)

**Interfaces:**
- Produces (consumed by every later task):
  ```ts
  export const LEDGER_VERSIONS: readonly ['v8', 'v9'];
  export type LedgerVersion = (typeof LEDGER_VERSIONS)[number];
  export type VersionResolutionPath = 'read' | 'construct';
  export const protocolVersionToLedger: (protocolVersion: number, path?: VersionResolutionPath) => LedgerVersion;
  export const versionOfRecord: (record: { protocolVersion: number }) => LedgerVersion;          // read paths
  export const networkHeadVersion: (source: { queryLatestProtocolVersion(): Promise<number> }) => Promise<LedgerVersion>; // construct paths
  export const PROTOCOL_ERROR_CODES: { /* frozen, see Step 3 */ };
  export class UnknownProtocolVersionError extends Error { readonly code: string; readonly protocolVersion: number; readonly path: VersionResolutionPath; }
  ```

- [ ] **Step 1: Write the failing table test** (`version.test.ts`):

```ts
import { LEDGER_VERSIONS, networkHeadVersion, protocolVersionToLedger, versionOfRecord } from '../version';
import { PROTOCOL_ERROR_CODES, UnknownProtocolVersionError } from '../errors';

describe('protocolVersionToLedger', () => {
  it.each([
    [22_000, 'v8'], [22_500, 'v8'],            // node 0.22 (major-0 exemption)
    [1_000_000, 'v8'], [1_999_000, 'v8'],      // node 1.x
    [2_000_000, 'v9'], [2_001_000, 'v9'], [2_999_000, 'v9'] // node 2.x — unseen-minor regression guard
  ])('maps %i to %s', (int, expected) => {
    expect(protocolVersionToLedger(int)).toBe(expected);
  });

  it.each([[23_000], [0], [21_000], [3_000_000], [4_000_000]])('fails fast on unknown %i', (int) => {
    expect(() => protocolVersionToLedger(int)).toThrow(UnknownProtocolVersionError);
  });

  it('rejects non-integers and negatives', () => {
    expect(() => protocolVersionToLedger(1.5)).toThrow(UnknownProtocolVersionError);
    expect(() => protocolVersionToLedger(-1)).toThrow(UnknownProtocolVersionError);
  });

  it('names the int and the supported set in the message', () => {
    expect(() => protocolVersionToLedger(3_000_000)).toThrow(/3000000/);
    expect(() => protocolVersionToLedger(3_000_000)).toThrow(/v8.*v9|supported/i);
  });
});

describe('sourcing helpers', () => {
  it('versionOfRecord uses the read path code', () => {
    try {
      versionOfRecord({ protocolVersion: 9_000_000 });
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(UnknownProtocolVersionError);
      expect((e as UnknownProtocolVersionError).code).toBe(PROTOCOL_ERROR_CODES.UNKNOWN_PROTOCOL_VERSION_READ);
    }
  });

  it('networkHeadVersion queries the source exactly once and uses the construct code', async () => {
    const source = { queryLatestProtocolVersion: vi.fn().mockResolvedValue(2_000_000) };
    await expect(networkHeadVersion(source)).resolves.toBe('v9');
    expect(source.queryLatestProtocolVersion).toHaveBeenCalledTimes(1);
    const bad = { queryLatestProtocolVersion: vi.fn().mockResolvedValue(9_000_000) };
    await expect(networkHeadVersion(bad)).rejects.toMatchObject({
      code: PROTOCOL_ERROR_CODES.UNKNOWN_PROTOCOL_VERSION_CONSTRUCT
    });
  });
});

describe('LEDGER_VERSIONS', () => {
  it('is exactly the closed two-version set', () => {
    expect([...LEDGER_VERSIONS].sort()).toEqual(['v8', 'v9']);
  });
});
```

- [ ] **Step 2: Run and verify failure:** `yarn workspace @midnight-ntwrk/midnight-js-protocol test` — FAIL: cannot resolve `../version`.
- [ ] **Step 3: Implement** `errors.ts`:

```ts
export const PROTOCOL_ERROR_CODES = {
  UNKNOWN_PROTOCOL_VERSION_READ: 'MJS_P_UNKNOWN_PROTOCOL_VERSION_READ',
  UNKNOWN_PROTOCOL_VERSION_CONSTRUCT: 'MJS_P_UNKNOWN_PROTOCOL_VERSION_CONSTRUCT',
  LEDGER8_INSTANCE_MISMATCH: 'MJS_P_LEDGER8_INSTANCE_MISMATCH',
  LEDGER8_RUNTIME_MISSING: 'MJS_P_LEDGER8_RUNTIME_MISSING',
  DOWN_CONVERT_FAILED: 'MJS_P_DOWN_CONVERT_FAILED',
  MERKLE_NOT_REHASHED: 'MJS_P_MERKLE_NOT_REHASHED'
} as const;
export type ProtocolErrorCode = (typeof PROTOCOL_ERROR_CODES)[keyof typeof PROTOCOL_ERROR_CODES];

export type VersionResolutionPath = 'read' | 'construct';

export class UnknownProtocolVersionError extends Error {
  readonly code: ProtocolErrorCode;
  constructor(
    readonly protocolVersion: number,
    readonly path: VersionResolutionPath
  ) {
    super(
      `Unknown protocolVersion ${protocolVersion} on the ${path} path. ` +
        `Supported eras: v8 (node 0.22, 1.x) and v9 (node 2.x). ` +
        `An unknown node major usually means this framework major predates a newer fork — upgrade midnight-js.`
    );
    this.name = 'UnknownProtocolVersionError';
    this.code =
      path === 'read'
        ? PROTOCOL_ERROR_CODES.UNKNOWN_PROTOCOL_VERSION_READ
        : PROTOCOL_ERROR_CODES.UNKNOWN_PROTOCOL_VERSION_CONSTRUCT;
  }
}
```

and `version.ts`:

```ts
import { UnknownProtocolVersionError, type VersionResolutionPath } from './errors';

export const LEDGER_VERSIONS = ['v8', 'v9'] as const;
export type LedgerVersion = (typeof LEDGER_VERSIONS)[number];

/** int encodes the NODE version (major·1_000_000 + minor·1_000) — spec OQ1.
 *  Bounded per-major ranges; fail fast ONLY on an unknown major. Major 0 is
 *  exempt from the same-major rule (0.x minors are semver-breaking). */
const NODE_MAJOR_TO_LEDGER: Readonly<Record<number, LedgerVersion>> = { 1: 'v8', 2: 'v9' };
const NODE_MAJOR0_MINOR_TO_LEDGER: Readonly<Record<number, LedgerVersion>> = { 22: 'v8' };

export const protocolVersionToLedger = (
  protocolVersion: number,
  path: VersionResolutionPath = 'construct'
): LedgerVersion => {
  if (!Number.isInteger(protocolVersion) || protocolVersion < 0) {
    throw new UnknownProtocolVersionError(protocolVersion, path);
  }
  const major = Math.floor(protocolVersion / 1_000_000);
  const ledger =
    major === 0
      ? NODE_MAJOR0_MINOR_TO_LEDGER[Math.floor(protocolVersion / 1_000)]
      : NODE_MAJOR_TO_LEDGER[major];
  if (ledger === undefined) {
    throw new UnknownProtocolVersionError(protocolVersion, path);
  }
  return ledger;
};

export const versionOfRecord = (record: { protocolVersion: number }): LedgerVersion =>
  protocolVersionToLedger(record.protocolVersion, 'read');

export const networkHeadVersion = async (source: {
  queryLatestProtocolVersion(): Promise<number>;
}): Promise<LedgerVersion> => protocolVersionToLedger(await source.queryLatestProtocolVersion(), 'construct');
```

Append to `index.ts` (additive — D3):

```ts
export * from './errors';
export * from './version';
```

- [ ] **Step 4: Run to green:** same command — PASS, coverage stays 100%.
- [ ] **Step 5: Extend the ACL test** (`protocol-acl.test.ts` pattern): add an export-surface assertion that the pre-existing five namespace exports are still present by strict sorted-key equality (AC1's "every pre-existing export unchanged").
- [ ] **Step 6: Commit** — `feat(midnight-js): add protocol version identity module (FR1, OQ1)`.

### Task 1.2: `utils` — `assertNever`, error-code registry, guards, tag parse

**Files:**
- Create: `packages/utils/src/assert-never.ts`, `packages/utils/src/error-codes.ts`, `packages/utils/src/serialized-tag.ts`, tests under `packages/utils/src/test/`
- Modify: `packages/utils/src/index.ts` (add three `export *` lines)

**Interfaces:**
- Consumes: `PROTOCOL_ERROR_CODES` from Task 1.1 (`utils` already depends on `protocol` — layering-legal; `protocol` must never import `utils`).
- Produces:
  ```ts
  export const assertNever: (value: never, context: string) => never;
  export const CONTRACTS_ERROR_CODES: { /* Step 3 */ };
  export const PROVIDER_ERROR_CODES: { /* Step 3 */ };
  export const UTILS_ERROR_CODES: { TAG_PARSE_FAILED: 'MJS_U_TAG_PARSE_FAILED' };
  export const MIDNIGHT_JS_ERROR_CODES: readonly string[];   // frozen union of all four groups — the AC2 registry
  export const hasErrorCode: <C extends string>(e: unknown, code?: C) => e is Error & { code: C };
  export interface ParsedSerializedTag { readonly tag: string; readonly body: Uint8Array; }
  export const parseSerializedTag: (bytes: Uint8Array) => ParsedSerializedTag;  // bounded scan, typed error
  ```

- [ ] **Step 1: Failing tests.** `assert-never.test.ts` (throws with context; `@ts-expect-error` on non-never arg). `error-codes.test.ts`: registry strict equality — `expect([...MIDNIGHT_JS_ERROR_CODES].sort()).toEqual([/* every literal, spelled out */].sort())`; uniqueness (`new Set(...).size`); `hasErrorCode` positive/negative/narrowing. `serialized-tag.test.ts` — the four adversarial shapes:

```ts
const utf8 = (s: string) => new TextEncoder().encode(s);

describe('parseSerializedTag', () => {
  it('parses a well-formed prefix to the second colon', () => {
    const parsed = parseSerializedTag(utf8('midnight:v8:payload-bytes'));
    expect(parsed.tag).toBe('midnight:v8');
    expect(parsed.body).toEqual(utf8('payload-bytes'));
  });
  it.each([
    ['missing second colon', utf8('midnight:v8payload')],
    ['no colon at all', utf8('justbytes')],
    ['oversized prefix', utf8(`${'x'.repeat(65)}:v8:b`)],
    ['empty input', new Uint8Array(0)]
  ])('throws the typed error on %s', (_name, bytes) => {
    expect(() => parseSerializedTag(bytes)).toThrow(expect.objectContaining({ code: UTILS_ERROR_CODES.TAG_PARSE_FAILED }));
  });
  it('never scans past the bound', () => {
    const big = new Uint8Array(10_000_000);           // no colon anywhere
    expect(() => parseSerializedTag(big)).toThrow();   // returns fast — bounded at 64 bytes
  });
});
```

- [ ] **Step 2: Run, verify failure** (`yarn workspace @midnight-ntwrk/midnight-js-utils test`).
- [ ] **Step 3: Implement.** `assert-never.ts`:

```ts
export const assertNever = (value: never, context: string): never => {
  throw new Error(`assertNever: unreachable branch reached in ${context} (value: ${JSON.stringify(value)})`);
};
```

`error-codes.ts` (codes for higher layers live here because `contracts`/providers depend on `utils`; protocol's are imported):

```ts
import { PROTOCOL_ERROR_CODES } from '@midnight-ntwrk/midnight-js-protocol';

export const CONTRACTS_ERROR_CODES = {
  ERA_ARTIFACT_MISMATCH: 'MJS_C_ERA_ARTIFACT_MISMATCH',
  LEDGER8_DEPLOY_ON_V9: 'MJS_C_LEDGER8_DEPLOY_ON_V9',
  HEAD_STATE_ERA_MISMATCH: 'MJS_C_HEAD_STATE_ERA_MISMATCH',
  INDEXER_INCONSISTENCY: 'MJS_C_INDEXER_INCONSISTENCY',
  STALE_HEAD: 'MJS_C_STALE_HEAD',
  KEY_SET_CONTRADICTION: 'MJS_C_KEY_SET_CONTRADICTION',
  UNSUPPORTED_KEY_SET: 'MJS_C_UNSUPPORTED_KEY_SET',
  PROOF_VERSION_UNRESOLVED: 'MJS_C_PROOF_VERSION_UNRESOLVED',
  ERA_INVARIANT_VIOLATION: 'MJS_C_ERA_INVARIANT_VIOLATION',
  UNSANCTIONED_MIXING: 'MJS_C_UNSANCTIONED_MIXING',
  MIXED_ERA_SCOPE: 'MJS_C_MIXED_ERA_SCOPE'
} as const;

export const PROVIDER_ERROR_CODES = {
  DECODE_VERSION_MISMATCH: 'MJS_PR_DECODE_VERSION_MISMATCH',
  MOCK_VERSION_INVARIANT: 'MJS_PR_MOCK_VERSION_INVARIANT'
} as const;

export const UTILS_ERROR_CODES = { TAG_PARSE_FAILED: 'MJS_U_TAG_PARSE_FAILED' } as const;

export const MIDNIGHT_JS_ERROR_CODES: readonly string[] = Object.freeze([
  ...Object.values(PROTOCOL_ERROR_CODES),
  ...Object.values(CONTRACTS_ERROR_CODES),
  ...Object.values(PROVIDER_ERROR_CODES),
  ...Object.values(UTILS_ERROR_CODES)
]);

export const hasErrorCode = <C extends string>(e: unknown, code?: C): e is Error & { code: C } =>
  e instanceof Error &&
  'code' in e &&
  typeof (e as Error & { code: unknown }).code === 'string' &&
  (code === undefined || (e as Error & { code: string }).code === code);
```

`serialized-tag.ts`: scan `bytes` for the second `0x3a` within `MAX_TAG_PREFIX_BYTES = 64`; on success return `{ tag, body }` (tag decoded as UTF-8, body a subarray); otherwise `throw new TagParseError(reason)` where `TagParseError extends Error` with `code = UTILS_ERROR_CODES.TAG_PARSE_FAILED`, `name` set, and a message stating the tag is a defence-in-depth discriminant only (spec §6.1: the tag is spoofable — the node is the authority on the body).

- [ ] **Step 4: Run to green;** utils thresholds hold (97/94/93/97).
- [ ] **Step 5: Commit** — `feat(midnight-js): add assertNever, error-code registry and bounded tag parse to utils`.

### Task 1.3: ESLint gates — `no-explicit-any`/`as unknown` + `protocol/v8` restriction

**Files:**
- Modify: `eslint.config.mjs` (root, lines ~128–174 — the existing `no-restricted-imports` block)
- Test: extend `packages/protocol/src/test/eslint-restriction.test.ts` (it already lints strings through the real root config)

- [ ] **Step 1: Failing test additions:** lint the string `import { loadV8 } from '@midnight-ntwrk/midnight-js-protocol/v8'` at `CONSUMER_PATH` → expect one `no-restricted-imports` error; lint `import type { Transaction } from '@midnight-ntwrk/midnight-js-protocol/v8'` → expect **zero** errors (type-only exempt); lint the runtime import at `PROTOCOL_INTERNAL_PATH` → zero errors.
- [ ] **Step 2:** Run protocol tests — new cases FAIL (rule not configured).
- [ ] **Step 3: Implement:** in the consumer block switch the relevant entry to `@typescript-eslint/no-restricted-imports` with `{ group: ['@midnight-ntwrk/midnight-js-protocol/v8'], allowTypeImports: true, message: 'Runtime v8 access only via loadV8() from @midnight-ntwrk/midnight-js-protocol. Type-only imports are allowed.' }`; keep the protocol-internal override permissive. Add a grep-based CI step (root `package.json` script `lint:casts`: `git grep -nE 'as unknown|as any' -- 'packages/*/src' ':!*/test/*'` must return empty).
- [ ] **Step 4:** Run to green. **Step 5: Commit** — `ci: gate protocol/v8 runtime imports and unsafe casts`.

### Task 1.4: `./v8` subpath, `loadV8()`, rollup laziness + dist gate

**Files:**
- Create: `packages/protocol/src/v8.ts`, `packages/protocol/src/load-v8.ts`, `packages/protocol/src/test/v8-surface.test.ts`, `packages/protocol/src/test/dist-laziness.test.ts`
- Modify: `packages/protocol/package.json` (add `ledger-v8` dependency — exact scoped literal from OQ2 verification; add `./v8` to `exports`), `packages/protocol/rollup.config.mjs`, `packages/protocol/src/index.ts`

**Interfaces:**
- Produces:
  ```ts
  export type ProtocolV8 = typeof import('./v8.js');
  export const loadV8: () => Promise<ProtocolV8>;   // memoised; the ONLY runtime path to v8
  ```
- Resolution decision (spec §4.1(3), DEV-4): the dynamic import uses the **package self-reference specifier** `import('@midnight-ntwrk/midnight-js-protocol/v8')` — it resolves inside the already-loaded `protocol` copy (dual-scope immune), is already `external` under the existing rollup pattern `/^@midnight-ntwrk\//` (so never inlined — NFR6 survives the single-file bundles), and works identically in esm and cjs output.

- [ ] **Step 1: Failing tests.** `v8-surface.test.ts`: `const surface = await loadV8(); expect(Object.keys(surface).sort()).toEqual(OQ3_SURFACE.sort())` (OQ3 list from Task 0.3; until it closes, assert the minimum contractual set: `Transaction`, `LedgerParameters`, `ZswapChainState`, `ContractState`); memoisation: two `loadV8()` calls return the identical promise. `dist-laziness.test.ts` (runs post-build; guard with `existsSync`):

```ts
const distIndex = ['dist/index.mjs', 'dist/index.cjs'].map((p) => readFileSync(resolve(PKG_ROOT, p), 'utf8'));
it.each(distIndex.map((c, i) => [i, c] as const))('dist index %i has no static ledger-v8 linkage', (_i, content) => {
  expect(content).not.toMatch(/from\s+['"].*ledger-v8['"]/);
  expect(content).not.toMatch(/require\(['"].*ledger-v8['"]\)/);
});
```

- [ ] **Step 2:** Run — FAIL (no `v8.ts`, no dep).
- [ ] **Step 3: Implement.** `v8.ts`: `export * from '<verified-scope>/ledger-v8';` (single line — the subpath instantiates the v8 WASM at import; that is why it is only ever reached through `loadV8()`). `load-v8.ts`:

```ts
export type ProtocolV8 = typeof import('./v8.js');

let v8ModulePromise: Promise<ProtocolV8> | undefined;

/** The only sanctioned runtime path to the v8 era (spec §4.1(3)).
 *  Self-reference specifier: resolves within this installed protocol copy;
 *  external to the rollup bundle, so the WASM loads only on first call. */
export const loadV8 = (): Promise<ProtocolV8> =>
  (v8ModulePromise ??= import('@midnight-ntwrk/midnight-js-protocol/v8'));
```

`rollup.config.mjs`: add `{ input: 'src/v8.ts', name: 'v8' }` to `entries`. `package.json` exports: add `"./v8"` following the existing per-entry shape. `index.ts`: `export * from './load-v8';` (type `ProtocolV8` + `loadV8` — additive).
- [ ] **Step 4:** `yarn workspace @midnight-ntwrk/midnight-js-protocol build && yarn workspace @midnight-ntwrk/midnight-js-protocol test` — green, including the dist gate.
- [ ] **Step 5: Lazy-load gate test:** in a fresh vitest process (`test/lazy-load.test.ts`, `pool: 'forks'`), import `../index`, assert `import.meta.resolve`-level: spy via a module-level flag exported from `v8.ts`? No — assert indirectly: `expect(v8ModulePromise-visible-behaviour)`: call nothing, then `expect(process.moduleLoadList ?? []).not.toContain(expect.stringMatching(/ledger-v8/))` on Node, or simpler and portable: mock `import()` seam by asserting `loadV8` is the only reference to the subpath in `src/` (`git grep -l 'midnight-js-protocol/v8' packages/protocol/src` returns only `load-v8.ts`). Implement the grep variant (deterministic, no runtime introspection).
- [ ] **Step 6: Commit** — `feat(midnight-js): add protocol/v8 subpath and lazy loadV8 accessor (D13, NFR6)`.
- [ ] **Step 7: OQ2 supply-chain checklist** (same PR, `SECURITY-SUPPLY-CHAIN.md` section or PR description): org ownership of both npm scopes checked, exact pin recorded as literal, lockfile integrity noted.

### Task 1.5: engine — envelope extract, down-convert, rehash (fixture-driven)

**Files:**
- Create: `packages/protocol/src/engine/envelope.ts`, `packages/protocol/src/engine/down-convert.ts`, `packages/protocol/src/test/engine-down-convert.test.ts`
- Consumes: Task 0.2 fixtures; spike `island-3/driver/src/downcast.ts` (`downcastV9StateForExecution`, `rehashStateValue`) — productionize, do not re-derive

**Interfaces:**
- Produces:
  ```ts
  // engine/envelope.ts — version-aware: v8/v6 and migrated-v9 envelopes
  export const extractEncodedStateValue: (raw: Uint8Array, version: LedgerVersion) => EncodedStateValue;
  // engine/down-convert.ts
  export const downConvertForExecution: (state: EncodedStateValue, runtime016: CompactRuntime016) => DownConvertedState; // rehashes; carries only .data
  ```

- [ ] **Step 1: Failing tests:** round-trip — `extract(state-migrated-v9.hex)` down-converted equals the pre-migration reference POJO from `state-v8.hex` (deep equality — spec A3: byte-identical state data); malformed input (`state-tampered-bytes.hex` truncated) → typed throw `PROTOCOL_ERROR_CODES.DOWN_CONVERT_FAILED`, never a silently empty state; Merkle: `state-migrated-v9-merkle.hex` decoded without rehash → root access throws `MERKLE_NOT_REHASHED`; after `downConvertForExecution` → `checkRoot` passes.
- [ ] **Step 2:** Run — FAIL. **Step 3:** Port the spike's downcast/rehash into the two modules, wrapping spike-level errors with `{ cause }` + the typed codes; cause sanitized per §6.2 (bounded message, no byte runs).
- [ ] **Step 4:** Green. **Step 5: POJO drift-compile test:** `AssertEqual`-style type test between the v8 and v9 `EncodedStateValue`/`Op`/`AlignedValue` shapes (drift detector; fixtures stay authoritative). **Step 6: Commit** — `feat(midnight-js): add ledger-8 engine envelope + down-convert/rehash (D11)`.

### Task 1.6: engine — identity probes + runtime-missing fail-fast + coverage globs

**Files:**
- Create: `packages/protocol/src/engine/instance-guard.ts`, `packages/protocol/src/test/engine-instance-guard.test.ts`
- Modify: `packages/protocol/vitest.config.ts` (glob-scoped thresholds), `packages/protocol/package.json` (devDeps: npm-alias packages `onchain-runtime-v3-alt`, `ledger-v9-alt` for the dual-instance negatives)

**Interfaces:**
- Produces:
  ```ts
  export const assertSharedLedger8Instances: (contractRuntime: unknown, engineRuntime: unknown, ledgerV9: unknown, engineLedgerV9: unknown) => void;
  // throws Ledger8InstanceMismatchError (code LEDGER8_INSTANCE_MISMATCH, remediation → dual-instantiation guide)
  export const assertLedger8RuntimePresent: () => Promise<void>;
  // throws Ledger8RuntimeMissingError (code LEDGER8_RUNTIME_MISSING, remediation → retained-toolchain note A2 + OQ2 pins) BEFORE any fetch/proving
  ```

- [ ] **Step 1: Failing tests:** constructor-reference-equality probes on both axes — same-instance positive; npm-alias dual-instance negatives (`onchain-runtime-v3-alt` vs `onchain-runtime-v3`; `ledger-v9-alt` vs `ledger-v9`) → `Ledger8InstanceMismatchError`; unresolvable 0.16 runtime (mock the acquisition seam to reject) → `Ledger8RuntimeMissingError`, message names the OQ2 pinned versions, **never** a raw module-resolution error.
- [ ] **Step 2–4:** red → implement → green.
- [ ] **Step 5: Coverage config (QA-13):** in `vitest.config.ts` add `coverage.thresholds` per-glob: `'src/version.ts': { lines:100, functions:100, branches:100, statements:100 }`, engine globs explicitly listed with the PR-justified lower bounds; note in the config comment: if the WASM coverage-timeout precedent recurs, exclude engine suites from instrumentation, never pad timeouts.
- [ ] **Step 6: Commit** — `feat(midnight-js): add ledger-8 instance/runtime fail-fasts (D15, #1052)`.

### Task 1.7 [OQ13-gated]: engine — circuit invocation + keep-state wrap leg

**Files:**
- Create: `packages/protocol/src/engine/execute.ts`, `packages/protocol/src/engine/wrap-v9.ts`, tests `packages/protocol/src/test/engine-execute.test.ts`

**Interfaces:**
- Consumes: Task 0.1 Step 5 (exact `createCircuitContext` sequence), Task 1.5 outputs, the 0.16 acquisition mechanism.
- Produces:
  ```ts
  export const executeCircuit016: (contract: Ledger8ContractLike, circuitId: string, args: readonly unknown[], state: DownConvertedState) => TranscriptPojo;
  export const wrapKeepStateCall: (transcript: TranscriptPojo, contractAddress: string) => ContractCallPrototype; // v9-native binding from the start, no re-bind
  ```
- [ ] **Steps (red/green/commit):** positive — spike counter fixture executes `increment` and the transcript POJO equals the spike's recorded reference; negative — mismatched runtime instance rejected by Task 1.6 guard before invocation; wrap produces a `ContractCallPrototype` accepted by existing `zswap-utils` `Intent` composition. Commit `feat(midnight-js): add ledger-8 circuit execution and keep-state v9 wrap`.

### Task 1.8 [OQ13/OQ3-gated]: engine — v8-native composition + deploy machinery

**Files:**
- Create: `packages/protocol/src/engine/compose-v8.ts`, `packages/protocol/src/engine/deploy-v8.ts`, tests

**Interfaces:**
- Produces:
  ```ts
  export const composeV8CallTx: (transcript: TranscriptPojo, contractAddress: string, v8: ProtocolV8) => Uint8Array;   // native v8 tx, immediately serialized tag-prefixed
  export const composeV8DeployTx: (initialState: DownConvertedState, artifacts: Ledger8Artifacts, v8: ProtocolV8) => Uint8Array;
  export const executeConstructor016: (contract: Ledger8ContractLike, args: readonly unknown[]) => ConstructorResultPojo; // spike-unproven — spec §4.1(4)
  ```
- [ ] **Steps:** serialized output parses back via `parseSerializedTag` with the v8 tag; round-trips through the v8 fixtures decoder; deploy leg is explicitly spike-unproven — first test is written against upstream's documented `ContractDeploy` shape and marked as the OQ13 confirmation artifact. Commit `feat(midnight-js): add v8-native tx composition incl. deploy machinery (FR8)`.

---


---

## PR slicing (small PRs, not one kobyła)

| PR | Tasks | Contents | Depends on |
|----|-------|----------|-----------|
| 1004-A | 0.2 | spike fixture port into testkit (`testkit-js/.../fixtures/hf/`) | — |
| 1004-B | 1.1, 1.2, 1.3 | version module + protocol errors; utils registry/`assertNever`/tag parse; ESLint gates | — |
| 1004-C | 1.4 | `./v8` subpath, `loadV8()`, rollup entry + dist laziness gate, OQ2 checklist | 1004-B |
| 1004-D | 1.5, 1.6 | engine envelope/down-convert/rehash; identity probes + runtime-missing fail-fast; coverage globs | 1004-A, 1004-C |
| 1004-E | 1.7, 1.8 | keep-state execution leg; v8-native composition + deploy machinery | 1004-D + OQ13 closed (Task 0.1) |

Tasks 0.1/0.3 produce no PRs — deliverables are ticket comments + spec updates on the docs branch.
