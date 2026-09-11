[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / TRANSACTION\_TAG\_PREFIX

# Variable: TRANSACTION\_TAG\_PREFIX

> `const` **TRANSACTION\_TAG\_PREFIX**: `"midnight:transaction["` = `'midnight:transaction['`

The opening of the tag every serialized ledger transaction carries, on both
eras.

Stops before the bracketed version deliberately: a `[vN]` is the wire-schema
version of the serialized OBJECT and never a ledger era — the retained era's
transactions are tagged `transaction[v9]`.

## See

packages/contracts/docs/verification-path.md for the same rule stated
     about verifier-key tags.
