[**Midnight.js API Reference v5.0.0-beta.7**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../../../README.md) / [contracts](../../../README.md) / [Ledger8](../README.md) / CircuitContext

# Interface: CircuitContext\<PS\>

The context a retained-era circuit receives as its first argument.

Read off the real artifact, which rejects its first argument unless it is an
object carrying `currentQueryContext`, and reads `currentPrivateState` and
`currentZswapLocalState` off it.

The two era-internal members are `unknown`: they are live values of the
previous runtime, and nothing outside that runtime may inspect them.

## Type Parameters

### PS

`PS` = `unknown`

## Properties

### currentPrivateState

> `readonly` **currentPrivateState**: `PS`

***

### currentQueryContext

> `readonly` **currentQueryContext**: `unknown`

***

### currentZswapLocalState

> `readonly` **currentZswapLocalState**: `unknown`
