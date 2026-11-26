# 0026. Drop the "retained era" term and name the older ledger by its number

- Status: Accepted
- Date: 2026-11-16
- Related: [ADR 0018](./0018-name-single-ledger-code-after-its-ledger.md),
  [ADR 0022](./0022-name-the-ledger-era-era-in-the-public-api.md)

## Context

"Retained era" meant every ledger era older than the last hard fork that this build still serves.
Today that is only ledger 8. ADR 0018 already names code bound to one ledger after that ledger
(`Ledger8*`), and ADR 0022 published the term as `RetainedLedgerEra` and `RETAINED_LEDGER_ERAS` from
`@midnightntwrk/midnight-js-protocol/version`.

The framework's own code does not use those two exports; one test did. Every other place that uses
"retained" as an era name in code, tests, comments and documentation means ledger 8, because
ledger 8 is the only older era. So the term is a second name for "ledger 8", and the reader has to
translate it. Like "current", it is relative to the last fork: after the next fork the same word
would describe a different set of ledgers.

The two exports have shipped since 5.0.0, so removing them is a breaking change.

## Decision

We drop the term "retained era".

- `RetainedLedgerEra` and `RETAINED_LEDGER_ERAS` stay in
  `@midnightntwrk/midnight-js-protocol/version` for 5.x, marked `@deprecated`. They are removed in
  the next major release. A consumer that needs the set of older eras derives it:
  `Exclude<LedgerEra, CurrentLedgerEra>`, or
  `LEDGER_ERAS.filter((era): era is Exclude<LedgerEra, CurrentLedgerEra> => era !== CURRENT_LEDGER_ERA)`.
  The framework's own code and tests derive it the same way.
- Code, tests, comments and documentation that mean ledger 8 say "ledger 8", ADRs included. Internal
  names use the `ledger8` / `Ledger8` / `LEDGER8` spelling.
- `CurrentLedgerEra` and `CURRENT_LEDGER_ERA` stay: the framework uses them.
- These keep the word:
  - ADR file names, because code and docs link to them.
  - Text that discusses the word itself, such as ADR 0018's context.
  - The `consumer-e2e/.retained/` directory and comments in CI workflows. The hard fork workflow
    caches that path, so it changes in a CI change, not here.
  - Files pinned byte for byte by a test: the released v5.0.0 migration guide recipe and the
    `private-counter-twin` contract source.

## Consequences

- **Positive:** one name for ledger 8. A reader no longer has to map "retained" to a ledger.
- **Positive:** no breaking change in 5.x. A consumer importing either export gets a deprecation
  warning that shows the replacement.
- **Negative:** the next major release breaks a consumer that still imports either export.
- **Negative:** when a later fork leaves more than one older era, code that serves all of them names
  each ledger or uses the derived set; there is no shared word for the group.

## Alternatives considered

- **Remove the two exports now, in a 6.0.0 release.** Rejected: a major release of every package for
  two constants nothing in the framework uses costs consumers more than the deprecation does.
- **Keep the term for era-generic code only, as ADR 0018 allowed.** Rejected: outside the two
  exports, the only era-generic user was one test; everywhere else the word meant ledger 8.
