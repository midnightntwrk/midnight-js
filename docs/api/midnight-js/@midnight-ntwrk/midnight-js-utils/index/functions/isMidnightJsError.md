[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-utils](../../README.md) / [index](../README.md) / isMidnightJsError

# Function: isMidnightJsError()

> **isMidnightJsError**(`e`): `e is Error & { code: MidnightJsErrorCode }`

True when `e` is an error midnight-js threw. Reads `e.code`, so it also recognises an error built by
another installed copy of a midnight-js package, which `instanceof MidnightJsError` would not.

Narrows to `Error & { code }`, not to `MidnightJsError`: an error from another copy may lack the
class's other members. Read the category with [errorCategory](errorCategory.md), not `e.category`.

## Parameters

### e

`unknown`

## Returns

`e is Error & { code: MidnightJsErrorCode }`
