[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [ledger](../README.md) / partitionTranscripts

# Function: partitionTranscripts()

> **partitionTranscripts**(`calls`, `params`): [`PartitionedTranscript`](../type-aliases/PartitionedTranscript.md)[]

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2641

Finalizes a set of programs against their initial contexts,
resulting in guaranteed and fallible [Transcript](../type-aliases/Transcript.md)s, optimally
allocated, and heuristically covered for gas fees.

## Parameters

### calls

[`PreTranscript`](../classes/PreTranscript.md)[]

### params

[`LedgerParameters`](../classes/LedgerParameters.md)

## Returns

[`PartitionedTranscript`](../type-aliases/PartitionedTranscript.md)[]
