[**Midnight.js API Reference v5.0.0-rc.5**](../../../../../README.md)

***

[Midnight.js API Reference](../../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../../README.md) / [contracts](../../README.md) / Ledger8

# Ledger8

The refusals the RETAINED era raises, under one name.

The barrel re-exports this module as `Ledger8`, so a caller writes
`Ledger8.CallTxFailedError`. The era prefix is dropped inside, because the namespace already
carries it -- so a declaration this reference calls `Ledger8X` is the member published as
`Ledger8.X`.

Only error classes live here. The retained era's types are flat `Ledger8*` exports: the entry
points return them by their declared names, and a type reachable only through a namespace cannot
be named in a dApp's declaration emit (TS4023). An error class reaches a consumer only through
the consumer's own `Ledger8.X`, which the compiler can always print back.

## See

[RetainedEraNamespace](../../../documents/RetainedEraNamespace.md) for what qualifies, what stays flat, and
     how the surface is withdrawn.

## Classes

- [AmbiguousEntryPointError](classes/AmbiguousEntryPointError.md)
- [ArtifactOnLedger9StateError](classes/ArtifactOnLedger9StateError.md)
- [CallTxFailedError](classes/CallTxFailedError.md)
- [ContractStateUnsupportedError](classes/ContractStateUnsupportedError.md)
- [DeployNotStoredError](classes/DeployNotStoredError.md)
- [DeployOnLedger9Error](classes/DeployOnLedger9Error.md)
- [DeployTxFailedError](classes/DeployTxFailedError.md)
- [DeployUnconfirmedError](classes/DeployUnconfirmedError.md)
- [InsertVerifierKeyTxFailedError](classes/InsertVerifierKeyTxFailedError.md)
- [MaintenanceOnLedger9Error](classes/MaintenanceOnLedger9Error.md)
- [RecipientUnmappableError](classes/RecipientUnmappableError.md)
- [RemoveVerifierKeyTxFailedError](classes/RemoveVerifierKeyTxFailedError.md)
- [ReplaceAuthorityUnconfirmedError](classes/ReplaceAuthorityUnconfirmedError.md)
- [ReplaceMaintenanceAuthorityTxFailedError](classes/ReplaceMaintenanceAuthorityTxFailedError.md)
- [ShieldedSpendUnsupportedError](classes/ShieldedSpendUnsupportedError.md)
- [SigningKeyNotStoredError](classes/SigningKeyNotStoredError.md)
- [SigningKeyUnavailableError](classes/SigningKeyUnavailableError.md)
- [SigningKeyUnusableError](classes/SigningKeyUnusableError.md)
