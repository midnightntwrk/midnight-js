[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / MaintenanceAuthorityMismatchError

# Class: MaintenanceAuthorityMismatchError

Thrown when a maintenance update cannot be signed so that the ledger accepts
it with the key held for the contract — see
[MaintenanceAuthorityMismatchReason](../type-aliases/MaintenanceAuthorityMismatchReason.md) for the three ways.

Raised BEFORE anything is signed or proven: the ledger would accept the
signature into the transaction and refuse the update only at submission,
after a proof has been paid for.

Renders the contract address and no key material: neither the signing key
nor any verifying key appears in the message.

## Param

**version**

The ledger era the update was being composed on.

## Param

**contractAddress**

The contract whose authority was checked.

## Param

**reason**

Which check refused it.

## See

[RetainedEraExecution](../../documents/RetainedEraExecution.md)

## Extends

- [`MidnightJsError`](MidnightJsError.md)

## Constructors

### Constructor

> **new MaintenanceAuthorityMismatchError**(`version`, `contractAddress`, `reason`): `MaintenanceAuthorityMismatchError`

#### Parameters

##### version

`"v8"` \| `"v9"`

##### contractAddress

`string`

##### reason

[`MaintenanceAuthorityMismatchReason`](../type-aliases/MaintenanceAuthorityMismatchReason.md)

#### Returns

`MaintenanceAuthorityMismatchError`

#### Overrides

[`MidnightJsError`](MidnightJsError.md).[`constructor`](MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](MidnightJsError.md).[`category`](MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_P_MAINTENANCE_AUTHORITY_MISMATCH"` = `PROTOCOL_ERROR_CODES.MAINTENANCE_AUTHORITY_MISMATCH`

#### Overrides

[`MidnightJsError`](MidnightJsError.md).[`code`](MidnightJsError.md#code)

***

### contractAddress

> `readonly` **contractAddress**: `string`

***

### reason

> `readonly` **reason**: [`MaintenanceAuthorityMismatchReason`](../type-aliases/MaintenanceAuthorityMismatchReason.md)

***

### version

> `readonly` **version**: `"v8"` \| `"v9"`
