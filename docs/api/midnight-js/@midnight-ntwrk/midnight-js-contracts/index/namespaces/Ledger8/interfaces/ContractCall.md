[**Midnight.js API Reference v5.0.0-beta.7**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../../../README.md) / [index](../../../README.md) / [Ledger8](../README.md) / ContractCall

# Interface: ContractCall\<TState\>

Proof data for ONE retained-era contract call.

The retained era's counterpart of `compact-js`'s `ContractCall`: it carries
every member that one does, under the same name and meaning, and adds three.
`public.contractState` differs only in TYPE — each era's state handle comes
from its own runtime. The additions are `public.contractStateEncoded` and the
pre-call pair, which the current era has no counterpart for.

## Type Parameters

### TState

`TState` = `DownConvertedState`

See [Ledger8ContractCallPublic](ContractCallPublic.md).

## Properties

### circuitId

> `readonly` **circuitId**: `string`

***

### communicationCommitment

> `readonly` **communicationCommitment**: `Option`\<[`CommunicationCommitmentData`](https://github.com/LFDT-Minokawa/compact)\>

ALWAYS `Option.none()` on this era: the commitment binds a cross-contract
sub-call to its caller, and a pre-fork contract cannot make one. The member
is carried rather than omitted so a caller reading a call entry does not
have to branch on which era produced it.

***

### contractAddress

> `readonly` **contractAddress**: `string`

***

### private

> `readonly` **private**: [`ContractCallPrivateBase`](../../../../../midnight-js/types/interfaces/ContractCallPrivateBase.md)

***

### public

> `readonly` **public**: [`ContractCallPublic`](ContractCallPublic.md)\<`TState`\>
