[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / StaleHeadOperationKind

# Type Alias: StaleHeadOperationKind

> **StaleHeadOperationKind** = `"call"` \| `"deploy"` \| `"maintenance"`

Whether the operation a [StaleHeadError](../classes/StaleHeadError.md) refuses was deploying a
contract, calling one already deployed, or maintaining one.

The same discriminant the era pairing table takes, kept as its own type here
because it decides which of the genuinely different remediations the error
carries.
