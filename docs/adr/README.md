# Architecture Decision Records

This directory records architecturally significant decisions for Midnight.js.
Each ADR states one decision as it stands today: the context, the decision, and
its consequences. See [ADR-0001](./0001-record-architecture-decisions.md) for why
we keep ADRs.

## When to write one

Write an ADR for a change that is expensive to reverse or that constrains
future work. In this repo that means, at minimum:

- Changes to provider interfaces in `packages/types/src`.
- Adding a provider implementation, or changing a provider's public shape.
- Adding a new runtime dependency, or swapping a core library.
- Any breaking change to a package's exported public API.

The full contributor/agent rules live in [AGENTS.md](../../AGENTS.md#architecture-decision-records-adrs).

## How to add or change one

1. Copy [`template.md`](./template.md) to `NNNN-kebab-title.md`, where `NNNN`
   is the next sequential zero-padded number. List this directory to find the
   highest existing one.
2. Fill it in as `Accepted`. Approving the PR is the acceptance.
3. **An ADR describes only the current decision.** When the decision still
   stands but a detail changes (a name, a mechanism, a follow-up that landed),
   edit the ADR in place, in the same PR as the code. Do not add amendment or
   changelog sections. Git keeps the history.
4. **To reverse a decision**, write a new ADR. Replace the old ADR's body with
   a short note that names the new one, and set its status to
   `Superseded by ADR-NNNN`. Keep the file, so links to it still work.
5. An ADR that has not reached `main` yet has no published number. Edit or
   delete it in place, and close the numbering up behind it.

Never rename an ADR file: code, tests and docs link to it.

There is no index to maintain. The files in this directory are the list, so
concurrent ADR PRs never conflict on a shared table.

## Statuses

- `Accepted`: in force.
- `Superseded by ADR-NNNN`: reversed by the named ADR.
