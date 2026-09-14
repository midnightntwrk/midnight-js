[**Midnight.js API Reference v5.0.0-beta.8**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../../../README.md) / [index](../../../README.md) / [Ledger8](../README.md) / ShieldedSpendUnsupportedError

# Class: ShieldedSpendUnsupportedError

An error indicating that a retained-era call would spend a shielded coin the
contract already holds on chain, which this pipeline structurally cannot
compose.

Building the transaction's Zswap offer for such a spend needs the contract's
Zswap CHAIN state, to locate the coin's commitment in the chain's Merkle tree
— and the retained-era pipeline does not read one. A coin the same call
produced needs no chain state (it is paired with its own output as a
transient), which is why only spends of previously held coins are refused.

Raised BEFORE the offer is built rather than left to fail deeper: without
this the condition surfaced as a bare assertion inside the offer builder,
naming neither the era nor the circuit, which told a caller nothing about
why its call could not be composed.

The fix is to supply the retained arm with a Zswap chain state, which is
tracked separately; until then this refuses in the caller's own test run
rather than in production.

## Extends

- `Error`

## Constructors

### Constructor

> **new ShieldedSpendUnsupportedError**(`circuitId`): `Ledger8ShieldedSpendUnsupportedError`

#### Parameters

##### circuitId

`string`

The circuit whose call was refused.

#### Returns

`Ledger8ShieldedSpendUnsupportedError`

#### Overrides

`Error.constructor`

## Properties

### circuitId

> `readonly` **circuitId**: `string`

The circuit whose call was refused.

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_C_LEDGER8_SHIELDED_SPEND_UNSUPPORTED"` = `CONTRACTS_ERROR_CODES.LEDGER8_SHIELDED_SPEND_UNSUPPORTED`
