# 0022. Name the ledger era "era" in the public API

- Status: Accepted
- Date: 2026-11-03
- Deciders: Szymon Paluchowski
- Related: #1506, #1489, #1494, ADR 0018

## Context

After #1494 the public API named the ledger era in two ways. The type was
`LedgerVersion`, with `LEDGER_VERSIONS`, `CURRENT_LEDGER_VERSION` and
`UnknownLedgerVersionError` around it. The fields and functions that use it said
"era": `era`, `supportedEras`, `loadLedgerEra`, ADR 0014's "one handler per era".

"Version" also already means other things here: the node version
(`BlockInfo.protocolVersion`), and the object schema version `[vN]` inside a
serialized tag.

compact-js (`@midnight-ntwrk/compact-js` 3.0.0-rc) says "era" too. Its
`Ledger.Era` describes facts about an era. Our `LedgerEra` was an object with
methods bound to one era. Both names are reachable from one package:
`@midnight-ntwrk/midnight-js-protocol` exports `LedgerEra` from its root, and its
`./v9/compact-js/effect` subpath re-exports compact-js's `Ledger` namespace.

These names exist only in 5.0.0 pre-releases. Renaming them is cheap
before 5.0.0 final and needs 6.0.0 after it.

## Decision

We will use the word "era" for the ledger era in the public API. The values stay
`'v8' | 'v9'`: they match the payload tags and the package names `ledger-v8` /
`ledger-v9`.

- The object `loadLedgerEra` returns is `LedgerEraFacade`. It hides one era's
  ledger package behind methods that take plain data only. There is one facade
  per era, with the same interface for both.
- The era value type is `LedgerEra`, with `CurrentLedgerEra`,
  `RetainedLedgerEra`, `LEDGER_ERAS`, `CURRENT_LEDGER_ERA`,
  `RETAINED_LEDGER_ERAS` and `UnknownLedgerEraError`
  (`MIDNIGHT_JS_P_UNKNOWN_LEDGER_ERA`).
- `LedgerEra` and compact-js `Ledger.Era` now describe the same concept in two
  shapes. compact-js's `Ledger.Era['ledger']` is `8` for `'v8'` and `9` for
  `'v9'`. We add no helper for that mapping: no midnight-js API needs the number.

These stay unchanged, as a separate decision: fields named `version`
(including `requestedVersion`), the `Versioned*` types, and the functions
`latestNetworkLedgerVersion`, `ledgerVersionOf*`, `versionOfRecord` and
`protocolVersionToLedger`.

## Consequences

- **Positive:** one word for one concept. "Version" is left for the node
  version and the schema version.
- **Negative:** `LedgerEra` changed meaning between pre-releases. Code
  written against an earlier 5.0.0 pre-release fails with
  `Property 'extractState' does not exist on type '"v8" | "v9"'` instead of
  "cannot find name". The error code string changed too, and a string
  comparison breaks without a type error. `breaking-changes.md` section 29
  says both.
- **Follow-ups:** decide separately whether the `version` fields and the
  function names that still say "version" follow.

## Alternatives considered

- **Keep `LedgerVersion`.** Rejected: the rest of the API already says "era".
- **Numbers `8 | 9`, as compact-js does.** Rejected: the provider payload tags
  and the package names use `'v8' | 'v9'`, and compact-js exports no named
  type for the number (only `Ledger.Era['ledger']`).
- **`...Codec`, `...Binding`, `...StateReader` or `...Engine` for the facade.**
  Rejected: a codec only encodes; compact-js uses "binding" for its per-era
  module; the object also composes transactions; `Ledger8Engine` is a
  different object.
