[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / findCodedCause

# Function: findCodedCause()

> **findCodedCause**(`failure`): [`CodedMidnightJsError`](../type-aliases/CodedMidnightJsError.md) \| `undefined`

The midnight-js error a failure is or carries: the failure itself when it is one, otherwise the first
one on its `cause` chain, at most eight links down. Use it when a dependency wraps a midnight-js error
and hides its `code` and `category`.

## Parameters

### failure

`unknown`

## Returns

[`CodedMidnightJsError`](../type-aliases/CodedMidnightJsError.md) \| `undefined`
