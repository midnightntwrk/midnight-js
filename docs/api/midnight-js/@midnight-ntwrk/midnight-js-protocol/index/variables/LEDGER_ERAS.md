[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / LEDGER\_ERAS

# Variable: LEDGER\_ERAS

> `const` **LEDGER\_ERAS**: readonly \[`"v8"`, `"v9"`\]

The two ledger runtimes midnight-js can talk to. `v8` backs the node 1.x
line; `v9` backs the 2.x line. This is a closed, exhaustive set — see
`protocolVersionToLedger` (`../version.ts`) for how a raw `protocolVersion`
integer maps onto it.

compact-js names the same era by number: its `Ledger.Era['ledger']` (for
example `executable.era.ledger`) is `8` for `'v8'` and `9` for `'v9'`.

## See

 - [SharedTableDiscipline](../../documents/SharedTableDiscipline.md) for why the array is frozen.
 - [ModuleGraphAndLazyLoading](../../documents/ModuleGraphAndLazyLoading.md) for why the constant is declared in
this leaf module and re-exported by `../version.ts`.
