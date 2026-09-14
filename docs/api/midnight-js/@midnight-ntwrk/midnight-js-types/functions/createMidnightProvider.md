[**Midnight.js API Reference v5.0.0-beta.8**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../README.md) / createMidnightProvider

# Function: createMidnightProvider()

> **createMidnightProvider**(`submitTx`): [`MidnightProvider`](../interfaces/MidnightProvider.md)

Lifts a v9-only submission function into the version-tagged
[MidnightProvider](../interfaces/MidnightProvider.md) interface.

The counterpart to `createWalletProvider`, and worth using for the same
reason: it keeps the `version` tag out of implementation code, so an
implementer never meets the parameter-mismatch error the tagged interface
otherwise produces.

The returned provider serves the v9 arm only — `supportedEras` says so — and
that is permanent rather than a gap: it lifts a v9-only implementation. It
rejects a v8 payload with `V8PayloadUnsupportedError` and an untagged one with
`UntaggedPayloadError`. To serve a retained era as well, use
[createMidnightProviderFromArms](createMidnightProviderFromArms.md).

## Parameters

### submitTx

(`tx`) => `Promise`\<`string`\>

The v9-only submission function to wrap.

## Returns

[`MidnightProvider`](../interfaces/MidnightProvider.md)

A [MidnightProvider](../interfaces/MidnightProvider.md) that narrows inbound payloads.

## Example

```typescript
const midnightProvider = createMidnightProvider((tx) => wallet.submitTransaction(tx));
```
