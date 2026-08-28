[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [ledger](../README.md) / LedgerState

# Class: LedgerState

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1720

The state of the Midnight ledger

## Constructors

### Constructor

> **new LedgerState**(`network_id`, `zswap`): `LedgerState`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1724

Intializes from a Zswap state, with an empty contract set

#### Parameters

##### network\_id

`string`

##### zswap

[`ZswapChainState`](ZswapChainState.md)

#### Returns

`LedgerState`

## Properties

### blockRewardPool

> `readonly` **blockRewardPool**: `bigint`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1834

The remaining unrewarded supply of native tokens.

***

### dust

> `readonly` **dust**: [`DustState`](DustState.md)

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1846

The dust subsystem state

***

### lockedPool

> `readonly` **lockedPool**: `bigint`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1819

The remaining size of the locked Night pool.

***

### parameters

> **parameters**: [`LedgerParameters`](LedgerParameters.md)

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1850

The parameters of the ledger

***

### reservePool

> `readonly` **reservePool**: `bigint`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1824

The size of the reserve Night pool

***

### utxo

> `readonly` **utxo**: [`UtxoState`](UtxoState.md)

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1842

The unshielded utxos present

***

### zswap

> `readonly` **zswap**: [`ZswapChainState`](ZswapChainState.md)

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1838

The Zswap part of the ledger state

## Methods

### apply()

> **apply**(`transaction`, `context`): \[`LedgerState`, [`TransactionResult`](TransactionResult.md)\]

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1734

Applies a [Transaction](Transaction.md)

#### Parameters

##### transaction

[`VerifiedTransaction`](VerifiedTransaction.md)

##### context

[`TransactionContext`](TransactionContext.md)

#### Returns

\[`LedgerState`, [`TransactionResult`](TransactionResult.md)\]

***

### applySystemTx()

> **applySystemTx**(`transaction`, `tblock`): \[`LedgerState`, [`Event`](Event.md)[]\]

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1742

Applies a system transaction to this ledger state.

#### Parameters

##### transaction

[`SystemTransaction`](SystemTransaction.md)

##### tblock

`Date`

#### Returns

\[`LedgerState`, [`Event`](Event.md)[]\]

***

### bridgeReceiving()

#### Call Signature

> **bridgeReceiving**(`recipient`): `bigint`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1782

How much in bridged night a recipient is owed and can claim.

##### Parameters

###### recipient

`string`

##### Returns

`bigint`

#### Call Signature

> **bridgeReceiving**(`recipient`): `bigint`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1829

How much in bridged night a recipient is owed and can claim.

##### Parameters

###### recipient

`string`

##### Returns

`bigint`

***

### index()

> **index**(`address`): [`ContractState`](ContractState.md) \| `undefined`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1747

Indexes into the contract state map with a given contract address

#### Parameters

##### address

`string`

#### Returns

[`ContractState`](ContractState.md) \| `undefined`

***

### postBlockUpdate()

> **postBlockUpdate**(`tblock`, `detailedBlockFullness?`, `overallBlockFullness?`): `LedgerState`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1767

Carries out a post-block update, which does amortized bookkeeping that
only needs to be done once per state change.

Typically, `postBlockUpdate` should be run after any (sequence of)
(system)-transaction application(s).

#### Parameters

##### tblock

`Date`

##### detailedBlockFullness?

[`NormalizedCost`](../type-aliases/NormalizedCost.md)

##### overallBlockFullness?

`number`

#### Returns

`LedgerState`

***

### serialize()

> **serialize**(): `Uint8Array`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1754

#### Returns

`Uint8Array`

***

### testingDistributeNight()

> **testingDistributeNight**(`recipient`, `amount`, `tblock`): `LedgerState`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1788

Allows distributing the specified amount of Night to the recipient's address.
Use is for testing purposes only.

#### Parameters

##### recipient

`string`

##### amount

`bigint`

##### tblock

`Date`

#### Returns

`LedgerState`

***

### testingUnlockToReserve()

> **testingUnlockToReserve**(`amount`, `tblock`): `LedgerState`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1814

Applies an `UnlockToReserve` system transaction, moving the given amount
of Night from the locked pool into the reserve pool.

Use is for testing purposes only.

#### Parameters

##### amount

`bigint`

##### tblock

`Date`

#### Returns

`LedgerState`

***

### testingUnlockToTreasury()

> **testingUnlockToTreasury**(`amount`, `tblock`): `LedgerState`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1806

Applies an `UnlockToTreasury` system transaction, moving the given amount
of Night from the locked pool into the treasury.

Use is for testing purposes only.

#### Parameters

##### amount

`bigint`

##### tblock

`Date`

#### Returns

`LedgerState`

***

### toString()

> **toString**(`compact?`): `string`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1758

#### Parameters

##### compact?

`boolean`

#### Returns

`string`

***

### treasuryBalance()

> **treasuryBalance**(`token_type`): `bigint`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1772

Retrieves the balance of the treasury for a specific token type.

#### Parameters

##### token\_type

[`TokenType`](../type-aliases/TokenType.md)

#### Returns

`bigint`

***

### unclaimedBlockRewards()

> **unclaimedBlockRewards**(`recipient`): `bigint`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1777

How much in block rewards a recipient is owed and can claim.

#### Parameters

##### recipient

`string`

#### Returns

`bigint`

***

### updateIndex()

> **updateIndex**(`address`, `state`, `balance`): `LedgerState`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1752

Sets the state of a given contract address from a [ChargedState](ChargedState.md)

#### Parameters

##### address

`string`

##### state

[`ChargedState`](ChargedState.md)

##### balance

`Map`\<[`TokenType`](../type-aliases/TokenType.md), `bigint`\>

#### Returns

`LedgerState`

***

### blank()

> `static` **blank**(`network_id`): `LedgerState`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1729

A fully blank state

#### Parameters

##### network\_id

`string`

#### Returns

`LedgerState`

***

### deserialize()

> `static` **deserialize**(`raw`): `LedgerState`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1756

#### Parameters

##### raw

`Uint8Array`

#### Returns

`LedgerState`

***

### testingFromGenesis()

> `static` **testingFromGenesis**(`network_id`, `lockedPool`, `reservePool`, `treasury`): `LedgerState`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1798

Constructs a ledger state with the given genesis parameterisation, using
the default initial parameters. Allows seeding the locked, reserve, and
treasury NIGHT pools so that subsequent system transactions (e.g.
[testingUnlockToTreasury](#testingunlocktotreasury)) can be exercised

Use is for testing purposes only.

#### Parameters

##### network\_id

`string`

##### lockedPool

`bigint`

##### reservePool

`bigint`

##### treasury

`bigint`

#### Returns

`LedgerState`
