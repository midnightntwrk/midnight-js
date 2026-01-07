[**@midnight-ntwrk/testkit-js v3.0.0-alpha.11**](../README.md)

***

## Methods

### build()

> **build**(): `Promise`\<`WalletFacade`\>

#### Returns

`Promise`\<`WalletFacade`\>

***

### buildWithoutStarting()

> **buildWithoutStarting**(): `Promise`\<\{ `seeds`: [`WalletSeeds`](WalletSeeds.md); `wallet`: `WalletFacade`; \}\>

#### Returns

`Promise`\<\{ `seeds`: [`WalletSeeds`](WalletSeeds.md); `wallet`: `WalletFacade`; \}\>

***

### withDustOptions()

> **withDustOptions**(`options`): `FluentWalletBuilder`

#### Parameters

##### options

[`DustWalletOptions`](../interfaces/DustWalletOptions.md)

#### Returns

`FluentWalletBuilder`

***

### withRandomSeed()

> **withRandomSeed**(): `FluentWalletBuilder`

#### Returns

`FluentWalletBuilder`

***

### withSeed()

> **withSeed**(`seed`): `FluentWalletBuilder`

#### Parameters

##### seed

`string`

#### Returns

`FluentWalletBuilder`

***

### forEnvironment()

> `static` **forEnvironment**(`envConfig`): `FluentWalletBuilder`

#### Parameters

##### envConfig

[`EnvironmentConfiguration`](../interfaces/EnvironmentConfiguration.md)

#### Returns

`FluentWalletBuilder`
