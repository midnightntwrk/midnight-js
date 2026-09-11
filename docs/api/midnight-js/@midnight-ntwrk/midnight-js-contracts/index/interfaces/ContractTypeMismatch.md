[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / ContractTypeMismatch

# Interface: ContractTypeMismatch

The ways in which a circuit the client holds a verifier key for can fail to line up with the
contract state deployed on chain. Each circuit falls into exactly one of these.

## Properties

### keyless

> `readonly` **keyless**: `string`[]

Circuits whose operation is registered on the deployed state but carries no verifier key.

***

### mismatched

> `readonly` **mismatched**: `string`[]

Circuits whose deployed verifier key differs from the one the client holds.

***

### missing

> `readonly` **missing**: `string`[]

Circuits for which the deployed state registers no operation at all.
