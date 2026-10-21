[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / assertProvidersSupportEra

# Variable: assertProvidersSupportEra

> `const` **assertProvidersSupportEra**: (`era`, `providers`) => `void`

Refuses an operation whose ledger era is not served by all three transaction
providers, before the operation does any work.

CALL THIS AT THE START OF AN OPERATION. The placement is the point: proving is
the expensive step and it is the first of the three transaction methods.

It does not make the providers safe by itself. A declaration is a claim, so each
provider still narrows its own payload and still reports
`Ledger8PayloadUnsupportedError` when a declaration turns out to be wrong.

Generic in the era, so a further ledger era needs no change here.

## Parameters

### era

[`LedgerVersion`](../../type-aliases/LedgerVersion.md)

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

ProviderEraDeclarations for why the declaration is not trusted, and
why this refusal stays distinct from `Ledger8PayloadUnsupportedError`.
