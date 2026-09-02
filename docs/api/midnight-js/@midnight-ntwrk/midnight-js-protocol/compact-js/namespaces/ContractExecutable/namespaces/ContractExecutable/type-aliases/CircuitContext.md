[**Midnight.js API Reference v5.0.0-beta.7**](../../../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../../../../../README.md) / [compact-js](../../../../../README.md) / [ContractExecutable](../../../README.md) / [ContractExecutable](../README.md) / CircuitContext

# Type Alias: CircuitContext\<PS\>

> **CircuitContext**\<`PS`\> = [`ContractContext`](ContractContext.md) & `object` & \{ `parentBlockHash?`: `undefined`; `stateProvider?`: `undefined`; \} \| \{ `parentBlockHash`: `string`; `stateProvider`: [`ContractStateProvider`](../../../../../../compact-runtime/interfaces/ContractStateProvider.md); \}

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/ContractExecutable.d.ts:84

## Type Declaration

### ledgerParameters?

> `readonly` `optional` **ledgerParameters?**: [`LedgerParameters`](../../../../../../ledger/classes/LedgerParameters.md)

### privateState

> `readonly` **privateState**: `PS`

### zswapLocalState?

> `readonly` `optional` **zswapLocalState?**: [`ZswapLocalState`](../../../../../../compact-runtime/interfaces/ZswapLocalState.md)

## Type Parameters

### PS

`PS`
