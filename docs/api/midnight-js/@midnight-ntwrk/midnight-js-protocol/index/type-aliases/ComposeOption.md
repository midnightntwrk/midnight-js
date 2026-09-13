[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / ComposeOption

# Type Alias: ComposeOption

> **ComposeOption** = `"calls"` \| `"contractState"` \| `"ledgerParameters"` \| `"networkId"` \| `"ttl"` \| `"verifierKeys"` \| `"zswapOffer"`

Which option handed to a composition leg was unusable:
- `'contractState'` — the state could not be bridged into the target
  ledger era (its serialized envelope was rejected by the era's decoder).
- `'networkId'` — the network id was empty. The ledger accepts an empty
  string and bakes it into the transaction, so a caller that forgot to
  resolve one would only find out at submission.
- `'ttl'` — the time-to-live was not a valid instant. `new Date('...')` on
  an unparseable value yields an Invalid Date, which the ledger silently
  records as the Unix epoch: a transaction that is already expired when it
  is composed.
- `'calls'` — the call list is not one the target era can compose. The
  retained pre-fork era composes exactly one call: a cross-contract call is a
  ledger-9-only feature that a pre-fork contract cannot emit, so that era has
  no call tree to express.
- `'verifierKeys'` — a deploy was requested with no verifier-key map, and the
  state it was given needs one. Raised on BOTH eras, for two different
  reasons: the retained era's deploy leg has to register the compiled
  contract's keys itself and so always needs the map, while the current era
  accepts its omission for a state that already carries its keys and refuses
  it only for a state still declaring a blank-keyed entry point.
- `'zswapOffer'` — the supplied offer bytes were rejected by the target era's
  decoder. Raised on BOTH eras, for the same reason and with the same
  remediation: pass the bytes that era's own offer serialization produced.

## See

 - [ComposeRefusalOrder](../../documents/ComposeRefusalOrder.md)
 - [VerifierKeys](../../documents/VerifierKeys.md)
