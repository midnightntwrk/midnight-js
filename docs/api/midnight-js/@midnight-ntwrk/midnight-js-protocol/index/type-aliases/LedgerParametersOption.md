[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / LedgerParametersOption

# Type Alias: LedgerParametersOption

> **LedgerParametersOption** = `Uint8Array` \| *typeof* [`INITIAL_LEDGER_PARAMETERS`](../variables/INITIAL_LEDGER_PARAMETERS.md)

What a composer accepts for the block's ledger parameters: the chain's own serialized parameters,
or [INITIAL\_LEDGER\_PARAMETERS](../variables/INITIAL_LEDGER_PARAMETERS.md).

There is deliberately no third option. This used to be optional, and omitting it fell back to the
initial parameters silently -- so a caller that simply forgot got the wrong cost model with no
signal, and a `PublicDataProvider` that does not serve `ledgerParameters` (the field is optional)
degraded every call built through it. Requiring the option keeps the compatibility path reachable
only as a decision, never as an oversight.

A caller that reads the chain must pass the bytes from the SAME read as the contract state: the
parameters are era-tagged and dated per block, so a second read could answer for another block.

## See

[EraSeam](../../documents/EraSeam.md)
