[**Midnight.js API Reference v5.0.0-beta.3**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../README.md) / CallResult

# Type Alias: CallResult\<C, PCK\>

> **CallResult**\<`C`, `PCK`\> = `object`

Contains all information resulting from circuit execution.

## Remarks

**Privacy-sensitive type.** The `private` field is a
[CallResultPrivate](CallResultPrivate.md) carrying ZK-confidential data. Treat the whole
object as confidential when logging, serializing, or transmitting — read
only the `public` field or destructure specific non-sensitive fields rather
than spreading or stringifying the whole object.

## Type Parameters

### C

`C` *extends* `Contract.Any`

### PCK

`PCK` *extends* `Contract.ProvableCircuitId`\<`C`\>

## Properties

### calls

> `readonly` **calls**: readonly `ContractExecutable.ContractExecutable.ContractCall`[]

Proof data for every contract call made while executing the circuit, in execution-trace order:
cross-contract callees first, the root call last. For a circuit that performs no cross-contract
calls this contains a single entry (the root). Consistent with `compact-js`'s
`ContractExecutable.CallResult.calls`.

#### Remarks

**Privacy-sensitive.** Each entry carries ZK input/output and private transcript data
for a call in the tree. Treat as confidential alongside [private](#private).

***

### private

> `readonly` **private**: [`CallResultPrivate`](CallResultPrivate.md)\<`C`, `PCK`\>

The private/sensitive data produced by the circuit execution.

#### Remarks

Describes the **root** contract call. Equivalent to the last entry of [calls](#calls).

***

### public

> `readonly` **public**: [`CallResultPublic`](CallResultPublic.md)

The public/non-sensitive data produced by the circuit execution.

#### Remarks

Describes the **root** contract call (the circuit that was invoked). It is the
application-facing view; equivalent to the last entry of [calls](#calls).
