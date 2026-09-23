[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [utils](../README.md) / hasForeignErrorCode

# Function: hasForeignErrorCode()

> **hasForeignErrorCode**\<`C`\>(`e`, `code`): `e is Error & { code: C }`

Type guard for "this error carries exactly `code`", where `code` belongs to
someone else — Node's `ECONNREFUSED`, a driver's own vocabulary, anything
outside [MidnightJsErrorCode](../type-aliases/MidnightJsErrorCode.md).

Separate from [hasErrorCode](hasErrorCode.md) so that reaching outside this framework's
codes is deliberate and visible at the call site. Foreignness is enforced
twice: by the compiler via ForeignErrorCode, and at run time by prefix.

## Type Parameters

### C

`C` *extends* `string`

## Parameters

### e

`unknown`

### code

`ForeignErrorCode`\<`C`\>

## Returns

`e is Error & { code: C }`

## Throws

Error if `code` carries this framework's own `MIDNIGHT_JS_` prefix.
  That is a mistake at the call site, not a property of `e`, so it is raised
  rather than reported as a non-match.

## See

ErrorVocabulary for why the two guards are separate, and why one
  gate cannot cover both cases.
