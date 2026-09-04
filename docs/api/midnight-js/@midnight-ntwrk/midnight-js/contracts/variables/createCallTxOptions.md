[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / createCallTxOptions

# Variable: createCallTxOptions

> `const` **createCallTxOptions**: \<`C`, `PCK`\>(`compiledContract`, `circuitId`, `contractAddress`, `privateStateId`, `additionalCoinEncPublicKeyMappings`, `args`) => [`CallTxOptions`](../type-aliases/CallTxOptions.md)\<`C`, `PCK`\>

Defined in: packages/contracts/dist/index.d.ts:834

Creates a [CallTxOptions](../type-aliases/CallTxOptions.md) object from various data.

## Type Parameters

### C

`C` *extends* [`Contract.Any`](https://github.com/midnightntwrk/midnight-sdk)

### PCK

`PCK` *extends* [`Contract.ProvableCircuitId`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>

## Parameters

### compiledContract

[`CompiledContract.CompiledContract`](https://github.com/midnightntwrk/midnight-sdk)\<`C`, `any`\>

### circuitId

`PCK`

### contractAddress

[`ContractAddress$1`](https://github.com/midnightntwrk/midnight-ledger)

### privateStateId

[`PrivateStateId`](../../types/type-aliases/PrivateStateId.md) \| `undefined`

### additionalCoinEncPublicKeyMappings

`ReadonlyMap`\<[`CoinPublicKey$1`](https://github.com/midnightntwrk/midnight-ledger), [`EncPublicKey`](https://github.com/midnightntwrk/midnight-ledger)\> \| `undefined`

### args

[`Contract.CircuitParameters`](https://github.com/midnightntwrk/midnight-sdk)\<`C`, `PCK`\>

## Returns

[`CallTxOptions`](../type-aliases/CallTxOptions.md)\<`C`, `PCK`\>
