[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / Ledger8UnsubmittedDeployTxData

# Interface: Ledger8UnsubmittedDeployTxData\<C\>

What a retained-era deploy builder answers with: everything the constructor produced and the
unproven transaction, before the chain has recorded anything. Nothing is stored yet; storing the
signing key and the private state once the deploy is final is the caller's job.

## Type Parameters

### C

`C` *extends* [`Ledger8Contract`](Ledger8Contract.md)

## Properties

### era

> `readonly` **era**: `"v8"`

The pipeline that produced this result. A retained-era deploy runs only before the fork.

***

### private

> `readonly` **private**: `object`

#### initialPrivateState

> `readonly` **initialPrivateState**: [`Ledger8PrivateState`](../type-aliases/Ledger8PrivateState.md)\<`C`\>

The private state the constructor produced.

##### Remarks

**Privacy-sensitive.**

#### initialZswapState

> `readonly` **initialZswapState**: [`ZswapLocalState`](https://github.com/LFDT-Minokawa/compact)

The Zswap local state the constructor ended on.

##### Remarks

**Privacy-sensitive.** Shielded coin material.

#### signingKey

> `readonly` **signingKey**: [`SigningKey`](https://github.com/midnightntwrk/midnight-ledger)

The key the maintenance authority is built from: the caller's, or a SAMPLED one. A sampled
key exists nowhere else, so a caller that submits this deploy has to store it.

##### Remarks

**Privacy-sensitive.** Signing-key material.

#### unprovenTx

> `readonly` **unprovenTx**: [`UnprovenTx`](../../types/type-aliases/UnprovenTx.md)

The unproven deploy transaction, a ledger 8 one.

***

### public

> `readonly` **public**: `object`

#### contractAddress

> `readonly` **contractAddress**: `string`

The address the composition minted, which no other deployment shares.

#### initialContractState

> `readonly` **initialContractState**: [`SerializedContractState`](../../types/classes/SerializedContractState.md)\<`"v8"`\>

See [Ledger8FinalizedDeployTxData](Ledger8FinalizedDeployTxData.md).
