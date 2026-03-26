---
status: proposed
date: 2026-03-26
deciders:
  - "@adamreynolds-io"
scope:
  - docs/adr
  - docs/aid
tags:
  - process
  - agents
approved_in: null
---

# ADR-0001: Agent planning and execution rules

## Context and Problem Statement

AI agents are increasingly involved in engineering work — drafting
decisions, planning implementations, writing code, and reviewing
output. Without explicit rules, agents can drift from priorities,
over-engineer solutions, expand scope, and execute without
validation. We need a governance framework that keeps humans in
control of decisions while letting agents do the heavy lifting
between approval gates.

## Decision Drivers

- Agents generate volume quickly but lack strategic judgement
- Decisions made without human review risk misalignment
- Agents reviewing their own work creates blind spots
- Unscoped agent execution leads to sprawl

## Considered Options

1. No formal process — rely on PR review to catch issues
2. Human-only planning with agent execution
3. Structured ADR/AID lifecycle with human gates

## Decision Outcome

Chosen option: "Structured ADR/AID lifecycle with human gates",
because it gives agents clear boundaries while keeping humans
in control of decisions and approval.

### The lifecycle

```
Engineer + AI ──▶ ADR (draft)
                    │
            Engineer reviews
                    │
                ADR (accepted) ◄── gate 1: human approval
                    │
              AI generates AID
                    │
            Engineer audits AID
                    │
                AID (approved) ◄── gate 2: human approval
                    │
            Agent executes work
                    │
          Engineer reviews output ◄── gate 3: human approval
                    │
                  Merged
```

### Rules

1. **Decisions are human-made** — Agents assist with research,
   options analysis, and drafting, but an engineer must author
   and approve every ADR. No agent commits an ADR.

2. **Planning requires a reviewed ADR** — An agent MUST NOT
   generate an AID unless it references an accepted ADR.
   No ADR, no plan.

3. **AIDs require engineer sign-off before execution** — An
   agent generates the AID, an engineer reviews scope,
   constraints, and validation criteria. The AID is merged
   via PR with the same review process as code.

4. **Execution follows the AID** — An agent implementing work
   MUST stay within the AID's scope and constraints. If it
   encounters something outside scope, it stops and flags.
   It does not expand the plan.

5. **Agents don't review their own work** — The agent that
   generates code does not approve it. A human reviews, or a
   different agent audits against the AID's validation
   criteria before human final review.

6. **No chain reactions** — An agent MUST NOT create an ADR
   from an AID, or generate a new AID from implementation
   findings. If implementation reveals a new decision is
   needed, it raises an issue for a human.

## Constraints

- MUST: Use MADR-compatible format for all ADRs
- MUST: Include scope in ADR frontmatter for agent discovery
- MUST: Include constraints section with RFC-2119 keywords
- MUST: Link AID to its parent ADR via `implements` field
- MUST: Record PR number in `approved_in` on acceptance
- MUST NOT: Allow agents to approve their own ADRs or AIDs
- MUST NOT: Allow agents to execute without an approved AID
- MUST NOT: Allow agents to expand scope beyond the AID
- PREFER: Agent uses GitNexus for codebase analysis during
  AID generation

## Consequences

### Positive

- Clear audit trail from decision to implementation
- Agents are productive between gates without human bottleneck
- Scope creep is structurally prevented
- Any agent can pick up an AID — not dependent on context
  from the drafting agent

### Negative

- Overhead for small changes — lightweight work may not
  warrant a full ADR/AID cycle
- Three approval gates could slow down urgent work
