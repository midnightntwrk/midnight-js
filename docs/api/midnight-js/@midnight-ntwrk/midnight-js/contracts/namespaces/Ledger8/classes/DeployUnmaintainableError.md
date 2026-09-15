[**Midnight.js API Reference v5.0.0-beta.8**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../../../README.md) / [contracts](../../../README.md) / [Ledger8](../README.md) / DeployUnmaintainableError

# Class: DeployUnmaintainableError

An error indicating that a retained-era deploy was refused because this
pipeline does not set a maintenance authority on the contract it would
create.

A retained constructor leaves behind an EMPTY committee with a threshold of
ONE — a rule set nothing can ever satisfy — so the deployed contract could
never have a verifier key inserted, removed or replaced, by anyone, its
deployer included. `packages/protocol/src/test/v8-deploy.test.ts` pins that
measurement.

The refusal is about the AUTHORITY THIS PIPELINE SETS, not about a limit of
the retained era: the retained runtime exposes `sampleSigningKey`,
`signatureVerifyingKey` and a mutable `ContractState.maintenanceAuthority`,
and an authority written onto the constructor's own state survives into the
composed deploy. Lifting the refusal therefore means threading a signing key
through the retained execution leg in `packages/protocol` — not widening the
era seam, which already carries the serialized state the authority lives in.

Carries no registered error code, deliberately: a code is a published
compatibility commitment, and this condition goes away when the authority is
threaded through. The exported CLASS is what a consumer needs in the
meantime — `instanceof` beats matching on a message that is expected to
change.

## See

[KeepStatePipeline](../../../../documents/KeepStatePipeline.md) for the measurement in full.

## Extends

- `Error`

## Constructors

### Constructor

> **new DeployUnmaintainableError**(): `Ledger8DeployUnmaintainableError`

#### Returns

`Ledger8DeployUnmaintainableError`

#### Overrides

`Error.constructor`
