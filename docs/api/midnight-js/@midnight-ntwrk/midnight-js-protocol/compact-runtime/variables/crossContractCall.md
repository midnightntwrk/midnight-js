[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [compact-runtime](../README.md) / crossContractCall

# Variable: crossContractCall

> `const` **crossContractCall**: (`circuitContext`, `calleeModule`, `calleeCircuitId`, `calleeAddress`, `calleeIsPure`, `callerProofData`, ...`args`) => `Promise`\<`any`\>

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/contract.d.ts:57

**`Internal`**

Calls a circuit defined in another contract from the currently executing contract and returns the result.

## Parameters

### circuitContext

[`CircuitContext`](../interfaces/CircuitContext.md)

The current circuit context.

### calleeModule

`Module`

The callee module containing TS executables.

### calleeCircuitId

[`CircuitId`](../type-aliases/CircuitId.md)

The name of the circuit to be called in the contract to be called.

### calleeAddress

[`ContractAddress`](../../onchain-runtime/type-aliases/ContractAddress.md)

The address of the contract to be called.

### calleeIsPure

`boolean`

A flag indicating whether the circuit being called is pure.

### callerProofData

[`PartialProofData`](../interfaces/PartialProofData.md)

The proof data instance created when the caller circuit was initialized.

### args

...`any`[]

The arguments to the circuit to be called.

## Returns

`Promise`\<`any`\>
