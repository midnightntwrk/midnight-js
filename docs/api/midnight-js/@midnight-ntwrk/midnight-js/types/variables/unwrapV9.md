[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / unwrapV9

# Variable: unwrapV9

> `const` **unwrapV9**: \<`T`\>(`payload`, `seam`) => `T`

Narrows a version-tagged transaction payload to its live v9 ledger object,
throwing if it carries any other era.

Use this at the top of a provider that implements only the v9 era, and in
consumer code that only ever sends v9 payloads. It is the narrowing the seam
types require, written once. The alternative — an ad-hoc
`if (payload.version !== 'v9') throw new Error(...)` — produces an error with
no `code`, which a caller cannot act on, and silently reports "expected v9"
for an era that does not exist yet.

## Type Parameters

### T

`T`

## Parameters

### payload

[`VersionedTx`](../type-aliases/VersionedTx.md)\<`T`\>

The version-tagged payload to narrow.

### seam

[`ProviderSeam`](../type-aliases/ProviderSeam.md)

The provider method being implemented, used in error messages.

## Returns

`T`

The live v9 ledger transaction.

## Throws

V8PayloadUnsupportedError if the payload carries the v8 arm.

## Throws

UntaggedPayloadError if `version` is missing or unrecognised. The
        types make that unrepresentable, so it is reachable only from
        JavaScript, from a consumer built against a pre-5.0.0
        `midnight-js-types`, or across an untyped boundary.

## Example

```typescript
const proven = unwrapV9(
  await proofProvider.proveTx({ version: 'v9', tx: unprovenTx }),
  'proveTx'
);
```
