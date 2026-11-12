# 0022. Name the ledger era "era" in the public API

- Status: Accepted
- Date: 2026-11-03
- Related: [ADR 0014](./0014-build-provider-seams-from-per-era-handlers.md),
  [ADR 0018](./0018-name-single-ledger-code-after-its-ledger.md)

## Context

The public API needs one word for "which ledger wrote this": `'v8'` or `'v9'`. The fields and
functions that carry it already say "era": `era`, `supportedEras`, `loadLedgerEra`, handlers keyed
by era (ADR 0014).

"Version" already means other things here: the node version (`protocolVersion` on a record or
block), and the object schema version `[vN]` inside a serialized tag. Using it for the ledger era
too would give one word three meanings.

compact-js (`@midnight-ntwrk/compact-js` 3.0.0) also says "era": its `Ledger.Era` describes the
facts of one era. `@midnight-ntwrk/midnight-js-protocol` re-exports compact-js's `Ledger` namespace
from its `./v9/compact-js/effect` subpath, so our names must fit beside it.

## Decision

We use the word "era" for the ledger era in the public API. The values are `'v8' | 'v9'`. They
match the transaction handle's `era` and the package names `ledger-v8` / `ledger-v9`.

- The era value type is `LedgerEra`, with `CurrentLedgerEra`, `RetainedLedgerEra`, `LEDGER_ERAS`,
  `CURRENT_LEDGER_ERA` and `RETAINED_LEDGER_ERAS` (from `@midnight-ntwrk/midnight-js-protocol/version`),
  and `UnknownLedgerEraError` (`MIDNIGHT_JS_P_UNKNOWN_LEDGER_ERA`) for a value that is not an era.
- The object `loadLedgerEra` returns is `LedgerEraFacade`. It hides one era's ledger package
  behind methods that trade only plain data (ADR 0010). There is one facade per era, with the same
  interface for both.
- `LedgerEra` and compact-js `Ledger.Era` describe the same concept in two shapes. compact-js's
  era carries the ledger major as a number (`8`, `9`). We add no helper for that mapping: no
  midnight-js API needs the number.

These names still say "version", and stay as they are:

- the `version` field holding a `LedgerEra` on `LedgerEraFacade` and on the era-aware errors in
  `protocol`;
- `requestedVersion` on `UnknownLedgerEraError`, the value that was refused;
- in `@midnight-ntwrk/midnight-js-protocol/version`: `VersionedRecord` (any record with a
  `protocolVersion`), `protocolVersionToLedger`, `versionOfRecord` and
  `latestNetworkLedgerVersion`. These read the node's protocol version and map it to a
  `LedgerEra`, so "version" names their input;
- in `utils`: `ledgerVersionOfContractState` and `ledgerVersionOfLedgerParameters`, which read
  the era from serialized bytes.

## Consequences

- The ledger era has one word. "Version" is left for the node version and the schema version.
- The names in the list above still mix the two words. A reader must know that a `version` field
  of type `LedgerEra` is an era. Whether those names follow is a separate decision.

## Alternatives considered

- **`LedgerVersion`.** Rejected: the rest of the API already says "era", and "version" is taken.
- **Numbers `8 | 9`, as compact-js does.** Rejected: the transaction handle and the package names
  use `'v8' | 'v9'`.
- **`...Codec`, `...Binding`, `...StateReader` or `...Engine` for the facade.** Rejected: a codec
  only encodes; compact-js uses "binding" for its per-era module; the object also composes
  transactions; and `Ledger8Engine` is a different object.
