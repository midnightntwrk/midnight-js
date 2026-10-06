[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / DeployContractOptionsShared

# Type Alias: DeployContractOptionsShared\<C\>

> **DeployContractOptionsShared**\<`C`\> = [`ContractConstructorOptionsWithArguments`](ContractConstructorOptionsWithArguments.md)\<`C`\> & `object`

What both [deployContract](../functions/deployContract.md) option arms carry, and nothing either arm
decides. Identical to [ContractConstructorOptionsWithArguments](ContractConstructorOptionsWithArguments.md) except
the `signingKey` is now optional, since [deployContract](../functions/deployContract.md) will generate a
fresh signing key in the event that `signingKey` is undefined.

Neither arm extends the other. Written as an intersection alias, an arm
declaring `privateStateId: PrivateStateId` over a base declaring
`privateStateId?: never` collapses that member to `never` and leaves the
private-state arm uninhabitable — so the pairing rule can only be stated by
making the two arms siblings over this.

Ledger8DeployContractOptionsShared plays the same role for the
retained era, which arrives there by a different route: its arms are
interfaces, and an interface redeclaring the member is rejected outright as an
incompatible extension. This era cannot use interfaces, because `args` reaches
both arms through the [ContractConstructorOptionsWithArguments](ContractConstructorOptionsWithArguments.md)
conditional and an interface cannot extend a conditional type.

PUBLISHED, unlike its retained-era counterpart, purely so the two members
below keep a documented page of their own: TypeDoc inlines the members an
interface inherits, but renders an unexported alias as bare text, which would
delete `signingKey` and `additionalCoinEncPublicKeyMappings` from the
reference for both arms.

## Type Declaration

### additionalCoinEncPublicKeyMappings?

> `readonly` `optional` **additionalCoinEncPublicKeyMappings?**: `ReadonlyMap`\<[`CoinPublicKey`](https://github.com/midnightntwrk/midnight-ledger), [`EncPublicKey`](https://github.com/midnightntwrk/midnight-ledger)\>

An optional mapping of [CoinPublicKey](https://github.com/midnightntwrk/midnight-ledger) to [EncPublicKey](https://github.com/midnightntwrk/midnight-ledger) that can be used to resolve encryption
keys for coins created in the contract constructor. This is useful in cases where the constructor creates
outputs to addresses that don't belong to the current user.

### signingKey?

> `readonly` `optional` **signingKey?**: [`SigningKey`](https://github.com/midnightntwrk/midnight-ledger)

The signing key to add as the to-be-deployed contract's maintenance authority.
If undefined, a new signing key is sampled and used as the CMA then stored
in the private state provider under the newly deployed contract's address.
Otherwise, the passed signing key is added as the CMA. The second case is
useful when you want to use the same CMA for two different contracts.

## Type Parameters

### C

`C` *extends* [`Contract.Any`](https://github.com/midnightntwrk/midnight-sdk)
