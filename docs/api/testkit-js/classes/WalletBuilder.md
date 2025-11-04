[**@midnight-ntwrk/testkit-js v3.0.0**](../README.md)

***

## Constructors

### Constructor

> **new WalletBuilder**(): `WalletBuilder`

#### Returns

`WalletBuilder`

## Methods

### buildAndStartWallet()

> `static` **buildAndStartWallet**(`envConfig`, `seed?`): `Promise`\<`WalletFacade`\>

#### Parameters

##### envConfig

[`EnvironmentConfiguration`](../interfaces/EnvironmentConfiguration.md)

##### seed?

`string`

#### Returns

`Promise`\<`WalletFacade`\>

***

### buildDustWallet()

> `static` **buildDustWallet**(`config`, `seed`, `networkId`, `dustOptions`): `DustWallet`

#### Parameters

##### config

`DefaultV1Configuration`

##### seed

`Uint8Array`

##### networkId

`NetworkId`

##### dustOptions

###### additionalFeeOverhead

`bigint` = `500_000_000_000_000_000_000n`

###### feeBlocksMargin

`number` = `5`

###### ledgerParams

`LedgerParameters` = `...`

#### Returns

`DustWallet`

***

### buildShieldedWallet()

> `static` **buildShieldedWallet**(`config`, `seed`): `ShieldedWallet`

#### Parameters

##### config

`DefaultV1Configuration`

##### seed

`Uint8Array`

#### Returns

`ShieldedWallet`

***

### buildUnshieldedWallet()

> `static` **buildUnshieldedWallet**(`config`, `seed`, `networkId`): `Promise`\<`UnshieldedWallet`\>

#### Parameters

##### config

`DefaultV1Configuration`

##### seed

`Uint8Array`

##### networkId

`NetworkId`

#### Returns

`Promise`\<`UnshieldedWallet`\>

***

### buildWallet()

> `static` **buildWallet**(`envConfig`, `shieldedSeed`, `unshieldedSeed`, `dustSeed`): `Promise`\<`WalletFacade`\>

#### Parameters

##### envConfig

[`EnvironmentConfiguration`](../interfaces/EnvironmentConfiguration.md)

##### shieldedSeed

`Uint8Array`

##### unshieldedSeed

`Uint8Array`

##### dustSeed

`Uint8Array`

#### Returns

`Promise`\<`WalletFacade`\>

***

### restoreShieldedWallet()

> `static` **restoreShieldedWallet**(`config`, `serializedState`): `Promise`\<`ShieldedWallet`\>

#### Parameters

##### config

`DefaultV1Configuration`

##### serializedState

`string`

#### Returns

`Promise`\<`ShieldedWallet`\>

***

### startWallet()

> `static` **startWallet**(`wallet`, `shieldedSeed`, `dustSeed`): `Promise`\<`WalletFacade`\>

#### Parameters

##### wallet

`WalletFacade`

##### shieldedSeed

`Uint8Array`

##### dustSeed

`Uint8Array`

#### Returns

`Promise`\<`WalletFacade`\>
