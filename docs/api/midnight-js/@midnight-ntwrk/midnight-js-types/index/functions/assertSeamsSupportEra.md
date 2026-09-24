[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../../README.md) / [index](../README.md) / assertSeamsSupportEra

# Function: assertSeamsSupportEra()

> **assertSeamsSupportEra**(`era`, `seams`): `void`

Refuses an operation whose ledger era is not served by all three transaction
seams, before the operation does any work.

CALL THIS AT THE START OF AN OPERATION. The placement is the point: proving is
the expensive step and it is the first of the three seams.

It does not make the seams safe by itself. A declaration is a claim, so each
seam still narrows its own payload and still reports
`V8PayloadUnsupportedError` when a declaration turns out to be wrong.

Generic in the era, so a further ledger era needs no change here.

## Parameters

### era

`"v9"` \| `"v8"`

The ledger era this operation will run on.

### seams

[`TransactionSeams`](../interfaces/TransactionSeams.md)

The three providers the transaction will pass through.

## Returns

`void`

## Throws

SeamEraUnsupportedError naming the first seam, in pipeline order,
        that does not declare `era`.

## See

[SeamEraDeclarations](../../documents/SeamEraDeclarations.md) for why the declaration is not trusted, and
why this refusal stays distinct from `V8PayloadUnsupportedError`.
