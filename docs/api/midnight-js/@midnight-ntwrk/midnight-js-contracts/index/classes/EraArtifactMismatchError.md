[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / EraArtifactMismatchError

# Class: EraArtifactMismatchError

An error indicating that the contract handed to an entry point does not belong to the era the
operation can execute — or to either era.

Raised before any pipeline is entered, so no proving, no provider round trip and no state decode
happens on a request that cannot succeed.

## See

[EraDispatch](../../documents/EraDispatch.md) for how the era is established and which pairings are refused.

## Extends

- [`MidnightJsError`](../../../midnight-js/classes/MidnightJsError.md)

## Constructors

### Constructor

> **new EraArtifactMismatchError**(`reason`, `options?`): `EraArtifactMismatchError`

#### Parameters

##### reason

[`EraArtifactMismatchReason`](../type-aliases/EraArtifactMismatchReason.md)

Which era mismatch this is. Also the discriminant a caller branches on, so it is
              retained on the error rather than only rendered.

##### options?

[`EraArtifactMismatchOptions`](../interfaces/EraArtifactMismatchOptions.md)

Carries the originating failure on `cause` -- a provider that could not serve the
               artifact description reports WHY there -- and an optional `detail` naming the
               value that was seen.

#### Returns

`EraArtifactMismatchError`

#### Overrides

[`MidnightJsError`](../../../midnight-js/classes/MidnightJsError.md).[`constructor`](../../../midnight-js/classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../../midnight-js/type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../../midnight-js/classes/MidnightJsError.md).[`category`](../../../midnight-js/classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_C_ERA_ARTIFACT_MISMATCH"` = `CONTRACTS_ERROR_CODES.ERA_ARTIFACT_MISMATCH`

#### Overrides

[`MidnightJsError`](../../../midnight-js/classes/MidnightJsError.md).[`code`](../../../midnight-js/classes/MidnightJsError.md#code)

***

### reason

> `readonly` **reason**: [`EraArtifactMismatchReason`](../type-aliases/EraArtifactMismatchReason.md)

Which era mismatch this is. Also the discriminant a caller branches on, so it is
              retained on the error rather than only rendered.
