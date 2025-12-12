[**Midnight.js API Reference v3.0.0-alpha.10**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../README.md) / CallOptionsBase

# Type Alias: CallOptionsBase\<C, ICK\>

> **CallOptionsBase**\<`C`, `ICK`\> = `object`

Describes the target of a circuit invocation.

## Type Parameters

### C

`C` *extends* `Contract`

### ICK

`ICK` *extends* `ImpureCircuitId`\<`C`\>

## Properties

### circuitId

> `readonly` **circuitId**: `ICK`

The identifier of the circuit to call.

***

### contract

> `readonly` **contract**: `C`

The contract defining the circuit to call.

***

### contractAddress

> `readonly` **contractAddress**: `ContractAddress`

The address of the contract being executed.
