[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / unwrapLedger9

# Variable: unwrapLedger9

> `const` **unwrapLedger9**: \<`T`\>(`payload`, `method`) => `T`

Narrows a version-tagged transaction payload to its live v9 ledger object,
throwing if it carries any other era.

Use this at the top of a provider that implements only the v9 era, and in
consumer code that only ever sends v9 payloads. It is the narrowing the provider
method types require, written once. The alternative — an ad-hoc
`if (payload.version !== 'v9') throw new Error(...)` — produces an error with
no `code`, which a caller cannot act on, and silently reports "expected v9"
for an era that does not exist yet.

## Type Parameters

### T

`T`

## Parameters

### payload

[`VersionedTransaction`](../type-aliases/VersionedTransaction.md)\<`T`\>

The version-tagged payload to narrow.

### method

[`TransactionMethod`](../type-aliases/TransactionMethod.md)

The provider method being implemented, used in error messages.

## Returns

`T`

The live v9 ledger transaction.

## Throws

Ledger8PayloadUnsupportedError if the payload is a v8 payload.

## Throws

UntaggedPayloadError if `version` is missing or unrecognised. The
        types make that unrepresentable, so it is reachable only from
        JavaScript, from a consumer built against a pre-5.0.0
        `midnight-js-types`, or across an untyped boundary.

## Example

```typescript
const proven = unwrapLedger9(
  await proofProvider.proveTx({ version: 'v9', tx: unprovenTx }),
  'proveTx'
);
```
