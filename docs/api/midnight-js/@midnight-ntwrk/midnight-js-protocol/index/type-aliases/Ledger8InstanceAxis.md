[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / Ledger8InstanceAxis

# Type Alias: Ledger8InstanceAxis

> **Ledger8InstanceAxis** = `"onchain-runtime-v3"`

Which physical-copy axis a dual-instantiation was detected on.

`'onchain-runtime-v3'` is the only member this framework version names.

NOTHING IN THIS PACKAGE RAISES THIS ANY MORE. The construction-time guard
that did (`lib/v8/instance-guard.ts`) compared `onchain-runtime-v3` against
the retained glue. Both are still reachable — `lib/v8/executable.ts` imports
the glue directly and compact-js resolves the same specifier for itself — so
the axis remains; what was removed is the runtime check on it. The invariant
is held at install time instead, by `src/test/single-instance.test.ts`, which
pins one resolved copy of each. That answers on THIS repo's lockfile, not on
physical instance identity in a consumer's process, so it is a narrower check
than the one it replaced. The error and its code stay on the published
surface because a consumer may switch on them, and `loadLedger8Engine` still
passes one through unwrapped if a lower layer ever raises it.

## See

[DualInstantiationGuard](../../documents/DualInstantiationGuard.md)
