# 0025. Run contract-scoped transactions on the ledger 8 era

- Status: Accepted
- Date: 2026-11-05
- Deciders: Szymon Paluchowski
- Related: #1218, #1576, #1581, [ADR-0021](./0021-mirror-per-era-functions-and-route-each-role-once.md)

## Context

`withContractScopedTransaction` batches several circuit calls into one transaction. midnight-js
4.1.1 ran it on the ledger 8 network: it composed each call as its own transaction, cached the
contract state and private state the call ended on, and merged the transactions with
`Transaction.merge()`.

The 5.0.0 pre-releases refused a scope while the network is on ledger 8 (`EraMismatchError`,
reason `'scope-on-ledger8-network'`), and refused a ledger 8 call handed a scope. The reason given
was that the ledger 8 era composes exactly one call per transaction. That is true of
`composeCallTx`, which builds one call tree; a cross-contract call is a ledger 9 feature. A scope
does not build a call tree. It merges whole transactions, which the ledger 8 ledger accepts: a
node on ledger 8 (node 1.0.0, `ledger-v8` 8.1.3) records a transaction merged from two calls as
`SucceedEntirely`.

The refusal removed a feature dApps used in 4.1.1, before the fork, when ledger 8 is the only era
they can run on.

## Decision

We will run contract-scoped transactions on a ledger 8 network, and only there for ledger 8
contracts.

- `withContractScopedTransaction` reads the head once and runs the scope of that era. It has one
  overload per era (ADR-0021). The ledger 9 overload is declared first, so an untyped scope
  function keeps the ledger 9 context it had; a ledger 8 caller types the parameter as
  `Ledger8TransactionContext`.
- `withLedger8ContractScopedTransaction` mirrors `withLedger9ContractScopedTransaction`. Each
  refuses a head of the other era with `EraMismatchError`, reason `'scope-era-mismatch'`, from the
  head reading alone and before the scope function runs. That reason replaces
  `'scope-on-ledger8-network'`.
- The ledger 8 scope acquires the retained runtime once, before its function runs. The first call
  added to it reads the contract state and the stored private state; every later call runs on the
  states the call before it ended on.
  The calls are merged with the framework's own ledger 8 copy and submitted once; the private state
  is stored once, after the chain records success.
- A ledger 8 call joins the scope through the ledger 8 overloads of `submitCallTx` and
  `Ledger8CircuitCallTxInterface`. `createUnprovenCallTx` and `createLedger8UnprovenCallTx` given
  the scope build against its states and add nothing to it; only a joined call fixes the contract
  and private state the scope runs against.
- After the fork a ledger 8 call handed a ledger 9 scope is still refused (`'ledger8-call-in-scope'`).
  A ledger 9 call handed a ledger 8 scope is refused with `'ledger9-artifact-on-ledger8-network'`.
  Both refusals hold on every path a call takes, `callTx.<circuit>` included. A scope context
  whose era is unknown, or a ledger 8 one made by another copy of the package, is refused with
  `InvalidArgumentError`.

## Consequences

- **Positive:** the 4.1.1 behaviour is back before the fork. A dApp moving from 4.1.1 keeps
  batching its ledger 8 calls.
- **Negative:** the scope function needs a type, or the era-specific function, to receive a ledger 8
  context. `ReturnType<typeof withContractScopedTransaction>` names the ledger 8 result, because it
  reads the last overload.
- **Negative:** as in the ledger 9 scope, the contract's balance stays as the first call read it,
  and the ledger does not keep the order of merged calls. A JavaScript caller that nests a scope by
  passing a running scope's context as the options gets that scope's last call data, not a
  finalized transaction, whatever the declared return type says.
- **Follow-ups:** none required. Running a ledger 8 contract's calls in a ledger 9 scope after the
  fork is a separate decision.

## Alternatives considered

- **Keep the refusal.** Rejected: its reason holds for a call tree, not for a merge, and it removes
  a working 4.1.1 feature for the whole time before the fork.
- **Only add `withLedger8ContractScopedTransaction`, and keep `withContractScopedTransaction`
  refusing a ledger 8 head.** Rejected: ADR-0021 makes the unprefixed name the router of every era
  it can serve.
- **Declare the ledger 8 overload first.** Rejected: every untyped ledger 9 scope function would
  receive a ledger 8 context and stop compiling.
