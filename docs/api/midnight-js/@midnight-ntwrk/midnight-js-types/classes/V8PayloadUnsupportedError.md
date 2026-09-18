[**Midnight.js API Reference v5.0.0-beta.8**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../README.md) / V8PayloadUnsupportedError

# Class: V8PayloadUnsupportedError

Thrown by a provider that only speaks the v9 ledger runtime when it is
handed the v8 arm of a versioned transaction payload — serialized,
tag-prefixed bytes instead of a live v9 transaction object.

Which providers raise this, and why, differs — the distinction matters at the
point of failure:

- `createProofProvider`, `createWalletProvider` and `createMidnightProvider`
  raise it PERMANENTLY. Each lifts a v9-only implementation into the
  version-tagged interface, so refusing the v8 arm is the adapter reporting
  what it actually wraps. Supply a `WalletProvider` or `MidnightProvider`
  implementing the interface directly to serve the v8 arm.
- Concrete providers may or may not implement it.
  `httpClientProofProvider` and `dappConnectorProofProvider` both DO, taking
  and returning serialized bytes; other implementations that have not been
  widened still raise this.

So catching this does not mean "the framework cannot do it yet" — it means
the specific implementation on that seam does not serve the v8 arm.

Lives in this package (rather than in each provider package) because the
payload union it rejects is defined here, on the provider interfaces every
implementation shares. Catch it via its stable `code`, using `hasErrorCode`
from `@midnight-ntwrk/midnight-js-utils`.

## Extends

- `Error`

## Constructors

### Constructor

> **new V8PayloadUnsupportedError**(`seam`, `byteLength?`): `V8PayloadUnsupportedError`

#### Parameters

##### seam

[`ProviderSeam`](../type-aliases/ProviderSeam.md)

The provider method that received the payload.

##### byteLength?

`number`

Size of the rejected payload, recorded so a report of
                  this error says something about what arrived. `undefined`
                  when the payload's `txBytes` was missing or not a
                  `Uint8Array` — which the message states, because that
                  caller has a second problem worth knowing about.

#### Returns

`V8PayloadUnsupportedError`

#### Overrides

`Error.constructor`

## Properties

### byteLength?

> `readonly` `optional` **byteLength?**: `number`

Size of the rejected payload, recorded so a report of
                  this error says something about what arrived. `undefined`
                  when the payload's `txBytes` was missing or not a
                  `Uint8Array` — which the message states, because that
                  caller has a second problem worth knowing about.

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_PR_V8_PAYLOAD_UNSUPPORTED"` = `V8_PAYLOAD_UNSUPPORTED`

***

### seam

> `readonly` **seam**: [`ProviderSeam`](../type-aliases/ProviderSeam.md)

The provider method that received the payload.
