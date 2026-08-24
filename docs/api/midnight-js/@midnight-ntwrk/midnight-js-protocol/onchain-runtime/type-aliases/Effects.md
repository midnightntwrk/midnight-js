[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [onchain-runtime](../README.md) / Effects

# Type Alias: Effects

> **Effects** = `object`

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:356

The contract-external effects of a transcript.

## Properties

### claimedContractCalls

> **claimedContractCalls**: \[`bigint`, [`ContractAddress`](ContractAddress.md), `string`, [`Fr`](Fr.md)\][]

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:379

The contracts called from this contract. The values are, in order:

- The sequence number of this call
- The contract being called
- The entry point being called
- The communications commitment

***

### claimedNullifiers

> **claimedNullifiers**: [`Nullifier`](Nullifier.md)[]

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:360

The nullifiers (spends) this contract call requires

***

### claimedShieldedReceives

> **claimedShieldedReceives**: [`CoinCommitment`](CoinCommitment.md)[]

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:365

The coin commitments (outputs) this contract call requires, as coins
received

***

### claimedShieldedSpends

> **claimedShieldedSpends**: [`CoinCommitment`](CoinCommitment.md)[]

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:370

The coin commitments (outputs) this contract call requires, as coins
sent

***

### claimedUnshieldedSpends

> **claimedUnshieldedSpends**: `Map`\<\[[`TokenType`](TokenType.md), [`PublicAddress`](PublicAddress.md)\], `bigint`\>

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:401

The unshielded UTXO outputs this contract expects to be present.

***

### shieldedMints

> **shieldedMints**: `Map`\<`string`, `bigint`\>

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:384

The shielded tokens minted in this call, as a map from hex-encoded 256-bit domain
separators to unsigned 64-bit integers.

***

### unshieldedInputs

> **unshieldedInputs**: `Map`\<[`TokenType`](TokenType.md), `bigint`\>

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:393

The unshielded inputs this contract expects.

***

### unshieldedMints

> **unshieldedMints**: `Map`\<`string`, `bigint`\>

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:389

The unshielded tokens minted in this call, as a map from hex-encoded 256-bit domain
separators to unsigned 64-bit integers.

***

### unshieldedOutputs

> **unshieldedOutputs**: `Map`\<[`TokenType`](TokenType.md), `bigint`\>

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:397

The unshielded outputs this contract authorizes.
