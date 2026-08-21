[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / Fees

# Type Alias: Fees

> **Fees** = `object`

Defined in: packages/types/dist/index.d.ts:170

Represents the fees associated with a particular entity or operation.

This type includes both the paid fees and the estimated fees. The paid fees represent
the amount that has already been settled, while the estimated fees provide a calculation
or projection of expected fees.

## Properties

### estimatedFees

> `readonly` **estimatedFees**: `string`

Defined in: packages/types/dist/index.d.ts:178

The estimated fees that are expected to be incurred.

***

### paidFees

> `readonly` **paidFees**: `string`

Defined in: packages/types/dist/index.d.ts:174

The fees that have already been paid.
