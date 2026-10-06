[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / DISPATCH\_BREADCRUMB\_MESSAGE

# Variable: DISPATCH\_BREADCRUMB\_MESSAGE

> `const` **DISPATCH\_BREADCRUMB\_MESSAGE**: `"contract era dispatch decision"` = `"contract era dispatch decision"`

The fixed message every breadcrumb is written under.

Nothing is interpolated into it, so the fields stay the only thing an
operator has to read and an aggregator can group the three decisions without
parsing prose.
