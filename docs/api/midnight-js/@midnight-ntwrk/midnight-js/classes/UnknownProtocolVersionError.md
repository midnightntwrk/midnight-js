[**Midnight.js API Reference v5.0.0-beta.8**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js](../README.md) / [](../README.md) / UnknownProtocolVersionError

# Class: UnknownProtocolVersionError

Thrown by `protocolVersionToLedger` (and, transitively, `versionOfRecord` /
`networkHeadVersion`) when a raw `protocolVersion` integer cannot be
resolved to a `LedgerVersion`. Those live in `./version`, which imports this
module -- the dependency stays one-way, so they are named here rather than
linked.

`code` is the field to switch on to tell all four cases apart: it splits
`reason` by the `path` that produced it.

## Param

**protocolVersion**

The raw `protocolVersion` value that could not be
  resolved. Carried for programmatic use, and rendered in the message.

## Param

**path**

Which call path asked for the version — see
  [VersionResolutionPath](../type-aliases/VersionResolutionPath.md).

## Param

**reason**

A malformed input (wrong shape or type, not a
  protocol-version problem at all) or a well-formed but genuinely unknown
  version (a real protocol version this framework build does not support
  yet) — see [ProtocolVersionUnknownReason](../type-aliases/ProtocolVersionUnknownReason.md).

## Extends

- `Error`

## Constructors

### Constructor

> **new UnknownProtocolVersionError**(`protocolVersion`, `path`, `reason`): `UnknownProtocolVersionError`

#### Parameters

##### protocolVersion

`number`

##### path

[`VersionResolutionPath`](../type-aliases/VersionResolutionPath.md)

##### reason

[`ProtocolVersionUnknownReason`](../type-aliases/ProtocolVersionUnknownReason.md)

#### Returns

`UnknownProtocolVersionError`

#### Overrides

`Error.constructor`

## Properties

### code

> `readonly` **code**: `"MIDNIGHT_JS_P_UNKNOWN_PROTOCOL_VERSION_READ"` \| `"MIDNIGHT_JS_P_UNKNOWN_PROTOCOL_VERSION_CONSTRUCT"`

***

### path

> `readonly` **path**: [`VersionResolutionPath`](../type-aliases/VersionResolutionPath.md)

***

### protocolVersion

> `readonly` **protocolVersion**: `number`

***

### reason

> `readonly` **reason**: [`ProtocolVersionUnknownReason`](../type-aliases/ProtocolVersionUnknownReason.md)
