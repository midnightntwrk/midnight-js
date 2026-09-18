[**Midnight.js API Reference v5.0.0-beta.8**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-utils](../README.md) / hasForeignErrorCode

# Function: hasForeignErrorCode()

> **hasForeignErrorCode**\<`C`\>(`e`, `code`): `e is Error & { code: C }`

Type guard for "this error carries exactly `code`", where `code` belongs to
someone else — Node's `ECONNREFUSED`, a driver's own vocabulary, anything
outside [MidnightJsErrorCode](../type-aliases/MidnightJsErrorCode.md).

Separate from [hasErrorCode](hasErrorCode.md) so that reaching outside this framework's
codes is deliberate and visible at the call site, instead of being the same
call that a typo degrades into.

Foreignness is enforced twice, because one gate cannot see both cases:

- A code this framework owns is rejected by the compiler, via
  ForeignErrorCode.
- A code that only LOOKS like one of ours — a misspelling, the case that
  sends a caller here in the first place — satisfies that constraint, so it
  is refused at runtime by its prefix. Answering `false` instead would be the
  silent guard that constraining [hasErrorCode](hasErrorCode.md) set out to abolish,
  reached through the other door.

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
