[**Midnight.js API Reference v5.0.0-beta.7**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../README.md) / erasServedBy

# Function: erasServedBy()

> **erasServedBy**(`retainedEras?`): readonly (`"v9"` \| `"v8"`)[]

The era list a provider assembled from these arms serves.

Derived from the arms actually supplied rather than written out beside them:
a hand-written list is a second statement of the same fact, and the two drift
the first time an arm is added or removed. The current era is always present
because [RetainedEraHandlers](../type-aliases/RetainedEraHandlers.md) is the only optional half — a provider
with no current-era arm cannot be constructed.

## Parameters

### retainedEras?

`Partial`\<`Readonly`\<`Record`\<`"v8"`, `unknown`\>\>\>

The retained arms supplied to the factory, if any.

## Returns

readonly (`"v9"` \| `"v8"`)[]

The eras this provider declares, frozen so a consumer cannot widen
         the declaration after construction and make
         `assertSeamsSupportEra` pass for an era the arms do not serve.
