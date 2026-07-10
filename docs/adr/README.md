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
   is the next sequential zero-padded number.
2. Fill it in and open the PR with the ADR marked `Proposed`.
3. On merge/approval, change the status to `Accepted` and add a row below.
4. To reverse a past decision, write a new ADR and mark the old one
   `Superseded by ADR-NNNN`.

## Statuses

`Proposed` · `Accepted` · `Deprecated` · `Superseded by ADR-NNNN`

## Index

| ADR | Title | Status |
|-----|-------|--------|
| [0001](./0001-record-architecture-decisions.md) | Record architecture decisions | Accepted |
