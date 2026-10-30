[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / createCallTxOptions

# Function: createCallTxOptions()

## Call Signature

> **createCallTxOptions**\<`C`, `PCK`\>(`compiledContract`, `circuitId`, `contractAddress`, `privateStateId`, `additionalCoinEncPublicKeyMappings`, `args`): [`Ledger8CallTxOptions`](../type-aliases/Ledger8CallTxOptions.md)\<`C`, `PCK`\>

Creates the options `submitCallTx` takes to call one circuit: a [Ledger9CallTxOptions](../type-aliases/Ledger9CallTxOptions.md) for a
ledger 9 `CompiledContract`, or a [Ledger8CallTxOptions](../type-aliases/Ledger8CallTxOptions.md) for a ledger 8 contract.

`args` is left out for a circuit that takes no arguments, and `privateStateId` when it is
`undefined`. `circuitId` must be a circuit the contract declares; a plain string literal is
accepted.

### Type Parameters

#### C

`C` *extends* [`Ledger8Contract`](../interfaces/Ledger8Contract.md)\<`unknown`\>

#### PCK

`PCK` *extends* `string`

### Parameters

#### compiledContract

`C`

The contract the circuit belongs to.

#### circuitId

`PCK`

The circuit to call.

#### contractAddress

`string`

The ledger address of the contract.

#### privateStateId

`string` \| `undefined`

Where to read and store the contract's private state,
or `undefined` for a contract that carries none.

#### additionalCoinEncPublicKeyMappings

`ReadonlyMap`\<`string`, `string`\> \| `undefined`

Encryption keys for shielded coins the circuit pays
to a recipient other than the calling wallet, or `undefined` for none.

#### args

[`Ledger8CircuitParameters`](../type-aliases/Ledger8CircuitParameters.md)\<`C`, `PCK`\>

The circuit's own arguments.

### Returns

[`Ledger8CallTxOptions`](../type-aliases/Ledger8CallTxOptions.md)\<`C`, `PCK`\>

### Throws

EraMismatchError If `compiledContract` has the shape of neither a ledger 8
contract nor a ledger 9 `CompiledContract`.

## Call Signature

> **createCallTxOptions**\<`C`, `PCK`\>(`compiledContract`, `circuitId`, `contractAddress`, `privateStateId`, `additionalCoinEncPublicKeyMappings`, `args`): [`Ledger9CallTxOptions`](../type-aliases/Ledger9CallTxOptions.md)\<`C`, `PCK`\>

Creates the options `submitCallTx` takes to call one circuit: a [Ledger9CallTxOptions](../type-aliases/Ledger9CallTxOptions.md) for a
ledger 9 `CompiledContract`, or a [Ledger8CallTxOptions](../type-aliases/Ledger8CallTxOptions.md) for a ledger 8 contract.

`args` is left out for a circuit that takes no arguments, and `privateStateId` when it is
`undefined`. `circuitId` must be a circuit the contract declares; a plain string literal is
accepted.

### Type Parameters

#### C

`C` *extends* [`Any`](https://github.com/midnightntwrk/midnight-sdk)

#### PCK

`PCK` *extends* `string`

### Parameters

#### compiledContract

[`CompiledContract`](https://github.com/midnightntwrk/midnight-sdk)\<`C`, `any`\>

The contract the circuit belongs to.

#### circuitId

`PCK`

The circuit to call.

#### contractAddress

`string`

The ledger address of the contract.

#### privateStateId

`string` \| `undefined`

Where to read and store the contract's private state,
or `undefined` for a contract that carries none.

#### additionalCoinEncPublicKeyMappings

`ReadonlyMap`\<`string`, `string`\> \| `undefined`

Encryption keys for shielded coins the circuit pays
to a recipient other than the calling wallet, or `undefined` for none.

#### args

[`CircuitParameters`](https://github.com/midnightntwrk/midnight-sdk)\<`C`, `PCK`\>

The circuit's own arguments.

### Returns

[`Ledger9CallTxOptions`](../type-aliases/Ledger9CallTxOptions.md)\<`C`, `PCK`\>

### Throws

EraMismatchError If `compiledContract` has the shape of neither a ledger 8
contract nor a ledger 9 `CompiledContract`.
