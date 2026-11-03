[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../../README.md) / [index](../README.md) / DecodersFor

# Type Alias: DecodersFor\<D, E\>

> **DecodersFor**\<`D`, `E`\> = \[`Extract`\<keyof `D`, `E`\>\] *extends* \[`never`\] ? `never` : `D`

Decoders `D` that can read a value of era `E`, or `never` when `D` has no decoder for any era `E`
can be, so such a call does not compile.

## Type Parameters

### D

`D` *extends* [`StateDecoders`](StateDecoders.md)

### E

`E` *extends* `LedgerVersion`
