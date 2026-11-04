[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / ContractTypeError

# Class: ContractTypeError

The error that is thrown when there is a contract type mismatch between a given contract type,
and the initial state that is deployed at a given contract address.

## Remarks

This error is typically thrown during calls to [findDeployedContract](../functions/findDeployedContract.md) where the supplied contract
address represents a different type of contract to the contract type given.

The three conditions are reported separately because they call for different responses: a
mismatched key means the local artifacts are wrong, while a keyless slot means the deployed state
itself is incomplete and rebuilding locally cannot help.

## Extends

- [`MidnightJsError`](../../classes/MidnightJsError.md)

## Constructors

### Constructor

> **new ContractTypeError**(`contractState`, `mismatch`, `contractAddress?`): `ContractTypeError`

Initializes a new ContractTypeError.

#### Parameters

##### contractState

[`SerializedContractState`](../../types/classes/SerializedContractState.md)

The deployed contract state that was checked, as bytes, of either era.
  Decode it with your own runtime of `error.contractState.era` to inspect it, for example
  `error.contractState.deserialize({ v9: ContractState })`.

##### mismatch

[`ContractTypeMismatch`](../interfaces/ContractTypeMismatch.md)

The circuits that failed to match, grouped by the condition that applied.

##### contractAddress?

`string`

The address the state was read from, when known.

#### Returns

`ContractTypeError`

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`constructor`](../../classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`category`](../../classes/MidnightJsError.md#category)

***

### circuitIds

> `readonly` **circuitIds**: `string`[]

Every circuit that failed to match, whatever the reason, grouped by condition: missing first,
then keyless, then mismatched.

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_C_CONTRACT_TYPE_MISMATCH"`

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`code`](../../classes/MidnightJsError.md#code)

***

### contractAddress?

> `readonly` `optional` **contractAddress?**: `string`

***

### contractState

> `readonly` **contractState**: [`SerializedContractState`](../../types/classes/SerializedContractState.md)

***

### keylessCircuitIds

> `readonly` **keylessCircuitIds**: `string`[]

The circuits whose deployed operation carries no verifier key.

***

### mismatchedCircuitIds

> `readonly` **mismatchedCircuitIds**: `string`[]

The circuits whose deployed verifier key differs from the local one.

***

### missingCircuitIds

> `readonly` **missingCircuitIds**: `string`[]

The circuits that the deployed state registers no operation for.
