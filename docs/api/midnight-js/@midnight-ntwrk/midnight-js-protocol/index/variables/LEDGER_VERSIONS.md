[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / LEDGER\_VERSIONS

# Variable: LEDGER\_VERSIONS

> `const` **LEDGER\_VERSIONS**: readonly \[`"v8"`, `"v9"`\]

The two ledger runtimes midnight-js can talk to. `v8` backs the node 1.x
line; `v9` backs the 2.x line. This is a closed, exhaustive set — see
`protocolVersionToLedger` (`../version.ts`) for how a raw `protocolVersion`
integer maps onto it.

## See

 - [SharedTableDiscipline](../../documents/SharedTableDiscipline.md) for why the array is frozen.
 - [ModuleGraphAndLazyLoading](../../documents/ModuleGraphAndLazyLoading.md) for why the constant is declared in
this leaf module and re-exported by `../version.ts`.
