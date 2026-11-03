[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / Ledger8Circuit

# Type Alias: Ledger8Circuit

> **Ledger8Circuit** = (`context`, ...`args`) => [`Ledger8CircuitResult`](../interfaces/Ledger8CircuitResult.md)

A retained-era circuit member.

Two things here are load-bearing and neither is cosmetic: the leading context is declared
EXPLICITLY, and both it and the argument tail are bottom types rather than `unknown`. Do not
widen either for readability.

## Parameters

### context

`Ledger8CircuitContextArgument`

### args

...`never`[]

## Returns

[`Ledger8CircuitResult`](../interfaces/Ledger8CircuitResult.md)

## See

[OverloadTyping](../../documents/OverloadTyping.md) for what each buys and what breaks without it.
