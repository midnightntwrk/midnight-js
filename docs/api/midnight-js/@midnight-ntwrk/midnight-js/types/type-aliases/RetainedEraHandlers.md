[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / RetainedEraHandlers

# Type Alias: RetainedEraHandlers\<H\>

> **RetainedEraHandlers**\<`H`\> = `Partial`\<`Readonly`\<`Record`\<`RetainedLedgerVersion`, `H`\>\>\>

The handlers a provider registers for the eras that cross its seam as
serialized bytes — one optional entry per RetainedLedgerVersion.

The current era is EXCLUDED from the key set on purpose, and that exclusion
is the point of the type: the current era crosses the seam as a live ledger
object, never as bytes, so a handler registered against it would have the
wrong signature and serve a request that can never arrive. Registering one is
a build failure rather than a comment asking implementers not to.

The exclusion is derived from `CURRENT_LEDGER_VERSION`, so when the network
moves on and today's current era becomes a retained one, it becomes
registrable here on its own — no change to this type, and no change to any
provider that already declines to register it.

## Type Parameters

### H

`H`

The handler signature for one retained era at this seam.
