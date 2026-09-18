[**Midnight.js API Reference v5.0.0-beta.8**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../../../README.md) / [contracts](../../../README.md) / [Ledger8](../README.md) / RecipientUnmappableError

# Class: RecipientUnmappableError

An error indicating that a retained-era call would pay a shielded coin to a
recipient whose encryption public key this arm cannot resolve.

Raised BEFORE the offer is built. Without it the condition surfaced from
inside `createZswapOutput` as a bare `Error` naming neither the era nor the
circuit, and advising a `encryptionPublicKeyResolver` mapping that the
retained-era options carry no field for — advice a caller structurally could
not follow.

Refusal rather than a best effort is the only answer that cannot lose a coin:
encrypting the output to the caller's own key instead would compose, prove,
balance and submit, and leave the recipient owning a coin it could never
discover.

## See

[KeepStatePipeline](../../../../documents/KeepStatePipeline.md) for why the retained arm resolves only the
     caller's own key and the burn address.

## Extends

- `Error`

## Constructors

### Constructor

> **new RecipientUnmappableError**(`circuitId`, `recipientCoinPublicKey`): `Ledger8RecipientUnmappableError`

#### Parameters

##### circuitId

`string`

##### recipientCoinPublicKey

`string`

#### Returns

`Ledger8RecipientUnmappableError`

#### Overrides

`Error.constructor`

## Properties

### circuitId

> `readonly` **circuitId**: `string`

***

### recipientCoinPublicKey

> `readonly` **recipientCoinPublicKey**: `string`
