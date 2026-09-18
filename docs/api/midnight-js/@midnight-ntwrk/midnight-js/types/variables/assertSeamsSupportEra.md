[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / assertSeamsSupportEra

# Variable: assertSeamsSupportEra

> `const` **assertSeamsSupportEra**: (`era`, `seams`) => `void`

Refuses an operation whose ledger era is not served by all three transaction
seams, before the operation does any work.

The point is WHERE this runs, not what it tests. Proving is the expensive
step and it is the first of the three, so a wallet that cannot balance a
retained-era transaction otherwise costs a full proving cycle before anything
notices. Called at the start of an operation, the same gap costs one
comparison.

This does not make the seams safe by itself and is not meant to. A
declaration is a claim by an implementation and nothing verifies it, so each
seam still narrows its own payload and still reports
`V8PayloadUnsupportedError` when a declaration turns out to be wrong — see
[SeamEraUnsupportedError](../classes/SeamEraUnsupportedError.md) for why the two errors stay distinct.

Generic in the era, so a further ledger era needs no change here.

## Parameters

### era

[`LedgerVersion`](../../type-aliases/LedgerVersion.md)

The ledger era this operation will run on.

### seams

[`TransactionSeams`](../interfaces/TransactionSeams.md)

The three providers the transaction will pass through.

## Returns

`void`

## Throws

SeamEraUnsupportedError naming the first seam, in pipeline order,
        that does not declare `era`.
