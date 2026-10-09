[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [utils](../README.md) / MidnightJsErrorCode

# Type Alias: MidnightJsErrorCode

> **MidnightJsErrorCode** = `CommonErrorCode` \| `ProtocolErrorCode` \| [`ContractsErrorCode`](ContractsErrorCode.md) \| [`ProviderErrorCode`](ProviderErrorCode.md) \| [`UtilsErrorCode`](UtilsErrorCode.md)

Union of every error code carried by a *coded* midnight-js error.

Every error midnight-js raises itself carries a code. `hasErrorCode(e) === false` means the error
came from a dependency, the platform or user code and was passed through unchanged, or from another
installed midnight-js copy using a code this copy does not know.
