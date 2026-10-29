[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / SubmitRejectionUndiagnosedCause

# Type Alias: SubmitRejectionUndiagnosedCause

> **SubmitRejectionUndiagnosedCause** = \{ `networkVersionReadFailure`: `unknown`; `reason`: `"network-version-read-failed"`; \} \| \{ `freshEra`: `LedgerVersion`; `reason`: `"network-version-went-backwards"`; \}

Why a submit rejection could NOT be diagnosed as a fork crossing or ruled out
as one.

A discriminated union rather than two error classes, because a caller's
decision is the same for both — do not blindly retry, find out whether the
transaction landed, then look at the read surface — and the reason is what
tells it which of the two happened.

## Union Members

### Type Literal

\{ `networkVersionReadFailure`: `unknown`; `reason`: `"network-version-read-failed"`; \}

Reading the network's ledger version again itself failed, so no reading is available to compare.

***

### Type Literal

\{ `freshEra`: `LedgerVersion`; `reason`: `"network-version-went-backwards"`; \}

The fresh read reported an EARLIER era than the operation started against.
A ledger era only ever moves forward, so the two readings cannot both
describe one chain.
