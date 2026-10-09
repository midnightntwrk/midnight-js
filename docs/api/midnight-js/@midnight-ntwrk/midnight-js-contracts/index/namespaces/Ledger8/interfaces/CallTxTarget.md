[**Midnight.js API Reference v5.0.0-rc.4**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../../../README.md) / [index](../../../README.md) / [Ledger8](../README.md) / CallTxTarget

# Interface: CallTxTarget\<C, K\>

The target of a retained-era circuit invocation, without its arguments.

## Type Parameters

### C

`C` *extends* [`Contract`](Contract.md)

### K

`K` *extends* [`CircuitId`](../type-aliases/CircuitId.md)\<`C`\>

## Properties

### additionalCoinEncPublicKeyMappings?

> `readonly` `optional` **additionalCoinEncPublicKeyMappings?**: `ReadonlyMap`\<`string`, `string`\>

An optional mapping of [CoinPublicKey](https://github.com/midnightntwrk/midnight-ledger) to [EncPublicKey](https://github.com/midnightntwrk/midnight-ledger) used to
encrypt shielded coins the circuit pays to a recipient other than the
calling wallet. A user-owned recipient that is neither the calling wallet,
the burn address, nor a key in this map is refused with
`Ledger8RecipientUnmappableError` before anything is proven.

***

### circuitId

> `readonly` **circuitId**: `K`

The identifier of the circuit to call.

***

### compiledContract

> `readonly` **compiledContract**: `C`

The retained-era contract instance, passed raw — there is no
`CompiledContract` container for this era.

***

### contractAddress

> `readonly` **contractAddress**: `string`

The address of the contract being called.
