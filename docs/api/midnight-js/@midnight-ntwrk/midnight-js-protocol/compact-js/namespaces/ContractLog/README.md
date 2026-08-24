[**Midnight.js API Reference v5.0.0-beta.7**](../../../../../README.md)

***

[Midnight.js API Reference](../../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../../README.md) / [compact-js](../../README.md) / ContractLog

# ContractLog

Typed domain model for the contract log events emitted from Compact contracts via the `emit`
expression (MIP-0002).

Events flow from contract emission → ledger wrapping → indexer storage → DApp queries. This
module turns the raw, on-chain-encoded [LogEvent](../../../compact-runtime/type-aliases/LogEvent.md) surfaced on a circuit result into a
typed, discriminated [ContractEvent](type-aliases/ContractEvent.md) whose `payload` is decoded per event type.

## Remarks

- **Event version**: Phase-1 wire format is `version: 1`. Version `0` is reserved on-chain for
  the decoder's malformed-input fallback, so it is treated here as degraded/unknown, never an
  error.
- **Graceful degradation** (MIP-0002): an oversized or malformed payload is dropped on-chain
  (surfaced as an empty `{ tag: 'null' }` `data`, or a short buffer). Decoding **never throws**
  and never fails a batch — such events decode to a [ContractEvent](type-aliases/ContractEvent.md) with `degraded: true`
  and `payload: undefined`. Absence is normal.
- **Indexed fields** are derived from the event type (not marked by the author); see
  [indexedFields](variables/indexedFields.md). `Misc` and lifecycle events index nothing.
- **Non-consensus**: events are NOT consensus state; retention is a downstream (indexer) policy.
- **Wire layout**: the intra-`data` field byte-offsets read by [decode](variables/decode.md) follow the
  corrected field-aligned layout from issue #278 — a 65-byte `Either` (`[is_left:1][left:32][right:32]`,
  `is_left=1` → coin-public-key), little-endian `Uint<128>` with trailing zeros stripped (buffers
  are right-padded to canonical width before slicing), and the post-compact#590 `shielded-receive`
  field order `(commitment, ciphertext, contractAddress)`. See the layout table in
  `test/effect/logEventFixtures.ts`. The authoritative reference is the indexer's Rust decoder
  (`ledger_state.rs`); the end-to-end cross-check against a live `emit` (see that file's provenance
  note) is the final validation gate. A wrong offset decodes **silently** to a wrong value rather
  than degrading.

## Other

### LogEvent

Re-exports [LogEvent](../../../compact-runtime/type-aliases/LogEvent.md)

## decoding

- [decode](variables/decode.md)
- [decodeAll](variables/decodeAll.md)

## indexing

- [indexedFields](variables/indexedFields.md)

## model

- [ContractEventBase](interfaces/ContractEventBase.md)
- [EitherAddress](interfaces/EitherAddress.md)
- [MiscPayload](interfaces/MiscPayload.md)
- [PayloadMap](interfaces/PayloadMap.md)
- [ShieldedBurnPayload](interfaces/ShieldedBurnPayload.md)
- [ShieldedMintPayload](interfaces/ShieldedMintPayload.md)
- [ShieldedReceivePayload](interfaces/ShieldedReceivePayload.md)
- [ShieldedSpendPayload](interfaces/ShieldedSpendPayload.md)
- [UnshieldedBurnPayload](interfaces/UnshieldedBurnPayload.md)
- [UnshieldedMintPayload](interfaces/UnshieldedMintPayload.md)
- [UnshieldedReceivePayload](interfaces/UnshieldedReceivePayload.md)
- [UnshieldedSpendPayload](interfaces/UnshieldedSpendPayload.md)
- [ContractEvent](type-aliases/ContractEvent.md)
- [DecodedEvent](type-aliases/DecodedEvent.md)
- [DegradedEvent](type-aliases/DegradedEvent.md)
- [LifecyclePayload](type-aliases/LifecyclePayload.md)
- [LogEventType](type-aliases/LogEventType.md)
- [LogEventTypeSchema](variables/LogEventTypeSchema.md)
