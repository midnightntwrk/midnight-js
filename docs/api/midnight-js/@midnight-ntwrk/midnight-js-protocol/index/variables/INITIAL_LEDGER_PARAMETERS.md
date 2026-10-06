[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / INITIAL\_LEDGER\_PARAMETERS

# Variable: INITIAL\_LEDGER\_PARAMETERS

> `const` **INITIAL\_LEDGER\_PARAMETERS**: `"initial"` = `'initial'`

The sentinel that asks for the ledger's own INITIAL cost model instead of the chain's.

Spelled out as a value a caller has to name, because the thing it selects is wrong for any chain
that has been running: the initial parameters are the model the chain started with, and prices
adjust per block. Partitioning against them draws the guaranteed/fallible boundary in the wrong
place and the node then refuses the guaranteed segment with `Transcript(Execution(OutOfGas))` --
after the caller has already paid to prove it.
