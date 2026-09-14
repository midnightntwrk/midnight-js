[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [utils](../README.md) / hasErrorCode

# Function: hasErrorCode()

## Call Signature

> **hasErrorCode**(`e`): `e is Error & { code: MidnightJsErrorCode }`

Type guard for "this is one of midnight-js's own coded errors" — narrows
to `Error & { code: MidnightJsErrorCode }` only when `e.code` is present
in the [MIDNIGHT\_JS\_ERROR\_CODES](../variables/MIDNIGHT_JS_ERROR_CODES.md) registry. A foreign coded error
(e.g. Node's `ECONNREFUSED`) returns `false`.

### Parameters

#### e

`unknown`

### Returns

`e is Error & { code: MidnightJsErrorCode }`

## Call Signature

> **hasErrorCode**\<`C`\>(`e`, `code`): `e is Error & { code: C }`

Type guard for "this error carries exactly `code`" — narrows to
`Error & { code: C }` when `e.code === code`. `C` is not required to be a
member of [MidnightJsErrorCode](../type-aliases/MidnightJsErrorCode.md), so this form also works for
comparing against a specific foreign code.

### Type Parameters

#### C

`C` *extends* `string`

### Parameters

#### e

`unknown`

#### code

`C`

### Returns

`e is Error & { code: C }`
