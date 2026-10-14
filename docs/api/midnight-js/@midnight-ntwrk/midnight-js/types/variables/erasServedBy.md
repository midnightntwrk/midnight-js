[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / erasServedBy

# Variable: erasServedBy

> `const` **erasServedBy**: (`retainedEras?`) => readonly [`LedgerVersion`](../../type-aliases/LedgerVersion.md)[]

The era list a provider assembled from these handlers serves.

Derived from the handlers actually supplied rather than written out beside them:
a hand-written list is a second statement of the same fact, and the two drift
the first time a handler is added or removed. The current era is always present
because [RetainedEraHandlers](../type-aliases/RetainedEraHandlers.md) is the only optional half — a provider
with no current-era handler cannot be constructed.

## Parameters

### retainedEras?

[`RetainedEraHandlers`](../type-aliases/RetainedEraHandlers.md)\<`unknown`\>

The retained handlers supplied to the factory, if any.

## Returns

readonly [`LedgerVersion`](../../type-aliases/LedgerVersion.md)[]

The eras this provider declares, frozen so a consumer cannot widen
         the declaration after construction and make
         `assertSeamsSupportEra` pass for an era the handlers do not serve.
