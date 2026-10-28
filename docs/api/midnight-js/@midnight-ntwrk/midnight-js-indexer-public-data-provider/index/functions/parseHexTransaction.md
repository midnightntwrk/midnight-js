[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-indexer-public-data-provider](../../README.md) / [index](../README.md) / parseHexTransaction

# Function: parseHexTransaction()

> **parseHexTransaction**\<`E`\>(`era`, `s`, `details?`): `Promise`\<[`LedgerTransaction`](../../../midnight-js/types/classes/LedgerTransaction.md)\<`"Finalized"`, `E`\>\>

## Type Parameters

### E

`E` *extends* `"v8"` \| `"v9"`

## Parameters

### era

`E`

### s

`string`

### details?

`Readonly`\<`Record`\<`string`, `string` \| `number`\>\>

## Returns

`Promise`\<[`LedgerTransaction`](../../../midnight-js/types/classes/LedgerTransaction.md)\<`"Finalized"`, `E`\>\>
