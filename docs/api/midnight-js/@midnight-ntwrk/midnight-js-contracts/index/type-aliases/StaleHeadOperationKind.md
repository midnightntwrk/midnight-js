[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / StaleHeadOperationKind

# Type Alias: StaleHeadOperationKind

> **StaleHeadOperationKind** = `"call"` \| `"deploy"`

Whether the operation a [StaleHeadError](../classes/StaleHeadError.md) refuses was deploying a
contract or calling one already deployed.

The same discriminant the era pairing table takes, kept as its own type here
because it decides which of two genuinely different remediations the error
carries.
