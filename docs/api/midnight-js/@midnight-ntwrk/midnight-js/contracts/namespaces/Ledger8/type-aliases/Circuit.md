[**Midnight.js API Reference v5.0.0-beta.8**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../../../README.md) / [contracts](../../../README.md) / [Ledger8](../README.md) / Circuit

# Type Alias: Circuit

> **Circuit** = (`context`, ...`args`) => [`CircuitResult`](../interfaces/CircuitResult.md)

A retained-era circuit member.

Two things here are load-bearing and neither is cosmetic: the leading context is declared
EXPLICITLY, and the argument tail is `never[]` rather than `unknown[]`. Do not widen either for
readability.

## Parameters

### context

[`CircuitContext`](../interfaces/CircuitContext.md)\<`never`\>

### args

...`never`[]

## Returns

[`CircuitResult`](../interfaces/CircuitResult.md)

## See

[OverloadTyping](../../../../documents/OverloadTyping.md) for what each buys and what breaks without it.
