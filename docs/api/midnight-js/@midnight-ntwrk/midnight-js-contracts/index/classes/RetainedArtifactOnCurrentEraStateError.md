[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / RetainedArtifactOnCurrentEraStateError

# Class: RetainedArtifactOnCurrentEraStateError

An error indicating that the contract at this address is held on chain in a CURRENT-era state,
while the artifacts handed to this operation came from the retained Compact toolchain.

The retained era stays supported for a contract whose state the retained ledger wrote, and it
stays supported after that state has been MIGRATED: a contract's first post-fork call rewrites
its envelope to the current era, and the ledger carries the retained verifier keys across
unchanged. So a current-era envelope on its own says nothing about which toolchain built the
contract, and this error is not raised for one.

What raises it is the pair: a current-era envelope AND a key these artifacts cannot match. A
migrated pre-fork contract still declares the keys the retained toolchain produced, so it does not
reach here; a contract deployed with current-toolchain artifacts declares keys no retained
artifact can match, and that is the case named here.

Distinct from the era disagreements either side of it: nothing here is stale or inconsistent, and
a retry cannot change it. What has to change is which artifacts the caller passes.

## Extends

- [`MidnightJsError`](../../../midnight-js/classes/MidnightJsError.md)

## Constructors

### Constructor

> **new RetainedArtifactOnCurrentEraStateError**(`contractAddress`, `options?`): `RetainedArtifactOnCurrentEraStateError`

#### Parameters

##### contractAddress

`string`

The contract whose on-chain state was read.

##### options?

`ErrorOptions`

Carries the key-mismatch this refusal re-reports on `cause`, so the byte-level
diagnosis is not lost behind the era-level one.

#### Returns

`RetainedArtifactOnCurrentEraStateError`

#### Overrides

[`MidnightJsError`](../../../midnight-js/classes/MidnightJsError.md).[`constructor`](../../../midnight-js/classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../../midnight-js/type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../../midnight-js/classes/MidnightJsError.md).[`category`](../../../midnight-js/classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_C_RETAINED_ARTIFACT_ON_CURRENT_ERA_STATE"` = `CONTRACTS_ERROR_CODES.RETAINED_ARTIFACT_ON_CURRENT_ERA_STATE`

#### Overrides

[`MidnightJsError`](../../../midnight-js/classes/MidnightJsError.md).[`code`](../../../midnight-js/classes/MidnightJsError.md#code)

***

### contractAddress

> `readonly` **contractAddress**: `string`

The contract whose on-chain state was read.
