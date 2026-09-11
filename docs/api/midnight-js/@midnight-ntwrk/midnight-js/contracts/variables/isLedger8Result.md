[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / isLedger8Result

# Variable: isLedger8Result

> `const` **isLedger8Result**: \<`T`\>(`result`) => `result is NarrowedToRetained<T>`

Whether a result came from the RETAINED pipeline, narrowing it to that era's
arm.

Reads `era`, which every result carries and which each arm declares as its
own literal -- so this narrows a union of any two result shapes that carry
the tag, not only the published unions above.

`era` names the PIPELINE that produced the objects in the result, read off
the compiled artifact. It is NOT the era that recorded the transaction:
`public.version` answers that, and the two disagree after the fork, when a
retained-era call is recorded as a keep-state transaction tagged `'v9'`.
Branch on this one to decide which module a result's objects came from, and
on `version` to decide which ledger recorded it.

## Type Parameters

### T

`T` *extends* `object`

## Parameters

### result

`T`

Any result carrying an era tag.

## Returns

`result is NarrowedToRetained<T>`

`true` when the retained pipeline produced it.
