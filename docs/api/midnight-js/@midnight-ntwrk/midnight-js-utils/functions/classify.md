[**Midnight.js API Reference v4.1.1**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-utils](../README.md) / classify

# Function: classify()

> **classify**(`callSite`, `cause`): [`DeserializationContext`](../interfaces/DeserializationContext.md)

Classify a deserialization error against the shared pattern table.
Returns a fully-populated `DeserializationContext` ready to attach to a
`DeserializationError`.

Rules (spec §7.1):
 - First matching pattern wins.
 - `extracted.dataType` (when populated by a pattern) overrides `callSite.dataType`.
 - Mitigation is dispatched on `(classification, source)` (D12).
 - `extracted` is `undefined` (not `{}`) when no pattern populated it.

## Parameters

### callSite

[`DeserializationCallSite`](../interfaces/DeserializationCallSite.md)

### cause

`Error`

## Returns

[`DeserializationContext`](../interfaces/DeserializationContext.md)
