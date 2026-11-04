[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / SerializedContractState

# Class: SerializedContractState\<E\>

A contract state as the bytes the ledger wrote, with the era of the ledger that wrote them.

No read hands out a decoded state. The caller decodes it with its own runtime, so the state comes
back as an object its compiled contract accepts:

```ts
import { ContractState } from '@midnight-ntwrk/compact-runtime';

const read = await publicDataProvider.queryContractState(address);
if (read !== null) {
  const state = ledger(read.contractState.deserialize({ v9: ContractState }).data);
}
```

The bytes live in a private field, so `structuredClone`, `postMessage` and JSON drop them. To send
one elsewhere, send `serialize()` and `era`, and rebuild it with
[SerializedContractState.fromBytes](#frombytes).

## Type Parameters

### E

`E` *extends* [`LedgerEra`](../../type-aliases/LedgerEra.md) = [`LedgerEra`](../../type-aliases/LedgerEra.md)

The era of the ledger that wrote it.

## Properties

### era

> `readonly` **era**: `E`

## Methods

### deserialize()

> **deserialize**\<`D`\>(`decoders`): `DecodedByEra`\<`D`, `E`\>

Decodes the state with the decoder for its own era.

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

> `static` **fromBytes**\<`E`\>(`era`, `bytes`): `SerializedContractState`\<`E`\>

Wraps the bytes of a contract state the ledger of `era` wrote.

#### Type Parameters

##### E

`E` *extends* `"v8"` \| `"v9"`

#### Parameters

##### era

`E`

##### bytes

`Uint8Array`

#### Returns

`SerializedContractState`\<`E`\>

#### Throws

UnknownLedgerEraError when `era` is not a supported ledger era.

#### Throws

InvalidSerializedStateError when `bytes` is not a `Uint8Array`, or does not start with
the tag that ledger writes for a contract state.

***

### isSerializedContractState()

> `static` **isSerializedContractState**(`value`): value is SerializedContractState\<"v8" \| "v9"\>

Whether `value` was made by [SerializedContractState.fromBytes](#frombytes) of this copy of the
package. A look-alike object, or one made by a second installed copy of the package, gives
`false`.

#### Parameters

##### value

`unknown`

#### Returns

value is SerializedContractState\<"v8" \| "v9"\>
