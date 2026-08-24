[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / UnshieldedBalance

# Type Alias: UnshieldedBalance

> **UnshieldedBalance** = `object`

Defined in: packages/types/dist/index.d.ts:251

Represents an unshielded balance, which is a balance that is not shielded or encrypted.
This type is used to track the available funds in an account that are visible on the public ledger.

## Properties

### balance

> `readonly` **balance**: `bigint`

Defined in: packages/types/dist/index.d.ts:255

Represents the current number of funds available or held in an account.

***

### tokenType

> `readonly` **tokenType**: [`RawTokenType`](../../../midnight-js-protocol/ledger/type-aliases/RawTokenType.md)

Defined in: packages/types/dist/index.d.ts:259

Represents the type of token in the system.
