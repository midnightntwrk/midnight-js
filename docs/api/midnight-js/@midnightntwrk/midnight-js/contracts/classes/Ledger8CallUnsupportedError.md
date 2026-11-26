[**Midnight.js API Reference v5.0.3**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnightntwrk/midnight-js](../../README.md) / [contracts](../README.md) / Ledger8CallUnsupportedError

# Class: Ledger8CallUnsupportedError

An error indicating that a ledger 8 call cannot be composed, refused BEFORE the offer is built.

`reason` `'shielded-spend'`: the call would spend a shielded coin the contract already holds on
chain, which this pipeline structurally cannot compose. A coin the same call produced is NOT
refused: it is paired with its own output as a transient and needs no chain state. Only spends of
previously held coins are.

`reason` `'unmappable-recipient'`: the call would pay a shielded coin to a user-owned recipient
whose encryption public key it cannot resolve: not the calling wallet, not the burn address, and
not a key in the caller's `additionalCoinEncPublicKeyMappings`. Raised by a ledger 8 deploy
too, whose options carry no mappings, with `circuitId` set to `'initialState'`; the message then
names the constructor and gives the deploy-specific advice. Refusal rather than a best effort is the
only answer that cannot lose a coin: encrypting the output to the caller's own key would compose,
prove, balance and submit, and leave the recipient owning a coin it could never discover.

## See

 - [ErrorTaxonomy](../../documents/ErrorTaxonomy.md) for what the ledger 8 path is missing and why this refuses before
the offer is built.
 - [KeepStatePipeline](../../documents/KeepStatePipeline.md) for how the ledger 8 path resolves each recipient's encryption key.

## Extends

- [`MidnightJsError`](../../index/classes/MidnightJsError.md)

## Constructors

### Constructor

> **new Ledger8CallUnsupportedError**(`reason`, `circuitId`): `Ledger8CallUnsupportedError`

#### Parameters

##### reason

`"shielded-spend"`

Why the call was refused. Also the discriminant a caller branches on.

##### circuitId

`string`

The circuit whose call was refused, or `'initialState'` for a deploy.

#### Returns

`Ledger8CallUnsupportedError`

#### Overrides

[`MidnightJsError`](../../index/classes/MidnightJsError.md).[`constructor`](../../index/classes/MidnightJsError.md#constructor)

### Constructor

> **new Ledger8CallUnsupportedError**(`reason`, `circuitId`, `recipientCoinPublicKey`): `Ledger8CallUnsupportedError`

#### Parameters

##### reason

`"unmappable-recipient"`

##### circuitId

`string`

##### recipientCoinPublicKey

`string`

#### Returns

`Ledger8CallUnsupportedError`

#### Overrides

[`MidnightJsError`](../../index/classes/MidnightJsError.md).[`constructor`](../../index/classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../index/type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../index/classes/MidnightJsError.md).[`category`](../../index/classes/MidnightJsError.md#category)

***

### circuitId

> `readonly` **circuitId**: `string`

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_C_LEDGER8_CALL_UNSUPPORTED"`

#### Overrides

[`MidnightJsError`](../../index/classes/MidnightJsError.md).[`code`](../../index/classes/MidnightJsError.md#code)

***

### reason

> `readonly` **reason**: [`Ledger8CallUnsupportedReason`](../type-aliases/Ledger8CallUnsupportedReason.md)

***

### recipientCoinPublicKey?

> `readonly` `optional` **recipientCoinPublicKey?**: `string`
