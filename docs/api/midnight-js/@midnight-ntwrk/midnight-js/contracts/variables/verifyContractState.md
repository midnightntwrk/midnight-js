[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / verifyContractState

# Variable: verifyContractState

> `const` **verifyContractState**: (`verifierKeys`, `contractState`) => `void`

Defined in: packages/contracts/dist/index.d.ts:862

Checks that the given `contractState` contains the given `verifierKeys`.

## Parameters

### verifierKeys

\[[`AnyProvableCircuitId`](../../types/type-aliases/AnyProvableCircuitId.md), [`VerifierKey`](../../types/type-aliases/VerifierKey.md)\][]

The verifier keys the client has for the deployed contract we're checking.

### contractState

[`ContractState`](https://github.com/midnightntwrk/midnight-ledger)

The (typically already deployed) contract state containing verifier keys.

## Returns

`void`

## Throws

ContractTypeError When one or more of the local and deployed verifier keys do not match.
