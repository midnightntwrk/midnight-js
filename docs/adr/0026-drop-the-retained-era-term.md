# 0026. Drop the "retained era" term and name the older ledger by its number

- Status: Accepted
- Date: 2026-11-16
- Related: [ADR 0018](./0018-name-single-ledger-code-after-its-ledger.md),
  [ADR 0022](./0022-name-the-ledger-era-era-in-the-public-api.md)

## Context

"Retained era" meant every ledger era older than the last hard fork that this build still serves.
Today that is only ledger 8. ADR 0018 already names code bound to one ledger after that ledger
(`Ledger8*`), and ADR 0022 published the term as `RetainedLedgerEra` and `RETAINED_LEDGER_ERAS` from
`@midnight-ntwrk/midnight-js-protocol/version`.

Nothing in the framework uses those two exports. Every place that says "retained" in code, tests,
comments and documentation means ledger 8, because ledger 8 is the only older era. So the term is a
second name for "ledger 8", and the reader has to translate it. Like "current", it is relative to
the last fork: after the next fork the same word would describe a different set of ledgers.

## Decision

We remove the term "retained era".

- `RetainedLedgerEra` and `RETAINED_LEDGER_ERAS` are removed from
  `@midnight-ntwrk/midnight-js-protocol/version`. A consumer that needs the set of older eras derives
  it: `Exclude<LedgerEra, CurrentLedgerEra>`, or
  `LEDGER_ERAS.filter((era) => era !== CURRENT_LEDGER_ERA)`.
- Code, tests, comments and documentation that mean ledger 8 say "ledger 8". Internal names use the
  `ledger8` / `Ledger8` / `LEDGER8` spelling.
- `CurrentLedgerEra` and `CURRENT_LEDGER_ERA` stay: the framework uses them.

## Consequences

- **Positive:** one name for ledger 8. A reader no longer has to map "retained" to a ledger.
- **Negative:** a consumer importing either removed export breaks at compile time and has to derive
  the set as shown above.
- **Negative:** when a later fork leaves more than one older era, code that serves all of them names
  each ledger or uses the derived set; there is no shared word for the group.

## Alternatives considered

- **Keep the two exports as `@deprecated` until the next major release.** Rejected: version 5.0.0 was
  released days before this decision, and no known consumer uses them.
- **Keep the term for era-generic code only, as ADR 0018 allowed.** Rejected: the only era-generic
  users were the two unused exports; everywhere else the word meant ledger 8.
