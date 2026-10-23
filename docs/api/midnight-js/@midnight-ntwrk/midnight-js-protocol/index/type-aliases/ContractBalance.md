[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / ContractBalance

# Type Alias: ContractBalance

> **ContractBalance** = `ReadonlyMap`\<[`TokenType`](https://github.com/midnightntwrk/midnight-ledger), `bigint`\>

The public balances a contract holds, keyed by token type.

Derived from the vendor's own `TokenType` rather than restated, so a rename
fails this build instead of leaving a mirror describing a shape neither
runtime has.

`shared-contract-state.test.ts` pins all three `TokenType` declarations —
both eras' and the execution runtime's, which is where the map actually
lands — mutually assignable. That pin is STRUCTURAL and can be no more:
`raw` is an opaque `string` everywhere, so assignability says the handoff
type-checks and says nothing about two eras reading a given key as the same
colour.

Plain data end to end — string-tagged objects and `bigint`s — so it crosses
an era boundary like every other member of [ContractStatePojo](../interfaces/ContractStatePojo.md). That is
a statement about `structuredClone`, which carries a `Map`; a JSON round trip
does NOT, and leaves the plain object the balance guards refuse.
