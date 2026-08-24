[**Midnight.js API Reference v5.0.0-beta.7**](../../../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../../../../../README.md) / [compact-js](../../../../../README.md) / [ContractExecutable](../../../README.md) / [ContractExecutable](../README.md) / ContractCall

# Type Alias: ContractCall

> **ContractCall** = `object`

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/ContractExecutable.d.ts:123

Proof data for a single contract call. One ContractCall is produced for every call
made while executing a circuit — the root call plus one per cross-contract call —
corresponding to the entries of the runtime's `callProofDataTrace`.

## Properties

### circuitId

> `readonly` **circuitId**: `string`

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/ContractExecutable.d.ts:125

***

### communicationCommitment

> `readonly` **communicationCommitment**: `Option.Option`\<[`CommunicationCommitmentData`](../../../../../../compact-runtime/interfaces/CommunicationCommitmentData.md)\>

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/ContractExecutable.d.ts:133

The communication commitment binding this call to its caller. Present (`Option.some`) for
cross-contract sub-calls (callees); `Option.none` for the root call, which is no one's
callee.

***

### contractAddress

> `readonly` **contractAddress**: [`ContractAddress`](../../../../../../platform-js/effect/ContractAddress/type-aliases/ContractAddress.md)

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/ContractExecutable.d.ts:124

***

### private

> `readonly` **private**: [`ContractCallPrivate`](ContractCallPrivate.md)

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/ContractExecutable.d.ts:127

***

### public

> `readonly` **public**: [`ContractCallPublic`](ContractCallPublic.md)

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/ContractExecutable.d.ts:126
