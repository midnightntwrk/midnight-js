[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / createCallTxOptions

# Variable: createCallTxOptions

> `const` **createCallTxOptions**: \<`C`, `PCK`\>(`compiledContract`, `circuitId`, `contractAddress`, `privateStateId`, `additionalCoinEncPublicKeyMappings`, `args`) => [`CallTxOptions`](../type-aliases/CallTxOptions.md)\<`C`, `PCK`\>

Creates a [CallTxOptions](../type-aliases/CallTxOptions.md) object from various data.

`args` is indexed with CircuitKey-unbranded `PCK`, matching `call.ts`'s
`CallOptionsWithArguments`. This function is part of the published surface (`index.ts`), and a
CONSUMER instantiating `PCK` with a branded id -- what `getProvableCircuitIds()` hands back --
is who hits the degradation: `Contract.CircuitParameters` resolves a branded key to `unknown[]`
rather than the real tuple. Without the unbranding this parameter would accept any argument list
while the return type -- `CallTxOptions<C, PCK>`, which is `CallOptionsWithArguments`
underneath -- claims the real tuple: an unsound mismatch between what is checked and what is
returned.

This package's own call site does NOT go through that path: `createCircuitCallTxInterface` below
instantiates `PCK` at the unbranded `Contract.ProvableCircuitId<C>` explicitly, as the comment
there says.

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

[`Contract.CircuitParameters`](https://github.com/midnightntwrk/midnight-sdk)\<`C`, `CircuitKey`\<`PCK`\>\>

## Returns

[`CallTxOptions`](../type-aliases/CallTxOptions.md)\<`C`, `PCK`\>
