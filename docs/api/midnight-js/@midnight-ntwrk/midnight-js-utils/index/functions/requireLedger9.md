[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-utils](../../README.md) / [index](../README.md) / requireLedger9

# Function: requireLedger9()

> **requireLedger9**\<`T`\>(`value`, `context`): `Extract`\<`T`\>

Narrows any era-tagged union (`FinalizedTxRead`, …)
to its v9 variant, for code that handles only the v9 era.

Code that handles both eras should `switch (value.era)` and close the switch with
[assertNever](assertNever.md) instead.

## Type Parameters

### T

`T` *extends* `object`

## Parameters

### value

`WithLedger9Variant`\<`T`\>

The era-tagged value.

### context

`string`

Names the call site, so the error says where it came from.

## Returns

`Extract`\<`T`\>

The whole v9 variant.

## Throws

Ledger8ValueUnsupportedError if the value was written by the v8 ledger.

## Throws

UnrecognisedEraTagError if the value is `null`, has no `era`, or carries an era this
  build does not know.

## Example

```ts
const { tx } = requireLedger9(await publicDataProvider.watchForTxData(txId), 'readTx');
```
