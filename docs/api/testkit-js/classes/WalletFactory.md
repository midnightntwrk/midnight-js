[**@midnight-ntwrk/testkit-js v3.0.0-alpha.12**](../README.md)

***

## Constructors

### Constructor

> **new WalletFactory**(): `WalletFactory`

#### Returns

`WalletFactory`

## Methods

### createDustWallet()

> `static` **createDustWallet**(`config`, `seed`, `dustOptions`): `DustWallet`

#### Parameters

##### config

`DefaultV1Configuration`

##### seed

`Uint8Array`

##### dustOptions

[`DustWalletOptions`](../interfaces/DustWalletOptions.md) = `DEFAULT_DUST_OPTIONS`

#### Returns

`DustWallet`

***

### createShieldedWallet()

> `static` **createShieldedWallet**(`config`, `seed`): `ShieldedWallet`

#### Parameters

##### config

`DefaultV1Configuration`

##### seed

`Uint8Array`

#### Returns

`ShieldedWallet`

***

### createUnshieldedWallet()

> `static` **createUnshieldedWallet**(`config`, `seed`, `networkId`): `UnshieldedWallet`

#### Parameters

##### config

`DefaultV1Configuration`

##### seed

`Uint8Array`

##### networkId

`NetworkId`

#### Returns

`UnshieldedWallet`

***

### createWalletFacade()

> `static` **createWalletFacade**(`shieldedWallet`, `unshieldedWallet`, `dustWallet`): `WalletFacade`

#### Parameters

##### shieldedWallet

`ShieldedWallet`

##### unshieldedWallet

`UnshieldedWallet`

##### dustWallet

`DustWallet`

#### Returns

`WalletFacade`

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

### startWalletFacade()

> `static` **startWalletFacade**(`wallet`, `shieldedSeed`, `dustSeed`): `Promise`\<`WalletFacade`\>

#### Parameters

##### wallet

`WalletFacade`

##### shieldedSeed

`Uint8Array`

##### dustSeed

`Uint8Array`

#### Returns

`Promise`\<`WalletFacade`\>
