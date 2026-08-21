[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [ledger](../README.md) / DustLocalState

# Class: DustLocalState

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1649

## Constructors

### Constructor

> **new DustLocalState**(`params`): `DustLocalState`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1650

#### Parameters

##### params

[`DustParameters`](DustParameters.md)

#### Returns

`DustLocalState`

## Properties

### commitmentTreeFirstFree

> `readonly` **commitmentTreeFirstFree**: `bigint`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1683

***

### generatingTreeFirstFree

> `readonly` **generatingTreeFirstFree**: `bigint`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1682

***

### nullifiers

> `readonly` **nullifiers**: `Map`\<`bigint`, [`QualifiedDustOutput`](../type-aliases/QualifiedDustOutput.md)\>

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1679

***

### params

> `readonly` **params**: [`DustParameters`](DustParameters.md)

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1680

***

### syncTime

> **syncTime**: `Date`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1681

***

### utxos

> `readonly` **utxos**: [`QualifiedDustOutput`](../type-aliases/QualifiedDustOutput.md)[]

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1678

## Methods

### addUtxo()

> **addUtxo**(`nullifier`, `utxo`, `pendingUntil?`): `DustLocalState`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1672

#### Parameters

##### nullifier

`bigint`

##### utxo

[`QualifiedDustOutput`](../type-aliases/QualifiedDustOutput.md)

##### pendingUntil?

`Date`

#### Returns

`DustLocalState`

***

### applyCommitmentCollapsedUpdate()

> **applyCommitmentCollapsedUpdate**(`update`): `DustLocalState`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1662

#### Parameters

##### update

[`DustStateMerkleTreeCollapsedUpdate`](DustStateMerkleTreeCollapsedUpdate.md)

#### Returns

`DustLocalState`

***

### applyGenerationCollapsedUpdate()

> **applyGenerationCollapsedUpdate**(`update`): `DustLocalState`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1656

#### Parameters

##### update

[`DustStateMerkleTreeCollapsedUpdate`](DustStateMerkleTreeCollapsedUpdate.md)

#### Returns

`DustLocalState`

***

### collapseCommitmentTree()

> **collapseCommitmentTree**(`commitmentIndexStart`, `commitmentIndexEnd`): `DustLocalState`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1661

#### Parameters

##### commitmentIndexStart

`bigint`

##### commitmentIndexEnd

`bigint`

#### Returns

`DustLocalState`

***

### collapseGenerationTree()

> **collapseGenerationTree**(`generationIndexStart`, `generationIndexEnd`): `DustLocalState`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1655

#### Parameters

##### generationIndexStart

`bigint`

##### generationIndexEnd

`bigint`

#### Returns

`DustLocalState`

***

### commitmentTreeRoot()

> **commitmentTreeRoot**(): `bigint` \| `undefined`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1663

#### Returns

`bigint` \| `undefined`

***

### findUtxoByNullifier()

> **findUtxoByNullifier**(`nullifier`): [`QualifiedDustOutput`](../type-aliases/QualifiedDustOutput.md) \| `undefined`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1673

#### Parameters

##### nullifier

`bigint`

#### Returns

[`QualifiedDustOutput`](../type-aliases/QualifiedDustOutput.md) \| `undefined`

***

### generatingTreeRoot()

> **generatingTreeRoot**(): `bigint` \| `undefined`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1658

#### Returns

`bigint` \| `undefined`

***

### generationInfo()

> **generationInfo**(`qdo`): [`DustGenerationInfo`](../type-aliases/DustGenerationInfo.md) \| `undefined`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1652

#### Parameters

##### qdo

[`QualifiedDustOutput`](../type-aliases/QualifiedDustOutput.md)

#### Returns

[`DustGenerationInfo`](../type-aliases/DustGenerationInfo.md) \| `undefined`

***

### insertCommitment()

> **insertCommitment**(`commitmentIndex`, `qdo`, `own_qdo`): `DustLocalState`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1659

#### Parameters

##### commitmentIndex

`bigint`

##### qdo

[`QualifiedDustOutput`](../type-aliases/QualifiedDustOutput.md)

##### own\_qdo

`boolean`

#### Returns

`DustLocalState`

***

### insertGenerationInfo()

> **insertGenerationInfo**(`generationIndex`, `generation`, `initialNonce?`): `DustLocalState`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1653

#### Parameters

##### generationIndex

`bigint`

##### generation

[`DustGenerationInfo`](../type-aliases/DustGenerationInfo.md)

##### initialNonce?

`string`

#### Returns

`DustLocalState`

***

### processTtls()

> **processTtls**(`time`): `DustLocalState`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1665

#### Parameters

##### time

`Date`

#### Returns

`DustLocalState`

***

### removeCommitment()

> **removeCommitment**(`commitmentIndex`): `DustLocalState`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1660

#### Parameters

##### commitmentIndex

`bigint`

#### Returns

`DustLocalState`

***

### removeGenerationInfo()

> **removeGenerationInfo**(`generationIndex`, `generation`): `DustLocalState`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1654

#### Parameters

##### generationIndex

`bigint`

##### generation

[`DustGenerationInfo`](../type-aliases/DustGenerationInfo.md)

#### Returns

`DustLocalState`

***

### removeUtxo()

> **removeUtxo**(`nullifier`): `DustLocalState`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1674

#### Parameters

##### nullifier

`bigint`

#### Returns

`DustLocalState`

***

### replayEvents()

> **replayEvents**(`sk`, `events`): `DustLocalState`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1666

#### Parameters

##### sk

[`DustSecretKey`](DustSecretKey.md)

##### events

[`Event`](Event.md)[]

#### Returns

`DustLocalState`

***

### replayEventsWithChanges()

> **replayEventsWithChanges**(`sk`, `events`): [`DustLocalStateWithChanges`](DustLocalStateWithChanges.md)

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1667

#### Parameters

##### sk

[`DustSecretKey`](DustSecretKey.md)

##### events

[`Event`](Event.md)[]

#### Returns

[`DustLocalStateWithChanges`](DustLocalStateWithChanges.md)

***

### replayRawEvents()

> **replayRawEvents**(`sk`, `rawEvents`): [`DustLocalStateWithChanges`](DustLocalStateWithChanges.md)

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1671

Replays a direct concatenation of serialized ledger events. Otherwise, acts as `replayEventsWithChanges`.

#### Parameters

##### sk

[`DustSecretKey`](DustSecretKey.md)

##### rawEvents

`Uint8Array`

#### Returns

[`DustLocalStateWithChanges`](DustLocalStateWithChanges.md)

***

### serialize()

> **serialize**(): `Uint8Array`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1675

#### Returns

`Uint8Array`

***

### spend()

> **spend**(`sk`, `utxo`, `vFee`, `ctime`): \[`DustLocalState`, [`DustSpend`](DustSpend.md)\<[`PreProof`](PreProof.md)\>\]

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1664

#### Parameters

##### sk

[`DustSecretKey`](DustSecretKey.md)

##### utxo

[`QualifiedDustOutput`](../type-aliases/QualifiedDustOutput.md)

##### vFee

`bigint`

##### ctime

`Date`

#### Returns

\[`DustLocalState`, [`DustSpend`](DustSpend.md)\<[`PreProof`](PreProof.md)\>\]

***

### toString()

> **toString**(`compact?`): `string`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1677

#### Parameters

##### compact?

`boolean`

#### Returns

`string`

***

### updateGenerationTreeFromEvidence()

> **updateGenerationTreeFromEvidence**(`evidence`): `DustLocalState`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1657

#### Parameters

##### evidence

[`DustGenerationTreeInsertionPath`](DustGenerationTreeInsertionPath.md)

#### Returns

`DustLocalState`

***

### walletBalance()

> **walletBalance**(`time`): `bigint`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1651

#### Parameters

##### time

`Date`

#### Returns

`bigint`

***

### deserialize()

> `static` **deserialize**(`raw`): `DustLocalState`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1676

#### Parameters

##### raw

`Uint8Array`

#### Returns

`DustLocalState`
