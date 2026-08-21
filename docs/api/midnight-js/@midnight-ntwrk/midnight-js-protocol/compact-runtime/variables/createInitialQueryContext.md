[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [compact-runtime](../README.md) / createInitialQueryContext

# Variable: createInitialQueryContext

> `const` **createInitialQueryContext**: (`contractState`, `contractAddress`, `time`, `parentBlockHash?`, `caller?`) => [`QueryContext`](../../onchain-runtime/classes/QueryContext.md)

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/circuit-context.d.ts:192

**`Internal`**

## Parameters

### contractState

[`ContractState`](../../onchain-runtime/classes/ContractState.md) \| [`StateValue`](../../onchain-runtime/classes/StateValue.md) \| [`ChargedState`](../../onchain-runtime/classes/ChargedState.md)

### contractAddress

[`ContractAddress`](../../onchain-runtime/type-aliases/ContractAddress.md)

### time

`number`

### parentBlockHash?

`string`

### caller?

[`PublicAddress`](../../onchain-runtime/type-aliases/PublicAddress.md)

## Returns

[`QueryContext`](../../onchain-runtime/classes/QueryContext.md)
