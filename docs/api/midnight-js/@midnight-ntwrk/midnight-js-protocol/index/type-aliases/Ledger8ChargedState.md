[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / Ledger8ChargedState

# Type Alias: Ledger8ChargedState

> **Ledger8ChargedState** = `ChargedState`

The retained runtime's state handle types, under names a consumer can write.

`DownConvertedState.data` is an `onchain-runtime-v3` `ChargedState` and
`.data.state` a `StateValue`, and neither was nameable outside this package:
the aliases above are local, and the vendor package publishes no subpath to
import them from. Published because results now carry these handles.

TYPE-ONLY, deliberately. `import type` is erased at compile time, so nothing
here puts a second copy of the retained runtime on any module graph — the
loaders remain the only runtime path to it.
