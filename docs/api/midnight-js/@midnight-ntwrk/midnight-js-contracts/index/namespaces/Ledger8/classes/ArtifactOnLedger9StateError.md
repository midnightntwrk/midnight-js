[**Midnight.js API Reference v5.0.0-rc.5**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../../../README.md) / [index](../../../README.md) / [Ledger8](../README.md) / ArtifactOnLedger9StateError

# Class: ArtifactOnLedger9StateError

An error indicating that the contract at this address is held on chain in a ledger 9 state,
while the artifacts handed to this operation came from the ledger 8 (pre-fork) Compact toolchain.

Ledger 8 artifacts stay supported for a contract whose state ledger 8 wrote, and they stay
supported after that state has been MIGRATED: the fork rewrites its version tag to ledger 9, and the
ledger carries the ledger 8 verifier keys across unchanged. So a ledger 9 version tag on its own says
nothing about which toolchain built the contract, and this error is not raised for one.

What raises it is the pair: a ledger 9 version tag AND a key these artifacts cannot match. A
migrated pre-fork contract still declares the keys the ledger 8 toolchain produced, so it does not
reach here; a contract deployed with ledger 9 toolchain artifacts declares keys no ledger 8
artifact can match, and that is the case named here.

Distinct from the era disagreements either side of it: nothing here is stale or inconsistent, and
a retry cannot change it. What has to change is which artifacts the caller passes.

## Extends

- [`MidnightJsError`](../../../../../midnight-js/classes/MidnightJsError.md)

## Constructors

### Constructor

> **new ArtifactOnLedger9StateError**(`contractAddress`, `options?`): `Ledger8ArtifactOnLedger9StateError`

#### Parameters

##### contractAddress

`string`

The contract whose on-chain state was read.

##### options?

`ErrorOptions`

Carries the key-mismatch this refusal re-reports on `cause`, so the byte-level
diagnosis is not lost behind the era-level one.

#### Returns

`Ledger8ArtifactOnLedger9StateError`

#### Overrides

[`MidnightJsError`](../../../../../midnight-js/classes/MidnightJsError.md).[`constructor`](../../../../../midnight-js/classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../../../../midnight-js/type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../../../../midnight-js/classes/MidnightJsError.md).[`category`](../../../../../midnight-js/classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_C_LEDGER8_ARTIFACT_ON_LEDGER9_STATE"` = `CONTRACTS_ERROR_CODES.LEDGER8_ARTIFACT_ON_LEDGER9_STATE`

#### Overrides

[`MidnightJsError`](../../../../../midnight-js/classes/MidnightJsError.md).[`code`](../../../../../midnight-js/classes/MidnightJsError.md#code)

***

### contractAddress

> `readonly` **contractAddress**: `string`

The contract whose on-chain state was read.
