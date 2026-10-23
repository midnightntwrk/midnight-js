[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / exitResultOrError

# Variable: exitResultOrError

> `const` **exitResultOrError**: \<`A`, `E`\>(`exit`) => `A`

Unwraps an Effect `Exit` instance, returning its value if it is successful, or throwing the error contained
within it.

A lone failure is thrown as the midnight-js error it is or carries on its `cause` chain, so that error's
`category` reaches the caller; a failure carrying none is thrown unchanged, and so is a defect. A coded
failure raised directly among several is thrown as is; otherwise several failures are reported together
as a `ContractExecutionError`.

## Type Parameters

### A

`A`

### E

`E`

## Parameters

### exit

`Exit.Exit`\<`A`, `E`\>

The source Effect `Exit` instance.

## Returns

`A`

The value from `exit` if it is successful, otherwise throws the error contained within it.
