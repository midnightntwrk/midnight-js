[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / findDeployedContract

# Function: findDeployedContract()

Creates an instance of [Ledger9FoundContract](../interfaces/Ledger9FoundContract.md) given the address of a deployed contract and an
optional private state ID at which an existing private state is stored. When given, the current value
at the private state ID is used as the `initialPrivateState` value in the `finalizedDeployTxData`
property of the returned `Ledger9FoundContract`.

## Param

**providers**

The providers used to manage transaction lifecycles.

## Param

**options**

Configuration.

## Throws

InvalidArgumentError `privateStateId` is present with an undefined value.

## Throws

PrivateStateNotFoundError `privateStateId` is named, no `initialPrivateState` is given, and
                                  nothing is stored under it.

## Throws

ContractNotFoundError No contract state could be found at `contractAddress`.

## Throws

EraMismatchError with reason `'ledger8-contract-state-unsupported'` The current contract state was written by the v8
ledger, and these artifacts come from the current toolchain.

## Throws

EraInvariantViolationError A v9 deploy record whose deploy state the provider tags v8. The
                                   error names `contractAddress`.

## Throws

UnknownLedgerVersionError The deploy record carries no readable era tag.

## Throws

UnknownLedgerVersionError The deploy state is not a `SerializedState`: the shape of a pre-5.0.0
                                provider.

## Throws

InvalidArgumentError Thrown if `contractAddress` is not correctly formatted as a contract address.

## Throws

ContractTypeError One or more circuits defined on `contract` are undefined on the contract
                          state found at `contractAddress`, carry no deployed verifier key, or
                          have mis-matched verifier keys.

## Throws

IncompleteFindContractPrivateStateConfig If an `initialPrivateState` is given but no
                                                 `privateStateId` is given to store it under.

## Throws

EraMismatchError If `options.compiledContract` belongs to neither Compact era, or
                                 is a raw current-era contract instance passed instead of its
                                 `CompiledContract` container, or its artifacts declare no
                                 toolchain this framework can place. Raised before anything is
                                 read from the chain; the ZK config provider is asked for the
                                 artifacts' declared runtime version, and no other provider is
                                 consulted.

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

[`Ledger9FindDeployedContractOptionsBase`](../interfaces/Ledger9FindDeployedContractOptionsBase.md)\<`C`\>

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

[`Ledger9FindDeployedContractOptionsExistingPrivateState`](../interfaces/Ledger9FindDeployedContractOptionsExistingPrivateState.md)\<`C`\>

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

[`Ledger9FindDeployedContractOptionsStorePrivateState`](../interfaces/Ledger9FindDeployedContractOptionsStorePrivateState.md)\<`C`\>

### Returns

`Promise`\<[`Ledger9FoundContract`](../interfaces/Ledger9FoundContract.md)\<`C`\>\>
