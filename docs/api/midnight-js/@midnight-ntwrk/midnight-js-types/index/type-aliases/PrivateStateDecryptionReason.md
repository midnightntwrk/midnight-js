[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../../README.md) / [index](../README.md) / PrivateStateDecryptionReason

# Type Alias: PrivateStateDecryptionReason

> **PrivateStateDecryptionReason** = `"wrong-key"` \| `"malformed"`

Why stored private state could not be decrypted: `wrong-key` when it was encrypted with a different key
or modified (the two cannot be told apart), `malformed` when it is not readable encrypted data at all.
