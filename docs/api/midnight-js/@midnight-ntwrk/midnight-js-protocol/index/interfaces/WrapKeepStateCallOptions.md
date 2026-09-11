[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / WrapKeepStateCallOptions

# Interface: WrapKeepStateCallOptions

Everything wrapKeepStateCall needs to wrap one keep-state call.
`contractState` is the migrated, post-fork v9 `ContractState` — read from
chain, or otherwise carrying the contract's real registered operations —
used only to look up the `ContractOperation` for `transcript.circuitId`
(mirrors `ComposeV8CallOptions`'s `contractState` parameter in
`../v8/compose.ts`).

## Properties

### contractAddress

> `readonly` **contractAddress**: `string`

***

### contractState

> `readonly` **contractState**: [`ContractState`](https://github.com/midnightntwrk/midnight-ledger)

***

### ledgerParameters

> `readonly` **ledgerParameters**: [`LedgerParametersOption`](../type-aliases/LedgerParametersOption.md)

The ledger parameters of the block this call is built against, or
[INITIAL\_LEDGER\_PARAMETERS](../variables/INITIAL_LEDGER_PARAMETERS.md) to accept the initial cost model.

Required rather than defaulted, and not hard-coded to the initial parameters here: the
transcript crosses as `'unpartitioned'`, so the partitioner DOES run and the cost model it uses
is whatever this supplies. Defaulting it would make this function the silent
wrong-cost-model path the option exists to close. See [LedgerParametersOption](../type-aliases/LedgerParametersOption.md).

***

### transcript

> `readonly` **transcript**: [`TranscriptPojo`](TranscriptPojo.md)
