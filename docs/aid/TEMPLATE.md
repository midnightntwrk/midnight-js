---
implements: ADR-XXXX
status: draft  # draft | approved | active | completed
date: YYYY-MM-DD
approved_in: null
scope:
  packages: []
  patterns: []
estimated_size: null  # S | M | L | XL
---

# AID-XXXX: Title

## Planning Rules

Agents generating or executing this AID MUST:

1. Analyse the codebase using GitNexus before proposing changes
2. Stay within the scope defined above — flag anything
   out of scope as a new issue
3. Not modify files outside `scope.packages` and
   `scope.patterns` without engineer approval
4. Not chain into new ADRs or AIDs — raise an issue instead
5. Not review their own output

## Objective

One-line: what does "done" look like?

## Affected Components

| Path | Change type | Description |
|---|---|---|

## Implementation Steps

Ordered steps the agent should follow.

## Dependencies

New or changed dependencies required.

## Validation

- [ ] Acceptance criteria (checkable items)

## Anti-patterns

| Pattern | Why | Do this instead |
|---|---|---|
