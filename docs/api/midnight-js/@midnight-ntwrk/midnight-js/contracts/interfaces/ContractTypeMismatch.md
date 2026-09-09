[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / ContractTypeMismatch

# Interface: ContractTypeMismatch

Defined in: packages/contracts/dist/index.d.ts:1043

The ways in which a circuit the client holds a verifier key for can fail to line up with the
contract state deployed on chain. Each circuit falls into exactly one of these.

## Properties

### keyless

> `readonly` **keyless**: `string`[]

Defined in: packages/contracts/dist/index.d.ts:1051

Circuits whose operation is registered on the deployed state but carries no verifier key.

***

### mismatched

> `readonly` **mismatched**: `string`[]

Defined in: packages/contracts/dist/index.d.ts:1055

Circuits whose deployed verifier key differs from the one the client holds.

***

### missing

> `readonly` **missing**: `string`[]

Defined in: packages/contracts/dist/index.d.ts:1047

Circuits for which the deployed state registers no operation at all.
