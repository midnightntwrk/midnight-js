# 0008. Report decode failures without attributing an era

- Status: Accepted
- Date: 2026-09-07
- Related: [ADR 0006](./0006-version-tagged-payloads-at-provider-seams.md), [ADR 0007](./0007-never-latch-the-network-head-version.md), [ADR 0020](./0020-carry-on-chain-state-as-bytes-decoded-by-the-callers-runtime.md), [ADR 0024](./0024-hold-transactions-as-bytes-decoded-by-the-callers-ledger.md)

## Context

The indexer public-data provider reads bytes and dates them. When bytes do not match the era chosen
for them, two very different things may have happened:

1. The record is inconsistent: the indexer dated bytes of one era to a block of another.
2. The consumer's `@midnightntwrk/ledger`-vN is a different version than the network's, so the
   serialization tag does not match what the installed ledger expects. Same era on both sides;
   ordinary dependency skew.

The deserialization layer in `@midnight-ntwrk/midnight-js-utils` classifies a failure and attaches a
mitigation. For `version-mismatch` the mitigation is to align the `@midnightntwrk/ledger`-vN version
with the network: case 2.

The evidence available at the read cannot separate the two cases. The `[vN]` markers inside a
serialization tag are object-schema versions, not ledger eras (a v8 ledger writes
`midnight:transaction[v9](...)`), so schema drift looks the same in both cases. A provider that
claims "inconsistent indexer" would bury the one mitigation that helps in case 2.

## Decision

We will not re-attribute a decode failure at the read boundary. The provider adds only facts it
knows; it does not say which side is at fault.

**Transaction records** (`watchForTxData`, `watchForDeployTxData`):

- The era comes from the record's `protocolVersion` (`resolveReadEra`). A value that maps to no era
  is `UnknownRecordEraError`. An era with no decoder in this build is `DecoderEraUnsupportedError`.
  Both are `IndexerError` subclasses.
- The provider does not decode the transaction. `decodeRecordTransaction` checks the hex and builds
  the handle with `LedgerTransaction.fromBytes(era, 'Finalized', bytes)` (through
  `deserializeLedgerTransaction`), which checks only the era's header. A failure leaves as the
  `DeserializationError` that layer produced, with the era, the raw `protocolVersion`, the read
  method and the record reference in `context.details`.
- The caller decodes with its own ledger (`record.tx.deserialize({ v9: Transaction })`). A decoder
  error that is not a `MidnightJsError` becomes `TransactionDecodeFailedError`; a framework error
  passes through unchanged.

**State reads** (`queryContractState`, `queryZSwapAndContractState`, `queryDeployContractState`,
`watchForContractState`, `contractStateObservable`):

- A state's era is read from the tag at the start of its bytes. The block's era comes from
  `protocolVersion`.
- A `protocolVersion` that maps to no era is refused as `UnknownRecordEraError`. A value that is not
  a non-negative integer is `IndexerDataError`, kind `'malformed-protocol-version'`.
- The block era bounds the state's era from above (kind `'era-disagreement'`) when the state and
  its block come from one pinned read. The check is skipped where they can straddle a fork:
  `watchForContractState`, and `queryContractState` / `queryZSwapAndContractState` without an
  offset. The block era is still resolved there, so an unplaceable `protocolVersion` is refused on
  every state read. Ledger parameters must match the block era exactly
  (kind `'parameters-era-disagreement'`).
- The caller decodes with its own runtime. A decoder error that is not a `MidnightJsError` becomes
  `SerializedStateDecodeFailedError`; a framework decoder's `DeserializationError` reaches the caller
  unchanged.

## Consequences

- The mitigation a caller reads is the one written by the layer that diagnosed the failure.
  Ordinary ledger skew is not reported as a broken indexer.
- Consumers matching `isDeserializationError` at the top level keep matching.
- A consumer who wants to tell the two cases apart gets no help from the type system; they read
  `context.details` beside the classification.
- A network this build cannot place fails every read, state reads included. Upgrading
  midnight-js is the fix.

## Alternatives considered

- **Wrap the failure in a provider error that blames the indexer.** Rejected: tag `[vN]` markers
  are not era evidence, so the claim is wrong in both directions and hides the useful mitigation.
- **Prove the claim by decoding with the other era's runtime.** Real evidence, but it loads the
  second WASM runtime on every failure path for a diagnosis, not a result.
- **Soften the message to name both possibilities.** Adds an error class whose only content is
  "one of two things happened"; the underlying error already says it better.
