[**Midnight.js API Reference v5.0.0-rc.3**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / createCallTxOptions

# Variable: createCallTxOptions

> `const` **createCallTxOptions**: \<`C`, `PCK`\>(`compiledContract`, `circuitId`, `contractAddress`, `privateStateId`, `additionalCoinEncPublicKeyMappings`, `args`) => [`CallTxOptions`](../type-aliases/CallTxOptions.md)\<`C`, `PCK`\>

Creates a [CallTxOptions](../type-aliases/CallTxOptions.md) object from various data.

`args` carries the circuit's real parameter tuple, indexed at `PCK` -- including the branded id
`getProvableCircuitIds()` hands back, which `Contract.CircuitParameters` unbrands itself.

`circuitId` is constrained by `PCK extends Contract.ProvableCircuitId<C>`, which is the
NAMESPACE member `keyof C['provableCircuits'] & string`. That `keyof` is what rejects a circuit
id the contract does not declare; the brand plays no part in it, and a plain unbranded literal
is accepted here.

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
