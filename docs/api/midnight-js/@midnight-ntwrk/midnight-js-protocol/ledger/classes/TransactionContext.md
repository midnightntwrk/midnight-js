[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [ledger](../README.md) / TransactionContext

# Class: TransactionContext

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2182

The context against which a transaction is run.

## Constructors

### Constructor

> **new TransactionContext**(`ref_state`, `block_context`, `whitelist?`): `TransactionContext`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2191

#### Parameters

##### ref\_state

[`LedgerState`](LedgerState.md)

A past ledger state that is used as a reference point
for 'static' data.

##### block\_context

[`BlockContext`](../type-aliases/BlockContext.md)

Information about the block this transaction is, or
will be, contained in.

##### whitelist?

`Set`\<`string`\>

A list of contracts that are being tracked, or
`undefined` to track all contracts.

#### Returns

`TransactionContext`

## Methods

### toString()

> **toString**(`compact?`): `string`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2193

#### Parameters

##### compact?

`boolean`

#### Returns

`string`
