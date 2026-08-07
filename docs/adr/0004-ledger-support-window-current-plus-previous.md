# 0004. Support the current and previous ledger version only; construct/submit stays current-version-only

- Status: Proposed (pending OQ10 — product/team ruling on the standing window policy)
- Date: 2026-08-07
- Deciders: Szymon Paluchowski
- Related: [HF design spec v3.9](https://github.com/midnightntwrk/midnight-js/blob/docs/superpowers-specs/docs/superpowers/specs/2026-07-09-ledger-v8-v9-dual-support-design.md) (D8, D9, D12), [#1005 upstream answers](https://github.com/midnightntwrk/midnight-js/issues/1005#issuecomment-5190024611) (confirmed [here](https://github.com/midnightntwrk/midnight-js/issues/1005#issuecomment-5202692002))

## Context

The Midnight blockchain hard-forks between ledger protocol versions (currently
v8 → v9). A dApp session may read history encoded with the previous version
while submitting transactions in the current one. Upstream imposes **no
ceiling** on how long old versions stay serviceable: there is no plan to drop
V2 proofs or ZKIR-v2 contract support (#1005 answers 2/4). Any support window
is therefore a midnight-js maintenance-policy choice, not an upstream
constraint. Midnight.js has no pre-fork construct pipeline: the
construct→prove→submit flow is statically pinned to the current ledger via
`packages/protocol`. Building an old-version construct pipeline would be a
major hidden workstream serving only a shrinking pre-fork window.

## Decision

We will support **exactly two ledger versions at a time: current + previous.**

- **Construct/submit is current-version-only.** Operating against a pre-fork
  network head fail-fasts with a typed error; dApps that must transact
  pre-fork stay on the last previous-version-based major.
- **Decode/read covers current + previous.** Previous-version records surface
  as raw bytes plus version int (ADR 0008) and decode dApp-side.
- **Keep-state soundness is re-validated per fork via a spike, never
  assumed.** Each fork window gets its own validation of the
  state-migration/byte-identity facts before any compat mechanism ships.
- **The fork date is not a design or scheduling driver.** Delivery is
  sequenced by dependency order only.

## Consequences

- **Positive:** dependency and test growth is bounded (at most two ledger
  stacks live at once); every version dispatch is a two-case switch; no
  pre-fork pipeline to build or maintain.
- **Negative:** during the pre-fork window a newly released major is
  read-capable only; retiring the previous version strands
  not-yet-graduated keep-state contracts on the last supporting major
  (the sanctioned graduation mechanism — key rotation installing
  current-version artifacts — is still unconfirmed upstream, tracked with
  OQ10). If policy ever widens to three live versions, the `contracts`
  routing table and the keep-state config shape need rework (localized,
  but real).
- **Follow-ups:** OQ10 ruling converts this ADR to Accepted (or revises
  it); compat-package retirement at each new fork is a deliberate policy
  act (`npm deprecate` + shrinking the `LedgerVersion` union).

## Alternatives considered

- **Support N versions indefinitely (upstream permits it):** rejected —
  unbounded dependency/test matrix growth for a framework that never needs
  more than one fork transition at a time.
- **Full pre-fork operation in the new major (v8-native construct):**
  rejected — no such pipeline exists in the codebase; the effort would serve
  only the pre-fork window and die at the fork.
