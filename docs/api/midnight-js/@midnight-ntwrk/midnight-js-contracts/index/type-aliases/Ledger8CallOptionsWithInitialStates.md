[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / Ledger8CallOptionsWithInitialStates

# Type Alias: Ledger8CallOptionsWithInitialStates\<C, PCK\>

> **Ledger8CallOptionsWithInitialStates**\<`C`, `PCK`\> = [`Ledger8CallTxOptionsBase`](Ledger8CallTxOptionsBase.md)\<`C`, `PCK`\> & `object`

Configuration for building a retained-era call on states the caller read itself, with
`createLedger8UnprovenCallTxFromInitialStates`. The head era is stated, and each state carries the
era that wrote it, because after the fork a retained-era contract's state may already be a ledger 9
one.

## Type Declaration

### coinPublicKey

> `readonly` **coinPublicKey**: [`CoinPublicKey`](https://github.com/midnightntwrk/midnight-ledger)

The Zswap public key of the current user.

### config

> `readonly` **config**: [`MidnightConfig`](../../../midnight-js/types/interfaces/MidnightConfig.md)

Network and transaction settings, normally `providers.config`.

### head

> `readonly` **head**: `LedgerEra`

The era of the network head the transaction is built for.

### initialContractState

> `readonly` **initialContractState**: [`SerializedContractState`](../../../midnight-js/types/classes/SerializedContractState.md)

The contract state to run the circuit against, as read: pass `read.contractState`. Its era is
`'v8'` before the fork and `'v9'` after it. An indexer older than 4.4.0-rc.6 may still serve the
pre-fork `'v8'` bytes after the fork.

### initialPrivateState?

> `readonly` `optional` **initialPrivateState?**: [`Ledger8PrivateState`](Ledger8PrivateState.md)\<`C`\>

The private state the circuit runs against.

#### Remarks

**Privacy-sensitive.**

### ledgerParameters

> `readonly` **ledgerParameters**: [`SerializedLedgerParameters`](../../../midnight-js/types/classes/SerializedLedgerParameters.md)

The ledger parameters of the block the state was read at, as read: pass `read.ledgerParameters`.

## Type Parameters

### C

`C` *extends* [`Ledger8Contract`](../interfaces/Ledger8Contract.md)

### PCK

`PCK` *extends* [`Ledger8CircuitId`](Ledger8CircuitId.md)\<`C`\>
