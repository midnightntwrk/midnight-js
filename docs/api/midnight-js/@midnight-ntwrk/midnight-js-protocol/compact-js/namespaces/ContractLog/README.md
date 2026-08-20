[**Midnight.js API Reference v5.0.0-beta.6**](../../../../../README.md)

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
- **⚠️ Payload decoding is experimental**: the intra-`data` field byte-offsets read by
  [decode](variables/decode.md) (Maybe flag positions, `Uint<128>` big-endianness, the `Either` discriminant
  value) are **derived from the compiler source**, not yet confirmed against a live `emit` — the
  bundled compactc emits no `log` ops, so no fixture exercises a real payload (see the provenance
  note in `test/effect/logEventFixtures.ts`). The **envelope** (`version`, `eventType`, `address`,
  degradation) is confirmed. A wrong offset would decode **silently** to a wrong value rather
  than degrading, so treat a decoded `payload` as provisional until re-confirmed against a live
  emit.

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
