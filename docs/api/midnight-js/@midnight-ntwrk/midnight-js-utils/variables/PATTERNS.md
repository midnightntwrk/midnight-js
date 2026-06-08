[**Midnight.js API Reference v4.1.1**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-utils](../README.md) / PATTERNS

# Variable: PATTERNS

> `const` **PATTERNS**: readonly [`PatternEntry`](../interfaces/PatternEntry.md)[]

Shared pattern table across all three sources (ledger / compact-runtime / onchain-runtime).
Sources share the same `serialize` Rust crate, so error message formats are identical.
Order matters — more specific patterns come first; first match wins.

Patterns sourced from `midnight-ledger` repo audit (spec §7.1):
 - `serialize/src/deserializable.rs`, `serialize/src/util.rs`
 - `serialize-macros/src/lib.rs`
 - `ledger/src/structure.rs`, `ledger/src/error.rs`
 - `ledger-wasm/src/conversions.rs`, `onchain-runtime-wasm/src/lib.rs`
