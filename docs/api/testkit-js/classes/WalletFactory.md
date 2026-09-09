[**@midnight-ntwrk/testkit-js v5.0.0-beta.7**](../README.md)

***

## Constructors

### Constructor

> **new WalletFactory**(): `WalletFactory`

#### Returns

`WalletFactory`

## Methods

### createDustWallet()

> `static` **createDustWallet**(`config`, `seed`, `dustOptions?`): `Promise`\<`DustWalletAPI`\>

#### Parameters

##### config

`DefaultDustConfiguration`

##### seed

`Uint8Array`

##### dustOptions?

[`DustWalletOptions`](../interfaces/DustWalletOptions.md) = `DEFAULT_DUST_OPTIONS`

#### Returns

`Promise`\<`DustWalletAPI`\>

***

### createShieldedWallet()

> `static` **createShieldedWallet**(`config`, `seed`): `Promise`\<`ShieldedWalletAPI`\>

#### Parameters

##### config

`DefaultShieldedConfiguration`

##### seed

`Uint8Array`

#### Returns

`Promise`\<`ShieldedWalletAPI`\>

***

### createUnshieldedWallet()

> `static` **createUnshieldedWallet**(`config`, `unshieldedKeystore`): `Promise`\<`UnshieldedWalletAPI`\>

#### Parameters

##### config

`DefaultUnshieldedConfiguration`

##### unshieldedKeystore

`UnshieldedKeystore`

#### Returns

`Promise`\<`UnshieldedWalletAPI`\>

***

### createWalletFacade()

> `static` **createWalletFacade**(`config`, `shieldedWallet`, `unshieldedWallet`, `dustWallet`): `Promise`\<`WalletFacade`\>

#### Parameters

##### config

`DefaultConfiguration`

##### shieldedWallet

`ShieldedWalletAPI`

##### unshieldedWallet

`UnshieldedWalletAPI`

##### dustWallet

`DustWalletAPI`

#### Returns

`Promise`\<`WalletFacade`\>

***

### restoreShieldedWallet()

> `static` **restoreShieldedWallet**(`config`, `serializedState`): `Promise`\<`ShieldedWallet`\>

#### Parameters

##### config

`DefaultShieldedConfiguration`

##### serializedState

`string`

#### Returns

`Promise`\<`ShieldedWallet`\>

***

### startWalletFacade()

> `static` **startWalletFacade**(`wallet`, `seeds`): `Promise`\<`WalletFacade`\>

#### Parameters

##### wallet

`WalletFacade`

##### seeds

`WalletSeeds`

#### Returns

`Promise`\<`WalletFacade`\>
