# Architecture Decision Records

This directory records architecturally significant decisions for Midnight.js.
Each ADR captures the context, the decision, and its consequences so the
reasoning survives beyond the PR thread where it was made.

See [ADR-0001](./0001-record-architecture-decisions.md) for why we keep ADRs.

## When to write one

Write an ADR for a change that is expensive to reverse or that constrains
future work. In this repo that means, at minimum:

- Changes to provider interfaces in `packages/types/src`.
- Adding a provider implementation, or changing a provider's public shape.
- Adding a new runtime dependency, or swapping a core library.
- Any breaking change to a package's exported public API.

The full contributor/agent rules live in [AGENTS.md](../../AGENTS.md#architecture-decision-records-adrs).

## How to add one

1. Copy [`template.md`](./template.md) to `NNNN-kebab-title.md`, where `NNNN`
   is the next sequential zero-padded number — list this directory to find the
   highest existing one.
2. Fill it in as `Accepted`: approving the PR *is* the acceptance, so there is
   no separate status flip after merge.
3. To reverse a past decision, write a new ADR and mark the old one
   `Superseded by ADR-NNNN`.

There is no index to maintain — the ADR files in this directory are the list.
This keeps each ADR PR limited to its own new file, so concurrent PRs never
conflict on a shared table.

## Statuses

`Proposed` · `Accepted` · `Deprecated` · `Superseded by ADR-NNNN`
