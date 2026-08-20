[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / Transaction

# Class: Transaction\<S, P, B\>

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2409

A Midnight transaction, consisting a section of ContractActions, and a guaranteed and fallible [ZswapOffer](../../../midnight-js-protocol/ledger/classes/ZswapOffer.md).

The guaranteed section are run first, and fee payment is taken during this
part. If it succeeds, the fallible section is also run, and atomically
rolled back if it fails.

## Type Parameters

### S

`S` *extends* [`Signaturish`](../../../midnight-js-protocol/ledger/type-aliases/Signaturish.md)

### P

`P` *extends* [`Proofish`](../../../midnight-js-protocol/ledger/type-aliases/Proofish.md)

### B

`B` *extends* [`Bindingish`](../../../midnight-js-protocol/ledger/type-aliases/Bindingish.md)

## Properties

### bindingRandomness

> `readonly` **bindingRandomness**: `bigint`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2616

The binding randomness associated with this transaction

***

### fallibleOffer

> **fallibleOffer**: `Map`\<`number`, [`ZswapOffer`](../../../midnight-js-protocol/ledger/classes/ZswapOffer.md)\<`P`\>\> \| `undefined`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2600

The fallible Zswap offer

Note that writing to this re-computes binding information if and only if
this transaction is unbound *and* unproven. If this is not the case,
creating or removing offer components will lead to a binding error down
the line.

#### Throws

On writing if `B` is [Binding](../../../midnight-js-protocol/ledger/classes/Binding.md) or this is not a standard
transaction

***

### guaranteedOffer

> **guaranteedOffer**: [`ZswapOffer`](../../../midnight-js-protocol/ledger/classes/ZswapOffer.md)\<`P`\> \| `undefined`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2612

The guaranteed Zswap offer

Note that writing to this re-computes binding information if and only if
this transaction is unbound *and* unproven. If this is not the case,
creating or removing offer components will lead to a binding error down
the line.

#### Throws

On writing if `B` is [Binding](../../../midnight-js-protocol/ledger/classes/Binding.md) or this is not a standard
transaction

***

### intents

> **intents**: `Map`\<`number`, [`Intent`](../../../midnight-js-protocol/ledger/classes/Intent.md)\<`S`, `P`, `B`\>\> \| `undefined`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2588

The intents contained in this transaction

Note that writing to this re-computes binding information if and only if
this transaction is unbound *and* unproven. If this is not the case,
creating or removing intents will lead to a binding error down the line,
but modifying existing intents will succeed.

#### Throws

On writing if `B` is [Binding](../../../midnight-js-protocol/ledger/classes/Binding.md) or this is not a standard
transaction

***

### rewards

> `readonly` **rewards**: [`ClaimRewardsTransaction`](../../../midnight-js-protocol/ledger/classes/ClaimRewardsTransaction.md)\<`S`\> \| `undefined`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2576

The rewards this transaction represents, if applicable

## Methods

### addCalls()

> **addCalls**(`segment`, `calls`, `params`, `ttl`, `zswapInputs?`, `zswapOutputs?`, `zswapTransient?`): `Transaction`\<`S`, `P`, `B`\>

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2458

Adds a set of new calls to the transaction.

In contrast to [Intent.addCall](../../../midnight-js-protocol/ledger/classes/Intent.md#addcall), this takes calls *before*
transcript partitioning ([partitionTranscripts](../../../midnight-js-protocol/ledger/functions/partitionTranscripts.md)), will create the
target intent where needed, and will ensure that relevant Zswap parts are
placed in the same section as contract interactions with them.

#### Parameters

##### segment

[`SegmentSpecifier`](../../../midnight-js-protocol/ledger/type-aliases/SegmentSpecifier.md)

##### calls

[`PrePartitionContractCall`](../../../midnight-js-protocol/ledger/classes/PrePartitionContractCall.md)[]

##### params

[`LedgerParameters`](../../../midnight-js-protocol/ledger/classes/LedgerParameters.md)

##### ttl

`Date`

##### zswapInputs?

[`ZswapInput`](../../../midnight-js-protocol/ledger/classes/ZswapInput.md)\<[`PreProof`](../../../midnight-js-protocol/ledger/classes/PreProof.md)\>[]

##### zswapOutputs?

[`ZswapOutput`](../../../midnight-js-protocol/ledger/classes/ZswapOutput.md)\<[`PreProof`](../../../midnight-js-protocol/ledger/classes/PreProof.md)\>[]

##### zswapTransient?

[`ZswapTransient`](../../../midnight-js-protocol/ledger/classes/ZswapTransient.md)\<[`PreProof`](../../../midnight-js-protocol/ledger/classes/PreProof.md)\>[]

#### Returns

`Transaction`\<`S`, `P`, `B`\>

#### Throws

If called on bound, proven, or proof-erased transactions.

***

### addIntent()

> **addIntent**(`segment`, `intent`): `Transaction`\<`S`, `P`, `B`\>

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2483

Adds provided intent to the segment specified.

#### Parameters

##### segment

[`SegmentSpecifier`](../../../midnight-js-protocol/ledger/type-aliases/SegmentSpecifier.md)

##### intent

[`Intent`](../../../midnight-js-protocol/ledger/classes/Intent.md)\<`S`, `P`, `B`\> \| `undefined`

#### Returns

`Transaction`\<`S`, `P`, `B`\>

#### Throws

If called on bound transactions.

***

### addZswapOffer()

> **addZswapOffer**(`segment`, `offer`): `Transaction`\<`S`, `P`, `B`\>

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2473

Adds Zswap offer to the segment specified.

#### Parameters

##### segment

[`SegmentSpecifier`](../../../midnight-js-protocol/ledger/type-aliases/SegmentSpecifier.md)

##### offer

[`UnprovenOffer`](../../../midnight-js-protocol/ledger/type-aliases/UnprovenOffer.md) \| `undefined`

#### Returns

`Transaction`\<`S`, `P`, `B`\>

#### Throws

If called on bound transactions.

***

### bind()

> **bind**(): `Transaction`\<`S`, `P`, [`Binding`](../../../midnight-js-protocol/ledger/classes/Binding.md)\>

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2501

Enforces binding for this transaction. This is irreversible.

#### Returns

`Transaction`\<`S`, `P`, [`Binding`](../../../midnight-js-protocol/ledger/classes/Binding.md)\>

***

### cost()

> **cost**(`params`, `enforceTimeToDismiss?`): [`SyntheticCost`](../../../midnight-js-protocol/ledger/type-aliases/SyntheticCost.md)

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2552

The underlying resource cost of this transaction.

#### Parameters

##### params

[`LedgerParameters`](../../../midnight-js-protocol/ledger/classes/LedgerParameters.md)

##### enforceTimeToDismiss?

`boolean`

#### Returns

[`SyntheticCost`](../../../midnight-js-protocol/ledger/type-aliases/SyntheticCost.md)

***

### eraseProofs()

> **eraseProofs**(): `Transaction`\<`S`, [`NoProof`](../../../midnight-js-protocol/ledger/classes/NoProof.md), [`NoBinding`](../../../midnight-js-protocol/ledger/classes/NoBinding.md)\>

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2491

Erases the proofs contained in this transaction

#### Returns

`Transaction`\<`S`, [`NoProof`](../../../midnight-js-protocol/ledger/classes/NoProof.md), [`NoBinding`](../../../midnight-js-protocol/ledger/classes/NoBinding.md)\>

***

### eraseSignatures()

> **eraseSignatures**(): `Transaction`\<[`SignatureErased`](../../../midnight-js-protocol/ledger/classes/SignatureErased.md), `P`, `B`\>

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2496

Removes signatures from this transaction.

#### Returns

`Transaction`\<[`SignatureErased`](../../../midnight-js-protocol/ledger/classes/SignatureErased.md), `P`, `B`\>

***

### fees()

> **fees**(`params`, `enforceTimeToDismiss?`): `bigint`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2559

The cost of this transaction, in SPECKs.

Note that this is *only* accurate when called with proven transactions.

#### Parameters

##### params

[`LedgerParameters`](../../../midnight-js-protocol/ledger/classes/LedgerParameters.md)

##### enforceTimeToDismiss?

`boolean`

#### Returns

`bigint`

***

### feesWithMargin()

> **feesWithMargin**(`params`, `margin`): `bigint`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2569

The cost of this transaction, in SPECKs, with a safety margin of `n` blocks applied.

As with [fees](#fees), this is only accurate for proven transactions.

Warning: `n` must be a non-negative integer, and it is an exponent, it is
very easy to get a completely unreasonable margin here!

#### Parameters

##### params

[`LedgerParameters`](../../../midnight-js-protocol/ledger/classes/LedgerParameters.md)

##### margin

`number`

#### Returns

`bigint`

***

### identifiers()

> **identifiers**(): `string`[]

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2521

Returns the set of identifiers contained within this transaction. Any of
these *may* be used to watch for a specific transaction.

#### Returns

`string`[]

***

### imbalances()

> **imbalances**(`segment`, `fees?`): `Map`\<[`TokenType`](../../../midnight-js-protocol/ledger/type-aliases/TokenType.md), `bigint`\>

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2547

For given fees, and a given section (guaranteed/fallible), what the
surplus or deficit of this transaction in any token type is.

#### Parameters

##### segment

`number`

##### fees?

`bigint`

#### Returns

`Map`\<[`TokenType`](../../../midnight-js-protocol/ledger/type-aliases/TokenType.md), `bigint`\>

#### Throws

If `segment` is not a valid segment ID

***

### merge()

> **merge**(`other`): `Transaction`\<`S`, `P`, `B`\>

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2529

Merges this transaction with another

#### Parameters

##### other

`Transaction`\<`S`, `P`, `B`\>

#### Returns

`Transaction`\<`S`, `P`, `B`\>

#### Throws

If both transactions have contract interactions, or they spend the
same coins

***

### mockProve()

> **mockProve**(): `Transaction`\<`S`, [`Proof`](../../../midnight-js-protocol/ledger/classes/Proof.md), [`Binding`](../../../midnight-js-protocol/ledger/classes/Binding.md)\>

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2439

Mocks proving, producing a 'proven' transaction that, while it will
*not* verify, is accurate for fee computation purposes.

Due to the variability in proof sizes, this *only* works for transactions
that do not contain unproven contract calls.

#### Returns

`Transaction`\<`S`, [`Proof`](../../../midnight-js-protocol/ledger/classes/Proof.md), [`Binding`](../../../midnight-js-protocol/ledger/classes/Binding.md)\>

#### Throws

If called on bound, proven, or proof-erased transactions, or if the
transaction contains unproven contract calls.

***

### prove()

> **prove**(`provider`, `cost_model`): `Promise`\<`Transaction`\<`S`, [`Proof`](../../../midnight-js-protocol/ledger/classes/Proof.md), `B`\>\>

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2446

Proves the transaction, with access to a low-level proving provider.
This may *only* be called for `P = PreProof`.

#### Parameters

##### provider

[`ProvingProvider`](../../../midnight-js-protocol/ledger/type-aliases/ProvingProvider.md)

##### cost\_model

[`CostModel`](../../../midnight-js-protocol/ledger/classes/CostModel.md)

#### Returns

`Promise`\<`Transaction`\<`S`, [`Proof`](../../../midnight-js-protocol/ledger/classes/Proof.md), `B`\>\>

#### Throws

If called on bound, proven, or proof-erased transactions.

***

### serialize()

> **serialize**(): `Uint8Array`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2531

#### Returns

`Uint8Array`

***

### toString()

> **toString**(`compact?`): `string`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2571

#### Parameters

##### compact?

`boolean`

#### Returns

`string`

***

### transactionHash()

> **transactionHash**(): `string`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2515

Returns the hash associated with this transaction. Due to the ability to
merge transactions, this should not be used to watch for a specific
transaction.

#### Returns

`string`

***

### wellFormed()

> **wellFormed**(`ref_state`, `strictness`, `tblock`): [`VerifiedTransaction`](../../../midnight-js-protocol/ledger/classes/VerifiedTransaction.md)

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2508

Tests well-formedness criteria, optionally including transaction balancing

#### Parameters

##### ref\_state

[`LedgerState`](../../../midnight-js-protocol/ledger/classes/LedgerState.md)

##### strictness

[`WellFormedStrictness`](../../../midnight-js-protocol/ledger/classes/WellFormedStrictness.md)

##### tblock

`Date`

#### Returns

[`VerifiedTransaction`](../../../midnight-js-protocol/ledger/classes/VerifiedTransaction.md)

#### Throws

If the transaction is not well-formed for any reason

***

### deserialize()

> `static` **deserialize**\<`S`, `P`, `B`\>(`markerS`, `markerP`, `markerB`, `raw`): `Transaction`\<`S`, `P`, `B`\>

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2533

#### Type Parameters

##### S

`S` *extends* [`Signaturish`](../../../midnight-js-protocol/ledger/type-aliases/Signaturish.md)

##### P

`P` *extends* [`Proofish`](../../../midnight-js-protocol/ledger/type-aliases/Proofish.md)

##### B

`B` *extends* [`Bindingish`](../../../midnight-js-protocol/ledger/type-aliases/Bindingish.md)

#### Parameters

##### markerS

`S`\[`"instance"`\]

##### markerP

`P`\[`"instance"`\]

##### markerB

`B`\[`"instance"`\]

##### raw

`Uint8Array`

#### Returns

`Transaction`\<`S`, `P`, `B`\>

***

### fromParts()

> `static` **fromParts**(`network_id`, `guaranteed?`, `fallible?`, `intent?`): [`UnprovenTransaction`](../../../midnight-js-protocol/ledger/type-aliases/UnprovenTransaction.md)

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2415

Creates a transaction from its parts.

#### Parameters

##### network\_id

`string`

##### guaranteed?

[`UnprovenOffer`](../../../midnight-js-protocol/ledger/type-aliases/UnprovenOffer.md)

##### fallible?

[`UnprovenOffer`](../../../midnight-js-protocol/ledger/type-aliases/UnprovenOffer.md)

##### intent?

[`UnprovenIntent`](../../../midnight-js-protocol/ledger/type-aliases/UnprovenIntent.md)

#### Returns

[`UnprovenTransaction`](../../../midnight-js-protocol/ledger/type-aliases/UnprovenTransaction.md)

***

### fromPartsRandomized()

> `static` **fromPartsRandomized**(`network_id`, `guaranteed?`, `fallible?`, `intent?`): [`UnprovenTransaction`](../../../midnight-js-protocol/ledger/type-aliases/UnprovenTransaction.md)

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2421

Creates a transaction from its parts, randomizing the segment ID to better
allow merging.

#### Parameters

##### network\_id

`string`

##### guaranteed?

[`UnprovenOffer`](../../../midnight-js-protocol/ledger/type-aliases/UnprovenOffer.md)

##### fallible?

[`UnprovenOffer`](../../../midnight-js-protocol/ledger/type-aliases/UnprovenOffer.md)

##### intent?

[`UnprovenIntent`](../../../midnight-js-protocol/ledger/type-aliases/UnprovenIntent.md)

#### Returns

[`UnprovenTransaction`](../../../midnight-js-protocol/ledger/type-aliases/UnprovenTransaction.md)

***

### fromRewards()

> `static` **fromRewards**\<`S`\>(`rewards`): `Transaction`\<`S`, [`PreProof`](../../../midnight-js-protocol/ledger/classes/PreProof.md), [`Binding`](../../../midnight-js-protocol/ledger/classes/Binding.md)\>

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2427

Creates a rewards claim transaction, the funds claimed must have been
legitimately rewarded previously.

#### Type Parameters

##### S

`S` *extends* [`Signaturish`](../../../midnight-js-protocol/ledger/type-aliases/Signaturish.md)

#### Parameters

##### rewards

[`ClaimRewardsTransaction`](../../../midnight-js-protocol/ledger/classes/ClaimRewardsTransaction.md)\<`S`\>

#### Returns

`Transaction`\<`S`, [`PreProof`](../../../midnight-js-protocol/ledger/classes/PreProof.md), [`Binding`](../../../midnight-js-protocol/ledger/classes/Binding.md)\>
