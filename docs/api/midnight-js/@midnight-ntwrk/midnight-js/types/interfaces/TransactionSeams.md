[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / TransactionSeams

# Interface: TransactionSeams

The three providers one transaction passes through, in the order it passes
through them.

Structural rather than the full `MidnightProviders` set, so the check can be
applied to any subset that happens to carry the three seams — including the
reduced sets the contracts package threads through its internal entry points.

## Properties

### midnightProvider

> `readonly` **midnightProvider**: [`EraDeclaringProvider`](EraDeclaringProvider.md)

***

### proofProvider

> `readonly` **proofProvider**: [`EraDeclaringProvider`](EraDeclaringProvider.md)

***

### walletProvider

> `readonly` **walletProvider**: [`EraDeclaringProvider`](EraDeclaringProvider.md)
