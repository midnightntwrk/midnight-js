[**Midnight.js API Reference v5.0.0-beta.3**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-utils](../README.md) / SOURCE\_PACKAGES

# Variable: SOURCE\_PACKAGES

> `const` **SOURCE\_PACKAGES**: `object`

The npm package families that produce the deserialization errors this
module wraps. The major-version suffix (e.g. `-v8`, `-v3`) is intentionally
omitted — error messages reference the family and rely on the structural
version tag carried inside the error itself (e.g. `contract-state[v6]`)
for the actual version context.

This avoids hardcoded `v8`/`v3` strings that would go stale silently when
the underlying package is bumped.

## Type Declaration

### compactRuntime

> `readonly` **compactRuntime**: `"@midnight-ntwrk/compact-runtime"` = `'@midnight-ntwrk/compact-runtime'`

### ledger

> `readonly` **ledger**: `"@midnight-ntwrk/ledger"` = `'@midnight-ntwrk/ledger'`

### onchainRuntime

> `readonly` **onchainRuntime**: `"@midnight-ntwrk/onchain-runtime"` = `'@midnight-ntwrk/onchain-runtime'`
