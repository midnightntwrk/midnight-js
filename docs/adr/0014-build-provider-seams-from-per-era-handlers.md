# 0014. Build providers from per-era handlers, and declare what they serve

- Status: Accepted
- Date: 2026-09-11
- Related: [ADR 0006](./0006-version-tagged-payloads-at-provider-seams.md),
  [ADR 0017](./0017-error-codes-are-the-contract.md),
  [ADR 0024](./0024-hold-transactions-as-bytes-decoded-by-the-callers-ledger.md)

## Context

A transaction passes through three provider methods in order: `ProofProvider.proveTx`,
`WalletProvider.balanceTx`, `MidnightProvider.submitTx`. Each carries a `LedgerTransaction`
handle of era `'v8'` or `'v9'` (ADR 0024).

Two problems follow from having two eras:

1. **Nobody can ask a provider what it serves.** Without a declaration, the only way to learn that
   a wallet cannot balance a v8 transaction is to send it one. At `balanceTx` that is after the
   proof has been paid for, and proving is the expensive step.
2. **Every multi-era provider writes the same routing by hand.** Read the era, branch, call the
   right path, seal the answer in the same era. Each hand-written copy is a chance to answer in
   the wrong era.

What a provider serves is static per instance. No provider here learns its capability at run
time, so a plain readonly field is enough.

## Decision

### Every provider declares `supportedEras`

`ProofProvider`, `WalletProvider` and `MidnightProvider` each have a required
`readonly supportedEras: readonly LedgerEra[]`. Required, so an implementer learns about it from
the compiler.

### Providers are built from one handler per era

`createProofProviderFromHandlers`, `createWalletProviderFromHandlers` and
`createMidnightProviderFromHandlers` take an object keyed by era, `{ v8, v9 }`
(`ProofProviderHandlers`, `WalletProviderHandlers`, `MidnightProviderHandlers`). Every era key must
be present; `undefined` means the era is not served.

- Each handler receives the handle of its own era. It decodes it with its own ledger copy
  (`tx.deserialize({ v9: Transaction })`) or passes `tx.serialize()` to something that takes
  bytes.
- A transaction answer (`proveTx`, `balanceTx`) may be a transaction object of any ledger copy or
  its bytes. The factory seals it in the request's era at the method's output stage. A handler
  never chooses the era of its answer. `submitTx`'s `TransactionId` passes through.
- A handle of an era with no handler is refused by the method with `ProviderEraUnsupportedError`,
  before any work.
- `supportedEras` is computed from the handlers, never written beside them. A hand-written list is
  a second statement of the same fact and drifts.

The factories check the handlers when the provider is built. An entry that is neither a function
nor `undefined` is refused with `UnusableEraEntryError`. An argument that is not an object, misses
an era key, or serves no era at all is refused with `InvalidArgumentError`. This checks shape only:
a well-formed handler paired with the wrong era still passes.

Implementing an interface directly is still supported. Such a provider writes `supportedEras`
itself and gets no per-handle check for free.

### Shorter routes for common cases

- `createProofProviderFromProvingProviders` takes one `ProvingProvider` per era
  (`ProvingProvidersByEra`: `{ v8, v9, costModel? }`) and builds the handlers itself. It exists for
  an in-process prover that crosses the fork: each era's circuits need their own key material, and
  a node rejects a proof made with the other era's, so one instance per era is required. The
  factory cannot verify the pairing (the v9 `ProvingProvider` shape is a superset of the v8 one),
  but it is one place where the pairing is written down.
- `createLedger9ProofProvider`, `createLedger9WalletProvider` and `createLedger9MidnightProvider`
  lift a v9-only implementation into the interface. They declare `['v9']` and refuse v8. That is an
  accurate report of what they wrap, not a gap.

### The declarations are checked before an operation starts

`assertProvidersSupportEra(era, providers)` (`packages/types/src/era-support.ts`) reads the three
declarations in pipeline order and throws `ProviderEraUnsupportedError`
(`MIDNIGHT_JS_PR_PROVIDER_ERA_UNSUPPORTED`) naming the first method that does not list the era.
`packages/contracts` calls it before the first provider call: in `admitLedger8Runtime`, shared by
`acquireLedger8Runtime` and `acquireLedger8RuntimeForReading`, and in the submit paths of
`submit-tx.ts`. The builders that take initial states or verifier keys read nothing from the
network and skip admission; `submitTx` checks their transaction.

The era checked is the one the transaction will carry. On the retained pipeline that is the
network head's era, not the artifact's: a keep-state call runs a v8 artifact against a post-fork
head and composes a v9 transaction. Checking the artifact's era would refuse every keep-state call
made with an ordinary v9-only wallet.

A declaration that is absent or malformed reads as "serves nothing", never as "serves everything".
A provider built against an older `midnight-js-types`, or written in JavaScript, has never heard of
the field; treating silence as consent would let exactly that provider through.

The read side keeps its own error, `DecoderEraUnsupportedError`
(`MIDNIGHT_JS_PR_DECODER_ERA_UNSUPPORTED`), meaning "this record cannot be decoded". Its remedy is
different (upgrade, or check the indexer), so the two codes stay apart (ADR 0017).

### Retained-era proving

- `proveLedger8Transaction` lives in `protocol` on the leaf subpath
  `@midnight-ntwrk/midnight-js-protocol/prove`, so a proof provider that needs only this function
  does not link the root barrel. The v8 runtime stays behind `loadLedger8Protocol`'s dynamic
  import, so importing the subpath does not load the v8 WASM.
- The cost model comes from the same era's runtime as the transaction:
  `v8.CostModel.initialCostModel()` from the same `loadLedger8Protocol()` result. It is not a
  caller parameter. The retained ledger checks the cost model's class across the WASM boundary and
  rejects the current era's.
- The proof-server envelope is shared across eras. `httpClientProvingProvider` builds every
  `/check` and `/prove` payload with the current era's builders for both eras.
  `packages/protocol/src/test/era-proving-payload-parity.test.ts` pins that both eras' builders
  produce byte-identical payloads for captured real preimages, so a vendor bump that changes either
  framing fails a test instead of failing at the proof server.

## Consequences

- A provider set that cannot carry a transaction end to end is refused before the proof is paid
  for, and the error names the method.
- Multi-era providers (`httpClientProofProvider`, `dappConnectorProofProvider`, the testkit's
  `MidnightWalletProvider`) write no routing of their own, so they cannot answer in the wrong era.
- `supportedEras` is required on three interfaces, so every external implementation and test
  double must add it.
- The declaration is trusted, not verified. A provider that lists an era it cannot serve passes the
  pre-flight check and fails later. A provider built from handlers still refuses an unserved era at
  the method; a directly implemented one may not.
- A new ledger era adds a key to the handler objects and becomes registrable in every factory;
  `assertProvidersSupportEra` needs no change.

## Alternatives considered

- **An optional `supportedEras`, defaulting to the current era.** Rejected: it keeps exactly the
  provider whose capability nobody can establish.
- **An `EVERY_ERA` constant.** Rejected: a provider written before a new era would silently claim
  to serve it.
- **An asynchronous `supportsEra(era)` probe.** Rejected: no provider learns its capability at run
  time, and it would make every fail-fast call site asynchronous.
- **Reusing the read side's decoder error code.** Rejected: a wiring mistake and a decode failure
  have different remedies, and `hasErrorCode` must tell them apart.
- **Checking declarations when a contract is found.** Not done: the find path does not receive the
  write providers, and the operation entries need the check anyway.
