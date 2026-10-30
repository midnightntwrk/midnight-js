[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / findDeployedContract

# Function: findDeployedContract()

## Call Signature

> **findDeployedContract**\<`C`\>(`providers`, `options`): `Promise`\<[`Ledger8FoundContract`](../interfaces/Ledger8FoundContract.md)\<`C`\>\>

The retained-era overload. Accepts a contract produced by the PREVIOUS Compact toolchain, passed as
the raw contract instance rather than inside a `CompiledContract` container.

Nothing is COMPOSED and nothing is submitted: no transaction leaves this call. It reads the
network's ledger version, checks the fetched state's version tag against it, and byte-matches every local verifier
key against the slot the chain holds — the checks that make a later call against this contract
safe, done once here so a mis-dispatch is caught at attach time rather than at the first call.

It does write LOCALLY. Supplying `initialPrivateState` alongside `privateStateId` names the
contract address on the private-state provider and stores that state under the id, so the calls
made through `callTx` read it back. Supplying it with no id is a caller error —
`IncompleteFindContractPrivateStateConfig` — because there is nowhere to put the state, and so
is writing `privateStateId` with an undefined value. Naming an id the provider holds nothing
under is refused too, rather than attaching against a state the contract never had.

The deploy record is returned ERA-TAGGED rather than narrowed to the current era, so it needs
narrowing on `era` before `tx` is touched.

### Type Parameters

#### C

`C` *extends* [`Ledger8Contract`](../interfaces/Ledger8Contract.md)\<`unknown`\>

### Parameters

#### providers

[`Ledger8ContractProviders`](../type-aliases/Ledger8ContractProviders.md)\<`C`, [`Ledger8CircuitId`](../type-aliases/Ledger8CircuitId.md)\<`C`\>\>

#### options

[`Ledger8FindDeployedContractOptions`](../interfaces/Ledger8FindDeployedContractOptions.md)\<`C`\>

### Returns

`Promise`\<[`Ledger8FoundContract`](../interfaces/Ledger8FoundContract.md)\<`C`\>\>

### Throws

IncompleteFindContractPrivateStateConfig if an `initialPrivateState` is supplied with no
        `privateStateId` to store it under.

### See

[OverloadTyping](../../documents/OverloadTyping.md) for how the two eras are discriminated, and why the record is
era-tagged.

## Call Signature

> **findDeployedContract**\<`C`\>(`providers`, `options`): `Promise`\<[`Ledger9FoundContract`](../interfaces/Ledger9FoundContract.md)\<`C`\>\>

Attaches to a deployed contract that declares no private state.

### Type Parameters

#### C

`C` *extends* [`Contract`](https://github.com/midnightntwrk/midnight-sdk)\<`undefined`, [`Witnesses`](https://github.com/midnightntwrk/midnight-sdk)\<`undefined`\>\>

### Parameters

#### providers

[`Ledger9ContractProviders`](../type-aliases/Ledger9ContractProviders.md)\<`C`, [`ProvableCircuitId`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>, `unknown`\>

#### options

[`FindDeployedContractOptionsBase`](../interfaces/FindDeployedContractOptionsBase.md)\<`C`\>

### Returns

`Promise`\<[`Ledger9FoundContract`](../interfaces/Ledger9FoundContract.md)\<`C`\>\>

## Call Signature

> **findDeployedContract**\<`C`\>(`providers`, `options`): `Promise`\<[`Ledger9FoundContract`](../interfaces/Ledger9FoundContract.md)\<`C`\>\>

Attaches to a deployed contract, reusing the private state already stored at `privateStateId`.

### Type Parameters

#### C

`C` *extends* [`Any`](https://github.com/midnightntwrk/midnight-sdk)

### Parameters

#### providers

[`Ledger9ContractProviders`](../type-aliases/Ledger9ContractProviders.md)\<`C`\>

#### options

[`FindDeployedContractOptionsExistingPrivateState`](../interfaces/FindDeployedContractOptionsExistingPrivateState.md)\<`C`\>

### Returns

`Promise`\<[`Ledger9FoundContract`](../interfaces/Ledger9FoundContract.md)\<`C`\>\>

## Call Signature

> **findDeployedContract**\<`C`\>(`providers`, `options`): `Promise`\<[`Ledger9FoundContract`](../interfaces/Ledger9FoundContract.md)\<`C`\>\>

Attaches to a deployed contract, storing the given `initialPrivateState` at `privateStateId`.

### Type Parameters

#### C

`C` *extends* [`Any`](https://github.com/midnightntwrk/midnight-sdk)

### Parameters

#### providers

[`Ledger9ContractProviders`](../type-aliases/Ledger9ContractProviders.md)\<`C`\>

#### options

[`FindDeployedContractOptionsStorePrivateState`](../interfaces/FindDeployedContractOptionsStorePrivateState.md)\<`C`\>

### Returns

`Promise`\<[`Ledger9FoundContract`](../interfaces/Ledger9FoundContract.md)\<`C`\>\>
