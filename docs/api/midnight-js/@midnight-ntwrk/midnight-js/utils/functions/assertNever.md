[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [utils](../README.md) / assertNever

# Function: assertNever()

> **assertNever**(`value`, `context`): `never`

Asserts that every member of a union has already been handled.

Put it in the `default` arm of a `switch` over a discriminated union. While
the switch is exhaustive the compiler narrows `value` to `never` and the call
type-checks; add an arm to the union and the same call stops compiling,
pointing at every switch that has to change.

The thrown message never includes `value`; `context` is what locates the throw.

## Parameters

### value

`never`

The narrowed value, which must be `never` for the call to compile.

### context

`string`

Names the switch, so the runtime throw says where it came from.

## Returns

`never`

## Throws

UnhandledUnionMemberError Always.

## Example

```ts
switch (record.version) {
  case 'v8': return readRetained(record);
  case 'v9': return readNative(record);
  default: return assertNever(record, 'readContractRecord');
}
```
