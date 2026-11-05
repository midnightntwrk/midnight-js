# 0024. Hold transactions as bytes, decoded by the caller's ledger

- Status: Accepted
- Date: 2026-11-05
- Deciders: Szymon Paluchowski
- Related: amends [0019](./0019-carry-transactions-as-opaque-era-carrying-handles.md); follows
  [0020](./0020-carry-on-chain-state-as-bytes-decoded-by-the-callers-runtime.md); issues #1551, #1543

## Context

ADR 0019 made every transaction in the public API a `LedgerTransaction<S, E>` handle. The handle
carries `era` and `stage` as data and holds a live ledger object of the framework's own WASM copy.
`seal` refuses an object of another copy, and `unwrap` hands the live object back.

That choice has four costs:

- **The outbound boundary is guarded by a rule, not by the type.** A per-era handler receives the
  framework's object. If it hands that object to another ledger copy (wallet-sdk, a second install
  of the ledger package), the call is refused, or it reads the other instance's memory. Only
  ADR 0019 point 4 ("serialize on the way out") prevents it.
- **The read side hands out the framework's object.** `LedgerTransaction.unwrap(record.tx, 'v9')`
  gives a dApp an object its own ledger copy may refuse. ADR 0020 removed the same hazard for
  on-chain state.
- **Ledger 8 must be loaded early.** Reading a v8 transaction record loads the ledger 8 runtime,
  also in a session that otherwise uses only ledger 9. `seal` refuses a v8 object before
  `loadLedger8Protocol()` has resolved.
- **Two models for one kind of data.** On-chain state is bytes plus an era (`SerializedState`,
  ADR 0020). Transactions are live objects.

ADR 0019 rejected "bytes everywhere" because bytes alone cannot say which decoder to use. The handle
already carries the era and the stage, so that reason no longer holds.

Facts that shape the decision:

- **The round trip is lossless where it was measured.** A ledger 9 contract call gives the same
  bytes after serialize → `Transaction.deserialize` → serialize, and proving the round-tripped copy
  gives the same transaction (ADR 0019). Existing `protocol` tests round-trip a ledger 8 call and
  deploy. Probes during the review of this decision kept the bytes and the binding randomness of an
  empty-intent transaction at all three stages in both eras, and the prover input of an unproven
  transaction with a Zswap output. Deploy, maintenance, Zswap-only and merged transactions have not
  been proved and balanced after a round trip.
- **A transaction decoder needs the stage.** `Transaction.deserialize(markerS, markerP, markerB, bytes)`
  in both `ledger-v8` and `ledger-v9` takes the signature, proof and binding markers. `protocol`
  already maps each stage to its markers. A state decoder takes only the bytes.
- **The stage parser accepts too much.** `transactionStageOf` reads the proof and binding markers,
  but ignores the signature marker and accepts any `transaction[vN]` schema version. It cannot by
  itself check that bytes belong to an era.
- **The scope merges repeatedly.** `withContractScopedTransaction` merges the accumulated
  transaction with each new call (`unwrap` + `merge` + `seal`). With bytes inside, every merge
  decodes the growing transaction again.
- **wallet-sdk holds a live object too.** `WalletTransaction` keeps an object of any ledger copy,
  with no copy check and no stage check, and uses bytes only at a process boundary
  (`toWire` / `fromWire`), with a decoder the caller supplies. wallet-sdk owns one ledger copy per
  era, so a live object is safe for it. The framework sits between three copies: the dApp's, the
  wallet's and its own.

## Decision

We will hold the bytes of a transaction inside `LedgerTransaction`, and let the caller decode them
with its own ledger copy. The handle keeps its name, its `era`, its `stage` and its stage type
parameter.

```ts
class LedgerTransaction<S extends TransactionStage, E extends LedgerEra = LedgerEra> {
  readonly era: E;
  readonly stage: S;
  static fromBytes<E, S>(era: E, stage: S, bytes: Uint8Array): LedgerTransaction<S, E>;
  static seal<E, S>(era: E, stage: S, tx: { serialize(): Uint8Array }): LedgerTransaction<S, E>;
  serialize(): Uint8Array;
  deserialize<D extends TransactionDecoders>(decoders: TransactionDecodersFor<D, E>): DecodedTransaction<D, E, S>;
  static require<S>(value: unknown, stage: S, method: TransactionHandleMethod): LedgerTransaction<S>;
  static isLedgerTransaction(value: unknown): value is LedgerTransaction<TransactionStage>;
}
```

The rules:

1. **`fromBytes` is the only way in.** It checks that the bytes start with the full header the
   ledger of `era` writes for `stage`: the transaction schema version and the signature, proof and
   binding markers. The headers live in one table in `@midnight-ntwrk/midnight-js-protocol/version`,
   one row per era and stage, like `LEDGER_STATE_TAGS`. The check asks "is this header valid for
   this era and stage", never "which era does this header name". An era with no row is a build
   error. Bytes that fail the check are refused with `InvalidTransactionHandleError`. The bytes are
   copied in and copied out by `serialize()`.
2. **`seal` is a shortcut for `fromBytes(era, stage, tx.serialize())`.** It takes an object of any
   ledger copy. Calling `serialize()` on an object of another copy runs in that copy, so it is
   safe. `ForeignLedgerTransactionError` and the `ledger8-not-loaded` reason are removed. A value
   with no `serialize` method is refused as `not-a-transaction`.
3. **`deserialize` takes the caller's `Transaction` class, one per era.** For example
   `handle.deserialize({ v9: Transaction })` with `Transaction` from the dApp's own `ledger-v9`.
   The handle passes the markers of its own stage, so a caller cannot decode a transaction at the
   wrong stage. Only the decoder of the handle's own era is called. A missing decoder is refused
   with a coded error, and a decoder that throws an error that is not a `MidnightJsError` is
   reported as a coded INTEGRITY error with the cause, as for `SerializedState`. Decoders that
   hold none for any era the handle can be do not compile. A type test proves that each stage
   returns the caller's transaction type at that stage, not the framework's.
4. **`unwrap` is removed from the public API.** The framework decodes with its own copy only where
   it builds, proves or merges a transaction: `contracts`, `http-client-proof-provider` and
   `dapp-connector-proof-provider`. It does that through `deserialize`, with the framework's
   classes. There is no form that decodes with the framework's copy by default.
5. **A handler receives the handle and returns an object or bytes.** The per-era handler of
   `create*FromHandlers` receives `LedgerTransaction<S, E>` for its era and decodes it with its own
   copy. It returns an object of any ledger copy, or bytes. The factory seals the answer with the
   era of the request and the stage the method produces, so the answer is checked as it is today.
   ADR 0019 point 4 (serialize on the way out) becomes a property of the type, and the exception
   in ADR 0019 point 7 (handlers speak raw framework objects) is removed.
6. **Bytes that enter from outside are decoded once, at once.** Where a wallet, a DApp Connector or
   a composed transaction hands bytes back, the framework decodes them with its own copy before it
   makes the handle, and refuses bytes that do not decode with `PayloadNotATransactionError`, as
   today. A malformed body fails there, not later in the proof or the submit. The read side does not
   decode: a transaction record is built with `fromBytes`, and reading a v8 record does not load the
   ledger 8 runtime.
7. **No cache in the handle.** The first version decodes on every use. A benchmark of a scope with
   several calls decides whether `contracts` keeps decoded objects for the length of one scope and
   seals once at the end. That optimisation stays inside `contracts` and never reaches the handle.
8. **The rest of ADR 0019 stands.** The stage in the type, `require` at every method, handlers
   keyed by era, the era of an inbound answer taken from the request, the run-time checks of
   provider answers in `contracts`, and the read record `FinalizedTxRead`.

A dApp reads a transaction like this:

```ts
import { Transaction } from '@midnightntwrk/ledger-v9';

const tx = record.tx.deserialize({ v9: Transaction });
```

## Consequences

- **Positive:** no handle holds a WASM object, so no handle can carry an object of the wrong copy
  to anyone. A dApp gets an object of its own ledger copy. Reading a v8 transaction record no longer
  loads ledger 8, and `seal` no longer needs it loaded. Transactions and on-chain state follow one
  model. A handler that talks to wallet-sdk or a DApp Connector already has the bytes it needs.
- **Negative:** a breaking change before 5.0.0 final: `unwrap` is removed, the handler signatures
  change, `seal` accepts objects it refused before, and `MIDNIGHT_JS_PR_FOREIGN_LEDGER_TRANSACTION`
  is no longer raised. Every use pays a decode, and the scope pays one per merge on a growing
  transaction until the benchmark says otherwise. A tag check proves less than a decode: on the read
  side a corrupt body is found only when the caller decodes it. The bytes are a private field, so
  `structuredClone`, `postMessage` and JSON drop them: send `serialize()`, `era` and `stage`.
- **Follow-ups:**
  - A release gate: deploy, maintenance, contract call, Zswap-only and merged transactions, in both
    eras and at every stage, are proved, balanced and submitted after a round trip.
  - The benchmark of the scope, with peak memory.
  - The wire envelope (#1543) reads and writes the bytes the handle already holds.
  - A migration guide entry for `unwrap` and the handler signatures.

## Alternatives considered

**Keep the live object (ADR 0019).** Rejected. It keeps the outbound rule outside the type, hands a
dApp the framework's object, and loads ledger 8 to read a v8 record. Its one advantage, no decode on
use, is small next to a proof.

**Bytes inside, with a public `unwrap` that decodes lazily with the framework's copy and caches the
result.** This was the first proposal in #1551. Rejected for the reason ADR 0020 rejected
`deserialize()` with no argument: the convenient call becomes the common one, and it hands out the
framework's copy. The cache also brings a live object back into the handle.

**Caller-supplied decoder functions that take the stage.** Rejected. A caller could decode with the
wrong markers. Passing the `Transaction` class and letting the handle pick the markers keeps the
stage check in one place.

**Reuse wallet-sdk's `WalletTransaction`.** Rejected in ADR 0019, and still rejected: its era stamp
is the node `protocolVersion`, it checks neither the copy nor the stage, and `unwrapWithin<T>`
returns a type the caller names without a check.
