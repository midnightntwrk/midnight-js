[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../../README.md) / [index](../README.md) / erasServedBy

# Function: erasServedBy()

> **erasServedBy**(`retainedEras?`): readonly (`"v8"` \| `"v9"`)[]

The era list a provider assembled from these entries serves.

Derived from the entries actually supplied rather than written out beside them:
a hand-written list is a second statement of the same fact, and the two drift
the first time an entry is added or removed. The current era is always present
because [RetainedEraEntries](../type-aliases/RetainedEraEntries.md) is the only optional half — a provider
with no current-era entry cannot be constructed.

## Parameters

### retainedEras?

`Partial`\<`Readonly`\<`Record`\<`"v8"`, `unknown`\>\>\>

The retained entries supplied to the factory, if any.

## Returns

readonly (`"v8"` \| `"v9"`)[]

The eras this provider declares, frozen so a consumer cannot widen
         the declaration after construction and make
         `assertProvidersSupportEra` pass for an era the entries do not serve.
