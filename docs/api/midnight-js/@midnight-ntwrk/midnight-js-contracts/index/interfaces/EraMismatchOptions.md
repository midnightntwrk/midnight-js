[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / EraMismatchOptions

# Interface: EraMismatchOptions

Options for [EraMismatchError](../classes/EraMismatchError.md).

## Extends

- `ErrorOptions`

## Properties

### circuitId?

> `readonly` `optional` **circuitId?**: `string`

The circuit the refused call names. Set for `'ledger8-call-in-scope'`.

***

### contractAddress?

> `readonly` `optional` **contractAddress?**: `string`

The contract the refused value belongs to. Set for `'ledger8-artifact-on-ledger9-contract'` and `'ledger8-contract-state-unsupported'`.

***

### detail?

> `readonly` `optional` **detail?**: `string`

A sentence appended to the settled wording for this reason, naming the value that was actually
seen. Kept OUT of the reason's own message so every instance of a reason reads identically up to
the fact that varies.
