# Handoff prompt — fix the public-API result-shape findings

Hand this to an agent working in this repository. It implements the fixes for the
audit in `docs/qa/2026-09-09-public-api-result-shape-audit.md`. Read that report
in full first; this prompt tells you how to land the work, not what the defects
are.

The report is organised by **cause** (R1–R8 plus a tail). Per-symptom IDs (A1,
B9.7, …) are kept in parentheses in each heading, so every reference below
resolves. Prefer closing a whole cause in one PR over picking symptoms out of
several.

---

## 0. State of the world (2026-09-09) — verify before relying on it

- The audit ran on `test/1006-ac0-contract-matrix` at `f1677a0d`. **That PR
  (#1281) has since MERGED** into `feat/1006-hardening` (merge commit
  `92746de0`); the remote branch is gone.
  `git diff --name-only f1677a0d..92746de0 -- packages/` is **empty**, so every
  `file:line` in the report still resolves. Re-run that diff against the current
  head before trusting line numbers.
- **The audit report and this prompt are TRACKED** as of the branch that carries
  this file; they were untracked while the work was being done. The citation
  rule survives that change and is unconditional: **no code comment, error
  message, docblock or commit message may cite either document** — design
  rationale goes in the ADR (§2) instead, because an ADR is what a reader of the
  source is expected to be able to follow.

## 1. Decisions already made — implement these, do not re-open them

The user settled the following. They are not up for renegotiation; if you think
one is wrong, say so in one sentence and then implement it anyway.

1. **Write an ADR** for the shared-base design. Number it **0010** — verified
   against `origin/feat/1006-hardening`, whose ADRs run 0001–0009. **`main` is
   only at 0005**, so the sequences have genuinely diverged: number from the
   TARGET branch, never from `main`.
2. **The bases live in `packages/types`**, not in `packages/contracts`.
3. ~~**Retained-era (`Ledger8*`) declarations get their own directory**,
   `packages/types/src/v8/`.~~ **SUPERSEDED by ADR-0010**, which decided against
   creating that directory: the bases turned out to be era-NEUTRAL, so nothing
   retained-specific moves into `packages/types` and the directory would have
   been empty. The rule itself stands for the day a retained-era declaration
   does land there. Follow the ADR, not this line.

There is a direct precedent for the layout: `packages/protocol/src/lib/` is
already `v8/ v9/ era/ shared/`, with the era-neutral vocabulary in `shared/`.
Mirror it. `packages/types/src` is flat today apart from `test/`.

## 2. The design

**The invariant.** A base is the guaranteed common contract for a pair of
era-specific returned types. An era **may add** members; an era **may not drop**
one. That is what makes the R2 class of defect unrepresentable rather than merely
detectable.

**Half the work is already done, and this is the key structural fact.** Every
finalized result type is already split across the two packages:

| half | where | base |
|---|---|---|
| transaction record (`status`, `txId`, `blockHash`, `fees`, `protocolVersion`, …) | `types` | **`FinalizedTxRecord` — already exists and already works** |
| execution (transcripts, ZK in/out, private state, zswap) | `contracts` today | to be written, into `types` per decision 1.2 |

`FinalizedTxRecord` (`packages/types/src/midnight-types.ts:229-235`) is the model:
*"Both arms … extend this, so the two arms differ in exactly two places — the
`version` discriminant and the type of `tx` — and cannot drift apart as fields are
added here."* Reproduce that sentence's guarantee for the execution half.

**This solves the union problem.** `VersionedFinalizedTxData` is a union and an
interface cannot extend a union — but the union's common part *is*
`FinalizedTxRecord`, because both `FinalizedTxData` and `FinalizedTxDataV8` extend
it and differ only in `{ version, tx }`. So:

```ts
interface FinalizedCallTxPublicDataBase extends CallResultPublicBase, FinalizedTxRecord {}
```

leaves each era adding only its discriminant pair. The intersection shrinks from
the whole record to two fields.

**The bases to write** (names follow the existing local idiom — `CallOptionsBase`,
`FinalizedDeployTxDataBase` — so do not invent a new suffix):

| base | current era adds | retained era adds |
|---|---|---|
| `CallResultPrivateBase` | — | `txBytes` |
| `CallResultPublicBase` | `nextContractState`, `logEvents` | — |
| `FinalizedCallTxDataBase` | `calls` | — |
| `SubmittedCallTxBase` | — | — |

Bases must be **generic** over `result` and `nextPrivateState`: those types differ
per era (`Contract.CircuitReturnType` vs `Ledger8CircuitReturnType`,
`Contract.PrivateState` vs `Ledger8PrivateState`). A flat non-generic base cannot
express them.

**HARD CONSTRAINT — a base that names behaviour cannot live in `types`.**
Verified: `packages/types`'s dependencies are `midnight-js-protocol`, `effect`,
`pino`, `rxjs` — it does **not** depend on `contracts`, and must not start.
So `FoundContract` / `DeployedContract` bases, which name
`CircuitCallTxInterface` and the maintenance interfaces (all defined in
`contracts` and reaching `submitCallTx`), **stay in `packages/contracts`**.
Split the rule cleanly:

- **data-shape bases → `packages/types`** (with `v8/` for the retained ones)
- **behaviour-bearing bases → `packages/contracts`**, composed from the `types`
  bases

**Moving existing declarations is not breaking, provided you re-export.**
TypeScript is structural, so `interface A extends B {}` with an unchanged total
member set is indistinguishable from the flat `interface A`. Consumers import
these names from `@midnight-ntwrk/midnight-js-contracts` today: **`contracts` must
keep re-exporting every name it currently exports**, from its new home. Verify
with the barrel test, using strict sorted equality on both directions —
`expect(actual.sort()).toEqual(expected.sort())`, never `toContain`.

**No subpath export for `types/src/v8/`.** These are type-only declarations with
no runtime cost, so ADR-0004's lazy-loading concern does not apply and a subpath
would be cargo-culted. Re-export through the existing root barrel.

## 3. Do the gates before the fixes

Two tests are worth more than any individual fix: they turn the report into a
merge gate, and writing them first makes the base work RED for free.

1. **Bidirectional era key-set parity.**
   `packages/contracts/src/test/typecheck/overloads.test-d.ts:243-291` asserts
   parity with `toHaveProperty`, which can only confirm presence and can never
   notice an absence — the repo's own `CLAUDE.md` Common Mistake #3, and the
   reason four members slipped. Replace it with key-set equality between
   `Ledger8FinalizedCallTxData` and `FinalizedCallTxData`, carrying an
   **explicit, named allow-list** of the members ADR-0007 excuses. Expect it to
   fail immediately on `nextZswapLocalState`, `newCoins`, `calls` and
   `logEvents`. **Do not weaken the assertion to make it pass** — fix the shape,
   or add to the allow-list only when ADR-0007 genuinely excuses it, and say why
   at the entry.
2. **A type-export pin for the protocol barrel.**
   `packages/protocol/src/test/protocol-acl.test.ts` pins the **runtime** key set
   with strict sorted equality and nothing pins the exported **type** set — which
   is why R4 is invisible. Add a `*.test-d.ts` asserting the exported type list.

Also worth fixing while you are in `era-parity.test.ts`: ADR-0007 describes its
gate as `structuredClone` *"over the result of all four methods"*, but `LedgerEra`
has had five since `era.ts:147` and `era-parity.test.ts:640-643` clones four. The
unguarded method's return type **is** plain data, so the rule is not violated —
only unenforced.

## 4. Two base branches — route every fix

Routing a fix to the wrong base either produces an unmergeable PR or hides a live
bug behind unreleased work. Verified per file with `git cat-file -e origin/<branch>:<path>`.

| base | owns |
|---|---|
| **`origin/main`** | `call.ts`, `internal/transaction.ts`, `call-constructor.ts`, `governance/`, `types/logger-provider.ts`, `types/midnight-types.ts`, `types/public-data-provider.ts`, `types/private-state-provider.ts`, `types/zk-config-registry.ts`, `utils/zk-artifact-manifest.ts`, the indexer / level / zk-config provider packages |
| **`origin/feat/1006-hardening`** | everything `Ledger8*`, all of `packages/protocol`, plus `types/versioned.ts`, `types/raw-contract-state.ts`, `types/unwrap-v9.ts`, `utils/error-codes.ts`, `midnight-js/docs/barrel-published-surface.md` |

**Check each file you touch — do not assume.** Some causes straddle the split:
R6 needs `UTILS_ERROR_CODES` (HF-only) while `ZkArtifactIntegrityError` is on
`main`. Split such a cause into two PRs on two bases rather than dragging HF work
into a `main` PR.

**R1 is on `main`**: `packages/contracts/src/call.ts:233` declares the member,
`packages/contracts/src/internal/transaction.ts:284` is the cast that hides its
absence. A live `TypeError` in released code.

## 5. Phase plan

**0a — R1 on `origin/main`. Ship first, alone, now.** Carry
`calls: unprovenCallTxData.calls` on the scoped arm and delete the
`as CallResult<C, PCK>` cast so the compiler holds the shape thereafter. It is
independent of everything else. **The defect is a runtime `undefined` behind a
type assertion, so a type-level test cannot see it — write a runtime test that
calls the scoped overload and asserts on `result.calls`.** Non-breaking.

**0b — the two gates from §3**, on `feat/1006-hardening`.

**0c — ADR 0010** on `feat/1006-hardening`, recording the base design, the
`types` / `contracts` split rule and the behaviour-bearing constraint from §2.
Land it with or before phase 1, not after.

**1 — the data-shape bases** (`CallResultPrivateBase`, `CallResultPublicBase`,
`FinalizedCallTxDataBase`) into `packages/types`, with the retained arms under
`types/src/v8/`. The missing members fall out of the base rather than being
four separate fixes; the §3 gate goes green. Closes **R2** entirely and part of
**R3**. Additive.

**2 — `SubmittedCallTxBase`** (R3/A2): the retained arm gains `callTxData`, built
from the `call` the internal helper already returns
(`internal/ledger8-entry.ts:904-910`). Additive.

**3 — found/deployed contract bases in `contracts`** (R3/B1a) plus the deploy
path (R3/A5, A6, B2). **Say explicitly in the PR body that the retained deploy
arm refuses today, so none of this is observable end to end** — do not imply it
was exercised. B1b (re-nesting `deployTxData`) is breaking; leave it.

**4 — R4, the barrel exports.** Independent of 1–3, can run in parallel.
Additive.

**Later, separately** — R5 (indexer documents), R6 (error surface), R7 and R8
(both breaking, batch them for a major), and the §3 tail of the report.

Phases 0a and 4 have no dependency on the rest. Phases 1→2→3 are sequential —
they share files.

## 6. Non-negotiables

From `CLAUDE.md`/`AGENTS.md` and standing user instructions. Violating any of
these means rejection regardless of correctness.

- **A NEW worktree per change, branched from a clean base.** Never an existing
  worktree, never a shared branch. Branch naming `<type>/<issue>-<description>`.
- **TDD for real.** Write the test first, **run it, paste the failure**. A test
  never seen RED is not evidence. Read RED output test-by-test, not by the
  summary count — `toThrow(undefined)` and similar silently degrade to "throws
  anything".
- **Never cut test scope or rigor to save lines.**
- **Assert bidirectionally.** The entire root cause in §3 is a one-directional
  assertion. Do not add another.
- **No `any`, no `as unknown as`.** A cast is what caused R1; do not fix a cast
  bug with another cast.
- **Fail fast** — throw early rather than a silent fallback.
- **Fix at the source** — no workaround layered over a defect.
- **Rationale in `docs/`, never in source comments.** For this work that means
  ADR 0010.
- **Conventional commits, GPG-signed, Apache-2.0 header on every new source
  file, `yarn lint` clean.** Commit messages ASCII-only — a non-ASCII character
  has produced BAD-signature failures here. End with `Assisted-by: AI`; never a
  `Co-Authored-By` naming a tool.
- **Do not commit or push without explicit approval**, and re-check `HEAD`
  immediately before any push.

## 7. What NOT to do

- **Do not re-litigate the withdrawn findings** (report §5): D1
  (`withContractScopedTransaction` returning the last call's data — pinned by a
  test and correctly documented) and half of D2 (the `Ledger8CallTxFailedError`
  base class, justified at `errors.ts:953-955`). Only D2's member rename
  survives, folded into R6.
- **Do not "fix" report §4.** Those differences are explained and correct.
  Changing them undoes a recorded decision.
- **Do not start R7 or R8.** Breaking; they need a product decision.
- **Do not touch `packages/compact`.** It publishes no library surface.
- **Do not create `types/src/v9/` speculatively.**

## 8. Open questions to put to the user before starting

1. **Should the audit report be committed, and where?** Until it is tracked on
   `main`, nothing in code may cite it. ADR 0010 will need to stand on its own
   without referencing it.
2. **The audit brief's own premise is false.**
   `docs/qa/public-api-result-shape-audit-prompt.md:117` tells auditors that
   *"`packages/types` is declarations-only"* and to excuse gaps on that basis.
   The package ships ~29 runtime values (report §6). The rule is a real
   convention, so the gap needs a decision: correct the brief, or move the
   values. Relevant here because decision 1.2 puts more declarations into
   `types` — which is consistent with the rule, and worth noting in the ADR.
3. **Does phase 4 run in parallel with 1–3?** It is independent; this is only a
   question of how wide a front to open.

## 9. Definition of done, per PR

- The RED test existed first, and its failure output is in the PR body.
- `yarn lint` clean, build succeeds, full suite green.
- Every name `contracts` exported before is still exported, proven by a
  bidirectional sorted-equality assertion.
- PR body follows the repo template (`## Summary`, `## Test plan`) and its claims
  match what the branch actually contains — a stale PR description is itself a
  defect here.
- Any finding you decided NOT to fix is named in the PR body with the reason.
  Silence reads as "covered".
