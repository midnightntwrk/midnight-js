# 0006. Carry the ledger era as data derived from what was observed

- Status: Accepted
- Date: 2026-08-28
- Related: [ADR 0007](./0007-never-latch-the-network-head-version.md), [ADR 0014](./0014-build-provider-seams-from-per-era-handlers.md), [ADR 0017](./0017-error-codes-are-the-contract.md), [ADR 0020](./0020-carry-on-chain-state-as-bytes-decoded-by-the-callers-runtime.md), [ADR 0024](./0024-hold-transactions-as-bytes-decoded-by-the-callers-ledger.md)

## Context

Across the ledger fork midnight-js handles values of two ledger eras, v8 and v9. The two ledger
builds are separate WASM instances. They expose the same method names, so duck-typing cannot tell
their objects apart, and `instanceof` does not hold across them. A raw `Uint8Array` says nothing
about which ledger wrote it.

So every value whose meaning depends on the era must say which era it belongs to. That statement
is only worth something if it is true. A label that a component writes by hand can disagree with
the bytes beside it, and a caller who narrows on a wrong label is actively misled.

## Decision

The era is data on the value, and it is derived from what was observed, never asserted.

- Every era-dependent value carries `era: LedgerEra` (`'v8' | 'v9'`, from
  `@midnight-ntwrk/midnight-js-protocol`). This holds for transaction handles (`LedgerTransaction`),
  for state (`SerializedContractState`, `SerializedLedgerParameters`, `SerializedZswapChainState`),
  for read records (`FinalizedTxRead`) and for `contracts` results.
- The era comes from observed data:
  - a state's era is read from the version tag at the start of its bytes;
  - a finalized-transaction record's era comes from the record's own `protocolVersion`
    (`versionOfRecord`, mapped by `protocolVersionToLedger`), and the bytes must then carry the
    header that era writes for a finalized transaction;
  - a `protocolVersion` that maps to no era is refused (`UnknownProtocolVersionError`, re-reported
    by the indexer provider as `UnknownRecordEraError`), never labelled with a default.
- A component never stamps an era literal on a value it did not observe. If the era it derives is
  one it cannot handle, it throws rather than mislabelling the value.
- Code that handles the eras differently narrows with `switch (x.era)` and closes the switch with
  `assertNever(x, '<call site>')` from `@midnight-ntwrk/midnight-js-utils`. While the switch is
  exhaustive, `x` is `never` in the `default` branch and the call compiles. When an era is added,
  every such switch stops compiling.
- `assertNever(value: never, context: string): never` has these properties:
  - `context` is required. It names the switch, so a runtime throw says where it came from. A
    required parameter is enforced by `tsc`; a documented convention is not.
  - It throws the coded `UnhandledUnionMemberError` (`MIDNIGHT_JS_U_UNHANDLED_UNION_MEMBER`), not a
    bare `Error`, so a caller can match it by code like every other framework error.
  - Its message never renders the unhandled value. The members of these unions carry transaction
    bytes and contract state, so rendering the value would copy them into every log that catches
    the error. `context` carries the diagnostic instead.

The framework uses the same `assertNever` in its own era switches (for example in
`createUnprovenDeployTx`).

## Consequences

- An era label is a statement about observed data. A caller can trust it and write one `switch`
  that is correct for both eras.
- Adding an era is a compile error at every `switch` closed by `assertNever`, not a runtime
  surprise.
- A value that reaches a switch from outside the build (decoded JSON, a mismatched dependency)
  fails with a coded error that names the call site and leaks no payload.
- A read against a network this build cannot place fails loudly instead of returning a record
  with a guessed era.
- Every caller must narrow on `era` before using era-specific members, even code that only
  supports v9.

## Alternatives considered

- **Pass bare ledger objects and detect the era by duck-typing.** Rejected: both WASM builds
  expose the same names, and `instanceof` does not work across instances.
- **Tag with a boolean or a number.** Rejected: a string literal reads correctly at the call site,
  matches the `ledger-v8` / `ledger-v9` package names, and extends to a third era without
  re-reading old values.
- **Stamp `'v9'` on read records and resolve the era later.** Rejected: the label could disagree
  with the `protocolVersion` in the same record, which is worse than no label.
- **Make `assertNever`'s context optional, or render the value in the message.** Rejected: an
  optional context gets skipped, and a rendered value leaks payloads into logs.
