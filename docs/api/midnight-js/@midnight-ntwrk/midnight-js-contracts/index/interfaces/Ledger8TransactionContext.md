[**Midnight.js API Reference v5.0.0**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / Ledger8TransactionContext

# Interface: Ledger8TransactionContext\<C, PCK\>

Encapsulates the context of a contract-scoped transaction on a ledger 8 (pre-fork) network.

Every call added with `submitCallTx` or `callTx.<circuit>` is composed against the states the
scope's last call ended on, and all of them are submitted as one ledger 8 transaction when the
scope's function returns. `createUnprovenCallTx` builds against the same states and adds nothing.

## Type Parameters

### C

`C` *extends* [`Ledger8Contract`](Ledger8Contract.md)

### PCK

`PCK` *extends* [`Ledger8CircuitId`](../type-aliases/Ledger8CircuitId.md)\<`C`\> = [`Ledger8CircuitId`](../type-aliases/Ledger8CircuitId.md)\<`C`\>

## Properties

### \[ScopeEra\]

> `readonly` **\[ScopeEra\]**: `"v8"`

***

### \[TypeId\]

> `readonly` **\[TypeId\]**: *typeof* `TypeId`

## Methods

### getAdditionalMappings()

> **getAdditionalMappings**(): `ReadonlyMap`\<`string`, `string`\> \| `undefined`

Gets the additional scoped [CoinPublicKey](https://github.com/midnightntwrk/midnight-ledger) to [EncPublicKey](https://github.com/midnightntwrk/midnight-ledger) mappings.

#### Returns

`ReadonlyMap`\<`string`, `string`\> \| `undefined`

A `ReadonlyMap`<[CoinPublicKey](https://github.com/midnightntwrk/midnight-ledger), [EncPublicKey](https://github.com/midnightntwrk/midnight-ledger)> instance, or `undefined` if no additional
mappings were specified for the current transaction context.

***

### getLastUnsubmittedCallTxDataToTransact()

> **getLastUnsubmittedCallTxDataToTransact**(): \[[`Ledger8UnsubmittedCallTxData`](Ledger8UnsubmittedCallTxData.md)\<`C`, `PCK`\>, `string`?\] \| `undefined`

Gets the last unsubmitted call transaction data.

#### Returns

\[[`Ledger8UnsubmittedCallTxData`](Ledger8UnsubmittedCallTxData.md)\<`C`, `PCK`\>, `string`?\] \| `undefined`

A tuple containing an [Ledger8UnsubmittedCallTxData](Ledger8UnsubmittedCallTxData.md) instance, and an optional private state
ID, or `undefined` if circuit calls are yet to be made. The running private state is
`getLastUnsubmittedCallTxDataToTransact()?.[0].private.nextPrivateState`.
