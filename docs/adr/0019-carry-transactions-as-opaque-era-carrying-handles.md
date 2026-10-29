# 0019. Carry transactions as opaque handles that carry their era

- Status: Accepted
- Date: 2026-10-26
- Deciders: Szymon Paluchowski
- Related: amends [0006](./0006-version-tagged-payloads-at-provider-seams.md) and
  [0014](./0014-build-provider-seams-from-per-era-handlers.md); issues #1533, #1543, #1525

## Context

ADR 0006 made every transaction that crosses `proveTx`, `balanceTx` and `submitTx` a
`version`-tagged record: `{ version: 'v9', tx }` for the current era and
`{ version: 'v8', txBytes }` for the retained one. The rule behind it was "the current era is a
live object, a retained era is bytes". ADR 0014 built the providers from that rule: a
`currentEra` handler that gets a live object, and `retainedEras` handlers that get bytes.

That rule has three costs:

- **The shape changes at every fork.** When ledger 10 becomes current, ledger 9 becomes retained,
  and `{ version: 'v9', tx }` has to become `{ version: 'v9', txBytes }`. Every consumer that reads
  `.tx` for v9 breaks, and every provider rewrites its v9 handler from objects to bytes.
- **Two handler shapes per provider.** A provider writes one signature for the current era and
  another for each retained era.
- **Bytes carry no stage.** The retained variant was the same type for all three methods, so an
  unproven `txBytes` could reach `submitTx` and the compiler said nothing.

wallet-sdk 2.0 solved the same problem with `WalletTransaction<Stage>`: one class for every era,
the stage in the type (`UnprovenTx`, `UnboundTx`, `FinalizedTx`), and the era as data on the
handle, checked at run time.

Two more facts shape the decision:

- **Bytes are lossless and cheap.** On a real ledger 9 contract call, unproven → bytes →
  `Transaction.deserialize` → bytes is identical, and proving the round-tripped copy gives the
  same transaction. One serialize plus one deserialize at each of the three methods costs about
  1.8 ms; the smallest proof takes about 82 ms.
- **Two ledger copies are a real hazard.** wallet-sdk installs `ledger-v8` under `@midnight-ntwrk`,
  the framework under `@midnightntwrk`. These are two WASM instances. A framework v8 object is not
  an `instanceof` the wallet's class: as an argument it is refused, and as the receiver of a method
  call it reads the other instance's memory (`memory access out of bounds`, or a plausible wrong
  value). `tsc` does not catch it.

## Decision

We will carry every transaction in the public API of every package from `types` upward as one
opaque handle per stage, declared in `types`:

```ts
class LedgerTransaction<S extends TransactionStage> {
  readonly era: LedgerVersion; // 'v8' | 'v9'
  readonly stage: S;           // 'Unproven' | 'Unbound' | 'Finalized'
  serialize(): Uint8Array;
  static seal<E, S>(era: E, stage: S, tx: LedgerTransactionTypes[E][S]): LedgerTransaction<S>;
  static unwrap<E, S>(handle: LedgerTransaction<S>, era: E): LedgerTransactionTypes[E][S];
  // true only for a handle made by this copy of `types`; a look-alike object or a handle
  // from a second installed copy gives false
  static isLedgerTransaction(value: unknown): value is LedgerTransaction<TransactionStage>;
}
type UnprovenTx = LedgerTransaction<'Unproven'>;
type UnboundTx = LedgerTransaction<'Unbound'>;
type FinalizedTx = LedgerTransaction<'Finalized'>;
```

**We declare our own class instead of reusing wallet-sdk's `WalletTransaction`.** Reusing it
would save a conversion at the wallet, but its era stamp is the node `protocolVersion` integer,
not `LedgerVersion`, and the central types would follow wallet-sdk's releases. Our class keeps
`LedgerVersion`, throws coded errors instead of returning an `Either`, and checks the WASM
instance when a handle is made. No package outside `testkit-js` depends on wallet-sdk, at run time
or in its types.

**The handle holds a live ledger object, guarded, rather than bytes.** The live object keeps the
handle cheap to read and lets `unwrap` give the caller the object it needs without a decode. The
guard in `seal` closes the one hazard a live object has: an object from another ledger copy.

The rules:

1. **`seal` and `unwrap` are the only ways in and out.** The ledger object sits in a private field.
   A raw ledger object exists only between `unwrap` and `seal` inside one function. The
   constructor takes a module-private token that only `seal` holds, so a handle cannot be built
   around `seal` from JavaScript either (`new`, `Reflect.construct`, a subclass).
2. **The guard runs in `seal`.** `seal` asks `isFrameworkLedgerTransaction(era, tx)` from
   `@midnight-ntwrk/midnight-js-protocol/transaction` whether `tx` is an object of the ledger copy
   this framework loaded. An object of another copy is refused with `ForeignLedgerTransactionError`
   (`MIDNIGHT_JS_PR_FOREIGN_LEDGER_TRANSACTION`); a value that is not a transaction object at all
   (bytes, `undefined`) with `InvalidTransactionHandleError`, reason `not-a-transaction`, whose
   message points at `deserializeTransactionAtStage`. Every handle is made by `seal`, so no handle
   holds a foreign object. This covers what `contracts` builds and what every provider handler returns,
   and it replaces `Ledger8InstanceMismatchError`.
3. **`seal` is synchronous.** A v8 object cannot be judged before `loadLedger8Protocol()` has
   resolved, because the framework's v8 class does not exist yet. Such an object is refused with
   reason `ledger8-not-loaded`, and the message names `loadLedger8Protocol()` as the fix. The check
   never loads the v8 WASM itself.
4. **Boundary rule: serialize on the way out, decode into the framework's copy on the way in.** A
   provider that hands a transaction to another ledger copy (wallet-sdk, a DApp Connector wallet)
   passes it bytes, and reads the answer with `deserializeTransactionAtStage(era, stage, bytes)`
   from `@midnight-ntwrk/midnight-js-protocol/transaction`, which decodes with the framework's own
   copy. A live object never crosses to another copy. The proof providers are not such a boundary:
   `httpClientProofProvider` and `dappConnectorProofProvider` prove the live object in this process,
   and only circuit preimages cross the wire.

   The testkit's wallet provider applies the rule in both directions. On the way out it decodes the
   bytes into wallet-sdk's OWN ledger copy — `@midnightntwrk/wallet-sdk/ledger/v9` for v9, and the
   module the wallet's v8 loader (`@midnightntwrk/wallet-sdk/ledger/v8`) returns for v8 — before
   adopting them; on the way in it decodes wallet-sdk's answer into the framework's copy. For v8 the
   two copies are separate WASM instances today. For v9 they resolve to one module today, so the v9
   tests prove only that a separate object is handed over, not a separate instance; the v8 tests
   carry the instance check.
5. **At an inbound boundary, the era comes from the request, never from the bytes.** A wallet's
   answer to a v9 request is decoded as v9. Guessing the era from the bytes would let a wrong answer
   choose its own decoder.
6. **`stage` is checked at run time, in `seal` and at the methods.** A ledger uses one class for
   all three stages, so `seal` reads the stage from the proof and binding markers in the object's
   serialized tag (`transactionStageOf` from `@midnight-ntwrk/midnight-js-protocol/transaction`) and
   refuses an object at another stage with `InvalidTransactionHandleError`
   (`MIDNIGHT_JS_PR_INVALID_TRANSACTION_HANDLE`, reason `stage-mismatch`). That costs one
   `serialize()` per `seal`. The stage is also a compile-time property of the handle type. Each
   provider method and each `contracts` entry point checks the handle it receives with
   `LedgerTransaction.require(value, stage, method)`, which refuses a handle at another stage
   (reason `wrong-stage`) and a value that is not a handle of this copy of `types` (reason
   `not-a-handle`); that message names a copied handle and a duplicate `midnight-js-types` install
   as the likely causes.
7. **Layer rule.** `protocol` sits below `types` and cannot know the handle, so it speaks raw ledger
   objects. Every package from `types` upward speaks only handles in its public API: the three
   provider methods, every `contracts` function and result that takes or returns a transaction
   (`submitTx`, `createUnproven*Tx`, `.private.unprovenTx`, `Ledger8.CallResultPrivate.unprovenTx`),
   the finalized-transaction records of the read side, `utils.deserializeLedgerTransaction` and
   `indexer-public-data-provider.parseHexTransaction`. The one exception is the per-era handler
   types, which take and return raw objects of their own era by design.
8. **The providers are built from one handler per era, keyed by `LedgerVersion`.**
   `createProofProviderFromHandlers({ v8, v9 })`, and the same for the wallet and midnight
   providers; `undefined` for an era not served. The `currentEra` / `retainedEras` split is gone,
   because the shape no longer depends on which era is current. A handler for one era receives that
   era's ledger object; the factory unwraps the handle for it and, for `proveTx` and `balanceTx`,
   seals the answer in the same era, naming the method in a refusal. `submitTx` answers with a
   `TransactionId`, which is passed through. A provider with no handler at all is refused when it is built
   (`InvalidArgumentError`). Adding an era to `LEDGER_VERSIONS` without a handler key is a compile
   error.
9. **The generic `E` dispatch signature must be kept.** The factories route through a function
   generic in `E extends LedgerVersion`, with mapped types indexed by `E`, so the call to the
   handler is checked against era `E`'s ledger types without an `as` cast. Replacing it with a
   `switch` over the era, or widening `E` to the union, needs a cast and loses that check.
10. **A handler's answer is checked at run time.** The types do not tie a handler's answer to era
    `E` without a cast, so `seal` checks it: an object of another ledger copy, a value that is not
    a transaction, and an object at another stage are refused. For the
    same reason `contracts` checks every provider's answer: a handle in the other era is refused
    with `EraInvariantViolationError`, at the wrong stage with `InvalidTransactionHandleError`.
11. **The read side keeps its `version` tag.** `VersionedFinalizedTxData` stays a
    `version`-discriminated union, because `contracts` narrows its result types on it. Only its
    `tx` changes, to a finalized handle of the variant's own era (`LedgerTransaction<'Finalized',
    'v9'>` and `<'Finalized', 'v8'>`, both a `FinalizedTx`), so `record.tx.era === record.version`
    holds in the types and narrowing on `version` narrows `tx.era`. `contracts` also checks it at
    run time, for a provider outside the type system. Read it with
    `LedgerTransaction.unwrap(record.tx, record.version)`. Contract states and public states are not
    transactions and stay as ADR 0006 left them.
    *Amended by [ADR-0020](./0020-carry-on-chain-state-as-bytes-decoded-by-the-callers-runtime.md):
    the record is now `FinalizedTxRead` and its tag is `era`.*
12. **A decode failure at a boundary is the caller's error.** `deserializeTransactionAtStage`
    refuses bytes that are not a transaction of the requested era and stage with
    `PayloadNotATransactionError` (`MIDNIGHT_JS_P_PAYLOAD_NOT_A_TRANSACTION`, category USAGE),
    including bytes that carry the tag but do not decode (`undecodable`, with the runtime's refusal
    on `cause`). It is raised where composed or wallet bytes become a handle: `contracts` reading a
    composed transaction (`sealComposed`), the DApp Connector wallet provider reading the wallet's
    answer, and the testkit wallet reading wallet-sdk's answer. The read side does not use it:
    `utils.deserializeLedgerTransaction(era, bytes, ctx)`, which the indexer uses for both eras,
    reads the bytes directly and fails with `DeserializationError`, as before. When a coded error
    reaches `contracts` through a provider, `ProviderFailedError` keeps its `code` on the sanitized
    `cause`.

Out of scope: wallet-sdk's JSON wire envelope (`{ wireFormat, protocolVersion, stage, transaction }`)
for crossing a process boundary. No provider in the framework uses it today; it is #1543.

## Consequences

- **Positive:** a transaction has one shape in every era, so the next fork changes no handle type
  and no handler signature. The stage is in the type, so an unproven transaction cannot reach
  `submitTx`. A duplicate ledger install fails at `seal` with a coded error that names the cause,
  instead of corrupting a WASM call. Every provider has one handler shape, and the testkit's wallet
  provider is now built from handlers too, instead of being the exception ADR 0014 point 6
  allowed.
- **Negative:** every `types`-and-up signature that carried a transaction changed, before 5.0.0
  final: `ProofProvider`, `WalletProvider`, `MidnightProvider`, the `contracts` builders and
  results, the read records, and two deserializers. A provider that talks to another ledger copy
  pays a serialize and a deserialize per call (about 1.8 ms). Reading a ledger 8 transaction record
  loads the ledger 8 runtime, also in a session that otherwise uses only ledger 9, because the
  handle holds a live object; a handle that decodes lazily would avoid it and was not chosen (see
  #1525). A v8 transaction cannot be sealed before `loadLedger8Protocol()` has resolved.
- **Follow-ups:** the wire envelope (#1543). The ledger 8 contract-state decode helpers (#1525),
  which no longer include a transaction decoder: bytes of a transaction are read with
  `deserializeTransactionAtStage` in both eras.

## Alternatives considered

**Reuse wallet-sdk's `WalletTransaction`.** Rejected, for the reasons in the Decision: the era
stamp is a `protocolVersion` integer, the central types would follow wallet-sdk's releases, errors
are returned rather than thrown with a code, and there is no WASM-instance check.

**Live objects everywhere, with no guard.** Rejected. A framework v8 object handed to wallet-sdk's
v8 copy is refused as an argument and reads the wrong memory as a receiver, and the compiler cannot
see the difference.

**Bytes everywhere.** Rejected. Every reader would decode, and a decode needs the era and the stage
from somewhere: the bytes alone cannot say which decoder to use. A live object behind a guard gives
the same safety with no decode on the common path, and bytes are still used where they are needed,
at a boundary to another ledger copy.

**Keep the `version`-tagged record and only make the v9 variant generic.** Rejected. It keeps the
shape change at every fork and the two handler shapes, which are the costs this ADR exists to
remove.

## Amendment — contract states and public states become bytes (2026-10-28)

Issue #1550, recorded in [ADR-0020](./0020-carry-on-chain-state-as-bytes-decoded-by-the-callers-runtime.md).
The last sentence of point 11 ("Contract states and public states are not transactions and stay as
ADR 0006 left them") no longer holds. They are now a `LedgerState`: bytes and the era of the
ledger that wrote them, decoded by the caller's own runtime. Transactions are unchanged: a
`LedgerTransaction` still holds a live object. The #1525 follow-up is closed by ADR 0020: a v8
state is decoded with `ContractState` from a ledger 8 `compact-runtime` (0.16).
