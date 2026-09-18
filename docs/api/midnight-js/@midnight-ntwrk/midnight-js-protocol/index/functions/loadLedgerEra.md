[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / loadLedgerEra

# Function: loadLedgerEra()

> **loadLedgerEra**(`version`): `Promise`\<[`LedgerEra`](../interfaces/LedgerEra.md)\>

Resolves one ledger era to a [LedgerEra](../interfaces/LedgerEra.md) bound to it.

This is the only sanctioned way to reach either era's operations. Pass the
version resolved from a record or from the network head (see
`protocolVersionToLedger` in `../../version.ts`) rather than a string chosen
by hand.

Memoised per era, so the retained pre-fork WASM is instantiated at most once
per process. A FAILED v8 acquisition is not memoised: the next call retries.

## Parameters

### version

`"v8"` \| `"v9"`

The era to resolve.

## Returns

`Promise`\<[`LedgerEra`](../interfaces/LedgerEra.md)\>

The era facade bound to `version`. The same object on every call
for that era, and frozen.

## Throws

UnknownLedgerVersionError — as a rejection — if `version` is not a
member of `LEDGER_VERSIONS`.

## Throws

Ledger8RuntimeMissingError — as a rejection — if the retained
pre-fork runtime cannot be acquired. It propagates unchanged, carrying the
underlying cause.

## See

 - [EraSeam](../../documents/EraSeam.md)
 - [SharedTableDiscipline](../../documents/SharedTableDiscipline.md)
