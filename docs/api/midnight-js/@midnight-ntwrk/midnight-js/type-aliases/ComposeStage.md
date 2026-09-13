[**Midnight.js API Reference v5.0.0-beta.7**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js](../README.md) / [](../README.md) / ComposeStage

# Type Alias: ComposeStage

> **ComposeStage** = `"wrap-call"` \| `"call-empty"` \| `"call-transcript-empty"` \| `"call-partition-context"` \| `"call-partition"` \| `"call-prototype"` \| `"call-dust-payout"` \| `"call-unsupported-payout"` \| `"call-operation"` \| `"call-contract-state"` \| `"call-verifier-key"` \| `"deploy-verifier-key"` \| `"deploy-unknown-circuit"` \| `"deploy-ambiguous-circuit"` \| `"deploy-verifier-key-blob"`

Which composition step [ComposeFailedError](../classes/ComposeFailedError.md) failed at.

Call stages:
- `'call-empty'` — a call transaction was requested with no calls in it.
  The one stage that names no circuit: it is raised before any circuit is
  looked up, so it names [NO\_CIRCUIT](../variables/NO_CIRCUIT.md).
- `'call-operation'` — a call leg could not resolve a registered operation
  for the call's circuit on the given contract state.
- `'call-verifier-key'` — a call leg resolved a registered operation for the
  call's circuit, but that operation carries no verifier key, so no ledger
  could verify a call against it.
- `'call-contract-state'` — the call's pre-call state could not be bridged
  into the target era's own state algebra. Carries the decoder's failure on
  `cause`.
- `'call-transcript-empty'` — a caller-supplied partitioned transcript
  carried neither a guaranteed nor a fallible half, so the call would record
  no operations at all.
- `'call-partition-context'` — the era rejected the query-context state the
  call recorded (its block, its starting effects, or one of the commitment
  indices it registered for a coin received in-contract) while bridging it
  onto the context the transcript is partitioned against. Carries the
  runtime's own failure on `cause`.
- `'call-partition'` — the ledger rejected the public transcript supplied
  for a call while splitting it into its guaranteed and fallible halves.
  Carries the runtime's own failure on `cause`.
- `'call-prototype'` — the ledger rejected the call's own inputs while
  constructing the call prototype. Carries the runtime's failure on `cause`.
- `'call-dust-payout'` — a transcript claimed an unshielded spend to a user
  address in DUST, which has no raw token type to be paid out in.
- `'call-unsupported-payout'` — a transcript claimed an unshielded spend to
  a user address in a token type that cannot be paid out as an unshielded
  UTXO at all (a shielded token type today).

Deploy stages:
- `'deploy-verifier-key'` — a deploy leg was given no verifier key for a
  circuit the contract state declares.
- `'deploy-unknown-circuit'` — the verifier-key map handed to a deploy leg
  names a circuit the contract state does not declare. Registering it would
  add an entry point the compiled contract never had, and silently change
  the deployed contract's address.
- `'deploy-ambiguous-circuit'` — two entry points the contract state
  declares resolve to the same name, so the verifier-key map (keyed by
  name) cannot address them apart. Registering under the shared name would
  key one slot and leave the other blank.
- `'deploy-verifier-key-blob'` — the ledger rejected the verifier-key bytes
  supplied for a circuit.

Keep-state stage:
- `'wrap-call'` — the keep-state leg could not resolve a registered
  operation for the transcript's circuit on the given contract state.

Which ledger era the failure happened on is carried separately, on the
error's `version` field. Every stage but `'wrap-call'` is reachable on both
eras; `'wrap-call'` is only ever raised for `'v9'`.

## See

 - ComposeRefusalOrder
 - VerifierKeys
