[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / PublicStatesRead

# Interface: PublicStatesRead

The public states of one contract read from one block: the contract state, the zswap chain state
and the ledger parameters, all as bytes and all written by the ledger of one era.

## Extends

- [`ContractStateAndParametersRead`](ContractStateAndParametersRead.md)

## Properties

### contractState

> `readonly` **contractState**: [`SerializedState`](../classes/SerializedState.md)\<`"ContractState"`\>

The contract state.

#### Inherited from

[`ContractStateAndParametersRead`](ContractStateAndParametersRead.md).[`contractState`](ContractStateAndParametersRead.md#contractstate)

***

### ledgerParameters

> `readonly` **ledgerParameters**: [`SerializedState`](../classes/SerializedState.md)\<`"LedgerParameters"`\>

The ledger parameters of the block that dates the read. On a read with no block given, that
block is looked up separately from the state, so near the hard fork it can be a block other than
the one the state was read at.

#### Inherited from

[`ContractStateAndParametersRead`](ContractStateAndParametersRead.md).[`ledgerParameters`](ContractStateAndParametersRead.md#ledgerparameters)

***

### protocolVersion

> `readonly` **protocolVersion**: `number`

The protocol-version integer of the block that dates the read. A state keeps the era of the
ledger that wrote it, so the era of this block can be newer than `contractState.era`. On a read
with no block given, the block and the state are looked up separately, so near the hard fork the
era of this block can also be older than `contractState.era`.

#### Inherited from

[`ContractStateAndParametersRead`](ContractStateAndParametersRead.md).[`protocolVersion`](ContractStateAndParametersRead.md#protocolversion)

***

### zswapChainState

> `readonly` **zswapChainState**: [`SerializedState`](../classes/SerializedState.md)\<`"ZswapChainState"`\>

The zswap chain state of the contract, resolved at the block.
