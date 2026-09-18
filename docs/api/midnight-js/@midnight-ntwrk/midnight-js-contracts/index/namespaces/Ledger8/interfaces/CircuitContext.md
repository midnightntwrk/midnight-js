[**Midnight.js API Reference v5.0.0-beta.8**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../../../README.md) / [index](../../../README.md) / [Ledger8](../README.md) / CircuitContext

# Interface: CircuitContext\<PS\>

The context a retained-era circuit receives as its first argument, as a
caller READS it.

The member list is an invariant, not a description: it must be exactly the
retained runtime's REQUIRED members. `gasLimit`, the one optional member, is
therefore absent -- and naming it, or any future optional member, without
`?` would collapse [Ledger8CircuitParameters](../type-aliases/CircuitParameters.md) to `never[]` for every
retained contract. `costModel` is named for the same reason rather than for
anything this type does on its own: Ledger8CircuitContextArgument
takes its keys from here.

The era-internal members are `unknown`: they are live values of the previous
runtime, and nothing outside that runtime may inspect them.

This is not the type that stands in a circuit's parameter position -- see
Ledger8CircuitContextArgument.

## See

[OverloadTyping](../../../../documents/OverloadTyping.md) for why the context needs two types.

## Type Parameters

### PS

`PS` = `unknown`

## Properties

### costModel

> `readonly` **costModel**: `unknown`

***

### currentPrivateState

> `readonly` **currentPrivateState**: `PS`

***

### currentQueryContext

> `readonly` **currentQueryContext**: `unknown`

***

### currentZswapLocalState

> `readonly` **currentZswapLocalState**: `unknown`
