# Audit prompt — result-shape consistency across the public API

Hand this to an agent working in a clean checkout of this repository. It audits
what the public API **returns**, looking for the defect class described below.

---

## Task

Audit every public entry point in this framework and report where the **shape of
the returned object** is inconsistent between operations a caller would
reasonably expect to match.

Report findings only. Change no code.

## The defect class, as a worked example

This audit exists because of a real finding. `submitCallTx` has two eras of arm:

```ts
// current era — packages/contracts/src/tx-model.ts, call.ts
FinalizedCallTxData<C, PCK> = {
  public:  { nextContractState, publicTranscript, partitionedTranscript, version: 'v9', tx, txId, status, … },
  private: { input, output, privateTranscriptOutputs, result, nextPrivateState, unprovenTx, newCoins },
  calls:   …
}

// retained era — packages/contracts/src/ledger8-contract.ts (before the fix)
Ledger8FinalizedCallTxData<C, K> = { circuitId, nextPrivateState, txData }
```

One function, one conceptual operation ("call a circuit and wait for
finalization"), two **structurally unrelated** results. Three separate problems
were folded into that:

1. **Different structure for the same operation.** A caller reads
   `submitted.private.result` in one era and `submitted.txData.status` in the
   other. Nothing in the API says why, and no test asserted the parity.
2. **A value computed and then dropped before the public boundary.** The
   circuit's own return value existed the whole time as
   `TranscriptPojo.result` (`packages/protocol/src/lib/v8/execute.ts`), was not
   carried by `Ledger8CallPipelineResult`
   (`packages/contracts/src/internal/ledger8-pipeline.ts`), and so could not
   reach the caller. It was reachable in one era only — not by decision, by
   omission.
3. **A justified difference sitting next to an unjustified one.** Two members of
   the current-era shape are live WASM handles (`public.nextContractState`,
   `private.unprovenTx`), and ADR-0007 forbade those crossing an era boundary,
   so their absence from the retained arm read as **correct** and had been
   camouflaging the incorrect ones. ADR-0011 has since lifted that bar for
   result types: the retained arm now carries its own handle for the first, and
   `unprovenTx` remains absent by a recorded decision rather than by the rule
   cited here.

Point 3 is the discipline this audit needs most. A difference is a finding only
when nothing explains it.

## Where to look

Public surface is what the barrels export:

```
packages/*/src/index.ts
```

Start from `packages/contracts`, `packages/types`, `packages/protocol` — the
first two define the caller-facing operations, the third defines the seams they
cross.

Pairings worth comparing, in rough order of likely yield:

- **Era pairs.** Anything with a `Ledger8*` / retained-era counterpart against
  its current-era sibling: call, deploy, find/attach, constructor results.
- **Overload arms of one exported function.** Every arm of `submitCallTx`,
  `submitDeployTx`, `deployContract`, `findDeployedContract`, and the governance
  entry points. TypeScript picks the first matching arm; two arms of one name
  answering different shapes is the exact hazard here.
- **`*Async` versus waiting variants.** `submitCallTx` vs `submitCallTxAsync`,
  and the same for deploy. Check both eras of each.
- **Operations over the same noun.** Everything that answers "contract state",
  "finalized transaction", "private state" — do they agree on field names,
  nesting and units?
- **Provider interfaces** in `packages/types/src/`. Seven providers; check that
  methods answering the same kind of value agree on shape and on how absence is
  expressed (`undefined` vs `null` vs a thrown error).

## Method

Work from the **type definitions**, not from documentation or comments. A
docblock claiming symmetry is not evidence of it; several in this repo were
wrong at the time of writing.

For each candidate finding:

1. Quote both shapes from their definitions, with `file:line`.
2. Name the member(s) that differ, in each direction. Missing members and
   differently-nested members both count; so does the same value under two
   names.
3. **Search for a recorded justification** before calling it a defect: an ADR in
   `docs/adr/`, a docblock on the type or member, or a comment at the
   construction site. Quote it if it exists.
4. If a member is missing, **check the layer below** for whether the value
   exists there. Grep the internal pipeline and the protocol package for a field
   of that meaning. A value that exists internally and stops at the boundary is
   the highest-value finding in this audit — that is what point 2 above was.
5. State what a caller has to write today to get the value in each variant. If
   one variant makes it unobtainable, say so explicitly.

## Constraints that make a difference legitimate

Do not report these as defects; do note where they apply:

- **ADR-0007, as amended by ADR-0011** — a live WASM handle may NOT cross the
  era-agnostic `LedgerEra` facade, but the framework's era-SPECIFIC result types
  DO publish handles, provided each travels with a plain-data twin. So on a
  result type a handle's presence is not a finding; a handle published WITHOUT
  its twin is, and so is a missing plain-data substitute (for example serialized
  bytes in place of a transaction object).
- **Version tagging.** A retained-era finalized record is deliberately
  `VersionedFinalizedTxData` rather than being narrowed to one era; see the
  comment on `submitLedger8CallTx`. Narrowing it would be the defect.
- **`packages/types` is mostly, but NOT only, declarations.** It ships around
  29 runtime values today: the provider factories (`createProofProvider`,
  `createWalletProvider`, `createMidnightProvider`), the key-material helpers,
  `unwrapV9`, the export limits, the status and segment constants, `LogLevel`,
  nine error classes and `ZKConfigRegistry`. Keeping new runtime helpers in
  `packages/utils` is a real convention and still holds for new code, so a
  missing *helper* in `types` is not a shape inconsistency — but do not excuse
  a missing *declaration* there on the grounds that the package cannot hold
  one. See `2026-09-09-public-api-result-shape-audit.md` §6 for the inventory.
- **Privacy split.** `public` versus `private` nesting is intentional and
  load-bearing. Report a value on the WRONG side; do not report the split
  itself.

## Output

A single report. For each finding:

| field | content |
|---|---|
| Operations compared | the two (or more) entry points |
| Shapes | both, quoted, with `file:line` |
| Difference | member by member, in both directions |
| Recorded justification | quoted, or "none found" |
| Reachable below the boundary? | yes + where, or no |
| Caller impact | what one has to write in each variant to get the same value |
| Severity | **unexplained drift** / **value trapped below the boundary** / **explained, documented here for completeness** |
| Minimal fix | the smallest change that removes the inconsistency, and whether it is breaking |

Order findings by severity, then by how many entry points each affects.

Finish with two lists: entry points you compared and found consistent, and any
public surface you could **not** audit, with the reason. The second list matters
as much as the findings — an audit that silently skipped a package reads as a
clean bill of health for it.

## Scale

Roughly 20 exported entry points across the provider interfaces and the
contracts package. Expect a few hours of reading. Do not sample: the finding
that prompted this audit was in the arm that gets the least use, and sampling
would have missed it.
