[**Midnight.js API Reference v5.0.0-rc.5**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../../../README.md) / [index](../../../README.md) / [Ledger8](../README.md) / ContractStateUnsupportedError

# Class: ContractStateUnsupportedError

An error indicating that the contract at this address is held on chain in a state the v8 ledger
wrote, while the operation runs only against states the v9 ledger wrote.

The contracts-level counterpart of `Ledger8ValueUnsupportedError` from `midnight-js-utils`, for
the reads this package makes on the caller's behalf: it names the contract and the operation,
because the caller has no `switch` of its own to put the v8 branch in.

## Extends

- [`MidnightJsError`](../../../../../midnight-js/classes/MidnightJsError.md)

## Constructors

### Constructor

> **new ContractStateUnsupportedError**(`contractAddress`, `operation`): `Ledger8ContractStateUnsupportedError`

#### Parameters

##### contractAddress

`string`

The contract whose on-chain state was read.

##### operation

`string`

The operation that handles only v9 states.

#### Returns

`Ledger8ContractStateUnsupportedError`

#### Overrides

[`MidnightJsError`](../../../../../midnight-js/classes/MidnightJsError.md).[`constructor`](../../../../../midnight-js/classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../../../../midnight-js/type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../../../../midnight-js/classes/MidnightJsError.md).[`category`](../../../../../midnight-js/classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_C_LEDGER8_CONTRACT_STATE_UNSUPPORTED"` = `CONTRACTS_ERROR_CODES.LEDGER8_CONTRACT_STATE_UNSUPPORTED`

#### Overrides

[`MidnightJsError`](../../../../../midnight-js/classes/MidnightJsError.md).[`code`](../../../../../midnight-js/classes/MidnightJsError.md#code)

***

### contractAddress

> `readonly` **contractAddress**: `string`

The contract whose on-chain state was read.

***

### operation

> `readonly` **operation**: `string`

The operation that handles only v9 states.
