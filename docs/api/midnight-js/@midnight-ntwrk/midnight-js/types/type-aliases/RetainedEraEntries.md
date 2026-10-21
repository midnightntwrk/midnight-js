[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / RetainedEraEntries

# Type Alias: RetainedEraEntries\<H\>

> **RetainedEraEntries**\<`H`\> = `Partial`\<`Readonly`\<`Record`\<`RetainedLedgerVersion`, `H`\>\>\>

The entries a provider registers for the eras that reach it as
serialized bytes — one optional entry per RetainedLedgerVersion. An
entry is a handler function in the `create*FromHandlers` factories and a
`ProvingProvider` in `ProvingProvidersByEra`.

The current era is EXCLUDED from the key set on purpose, and that exclusion
is the point of the type: a current-era transaction is passed to the provider as a live ledger
object, never as bytes, so an entry registered against it would have the
wrong signature and serve a request that can never arrive. Registering one is
a build failure rather than a comment asking implementers not to.

The exclusion is derived from `CURRENT_LEDGER_VERSION`, so when the network
moves on and today's current era becomes a retained one, it becomes
registrable here on its own — no change to this type, and no change to any
provider that already declines to register it.

## Type Parameters

### H

`H`

The entry type for one retained era.
