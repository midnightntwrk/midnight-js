# 0001. Record architecture decisions

- Status: Accepted
- Date: 2026-07-09
- Deciders: Midnight.js maintainers

## Context

Midnight.js is a layered framework where a handful of decisions — provider
interface shapes in `packages/types/src`, the transaction flow, dependency
choices — ripple across every downstream package. These decisions were being
made in PR threads and chat, where the reasoning is hard to find later. Both
new contributors and AI agents working in the repo need a durable, greppable
record of *why* the architecture is the way it is, not just *what* it is.

## Decision

We will record architecturally significant decisions as Architecture Decision
Records (ADRs) stored in `docs/adr/`, one Markdown file per decision, using the
MADR-lite template in [`template.md`](./template.md). Files are named
`NNNN-kebab-title.md` with a zero-padded sequential number. The index in
[`README.md`](./README.md) lists every ADR and its status.

## Consequences

- **Positive:** decision rationale is versioned alongside the code, reviewable
  in PRs, and discoverable by grep or the repo's documentation skills, which
  already look under `docs/adr/`.
- **Negative:** contributors must spend time writing an ADR for qualifying
  changes; the index must be kept in sync by hand.
- **Follow-ups:** enforcement guidance for contributors and agents lives in
  [AGENTS.md](../../AGENTS.md); a CI gate could be added later if manual
  discipline proves insufficient.

## Alternatives considered

- **No ADRs (status quo):** rejected — reasoning kept leaking into ephemeral PR
  and chat threads.
- **A single running decisions log:** rejected — one file grows unwieldy and
  produces merge conflicts; per-file ADRs review and diff cleanly.
- **A wiki or external doc tool:** rejected — decisions drift out of sync with
  the code and are invisible to in-repo tooling and agents.
