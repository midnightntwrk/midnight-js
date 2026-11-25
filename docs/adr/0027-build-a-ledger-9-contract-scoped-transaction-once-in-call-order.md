# 0027. Build a ledger 9 contract-scoped transaction once, in call order, across contracts

- Status: Accepted
- Date: 2026-11-23
- Related: [ADR 0017](./0017-error-codes-are-the-contract.md),
  [ADR 0023](./0023-reach-private-states-through-a-per-contract-view.md),
  [ADR 0025](./0025-run-contract-scoped-transactions-on-the-ledger-8-era.md)

## Context

`withContractScopedTransaction` runs several circuit calls as one transaction. Every ledger 9
call runs through it: a call made outside a scope is a scope of one call.

Until now the ledger 9 scope built each call as its own transaction and joined them with
`Transaction.merge()`. Each call's own transaction puts it in one intent at a segment id chosen at
random when that transaction is built (`fromPartsRandomized`); the merge keeps each intent at that
segment, after moving an id a later call shares with an earlier one to another random id, and the
ledger applies intents in segment order. So two calls where the second depends on
what the first wrote could land in either order, and could fail on chain. The scope also kept
one cached contract state and one private state, so it refused a second contract or a second
private state id, and it left a contract's balance as the first call read it.

The ledger itself keeps order inside one intent: it applies an intent's contract calls in the
order they appear, a caller before the callees it claims, each call on the state the one before
it left. A transaction with no fallible part lands whole or not at all: its calls sit wholly in the
guaranteed half, and it holds no fallible coins, fallible unshielded offer, deploy or maintenance
update.
The ledger also refuses a transaction whose time to dismiss is over its limit, and
`Transaction.cost(params, true)` prices that on the client.

## Decision

We will build a ledger 9 scope's transaction once, when the scope submits, over every call it
recorded, in the order the calls were made.

- **The scope records execution only.** Each call runs its circuit against the scope's states
  and is recorded. When the scope submits, it builds one transaction: one intent holding every
  recorded call in order, one set of offers over every call's coins, and the claim check over
  every call, before proving. A scope of one call is built from the same inputs as a call made
  alone. `createLedger9UnprovenCallTx` and `createLedger9UnprovenCallTxFromInitialStates` build
  their one call exactly as before.
- **States.** The scope pins one block. It reads each contract's state there once, through the
  caller's public data provider, and advances it, data and balance, for every contract a call
  reaches, root and callees, as a copy. A callee is served from the scope's state before the
  chain. Private states are kept per contract and private state id, each with the private state
  provider it was read through; a call that reaches one through another provider is refused
  before it runs. Contract addresses are compared in lower case.
- **Encryption keys.** The scope's mappings, every call's mappings and every call's wallet keys
  are merged; a coin key mapped to two encryption keys is refused before proving.
- **The claim check is the ledger's own five comparisons** (receives, nullifiers, claimed
  shielded spends, claimed contract calls by segment, claimed unshielded spends), run in
  `createUnprovenLedgerCallTx`, so a call built outside a scope gets the same check: a lone call
  whose nullifiers, claimed shielded spends, claimed contract calls or claimed unshielded spends
  do not match its transaction is now refused before proving, where the node refused it after.
- **A scope of two or more calls lands whole.** Before proving, a call tree placed wholly in the
  fallible half moves whole into the guaranteed half; any other fallible part is refused
  (`Ledger9ScopeFalliblePartError`), before proving and again on the transaction the wallet
  balanced. The time to dismiss is priced with `Transaction.cost(params, true)` under the ledger
  parameters of the pinned block, before proving only (`Ledger9ScopeOutsideTimeToDismissError`,
  naming each call moved). The balanced transaction is left to the node, which refuses one over
  the limit at no fee, after which the wallet releases what it booked. A lone call takes neither
  check, as before.
- **Or, opted in, in the fallible section.** With `inFallibleSection`, every call of the scope, a
  lone call included, is placed in the fallible section of the one intent, in order, so the scope
  lands whole or fails whole on chain. Set out below.
- **Private states are stored only when the transaction succeeds entirely.** The scope takes one
  snapshot of every private state before it submits, hands it with every identifier of the
  transaction to `beforeSubmit` once the wallet has balanced the transaction and the scope's checks
  passed, before `submitTx` is called, and stores exactly that snapshot through each state's own
  provider. A page or process that stops while `submitTx` runs has already been handed the states.
  A `beforeSubmit` that throws stops the submission. Every state is tried; those refused are
  carried by one `Ledger9PrivateStatesNotStoredError`. A failed wait after submission raises
  `Ledger9SubmittedTxUnconfirmedError`. The `ProviderFailedError` of a rejected `submitTx` carries
  the private states and the transaction's identifiers, hidden, since it does not prove the node
  never took the transaction; a coded error the midnight provider raised is passed on as itself and
  carries neither. A call made after submitting begins is refused.
- **One-time keys.** `spentHere` names keys made for one transaction: every coin a call makes for
  them is spent again in the same transaction. The scope refuses a wallet's own keys, keys that
  spend no coin the scope made, and `spentHere` or `beforeSubmit` given to a scope that does not
  submit (a nested scope) or that runs on a ledger 8 network.
- **Errors.** The four new errors are raised only on the ledger 9 path, so they carry the
  `Ledger9` prefix (ADR 0018). `Ledger9SubmittedTxUnconfirmedError` and
  `Ledger9PrivateStatesNotStoredError` sit in the categories of `Ledger8UnconfirmedError` and
  `Ledger8NotStoredError` but are not cases of them: the ledger 8 classes carry a deploy's or an
  authority replacement's signing key and send the caller to check the contract's address, the
  ledger 9 classes carry the private states calls left and send the caller to store them.
- The ledger 8 scope is unchanged (ADR 0025).

### Placing the calls in the fallible section (`inFallibleSection`)

The choice. By default a scope of two or more calls lands whole in the guaranteed section, as
above. With `inFallibleSection`, the scope moves every call tree whole into the fallible section
instead: a transcript the partitioner placed in the guaranteed section moves, one it placed in the
fallible section stays, callees with their root. A proof binds the guaranteed program then the
fallible one, concatenated, so a transcript proves the same in either section; the coins and
unshielded payments each transcript claims follow it into the fallible offer and the fallible
unshielded offer of the intent's segment. Where the calls are placed (the fallible section, whole
in the guaranteed section, or a lone call made alone) is decided once, when the scope builds. A
call the partitioner split at a checkpoint is refused before proving
(`Ledger9ScopeFalliblePartError`), a lone call included: only the ledger's runtime can join its two
transcripts into one, and its guaranteed part alone would be kept when the rest fails. Any
guaranteed part the calls leave is refused before proving too. Two or more calls are priced
against the time to dismiss before proving, as by default; a lone call is not, as by default,
since the ledger counts the guaranteed section's application and not the fallible one's, so in the
fallible section a call costs no more to dismiss than made alone. The balanced transaction is not
checked for fallible parts, since the wallet adds only its Dust spend to the guaranteed section and
balances a fallible part in that part's own segment, which the ledger holds to its own balance. The
ledger applies a segment's fallible section whole or not at all: a failure on chain is
`FailFallible`, one fee paid and nothing of the calls kept, and the scope then stores no private
state and throws `TxFailedError`, whose message says so, with the states the calls left, which are
not to be kept. A nested scope and a scope on a ledger 8 network refuse the option before any call
runs, whenever it is given.

The two placements, measured on a local chain (node 2.1.101, indexer 4.4.101, proof server
9.0.2) with two calls of one contract: a raise, then a seal that checks the id was not already
sealed and inserts it three times into a Merkle tree (wholly fallible when sent alone). Fees are
the ledger's `fees` of the transaction submitted, in DUST specks, medians.

| Placement | Natural runs | Made to fail on chain (another party seals the id first) |
|---|---|---|
| Sent as two transactions | 11 of 11 landed, two approvals, about 42 s, 4.7 x 10^14 | the raise landed (one fee, 1.8 x 10^14), the seal was refused before proving: in part |
| Default (guaranteed section) | 10 of 10 refused before proving (priced about 29 ms against about 21 ms allowed), no fee; sent as two transactions | refused before proving, no fee |
| `inFallibleSection` | 11 of 11 landed whole in one transaction, one approval, about 24 s, 3.6 x 10^14 | 8 of 8 `FailFallible`: one fee (3.5 x 10^14), nothing of the calls kept |
| A guaranteed prefix and a fallible suffix (for comparison; not offered) | 11 of 11 landed whole, one approval, about 24 s, 4.0 x 10^14 | 4 of 8 `FailFallible` with the raise kept (landed in part, 3.2 x 10^14); 4 of 8 refused by the node, no fee |

Why opt-in. The default keeps what a scope of several calls has meant since it was built: it
lands whole or not at all, and whatever cannot is refused before proving or, failing on chain, by
the node, at no cost. In the
fallible section a scope that fails on chain still pays its fee, so the caller chooses it for
calls that must take effect together and that the default cannot fit in one transaction, knowing
the failure is whole and paid for.

## Consequences

- **Positive:** calls that depend on each other land in the order they were made, or not at all.
  One scope can call several contracts and several private states. The claim check and the time
  to dismiss refuse before a proof is paid for.
- **Positive:** a lone call that contradicts its own wallet's encryption key, whose private state
  store is refused, or whose wait fails after submission now gets a named error, where it used to
  get the wallet's key silently or the raw error. A lone call whose transcripts' claims do not
  match its transaction is refused before proving, where the node refused it after.
- **Negative:** the time to dismiss before proving is an estimate made before the Dust spend,
  with the ledger's estimated proof sizes, so a scope near the limit can be refused that the node
  would take. The client prices a verifier key as one 4,096-byte block, so the node can be
  stricter only for keys over 4,096 bytes.
- **Negative:** a call moved out of the fallible half counts in full against the time to dismiss.
  The partitioner placed it there because even its part before the first checkpoint costs more
  than the guaranteed half allows it, so it fits only beside calls whose size leaves spare
  allowance; otherwise it is sent in a transaction of its own, where it keeps its fallible
  placement. A scope that earlier releases landed in one transaction with a fallible part,
  possibly in part, is refused before proving.
- **Negative:** a scope over several contracts needs a proof provider that resolves the keys of
  every contract its calls reach.
- **Negative:** one transaction links what its calls state publicly. A wrap of unshielded tokens
  merged with a deposit into a receiver meant to stay private puts the wrap's amount, the token
  and the receiver together on chain; sent apart, the deposit of an already-shielded coin states
  no amount. The scope's documentation says to merge a wrap with what follows it only where the
  receiver is not private, one-time keys included.
- **Positive:** with `inFallibleSection`, calls the default would send as two transactions land
  whole in one, with one approval, in about 24 s against about 42 s measured, or fail whole.
- **Negative:** with `inFallibleSection`, a failure on chain pays the transaction's fee and keeps
  nothing of the calls; a call split at a checkpoint cannot be sent in such a scope.
- **Follow-ups:** the ledger's own time to dismiss as a figure, exposed through ledger-wasm,
  would replace the client's text-matching of the ledger's refusal.

## Alternatives considered

- **Keep building each call and merging.** Rejected: the merge does not keep order and cannot
  carry a coin one call makes to a later call.
- **A new public builder beside the scope.** Rejected: every ledger 9 call already runs through
  the scope, so one way in keeps a lone call and a scope on the same path.
- **Check the time to dismiss for a lone call too.** Rejected: priced before the Dust spend, it
  would refuse calls near the limit that land today.
- **Price the balanced transaction too.** Rejected: the node refuses the same transaction at no
  fee and the wallet then releases what it booked, where a refusal in the client leaves the
  bookings held, and a wallet reached through the DApp connector offers no revert.
- **A guaranteed prefix and a fallible suffix.** The ledger applies every guaranteed transcript
  first and then each fallible segment, so calls with only guaranteed parts, then at most one
  call split at a checkpoint, then wholly fallible calls in one fallible segment keep the scope's
  order. Rejected: made to fail on chain it landed in part, keeping the prefix (measured above),
  and it would need a second rule that stores the guaranteed calls' private states on a partial
  success and carries the rest.
- **Every call in the fallible section by default.** Rejected: a failure on chain would pay a fee
  where the default refuses at no cost, for every scope, including those the default already
  lands whole. Offered as an option instead.
