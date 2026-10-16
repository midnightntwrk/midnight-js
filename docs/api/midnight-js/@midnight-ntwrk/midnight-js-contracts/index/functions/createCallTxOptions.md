[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / createCallTxOptions

# Function: createCallTxOptions()

> **createCallTxOptions**\<`C`, `PCK`\>(`compiledContract`, `circuitId`, `contractAddress`, `privateStateId`, `additionalCoinEncPublicKeyMappings`, `args`): [`CallTxOptions`](../type-aliases/CallTxOptions.md)\<`C`, `PCK`\>

Creates a [CallTxOptions](../type-aliases/CallTxOptions.md) object from various data.

`args` carries the circuit's real parameter tuple, indexed at `PCK` -- including the branded id
`getProvableCircuitIds()` hands back, which `Contract.CircuitParameters` unbrands itself.

`circuitId` is constrained by `PCK extends Contract.ProvableCircuitId<C>`, which is the
NAMESPACE member `keyof C['provableCircuits'] & string`. That `keyof` is what rejects a circuit
id the contract does not declare; the brand plays no part in it, and a plain unbranded literal
is accepted here.

## Type Parameters

### C

`C` *extends* [`Any`](https://github.com/midnightntwrk/midnight-sdk)

### PCK

`PCK` *extends* `string`

## Parameters

### compiledContract

[`CompiledContract`](https://github.com/midnightntwrk/midnight-sdk)\<`C`, `any`\>

### circuitId

`PCK`

### contractAddress

`string`

### privateStateId

`string` \| `undefined`

### additionalCoinEncPublicKeyMappings

`ReadonlyMap`\<`string`, `string`\> \| `undefined`

### args

[`CircuitParameters`](https://github.com/midnightntwrk/midnight-sdk)\<`C`, `PCK`\>

## Returns

[`CallTxOptions`](../type-aliases/CallTxOptions.md)\<`C`, `PCK`\>
