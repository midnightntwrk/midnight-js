[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / IncompleteDeployContractPrivateStateConfig

# Class: IncompleteDeployContractPrivateStateConfig

An error indicating that a contract deploy named only one half of the private-state pairing:
an initial private state with no private state ID to store it under, or a private state ID with
no initial private state to store. The message names the missing half.

Raised by `deployContract` (both eras) and `submitDeployTx`, before any provider is touched.
It stays on the flat surface rather than under the `Ledger8` namespace because it is the deploy
member of the three-refusal family `IncompleteCallTxPrivateStateConfig` and
[IncompleteFindContractPrivateStateConfig](IncompleteFindContractPrivateStateConfig.md) belong to — one client-side rule per entry
point, and client-side storage is era-independent.

## Extends

- [`MidnightJsError`](../../../midnight-js/classes/MidnightJsError.md)

## Constructors

### Constructor

> **new IncompleteDeployContractPrivateStateConfig**(`missing?`): `IncompleteDeployContractPrivateStateConfig`

#### Parameters

##### missing?

`"privateStateId"` \| `"initialPrivateState"`

#### Returns

`IncompleteDeployContractPrivateStateConfig`

#### Overrides

[`MidnightJsError`](../../../midnight-js/classes/MidnightJsError.md).[`constructor`](../../../midnight-js/classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../../midnight-js/type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../../midnight-js/classes/MidnightJsError.md).[`category`](../../../midnight-js/classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_C_INCOMPLETE_DEPLOY_PRIVATE_STATE_CONFIG"` = `CONTRACTS_ERROR_CODES.INCOMPLETE_DEPLOY_PRIVATE_STATE_CONFIG`

#### Overrides

[`MidnightJsError`](../../../midnight-js/classes/MidnightJsError.md).[`code`](../../../midnight-js/classes/MidnightJsError.md#code)
