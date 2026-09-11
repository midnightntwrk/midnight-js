[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / verifyContractState

# Variable: verifyContractState

> `const` **verifyContractState**: (`verifierKeys`, `contractState`, `contractAddress?`) => `void`

Checks that the given `contractState` contains the given `verifierKeys`.

A circuit fails the check when the state registers no operation for it, when the registered
operation carries no verifier key at all, or when the deployed key differs from the local one.
The three are reported separately on the thrown error, because only the last one means the local
artifacts are at fault.

## Parameters

### verifierKeys

\[[`AnyProvableCircuitId`](../../types/type-aliases/AnyProvableCircuitId.md), [`VerifierKey`](../../types/type-aliases/VerifierKey.md)\][]

The verifier keys the client has for the deployed contract we're checking.

### contractState

[`ContractState`](https://github.com/midnightntwrk/midnight-ledger)

The (typically already deployed) contract state containing verifier keys.

### contractAddress?

[`ContractAddress`](https://github.com/midnightntwrk/midnight-ledger)

The address `contractState` was read from, used to identify the contract
                       in the thrown error.

## Returns

`void`

## Throws

ContractTypeError When any circuit is missing from `contractState`, has no deployed
                          verifier key, or has a key differing from the local one.
