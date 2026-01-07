[**Midnight.js API Reference v3.0.0-alpha.12**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-level-private-state-provider](../README.md) / LevelPrivateStateProviderConfig

# Interface: LevelPrivateStateProviderConfig

Optional properties for the indexedDB based private state provider configuration.

## Properties

### midnightDbName

> `readonly` **midnightDbName**: `string`

The name of the LevelDB database used to store all Midnight related data.

***

### privateStateStoreName

> `readonly` **privateStateStoreName**: `string`

The name of the object store containing private states.

***

### privateStoragePasswordProvider?

> `readonly` `optional` **privateStoragePasswordProvider**: [`PrivateStoragePasswordProvider`](../type-aliases/PrivateStoragePasswordProvider.md)

Provider function that returns the password used for encrypting private state.
The password must be at least 16 characters long.

If not provided, defaults to using walletProvider.getEncryptionPublicKey().

#### Example

```typescript
// Using default (wallet's encryption public key)
{ walletProvider: wallet }

// Using custom password provider
{
  walletProvider: wallet,
  privateStoragePasswordProvider: async () => await getUserPassword()
}
```

***

### signingKeyStoreName

> `readonly` **signingKeyStoreName**: `string`

The name of the object store containing signing keys.

***

### walletProvider?

> `readonly` `optional` **walletProvider**: `WalletProvider`

Wallet provider used to get the encryption public key for password derivation.
If privateStoragePasswordProvider is not provided, the wallet's encryption public key
will be used as the password.
