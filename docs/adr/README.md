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
3. To reverse a decision that is already on `main`, write a new ADR and mark
   the old one `Superseded by ADR-NNNN`. Both files stay, so the reasoning
   behind the old choice remains readable.
4. An ADR that has **not** yet reached `main` has no published number. Edit or
   delete it in place instead, and close the numbering up behind it. Shipping
   a file that was superseded before anyone could read it records a decision no
   consumer ever saw.
5. To amend an ADR whose decision still stands — a fact it rested on changed,
   or a follow-up landed — append an `## Amendment — <what changed> (date)`
   section. Leave the original sections untouched.

There is no index to maintain — the ADR files in this directory are the list.
This keeps each ADR PR limited to its own new file, so concurrent PRs never
conflict on a shared table.

## Statuses

- `Accepted` — in force. Every ADR lands in this state; approving the PR is the
  acceptance.
- `Superseded by ADR-NNNN` — reversed by a later decision, which the status
  names.

There is no `Proposed` state: a decision still being argued belongs in the PR
thread, not in this directory. There is no `Deprecated` state either — an ADR
is either in force or superseded by a named replacement.
