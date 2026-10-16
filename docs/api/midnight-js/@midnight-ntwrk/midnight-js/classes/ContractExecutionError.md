[**Midnight.js API Reference v5.0.0-rc.4**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js](../README.md) / [](../README.md) / ContractExecutionError

# Class: ContractExecutionError

What a retained-era circuit or constructor execution fails with. A Compact `assert` refusal is the usual
cause, but a key or config read failure or a runtime fault can also arrive this way, so `cause` is the
source of truth. A failure that is, or carries on its `cause` chain, a midnight-js coded error is not
wrapped in this class: that coded error surfaces directly.

## Extends

- [`MidnightJsError`](MidnightJsError.md)

## Constructors

### Constructor

> **new ContractExecutionError**(`message`, `options?`): `ContractExecutionError`

#### Parameters

##### message

`string`

##### options?

`ErrorOptions` & `object`

#### Returns

`ContractExecutionError`

#### Overrides

[`MidnightJsError`](MidnightJsError.md).[`constructor`](MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](MidnightJsError.md).[`category`](MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_P_CONTRACT_EXECUTION_FAILED"`

#### Overrides

[`MidnightJsError`](MidnightJsError.md).[`code`](MidnightJsError.md#code)

***

### errors

> `readonly` **errors**: readonly `unknown`[]

Every failure the execution reported, as the original objects, in the order they arrived. Filled by
[ContractExecutionError.fromFailures](#fromfailures); empty when the error was built without a list.

## Methods

### fromFailures()

> `static` **fromFailures**(`failures`): `ContractExecutionError`

Reports every failure of an execution, each with its whole cause chain, separated by `; `.
`cause` is the first coded error found on any failure's chain, or the first failure when none is coded.
`errors` holds every failure as the original object, so no stack is lost.

#### Parameters

##### failures

readonly `unknown`[]

#### Returns

`ContractExecutionError`
