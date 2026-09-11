[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / EraPartitionCallOptions

# Interface: EraPartitionCallOptions

What an era needs to partition one call's transcript, which is strictly less
than composing the call: no operation registry, no private outputs, no
transaction envelope. The era supplies its own version.

## Properties

### circuitId

> `readonly` **circuitId**: `string`

***

### contractAddress

> `readonly` **contractAddress**: `string`

***

### ledgerParameters

> `readonly` **ledgerParameters**: [`LedgerParametersOption`](../type-aliases/LedgerParametersOption.md)

The chain's own serialized ledger parameters at the block this call is
built against, or [INITIAL\_LEDGER\_PARAMETERS](../variables/INITIAL_LEDGER_PARAMETERS.md) to partition against
the era's initial cost model instead.

Required, exactly as on `ComposeCallEntry`. The partitioner runs on this
path too, so an optional field here would reopen the silent
wrong-cost-model fallback that [LedgerParametersOption](../type-aliases/LedgerParametersOption.md) exists to
close.

***

### transcript

> `readonly` **transcript**: [`CallTranscriptSource`](../type-aliases/CallTranscriptSource.md)
