[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [compact-runtime](../README.md) / contractDependencies

# Variable: contractDependencies

> `const` **contractDependencies**: (`contractReferenceLocations`, `state`) => [`ContractAddress`](../../onchain-runtime/type-aliases/ContractAddress.md)[]

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/contract-dependencies.d.ts:177

// TODO: Remove compiler support for contract dependencies once CCCs land.

Given a [StateValue](../../onchain-runtime/classes/StateValue.md) representing the current ledger state of a contract, uses the [ContractReferenceLocations](../type-aliases/ContractReferenceLocations.md)
object produced by the Compact compiler to extract the current contract addresses present in the given ledger state. The produced
contract addresses represent the contracts on which the root contract depends. The dependencies are used in a multi-contract
setting to fetch the ledger states of all contracts on which the root contract depends prior to execution.

NOTE: The given [ContractReferenceLocations](../type-aliases/ContractReferenceLocations.md) must be from the contract executable containing the ledger state constructor
      that produced the given [StateValue](../../onchain-runtime/classes/StateValue.md).

## Parameters

### contractReferenceLocations

[`ContractReferenceLocations`](../type-aliases/ContractReferenceLocations.md)

A data structure pointing to contract references in the ledger state of the root contract.

### state

[`StateValue`](../../onchain-runtime/classes/StateValue.md)

The current ledger state of the root contract.

## Returns

[`ContractAddress`](../../onchain-runtime/type-aliases/ContractAddress.md)[]

A list of all contract addresses (references) present in the given ledger state.

## Remarks

The algorithm has three main stages:

         1. It unwraps the [PublicLedgerSegments](../type-aliases/PublicLedgerSegments.md) in the given [ContractReferenceLocations](../type-aliases/ContractReferenceLocations.md) until a [SparseCompactADT](../type-aliases/SparseCompactADT.md) is reached.
            Each time a [PublicLedgerSegments](../type-aliases/PublicLedgerSegments.md) is unwrapped, it casts the current state value to a state value array and proceeds recursively with each
            of the state values and unwrapped ledger segments.
         2. It unwraps each [SparseCompactADT](../type-aliases/SparseCompactADT.md) in the current [PublicLedgerSegments](../type-aliases/PublicLedgerSegments.md) until a [SparseCompactType](../type-aliases/SparseCompactType.md) is reached.
            Each time a [SparseCompactADT](../type-aliases/SparseCompactADT.md) is unwrapped, it casts the current state value to a state representation indicated by
            the [SparseCompactADT](../type-aliases/SparseCompactADT.md).
         3. Once the current state can no longer be reduced, it must represent a Compact contract address somewhere inside the state,
            and that contract address is added to the dependency set.
