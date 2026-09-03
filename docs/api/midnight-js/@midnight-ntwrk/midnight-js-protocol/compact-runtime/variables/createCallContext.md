[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [compact-runtime](../README.md) / createCallContext

# Variable: createCallContext

> `const` **createCallContext**: \<`PS`\>(`circuitId`, `contractAddress`, `coinPublicKeyOrZswapState`, `contractState`, `privateState`, `maybeTime?`, `parentBlockHash?`, `caller?`) => `CallContext`\<`PS`\>

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/circuit-context.d.ts:211

## Type Parameters

### PS

`PS`

## Parameters

### circuitId

[`CircuitId`](../type-aliases/CircuitId.md)

### contractAddress

[`ContractAddress`](../../onchain-runtime/type-aliases/ContractAddress.md)

### coinPublicKeyOrZswapState

[`CoinPublicKey`](../../onchain-runtime/type-aliases/CoinPublicKey.md) \| [`EncodedCoinPublicKey`](../interfaces/EncodedCoinPublicKey.md) \| [`ZswapLocalState`](../interfaces/ZswapLocalState.md) \| [`EncodedZswapLocalState`](../interfaces/EncodedZswapLocalState.md)

### contractState

[`ContractState`](../../onchain-runtime/classes/ContractState.md) \| [`StateValue`](../../onchain-runtime/classes/StateValue.md) \| [`ChargedState`](../../onchain-runtime/classes/ChargedState.md)

### privateState

`PS`

### maybeTime?

`number`

### parentBlockHash?

`string`

### caller?

[`PublicAddress`](../../onchain-runtime/type-aliases/PublicAddress.md)

## Returns

`CallContext`\<`PS`\>
