[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../../README.md) / [index](../README.md) / assertProvidersSupportEra

# Function: assertProvidersSupportEra()

> **assertProvidersSupportEra**(`era`, `providers`): `void`

Refuses an operation whose ledger era is not served by all three transaction
providers, before the operation does any work.

CALL THIS AT THE START OF AN OPERATION. The placement is the point: proving is
the expensive step and it is the first of the three transaction methods.

It does not make the providers safe by itself. A declaration is a claim, so a
provider built from per-era handlers still refuses an era it has no handler
for when the handle arrives, before doing any work.

Generic in the era, so a further ledger era needs no change here.

## Parameters

### era

`"v8"` \| `"v9"`

The ledger era this operation will run on.

### providers

[`TransactionProviders`](../interfaces/TransactionProviders.md)

The three providers the transaction will pass through.

## Returns

`void`

## Throws

ProviderEraUnsupportedError naming the first method, in pipeline order,
        that does not declare `era`.

## See

[ProviderEraDeclarations](../../documents/ProviderEraDeclarations.md) for why the declaration is not trusted.
