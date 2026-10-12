[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../../README.md) / [index](../README.md) / PrivateStateSerializationFailure

# Type Alias: PrivateStateSerializationFailure

> **PrivateStateSerializationFailure** = `"function"` \| `"symbol"` \| `"symbol_keyed_property"` \| `"class_instance"` \| `"binary_buffer"` \| `"invalid_date"` \| `"sparse_array"` \| `"dropped_property"`

The reasons a private state cannot be stored.

Each names what storage would do to the member rather than what the member is,
so the remedy follows from the reason.
