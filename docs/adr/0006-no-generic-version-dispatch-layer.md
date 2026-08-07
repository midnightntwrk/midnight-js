# 0006. Handle ledger versions with explicit parameters and two-case switches, not a generic dispatch layer

- Status: Accepted
- Date: 2026-08-07
- Deciders: Szymon Paluchowski
- Related: [HF design spec v3.9](https://github.com/midnightntwrk/midnight-js/blob/docs/superpowers-specs/docs/superpowers/specs/2026-07-09-ledger-v8-v9-dual-support-design.md) (D1, D10), ADR 0004

## Context

Supporting two ledger versions invites generic machinery: a
version-parameterised accessor (`getLedger<V>`), a unified dispatch facade,
branded type buckets, per-version ACL parity lists. Early spec drafts designed
exactly that and successive reviews removed it all: under ADR 0004 the
construct→prove→submit pipeline is statically current-version, the
previous-version decode surface is a handful of functions, and N never
exceeds 2. A generic facade would encode an assumed axis of variation that an
unknown future fork will not honour — the v8→v9 spike itself invalidated the
previous fork model (dual compiled artifacts) that any prematurely built
facade would have frozen in.

## Decision

We will keep version handling **concrete and explicit**:

- A closed union type (`LedgerVersion`, currently `'v8' | 'v9'`) is the
  single compile-time signal downstream code keys on. It widens at a fork
  and shrinks at retirement — every switch over it stops compiling at both
  events, which is the intended change-discovery mechanism.
- Version values are **passed as explicit arguments** (per-record version,
  network-head version); no hidden mutable global — cross-version
  operations coexist in one session and a shared global is racy.
- Dispatch points are **plain two-case switches** in the few places that
  need them. No unified facade, no branded types, no runtime version
  registry. Abstraction is added *when* a future fork's real shape is
  known, not before.

## Consequences

- **Positive:** the version-handling surface is small enough to audit by
  reading; the compiler mechanically finds every dispatch point when the
  union changes; nothing generic exists to misfit the next fork's actual
  needs.
- **Negative:** a third live version (if ADR 0004's window ever widens)
  means touching each switch by hand — accepted, because the compiler
  enumerates them and the alternative is speculative machinery carried
  forever.
- **Follow-ups:** the sourcing distinction (per-record vs network-head
  version) is convention enforced by review and spy tests, not by the type
  system — a deliberate trade recorded here.

## Alternatives considered

- **Version-parameterised accessor / unified facade (early spec drafts):**
  rejected after review — every consumer paid indirection for a pipeline
  that is statically single-version.
- **Branded types and a type-bucket taxonomy for divergent shapes:**
  rejected — solved a problem that current-version-only construct/submit
  had already removed; raw-bytes surfacing (ADR 0008) closes the one place
  the two type worlds would have met.
- **Mutable module-level "active version" global:** rejected — racy across
  concurrent operations and hostile to fail-fast behaviour.
