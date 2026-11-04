[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / SubmittedOperationKind

# Type Alias: SubmittedOperationKind

> **SubmittedOperationKind** = `"call"` \| `"deploy"` \| `"maintenance"`

Whether a contract operation was deploying a contract, calling one already deployed, or
maintaining one. A [ForkCrossedDuringOperationError](../classes/ForkCrossedDuringOperationError.md) can also carry `'transaction'`, for a
transaction submitted with `submitTx` / `submitTxAsync`; see [SubmittedOperation](SubmittedOperation.md).

The same discriminant the era pairing table takes, kept as its own type here
because it decides which of the genuinely different remediations the error
carries.
