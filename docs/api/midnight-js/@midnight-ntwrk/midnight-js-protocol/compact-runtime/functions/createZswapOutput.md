[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [compact-runtime](../README.md) / createZswapOutput

# Function: createZswapOutput()

> **createZswapOutput**(`circuitContext`, `coinInfo`, `recipient`): \[\]

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/zswap.d.ts:158

Adds a coin to the list of outputs produced by the circuit.

## Parameters

### circuitContext

[`CircuitContext`](../interfaces/CircuitContext.md)\<`unknown`\>

The current circuit context.

### coinInfo

[`EncodedShieldedCoinInfo`](../interfaces/EncodedShieldedCoinInfo.md)

The coin to produce.

### recipient

[`EncodedRecipient`](../interfaces/EncodedRecipient.md)

The coin recipient - either a coin public key representing an end user or a contract address
                 representing a contract.

## Returns

\[\]
