[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / SubmitRejectionUndiagnosedCause

# Type Alias: SubmitRejectionUndiagnosedCause

> **SubmitRejectionUndiagnosedCause** = \{ `headReadFailure`: `unknown`; `reason`: `"head-read-failed"`; \} \| \{ `freshEra`: `LedgerVersion`; `reason`: `"head-moved-backwards"`; \}

Why a submit rejection could NOT be diagnosed as a fork crossing or ruled out
as one.

A discriminated union rather than two error classes, because a caller's
decision is the same for both — do not blindly retry, find out whether the
transaction landed, then look at the read surface — and the reason is what
tells it which of the two happened.

## Union Members

### Type Literal

\{ `headReadFailure`: `unknown`; `reason`: `"head-read-failed"`; \}

The fresh head read itself rejected, so no reading is available to compare.

***

### Type Literal

\{ `freshEra`: `LedgerVersion`; `reason`: `"head-moved-backwards"`; \}

The fresh read reported an EARLIER era than the operation started against.
A ledger era only ever moves forward, so the two readings cannot both
describe one chain.
