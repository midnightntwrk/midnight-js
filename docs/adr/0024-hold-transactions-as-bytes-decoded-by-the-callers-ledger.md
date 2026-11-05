# 0024. Carry every transaction as a byte handle that the caller decodes with its own ledger

- Status: Accepted
- Date: 2026-11-05
- Related: [ADR 0014](./0014-build-provider-seams-from-per-era-handlers.md),
  [ADR 0018](./0018-name-single-ledger-code-after-its-ledger.md),
  [ADR 0020](./0020-carry-on-chain-state-as-bytes-decoded-by-the-callers-runtime.md)

## Context

A transaction crosses three provider methods (`proveTx`, `balanceTx`, `submitTx`) and the read side
(`watchForTxData`, `watchForDeployTxData`). Four forces shape how we carry it:

- **The shape must not change at a fork.** If the current era is a live object and an older era is
  bytes, then at every fork the previous era's shape changes and every consumer and provider breaks.
- **The stage must be in the type.** An unproven transaction must not reach `submitTx`.
- **Several ledger copies live in one process.** The dApp, the wallet (wallet-sdk, a DApp Connector
  wallet) and the framework can each load their own copy of the ledger WASM. A ledger object passed
  to another copy is refused as an argument, or, as the receiver of a method call, reads the other
  instance's memory and gives a wrong value. `tsc` cannot see this.
- **A decoder needs the era and the stage.** `Transaction.deserialize(markerS, markerP, markerB,
  bytes)` in `ledger-v8` and `ledger-v9` takes the signature, proof and binding markers. Bytes alone
  do not say which decoder to use, but a handle that carries the era and the stage does.

Bytes are lossless: a contract call gives the same bytes after serialize, deserialize and serialize,
and proving the round-tripped copy gives the same transaction. A decode costs far less than a proof.
Bytes are also the only form every ledger copy can read safely.

## Decision

Every transaction in the public API of every package from `types` up is a `LedgerTransaction`
(`packages/types/src/ledger-transaction.ts`). It holds the bytes the ledger wrote, and carries the era
and the stage as data. The stage is also in the type: `UnprovenTx`, `UnboundTx` and `FinalizedTx` are
`LedgerTransaction<'Unproven' | 'Unbound' | 'Finalized'>`.

```ts
class LedgerTransaction<S extends TransactionStage, out E extends LedgerEra = LedgerEra> {
  readonly era: E;
  readonly stage: S;
  static fromBytes<E, S>(era: E, stage: S, bytes: Uint8Array, method?): LedgerTransaction<S, E>;
  static seal<E, S>(era: E, stage: S, tx: { serialize(): Uint8Array }, method?): LedgerTransaction<S, E>;
  serialize(): Uint8Array;
  deserialize<D extends TransactionDecoders>(decoders: TransactionDecodersFor<D, E>): DecodedTransaction<D, E, S>;
  static require<S>(value: unknown, stage: S, method: TransactionHandleMethod): LedgerTransaction<S>;
  static isLedgerTransaction(value: unknown): value is LedgerTransaction<TransactionStage>;
}
```

1. **`fromBytes` is the only way in.** It checks that the bytes start with the full header the ledger
   of `era` writes for `stage`: schema version and signature, proof and binding markers, from
   `LEDGER_TRANSACTION_TAGS` (`@midnight-ntwrk/midnight-js-protocol/version`, one row per era and
   stage). The check asks "is this header valid for this era and stage", never "which era does this
   header name". An era with no row is a build error. A refusal is `InvalidTransactionHandleError`
   (`MIDNIGHT_JS_PR_INVALID_TRANSACTION_HANDLE`) with reason `header-mismatch`, `not-bytes` or
   `invalid-stage`; an unknown era is `UnknownLedgerEraError`. The constructor takes a module-private
   token, so no other path makes a handle. The bytes are copied in, and copied out by `serialize()`.
2. **`seal` is `fromBytes(era, stage, tx.serialize())`.** It takes a transaction object of any ledger
   copy: `serialize()` runs inside the object's own copy, so it is safe. A value with no `serialize`
   method is refused with reason `not-a-transaction`. `seal` is synchronous and never loads a runtime.
3. **`deserialize` decodes with the caller's own `Transaction` class**, one per era:
   `handle.deserialize({ v9: Transaction })`. The handle passes the markers of its own stage, so the
   caller cannot decode at the wrong stage, and the result has the caller's type at that stage. Only
   the class of the handle's era is called. Decoders with no class for any era the handle's type
   allows do not compile. A missing class at run time is `TransactionDecoderMissingError`
   (`MIDNIGHT_JS_PR_TRANSACTION_DECODER_MISSING`). A class that throws a non-`MidnightJsError` is
   `TransactionDecodeFailedError` (`MIDNIGHT_JS_PR_TRANSACTION_DECODE_FAILED`, INTEGRITY) with the
   cause; a `MidnightJsError` is rethrown unchanged. There is no form that decodes with the
   framework's copy by default.
4. **Every method checks what it receives.** Each provider method and each `contracts` entry point
   calls `LedgerTransaction.require(value, stage, method)`. It refuses a value that is not a handle of
   this copy of `types` (`not-a-handle`; the message names a copied handle and a duplicate
   `midnight-js-types` install as likely causes) and a handle at another stage (`wrong-stage`).
5. **Layer rule.** `protocol` sits below `types` and cannot know the handle, so it speaks raw ledger
   objects. Every package from `types` up speaks only handles in its public API. A decoded ledger
   object lives only inside one function, between `deserialize` and `seal`.
6. **Providers are built from one handler per era, keyed `{ v8, v9 }`.**
   `createProofProviderFromHandlers`, `createWalletProviderFromHandlers` and
   `createMidnightProviderFromHandlers` take one entry per `LedgerEra`, `undefined` for an era not
   served. A handler receives the handle of its own era (`LedgerTransaction<S, E>`) and decodes it
   with its own copy, or passes `tx.serialize()` on. A `proveTx` or `balanceTx` handler answers with a
   transaction object of any ledger copy, or with bytes (`TransactionAnswer`). See
   [ADR 0014](./0014-build-provider-seams-from-per-era-handlers.md) for `supportedEras` and the
   refusal of an unserved era.
7. **The era of an answer comes from the request, never from the bytes.** The factory seals the
   answer in the era of the request, at the stage the method produces. Guessing the era from the
   bytes would let a wrong answer choose its own decoder.
8. **The routing is generic in the era, with no cast.** The factories route through a function
   generic in `E extends LedgerEra`, with handler types indexed by `E`, so the call to the handler is
   checked against era `E`. A `switch` over the era, or widening `E` to the union, would need a cast
   and lose that check. Keep this signature.
9. **Bytes that enter from outside are decoded once, at once.** Where a provider answer, a DApp
   Connector wallet or a composed transaction hands bytes back, the framework decodes them with its
   own copy (`deserializeTransactionAtStage` from `@midnight-ntwrk/midnight-js-protocol/transaction`)
   before it makes the handle. Bytes that do not decode are refused with
   `PayloadNotATransactionError` (`MIDNIGHT_JS_P_PAYLOAD_NOT_A_TRANSACTION`, USAGE). So a corrupt
   body fails there, not later in the proof or the submit.
10. **`contracts` checks every provider answer.** A provider outside the type system can still answer
    with a handle of another era (`EraInvariantViolationError`) or at another stage
    (`InvalidTransactionHandleError`).
11. **The read side does not decode.** `FinalizedTxRead` is `era`-tagged and its `tx` is a
    `FinalizedTx` of the same era (`record.tx.era === record.era`, in the types and checked at run
    time). It is built with `fromBytes`, through `utils.deserializeLedgerTransaction(era, bytes, ctx)`,
    which reports a bad header as `DeserializationError`. Reading a v8 record does not load ledger 8.
12. **We use our own class, not wallet-sdk's `WalletTransaction`.** Its era stamp is the node
    `protocolVersion` integer, not `LedgerEra`; it checks neither the stage nor the copy; it returns
    errors instead of throwing coded ones; and the central types would follow wallet-sdk's releases.
    No package outside `testkit-js` depends on wallet-sdk.
13. **No cache in the handle.** Each use decodes. If a benchmark shows the scope's repeated merges
    cost too much, `contracts` may keep decoded objects for the length of one scope. That stays
    inside `contracts` and never reaches the handle.

A dApp reads a transaction like this:

```ts
import { Transaction } from '@midnightntwrk/ledger-v9';

const tx = record.tx.deserialize({ v9: Transaction });
```

## Consequences

- **Positive:** a transaction has one shape in every era, so a fork changes no handle type and no
  handler signature. The stage is in the type. No handle holds a WASM object, so none can carry an
  object of the wrong copy, and a dApp always gets an object of its own copy. Reading a v8 record
  does not load ledger 8. Transactions and on-chain state follow one model (ADR 0020). A handler that
  talks to wallet-sdk or a DApp Connector already has the bytes it needs.
- **Negative:** every use pays a decode, and the scope pays one per merge on a growing transaction.
  A header check proves less than a decode: on the read side a corrupt body is found only when the
  caller decodes it. The bytes are a private field, so `structuredClone`, `postMessage` and JSON drop
  them: send `serialize()`, `era` and `stage`, and rebuild with `fromBytes`.
- **Follow-ups:**
  - A release gate: deploy, maintenance, contract call, Zswap-only and merged transactions, in both
    eras and at every stage, are proved, balanced and submitted after a round trip.
  - A benchmark of the scope, with peak memory, to decide on the cache in point 13.
  - wallet-sdk's JSON wire envelope reads and writes the bytes the handle holds (#1543).

## Alternatives considered

- **Hold a live ledger object, guarded against other copies.** Rejected. Keeping objects safe
  becomes a rule ("serialize on the way out") instead of a property of the type, the read side hands
  a dApp the framework's object, and reading a v8 record loads ledger 8.
- **A version-tagged record, live object for the current era and bytes for older ones.** Rejected.
  The shape changes at every fork, each provider writes two handler shapes, and bytes carry no stage.
- **Bytes with a public `unwrap` that decodes with the framework's copy.** Rejected for the reason
  ADR 0020 gives: the convenient call becomes the common one and hands out the framework's copy.
- **Caller-supplied decoder functions that take the stage.** Rejected. A caller could pass the wrong
  markers. Passing the `Transaction` class and letting the handle pick the markers keeps the stage
  check in one place.
- **Reuse wallet-sdk's `WalletTransaction`.** Rejected for the reasons in point 12.
