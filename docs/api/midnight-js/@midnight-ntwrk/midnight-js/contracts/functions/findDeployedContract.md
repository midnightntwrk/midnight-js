[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / findDeployedContract

# Function: findDeployedContract()

## Call Signature

> **findDeployedContract**\<`C`\>(`providers`, `options`): `Promise`\<[`FoundContract`](../namespaces/Ledger8/interfaces/FoundContract.md)\<`C`\>\>

The retained-era arm. Accepts a contract produced by the PREVIOUS Compact toolchain, passed as
the raw contract instance rather than inside a `CompiledContract` container.

Nothing is COMPOSED and nothing is submitted: no transaction leaves this call. It resolves the
head era, dates the fetched state's envelope against it, and byte-matches every local verifier
key against the slot the chain holds — the checks that make a later call against this contract
safe, done once here so a mis-dispatch is caught at attach time rather than at the first call.

It does write LOCALLY. Supplying `initialPrivateState` alongside `privateStateId` names the
contract address on the private-state provider and stores that state under the id, so the calls
made through `callTx` read it back. Supplying it with no id is a caller error —
`IncompleteFindContractPrivateStateConfig` — because there is nowhere to put the state, and so
is writing `privateStateId` with an undefined value. Naming an id the provider holds nothing
under is refused too, rather than attaching against a state the contract never had.

The deploy record is returned VERSION-TAGGED rather than narrowed to the current era: a
retained-era contract was deployed in whichever era was current at the time, and refusing the
pre-fork arm would refuse exactly the contracts this arm exists to keep callable.

### Type Parameters

#### C

`C` *extends* [`Contract`](../namespaces/Ledger8/interfaces/Contract.md)\<`unknown`\>

### Parameters

#### providers

[`ContractProviders`](../namespaces/Ledger8/type-aliases/ContractProviders.md)\<`C`, [`CircuitId`](../namespaces/Ledger8/type-aliases/CircuitId.md)\<`C`\>\>

#### options

[`FindDeployedContractOptions`](../namespaces/Ledger8/interfaces/FindDeployedContractOptions.md)\<`C`\>

### Returns

`Promise`\<[`FoundContract`](../namespaces/Ledger8/interfaces/FoundContract.md)\<`C`\>\>

### Throws

IncompleteFindContractPrivateStateConfig if an `initialPrivateState` is supplied with no
        `privateStateId` to store it under.

### See

[OverloadTyping](../../documents/OverloadTyping.md) for how the two eras are discriminated.

## Call Signature

> **findDeployedContract**\<`C`\>(`providers`, `options`): `Promise`\<[`FoundContract`](../interfaces/FoundContract.md)\<`C`\>\>

Attaches to a deployed contract that declares no private state.

### Type Parameters

#### C

`C` *extends* [`Contract`](https://github.com/midnightntwrk/midnight-sdk)\<`undefined`, [`Witnesses`](https://github.com/midnightntwrk/midnight-sdk)\<`undefined`\>\>

### Parameters

#### providers

[`ContractProviders`](../type-aliases/ContractProviders.md)\<`C`, [`ProvableCircuitId`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>, `unknown`\>

#### options

[`FindDeployedContractOptionsBase`](../interfaces/FindDeployedContractOptionsBase.md)\<`C`\>

### Returns

`Promise`\<[`FoundContract`](../interfaces/FoundContract.md)\<`C`\>\>

## Call Signature

> **findDeployedContract**\<`C`\>(`providers`, `options`): `Promise`\<[`FoundContract`](../interfaces/FoundContract.md)\<`C`\>\>

Attaches to a deployed contract, reusing the private state already stored at `privateStateId`.

### Type Parameters

#### C

`C` *extends* [`Any`](https://github.com/midnightntwrk/midnight-sdk)

### Parameters

#### providers

[`ContractProviders`](../type-aliases/ContractProviders.md)\<`C`\>

#### options

[`FindDeployedContractOptionsExistingPrivateState`](../interfaces/FindDeployedContractOptionsExistingPrivateState.md)\<`C`\>

### Returns

`Promise`\<[`FoundContract`](../interfaces/FoundContract.md)\<`C`\>\>

## Call Signature

> **findDeployedContract**\<`C`\>(`providers`, `options`): `Promise`\<[`FoundContract`](../interfaces/FoundContract.md)\<`C`\>\>

Attaches to a deployed contract, storing the given `initialPrivateState` at `privateStateId`.

### Type Parameters

#### C

`C` *extends* [`Any`](https://github.com/midnightntwrk/midnight-sdk)

### Parameters

#### providers

[`ContractProviders`](../type-aliases/ContractProviders.md)\<`C`\>

#### options

[`FindDeployedContractOptionsStorePrivateState`](../interfaces/FindDeployedContractOptionsStorePrivateState.md)\<`C`\>

### Returns

`Promise`\<[`FoundContract`](../interfaces/FoundContract.md)\<`C`\>\>
