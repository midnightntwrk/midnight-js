[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [utils](../README.md) / MidnightJsErrorCode

# Type Alias: MidnightJsErrorCode

> **MidnightJsErrorCode** = `ProtocolErrorCode` \| [`ContractsErrorCode`](ContractsErrorCode.md) \| [`ProviderErrorCode`](ProviderErrorCode.md) \| [`UtilsErrorCode`](UtilsErrorCode.md)

Union of every error code carried by a *coded* midnight-js error.

Not every midnight-js error carries a code, so `hasErrorCode(e) === false`
does not mean the error came from somewhere else.
