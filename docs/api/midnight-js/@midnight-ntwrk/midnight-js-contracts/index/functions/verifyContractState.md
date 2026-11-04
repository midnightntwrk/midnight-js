[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / verifyContractState

# Function: verifyContractState()

> **verifyContractState**(`verifierKeys`, `contractState`, `contractAddress?`): `Promise`\<`void`\>

Checks that the given `contractState` contains the given `verifierKeys`.

A circuit fails the check when the state registers no operation for it, when the registered
operation carries no verifier key at all, or when the deployed key differs from the local one.
The three are reported separately on the thrown error, because only the last one means the local
artifacts are at fault.

## Parameters

### verifierKeys

\[`string`, [`VerifierKey`](../../../midnight-js/types/type-aliases/VerifierKey.md)\][]

The verifier keys the client has for the deployed contract we're checking.

### contractState

[`SerializedContractState`](../../../midnight-js/types/classes/SerializedContractState.md)

The (typically already deployed) contract state containing verifier keys, of
                     either ledger era, as a read returns it: pass `read.contractState`. A state
                     written by the v8 ledger loads the ledger 8 runtime to be decoded.

### contractAddress?

`string`

The address `contractState` was read from, used to identify the contract
                       in the thrown error.

## Returns

`Promise`\<`void`\>

## Throws

UnknownLedgerEraError When `contractState` names an era this build does not know.

## Throws

InvalidArgumentError When `contractState` is not a `SerializedContractState`.

## Throws

InvalidSerializedStateError When its bytes are not a contract state of its era, for example
                                    ledger parameters, or a state from another copy of the types
                                    package whose bytes carry another tag.

## Throws

SerializedStateDecodeFailedError, or the framework decoder's coded error, When the bytes
                                    after the tag do not decode.

## Throws

Ledger8RuntimeMissingError When a v8 state is passed and the ledger 8 runtime cannot load.

## Throws

ContractTypeError When any circuit is missing from `contractState`, has no deployed
                          verifier key, or has a key differing from the local one.
