[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / createCallTxOptions

# Variable: createCallTxOptions

> `const` **createCallTxOptions**: \<`C`, `PCK`\>(`compiledContract`, `circuitId`, `contractAddress`, `privateStateId`, `additionalCoinEncPublicKeyMappings`, `args`) => [`CallTxOptions`](../type-aliases/CallTxOptions.md)\<`C`, `PCK`\>

Defined in: packages/contracts/dist/index.d.ts:834

Creates a [CallTxOptions](../type-aliases/CallTxOptions.md) object from various data.

## Type Parameters

### C

`C` *extends* [`Any`](../../../midnight-js-protocol/compact-js/namespaces/Contract/type-aliases/Any.md)

### PCK

`PCK` *extends* [`ProvableCircuitId`](../../../midnight-js-protocol/compact-js/namespaces/Contract/type-aliases/ProvableCircuitId.md)\<`C`\>

## Parameters

### compiledContract

[`CompiledContract`](../../../midnight-js-protocol/compact-js/namespaces/CompiledContract/interfaces/CompiledContract.md)\<`C`, `any`\>

### circuitId

`PCK`

### contractAddress

[`ContractAddress`](../../../midnight-js-protocol/ledger/type-aliases/ContractAddress.md)

### privateStateId

[`PrivateStateId`](../../types/type-aliases/PrivateStateId.md) \| `undefined`

### additionalCoinEncPublicKeyMappings

`ReadonlyMap`\<[`CoinPublicKey`](../../../midnight-js-protocol/ledger/type-aliases/CoinPublicKey.md), [`EncPublicKey`](../../../midnight-js-protocol/ledger/type-aliases/EncPublicKey.md)\> \| `undefined`

### args

[`CircuitParameters`](../../../midnight-js-protocol/compact-js/namespaces/Contract/type-aliases/CircuitParameters.md)\<`C`, `PCK`\>

## Returns

[`CallTxOptions`](../type-aliases/CallTxOptions.md)\<`C`, `PCK`\>
