[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / AnyContract

# Type Alias: AnyContract

> **AnyContract** = [`Ledger8Contract`](../interfaces/Ledger8Contract.md) \| [`Ledger9Contract`](Ledger9Contract.md)

A contract compiled with the toolchain of any ledger era this release serves.

Use it as a constraint (`C extends AnyContract`). Instantiated with itself, a flat name such
as `FinalizedCallTxData<AnyContract, …>` types the circuit values as `any`; for a call of any
contract use `AnyFinalizedCallTxData`. The flat names tell the eras apart by testing
`Ledger8Contract` first: `Contract.Any` alone accepts a ledger 8 artifact too.
