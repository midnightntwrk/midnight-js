[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../../README.md) / [index](../README.md) / SerializedState

# Class: SerializedState\<K, E\>

A value the ledger wrote — a contract state, ledger parameters or a zswap chain state — carried
as its bytes, with the era of the ledger that wrote them.

No read hands out a decoded state. The caller decodes it with its own runtime, so a contract
state comes back as an object its compiled contract accepts:

```ts
import { ContractState } from '@midnight-ntwrk/compact-runtime';

const read = await publicDataProvider.queryContractState(address);
if (read !== null) {
  const state = ledger(read.contractState.deserialize({ v9: ContractState }).data);
}
```

A `SerializedState` keeps its bytes in a private field, so `structuredClone`, `postMessage` and JSON
drop them. To send one elsewhere, send `serialize()` and `era`, and rebuild it with
[SerializedState.fromBytes](#frombytes).

## Type Parameters

### K

`K` *extends* [`StateKind`](../type-aliases/StateKind.md) = [`StateKind`](../type-aliases/StateKind.md)

The kind of value.

### E

`E` *extends* `LedgerVersion` = `LedgerVersion`

The era of the ledger that wrote it.

## Properties

### era

> `readonly` **era**: `E`

***

### kind

> `readonly` **kind**: `K`

## Methods

### deserialize()

> **deserialize**\<`D`\>(`decoders`): `DecodedByEra`\<`D`, `E`\>

Decodes the value with the decoder for its own era.

#### Type Parameters

##### D

`D` *extends* `Readonly`\<`Partial`\<`Record`\<`"v8"` \| `"v9"`, [`StateDecoder`](../interfaces/StateDecoder.md)\<`unknown`\>\>\>\>

#### Parameters

##### decoders

[`DecodersFor`](../type-aliases/DecodersFor.md)\<`D`, `E`\>

One decoder per ledger era, from the caller's own runtime, e.g.
`{ v9: ContractState }`. Decoders with none for any era this value can be do not compile.

#### Returns

`DecodedByEra`\<`D`, `E`\>

#### Throws

SerializedStateDecoderMissingError when `decoders` has none for [era](#era), which only a
value whose era is not known when compiling can reach.

#### Throws

SerializedStateDecodeFailedError when the decoder throws an error that is not a
`MidnightJsError`, for example because it decodes another kind or the bytes after the tag are
corrupt. A `MidnightJsError` from the decoder is rethrown unchanged.

***

### serialize()

> **serialize**(): `Uint8Array`

#### Returns

`Uint8Array`

A copy of the bytes, exactly as the ledger wrote them.

***

### fromBytes()

> `static` **fromBytes**\<`E`, `K`\>(`era`, `kind`, `bytes`): `SerializedState`\<`K`, `E`\>

Wraps bytes the ledger of `era` wrote for a value of `kind`.

#### Type Parameters

##### E

`E` *extends* `"v8"` \| `"v9"`

##### K

`K` *extends* `"ContractState"` \| `"LedgerParameters"` \| `"ZswapChainState"`

#### Parameters

##### era

`E`

##### kind

`K`

##### bytes

`Uint8Array`

#### Returns

`SerializedState`\<`K`, `E`\>

#### Throws

UnknownLedgerVersionError when `era` is not a supported ledger era.

#### Throws

InvalidSerializedStateError when `kind` is unknown, `bytes` is not a `Uint8Array`, or the
bytes do not start with the tag that ledger writes for that kind.

***

### isSerializedState()

> `static` **isSerializedState**(`value`): value is SerializedState\<"ContractState" \| "LedgerParameters" \| "ZswapChainState", "v8" \| "v9"\>

Whether `value` was made by [SerializedState.fromBytes](#frombytes) of this copy of the package. A
look-alike object, or one made by a second installed copy of the package, gives `false`.

#### Parameters

##### value

`unknown`

#### Returns

value is SerializedState\<"ContractState" \| "LedgerParameters" \| "ZswapChainState", "v8" \| "v9"\>
