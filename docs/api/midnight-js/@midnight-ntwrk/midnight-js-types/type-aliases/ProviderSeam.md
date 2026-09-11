[**Midnight.js API Reference v5.0.0-beta.7**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../README.md) / ProviderSeam

# Type Alias: ProviderSeam

> **ProviderSeam** = `"proveTx"` \| `"balanceTx"` \| `"submitTx"`

The provider methods that carry a version-tagged transaction payload.

Closed rather than a bare `string` so a caught error can be switched on
exhaustively, and so a typo in a throw site is a compile error.
