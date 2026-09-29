[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-utils](../../README.md) / [index](../README.md) / hasErrorCode

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
`Error & { code: C }` when `e.code === code`.

`code` must be one of this framework's own codes, so a typo is a compile
error rather than a guard that silently never matches.

If a code you believe is ours does not compile here, it is misspelled or was
never registered — check [MIDNIGHT\_JS\_ERROR\_CODES](../variables/MIDNIGHT_JS_ERROR_CODES.md). Do NOT reach for
[hasForeignErrorCode](hasForeignErrorCode.md) to get it past the compiler; that guard refuses
anything carrying this framework's prefix. It is for codes belonging to
someone else, such as Node's `ECONNREFUSED`.

### Type Parameters

#### C

`C` *extends* [`MidnightJsErrorCode`](../type-aliases/MidnightJsErrorCode.md)

### Parameters

#### e

`unknown`

#### code

`C`

### Returns

`e is Error & { code: C }`
