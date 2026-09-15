[**Midnight.js API Reference v5.0.0-beta.8**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-utils](../README.md) / parseSerializedTag

# Function: parseSerializedTag()

> **parseSerializedTag**(`bytes`): [`ParsedSerializedTag`](../interfaces/ParsedSerializedTag.md)

Parses the `namespace:version:` prefix off the front of a serialized
value's raw bytes.

Only the first MAX\_TAG\_PREFIX\_BYTES (64) bytes are ever scanned —
this throws [TagParseError](../classes/TagParseError.md) without reading further into the buffer
if no well-formed prefix is found there, so an attacker cannot force a
full-buffer scan by omitting the tag. Both `namespace` and `version` must
be non-empty and match `/^[a-z0-9_[\](),-]+$/i` — the character set the
ledger runtimes actually emit, brackets and parentheses included. Anything
else (whitespace, and control characters, which could otherwise be used to
inject fake log lines) throws [TagParseError](../classes/TagParseError.md). `body` is a `.slice()` copy, so it is
isolated from the input buffer the caller passed in.

## Parameters

### bytes

`Uint8Array`

## Returns

[`ParsedSerializedTag`](../interfaces/ParsedSerializedTag.md)
